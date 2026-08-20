# -*- coding: utf-8 -*-
"""
블로그 링크 -> 본문 텍스트 추출 -> 장소/아티스트 후보 뽑기

사용법:
    1. 아래 ARTIST_LIST에 팀이 이미 알고 있는 아티스트 이름을 채워넣기 (선택, 안 넣어도 동작함)
    2. python extract_places.py 실행
    3. 블로그 URL을 한 줄에 하나씩 입력하고, 빈 줄 입력하면 종료
    4. results_날짜시간.csv 로 저장됨 (한 줄 = 한 개 항목. 한 블로그 글에 장소/아티스트가
       여러 개 있으면 여러 줄로 나뉘어서 저장됨)

CSV 컬럼:
    - url: 어느 블로그 글에서 나왔는지
    - item: 후보 이름 (장소명 또는 아티스트명)
    - category: 아티스트 / 아티스트(추정-영문약어) / 장소 / 주소 / 미분류(확인 필요)
    - source: 어떤 방식으로 잡혔는지 (형태소분석 / 접미사매칭 / 따옴표강조 / 정규식)
    - status: 처리 성공/실패 여부

주의:
    - 100% 정확하지 않은 휴리스틱(규칙 기반 + 형태소 분석) 추출입니다.
      특히 "미분류(확인 필요)"로 뜬 항목은 사람이 눈으로 한 번 봐야 합니다.
    - 네이버 블로그는 본문이 iframe 안에 있어서, 모바일 버전(m.blog.naver.com)으로
      우회해서 가져오도록 처리했습니다.
"""

import re
import csv
import time
import sys
from urllib.parse import urlparse, parse_qs

import requests
from bs4 import BeautifulSoup
from kiwipiepy import Kiwi

kiwi = Kiwi()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# 장소명 뒤에 붙는 대표적인 접미사 패턴 (한국어 지명/장소 특성 반영)
PLACE_SUFFIXES = [
    "역", "동", "거리", "공원", "시장", "타워", "박물관", "미술관",
    "카페", "스튜디오", "센터", "홀", "극장", "공연장", "학교",
    "대학교", "빌딩", "상가", "골목", "다리", "해변", "해수욕장",
    "성당", "절", "사찰", "궁", "궁궐", "마을", "거리",
]

# 주소 패턴 (도/시/구/군/읍/면/로/길)
# 주의: 이전 버전은 "도"/"로"가 조사·어미와 겹쳐서 "지속적으로" 같은 문장을
# 주소로 잘못 인식하는 문제가 있었음. 실제 주소는 거의 항상 번지수(숫자)가
# 뒤따르므로 숫자를 필수 조건으로 넣어 오탐을 크게 줄임.
ADDRESS_PATTERN = re.compile(
    r"[가-힣]{2,10}(?:특별시|광역시|자치시|자치도|도|시|군|구)\s?[가-힣0-9]{2,15}(?:로|길)\s?\d{1,5}(?:번길)?\s?\d{0,5}"
)

# "OO역", "OO카페" 등 명사+접미사 패턴
suffix_group = "|".join(PLACE_SUFFIXES)
PLACE_PATTERN = re.compile(rf"[가-힣A-Za-z0-9]{{2,10}}(?:{suffix_group})")

# 따옴표로 감싼 고유명사 (블로그 글에서 장소를 강조할 때 자주 씀: "OOO" 라는 카페)
QUOTED_PATTERN = re.compile(r"[\"'“‘]([가-힣A-Za-z0-9 ]{2,20})[\"'”’]")

# 실제로 확인된 노이즈성 단어 (장소가 아닌데 패턴에 자주 걸리는 것들)
NOISE_WORDS = {
    "콘텐츠", "지속적", "경험", "콘서트", "여행", "도시", "체류", "시간",
    "이번", "저번", "여기", "거기", "우리", "스토리", "보라해", "별",
}

# ============================================================
# 여기에 팀이 이미 알고 있는 아티스트 이름을 채워넣으세요.
# (기획 파트에서 정리한 "지역-아티스트" 목록이 있다면 그대로 옮기면 됩니다)
# 여기 있는 이름과 일치하면 무조건 "아티스트"로 분류됩니다.
# 예: {"방탄소년단", "BTS", "아이유", "IU", "뉴진스", "NewJeans"}
# ============================================================

# ARTIST_LIST = set()
# 예시로 채워넣고 싶다면 아래처럼:
ARTIST_LIST = {"방탄소년단", "BTS", "아이유", "IU", "뉴진스", "NewJeans"}
ARTIST_LIST_NORMALIZED = {a.replace(" ", "").lower() for a in ARTIST_LIST}

# 목록에 없어도 "BTS", "NCT"처럼 영문 대문자로만 된 2~10자는 아티스트(그룹명)일 확률이 높음
ARTIST_ACRONYM_PATTERN = re.compile(r"^[A-Z0-9]{2,10}$")

# 형태소 분석기는 "BTS", "NCT" 같은 영문 약어를 고유명사(NNP)가 아니라
# 외래어(SL) 태그로 분류해서 후보에서 빠지는 경우가 많음 -> 정규식으로 별도 보강
# 주의: \b는 한글을 '단어 문자'로 취급해서 "BTS와"처럼 조사가 바로 붙으면 못 잡는 문제가 있어
# 앞뒤로 영문/숫자가 아니면 된다는 방식(lookaround)으로 대체함.
ENGLISH_ACRONYM_PATTERN = re.compile(r"(?<![A-Za-z0-9])[A-Z0-9]*[A-Z][A-Z0-9]*(?![A-Za-z0-9])")


def normalize_naver_blog_url(url: str) -> str:
    """네이버 블로그 PC 링크를 모바일(m.blog.naver.com) 버전으로 변환.
    모바일 버전은 iframe 없이 바로 본문 HTML을 내려줘서 파싱이 훨씬 쉬움."""
    parsed = urlparse(url)

    if "blog.naver.com" not in parsed.netloc:
        return url

    # 이미 모바일 주소면 그대로
    if parsed.netloc.startswith("m."):
        return url

    # 형태 1: blog.naver.com/{blogId}/{logNo}
    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) >= 2:
        blog_id, log_no = parts[0], parts[1]
        return f"https://m.blog.naver.com/{blog_id}/{log_no}"

    # 형태 2: blog.naver.com/PostView.naver?blogId=...&logNo=...
    qs = parse_qs(parsed.query)
    if "blogId" in qs and "logNo" in qs:
        blog_id = qs["blogId"][0]
        log_no = qs["logNo"][0]
        return f"https://m.blog.naver.com/{blog_id}/{log_no}"

    # 변환 실패 시 원래 URL 그대로 시도
    return url


def fetch_text(url: str) -> str:
    """URL 접속해서 본문으로 추정되는 텍스트를 최대한 뽑아냄."""
    target_url = normalize_naver_blog_url(url)

    try:
        resp = requests.get(target_url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  [실패] {url} -> {e}")
        return ""

    soup = BeautifulSoup(resp.text, "html.parser")

    # 광고/스크립트/네비게이션 등 노이즈 제거
    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()

    # 네이버 블로그 모바일 버전은 본문이 보통 이 클래스 안에 있음
    candidates = soup.select_one(".se-main-container") or soup.select_one("#postViewArea") or soup.body

    text = candidates.get_text(separator=" ", strip=True) if candidates else soup.get_text(separator=" ", strip=True)
    return text


def extract_proper_nouns(text: str) -> list:
    """형태소 분석(kiwipiepy)으로 고유명사(NNP)만 골라냄.
    정규식과 달리 문맥을 보고 "이 단어가 실제 이름/지명인지"를 판단하기 때문에
    '콘텐츠', '경험' 같은 일반명사가 섞여 들어오지 않음.
    연속된 고유명사는 하나로 합침 (예: '동대문' + '디자인' + '플라자' -> '동대문 디자인 플라자')."""
    tokens = kiwi.tokenize(text)

    merged = []
    buffer = []
    for tok in tokens:
        if tok.tag == "NNP":
            buffer.append(tok.form)
        else:
            if buffer:
                merged.append(" ".join(buffer))
                buffer = []
    if buffer:
        merged.append(" ".join(buffer))

    # 한 글자짜리, 노이즈 단어 제거
    merged = [m for m in merged if len(m.replace(" ", "")) >= 2 and m not in NOISE_WORDS]
    return sorted(set(merged))


def classify_item(name: str) -> str:
    """후보 하나를 보고 아티스트/장소/미분류로 분류."""
    normalized = name.replace(" ", "").lower()

    if normalized in ARTIST_LIST_NORMALIZED:
        return "아티스트"
    if ARTIST_ACRONYM_PATTERN.match(name.replace(" ", "")):
        return "아티스트(추정-영문약어)"
    if any(name.endswith(suffix) for suffix in PLACE_SUFFIXES):
        return "장소"
    return "미분류(확인 필요)"


ENGLISH_NOISE = {"TV", "OK", "ID", "PC", "DM", "SNS", "QR", "GPS", "AI", "IT", "URL"}


def extract_place_candidates(text: str) -> dict:
    """본문 텍스트에서 장소/아티스트 후보를 추출.
    같은 후보가 여러 방식(형태소분석/접미사매칭/따옴표)에서 동시에 잡히면
    출처를 합쳐서 신뢰도를 표시함.

    반환값: {후보이름: {"sources": set(...)}} 형태 + 주소는 별도 리스트."""
    proper_nouns = extract_proper_nouns(text)
    place_words = sorted(set(PLACE_PATTERN.findall(text)) - NOISE_WORDS)
    quoted = [w for w in set(QUOTED_PATTERN.findall(text)) if len(w.strip()) >= 2 and w not in NOISE_WORDS]
    addresses = sorted(set(ADDRESS_PATTERN.findall(text)))
    english_acronyms = sorted(
        set(m for m in ENGLISH_ACRONYM_PATTERN.findall(text) if 2 <= len(m) <= 10) - ENGLISH_NOISE
    )

    items = {}
    for name in proper_nouns:
        items.setdefault(name, set()).add("형태소분석(고유명사)")
    for name in place_words:
        items.setdefault(name, set()).add("접미사매칭")
    for name in quoted:
        items.setdefault(name, set()).add("따옴표강조")
    for name in english_acronyms:
        items.setdefault(name, set()).add("영문약어패턴")

    return {"items": items, "addresses": addresses}


def process_urls(urls: list) -> list:
    """반환값: 한 줄 = 한 항목(장소 또는 아티스트 후보 1개).
    같은 블로그 글에서 여러 개가 나오면 여러 줄로 풀어서 나옴."""
    rows = []
    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] 처리 중: {url}")
        text = fetch_text(url)
        if not text:
            rows.append({
                "url": url,
                "item": "",
                "category": "",
                "source": "",
                "status": "실패(접속 불가 또는 본문 없음)",
            })
            continue

        result = extract_place_candidates(text)

        if not result["items"] and not result["addresses"]:
            rows.append({
                "url": url,
                "item": "",
                "category": "",
                "source": "",
                "status": "성공(후보 없음)",
            })
            time.sleep(1)
            continue

        for name, sources in sorted(result["items"].items()):
            rows.append({
                "url": url,
                "item": name,
                "category": classify_item(name),
                "source": " + ".join(sorted(sources)),
                "status": "성공",
            })

        for addr in result["addresses"]:
            rows.append({
                "url": url,
                "item": addr,
                "category": "주소",
                "source": "정규식(번지매칭)",
                "status": "성공",
            })

        time.sleep(1)  # 서버 부담 줄이기용 딜레이

    return rows


def save_csv(rows: list, filename: str = None):
    fieldnames = ["url", "item", "category", "source", "status"]

    if filename is None:
        # 타임스탬프를 붙여서 매번 새 파일로 저장 -> 엑셀에 열려있어도 충돌 안 남
        filename = f"results_{time.strftime('%Y%m%d_%H%M%S')}.csv"

    try:
        with open(filename, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"\n완료! -> {filename} 저장됨 (엑셀에서 바로 열어보세요)")
    except PermissionError:
        # 원래 경로에 쓰기 권한이 없는 경우 (엑셀에서 열려있거나, 폴더 권한 문제)
        # -> 현재 사용자 홈 폴더(Desktop)에 대신 저장 시도
        import os
        fallback_path = os.path.join(os.path.expanduser("~"), "Desktop", filename)
        try:
            with open(fallback_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            print(f"\n[알림] 원래 위치에 저장 실패 (엑셀에서 열려있거나 권한 문제) -> 대신 바탕화면에 저장했습니다.")
            print(f"완료! -> {fallback_path}")
        except Exception as e2:
            print(f"\n[오류] 저장에 계속 실패했습니다: {e2}")
            print("결과가 사라지지 않도록 아래에 그대로 출력합니다:\n")
            for row in rows:
                print(row)


def main():
    print("블로그 URL을 한 줄에 하나씩 입력하세요. 다 입력했으면 빈 줄에서 엔터.\n")
    urls = []
    while True:
        line = input("> ").strip()
        if not line:
            break
        urls.append(line)

    if not urls:
        print("입력된 URL이 없습니다.")
        sys.exit(0)

    rows = process_urls(urls)
    save_csv(rows)


if __name__ == "__main__":
    main()
