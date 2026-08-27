# -*- coding: utf-8 -*-
"""
NAVER API HUB(NCP 콘솔 발급) 연동 - naver-api-hub-integration.md 참고.

이 파일은 그 문서의 3.1(블로그/웹문서 검색으로 source_url 자동 채우기)과
3.2(지역 검색으로 좌표 교차검증) 로직을 실제 코드로 옮긴 것. kakao_keyword_search()가
build_dataset.py 안에 있는 것과 달리, Google Places API가 fill_hours.py로 분리돼 있는
전례를 따라 이것도 별도 파일로 뺐다 - 외부 API 하나당 파일 하나 원칙.

## 우선순위 1 - source_url 자동 채우기 (바로 실행 가능)

가장 안전하고 즉시 쓸 수 있는 기능. 텍스트 검색만 쓰므로 좌표계 문제가 없다.

    python naver_hub.py fill-sources --city=seoul --owner=정인지 --dry-run
    python naver_hub.py fill-sources --city=seoul --owner=정인지

대상: generated_places_needs_review_<city>_<owner>.csv에서 "실제 출처 URL 없음"이
걸린 행. 찾으면 generated_places_<city>_<owner>.json의 source_url을 채우고,
review CSV에는 새 컬럼 _source_status(auto_found_unverified/not_found)/
_source_type(naver_blog/tistory)을 추가하고 _review_notes를 "자동 채움(NAVER,
날짜) - 사람 확인 필요"로 바꾼다. **행을 지우지 않는다** - source_url이 자동으로
채워졌다고 사람이 실제로 링크를 열어본 것과 같지 않기 때문(문서 5번 원칙).

## 우선순위 2 - 좌표 교차검증 (✅ 2026-08-27 selftest로 검증 완료)

`naver-api-hub-integration.md`는 지역 검색(`/search/v1/local`)의 mapx/mapy가
KATEC(TM128) 좌표계로 온다고 적어뒀는데, 실제로 키를 받아 `python naver_hub.py
selftest`를 돌려보니 **틀린 정보였다.** 교보문고 광화문점으로 확인한 실측값:
`raw_mapx="1269781271"`, `raw_mapy="375708965"` -> `1269781271 / 1e7 =
126.9781271`, `375708965 / 1e7 = 37.5708965` - 이게 그냥 WGS84 위경도를
10^7배 정수로 표현한 것뿐이고, 실제 교보문고 광화문점 위치(위도 37.5708,
경도 126.9779 근처)와 거의 정확히 일치한다. 그래서 pyproj/투영 변환이 아예
필요 없다 - 그냥 10^7로 나누면 끝. (문서에 이 부분 수정 필요하다고 남겨둘 것.)

## 인증

.env에 아래 두 값 필요(NCP 콘솔 > API HUB > Application에서 발급):
    NAVER_HUB_CLIENT_ID=
    NAVER_HUB_CLIENT_SECRET=
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from datetime import date

import requests

import build_dataset as bd

BASE_URL = "https://naverapihub.apigw.ntruss.com/search/v1"
TODAY = date.today().isoformat()


def load_env():
    bd.load_env()


def _headers():
    cid = os.environ.get("NAVER_HUB_CLIENT_ID", "").strip()
    secret = os.environ.get("NAVER_HUB_CLIENT_SECRET", "").strip()
    if not cid or not secret:
        raise RuntimeError(
            "NAVER_HUB_CLIENT_ID / NAVER_HUB_CLIENT_SECRET가 .env에 없습니다. "
            ".env.example을 참고해 값을 채워주세요."
        )
    return {"X-NCP-APIGW-API-KEY-ID": cid, "X-NCP-APIGW-API-KEY": secret}


def strip_tags(text):
    return re.sub(r"<.*?>", "", text or "")


def search(endpoint, query, display=5, retries=3):
    """endpoint: 'blog' / 'webkr' / 'local'. 429(쿼터 초과)는 지수 백오프로 재시도."""
    headers = _headers()
    for attempt in range(retries):
        resp = requests.get(
            f"{BASE_URL}/{endpoint}",
            headers=headers,
            params={"query": query, "display": display, "sort": "sim"},
            timeout=10,
        )
        if resp.status_code == 429:
            wait = 2 ** attempt
            print(f"   [429] 쿼터 초과, {wait}초 대기 후 재시도 ({attempt + 1}/{retries})")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return resp.json().get("items", [])
    raise RuntimeError(f"'{query}' 쿼리가 {retries}회 재시도 후에도 429 - 나중에 다시 시도할 것")


def pick_source(query, place, domain_filter, endpoint):
    for item in search(endpoint, query):
        text = strip_tags(item.get("title", "") + item.get("description", ""))
        if domain_filter in item.get("link", "") and place in text:
            return item["link"]
    return None


def find_source_url(artist, place):
    """naver-api-hub-integration.md 3.1 그대로. 반환: (url_or_None, source_type)."""
    query = f"{artist} {place}"
    url = pick_source(query, place, "blog.naver.com", "blog")
    if url:
        return url, "naver_blog"
    url = pick_source(query, place, "tistory.com", "webkr")
    if url:
        return url, "tistory"
    return None, "not_found"


# --- 좌표 교차검증 ---

def _mapxy_to_wgs84(mapx, mapy):
    """지역 검색 mapx/mapy -> WGS84 (lat, lon). KATEC이 아니라 그냥 위경도를
    10^7배 정수로 표현한 것뿐 - 2026-08-27 실측(교보문고 광화문점)으로 확인."""
    return float(mapy) / 1e7, float(mapx) / 1e7


def naver_local_recheck(place_name_ko, city_name_ko=None):
    """verify-english-query-matches 스킬의 naver_local_recheck 방법.
    각 후보에 raw mapx/mapy와 변환된 lat/lon을 함께 담아 반환 - raw 값도
    같이 남겨두면 나중에 변환식이 또 안 맞는 경우가 생겨도 재계산 가능."""
    query = f"{city_name_ko} {place_name_ko}".strip() if city_name_ko else place_name_ko
    results = []
    for item in search("local", query):
        mapx, mapy = item.get("mapx"), item.get("mapy")
        entry = {
            "title": strip_tags(item.get("title", "")),
            "address": item.get("roadAddress") or item.get("address"),
            "category": item.get("category"),
            "raw_mapx": mapx,
            "raw_mapy": mapy,
            "lat": None,
            "lon": None,
        }
        if mapx and mapy:
            try:
                entry["lat"], entry["lon"] = _mapxy_to_wgs84(mapx, mapy)
            except Exception as e:
                entry["conversion_error"] = str(e)
        results.append(entry)
    return results


def selftest():
    """알려진 장소(광화문 교보문고)로 한 건만 호출해서 응답 구조와 좌표 변환이
    실제로 맞는지 눈으로 확인. 문서 6번 체크리스트 4번 항목."""
    load_env()
    print("=== blog 검색 self-test: '교보문고 광화문점' ===")
    for item in search("blog", "교보문고 광화문점", display=3):
        print(" -", strip_tags(item.get("title", "")), "|", item.get("link"))
    print()
    print("=== local 검색 + 좌표 변환 self-test: '교보문고 광화문점' ===")
    print("    (실제 위치: 대략 위도 37.5708, 경도 126.9779 근처여야 함)")
    for entry in naver_local_recheck("교보문고 광화문점"):
        print(" -", entry)


# --- 우선순위 1: source_url 자동 채우기 ---

def resolve_city_paths(city, owner):
    prefix = f"{city}_{owner}" if owner else city
    base = os.path.join(bd.BASE_DIR, "preprocessed")
    return {
        "places": os.path.join(base, f"generated_places_{prefix}.json"),
        "review_csv": os.path.join(base, f"generated_places_needs_review_{prefix}.csv"),
        "artists": os.path.join(base, f"generated_artists_{prefix}.json"),
    }


def load_artist_ko_names(artists_path):
    """artist_id -> 검색 쿼리에 쓸 이름. artists.json은 멤버 단위 artist_id에는
    이미 멤버 한글명("bts-rm" -> "알엠")을, 그룹 단위엔 그룹 한글명("bts" ->
    "방탄소년단")을 갖고 있어서 그대로 쓰면 된다 - 한글명이 없으면 영문명,
    그것도 없으면 artist_id 그대로(최후 수단, 검색 품질 낮음)."""
    try:
        with open(artists_path, encoding="utf-8") as f:
            artists = json.load(f)
    except FileNotFoundError:
        return {}
    return {
        a["artist_id"]: a.get("artist_name_ko") or a.get("artist_name_en") or a["artist_id"]
        for a in artists
    }


NO_URL_FLAG = "실제 출처 URL 없음"


def fill_sources(city, owner, dry_run=False, limit=None):
    load_env()
    paths = resolve_city_paths(city, owner)

    with open(paths["places"], encoding="utf-8") as f:
        places = json.load(f)
    by_id = {p["place_id"]: p for p in places}
    artist_ko = load_artist_ko_names(paths["artists"])

    with open(paths["review_csv"], encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    for col in ("_source_status", "_source_type"):
        if col not in fieldnames:
            fieldnames.insert(fieldnames.index("_todo") if "_todo" in fieldnames else len(fieldnames), col)

    targets = [r for r in rows if NO_URL_FLAG in (r.get("_review_notes") or "")]
    if limit:
        targets = targets[:limit]
    print(f"   대상: {len(targets)}행 ('{NO_URL_FLAG}' 플래그 붙은 행)")

    n_found = n_not_found = 0
    for r in targets:
        pid = r["place_id"]
        place = by_id.get(pid)
        if not place:
            continue
        # 쿼리는 artist_id("bts")가 아니라 실제 한글 표기("방탄소년단")로 -
        # 팬 블로그 글은 그룹/멤버 한글명으로 쓰지 artist_id로 안 쓰기 때문
        # (2026-08-27 사용자 지적으로 수정 - 예: "방탄 hanna543"처럼 검색해야 함).
        first_artist_id = (place.get("artist_ids") or [None])[0]
        artist = artist_ko.get(first_artist_id, first_artist_id or "")
        query_name = place.get("place_name_ko") or place.get("place_name_en")

        if dry_run:
            print(f"   [dry-run] {pid} <- query='{artist} {query_name}'")
            continue

        url, source_type = find_source_url(artist, query_name)
        time.sleep(0.2)

        if url:
            place["source_url"] = url
            r["_source_status"] = "auto_found_unverified"
            r["_source_type"] = source_type
            notes = (r.get("_review_notes") or "").replace(NO_URL_FLAG, "").strip("; ").strip()
            addon = f"자동 채움(NAVER {source_type}, {TODAY}) - 사람이 링크 열어서 실제 내용 확인 필요"
            r["_review_notes"] = f"{notes}; {addon}".strip("; ").strip() if notes else addon
            n_found += 1
        else:
            r["_source_status"] = "not_found"
            r["_source_type"] = ""
            n_not_found += 1

    if dry_run:
        print("   dry-run 종료 - 파일 변경 없음")
        return

    with open(paths["places"], "w", encoding="utf-8") as f:
        json.dump(places, f, ensure_ascii=False, indent=2)
    with open(paths["review_csv"], "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"   완료: 찾음 {n_found} / 못 찾음 {n_not_found} (모두 auto_found_unverified 상태 - review 행 안 지움)")


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)

    p1 = sub.add_parser("fill-sources", help="source_url 자동 채우기 (문서 3.1)")
    p1.add_argument("--city", required=True)
    p1.add_argument("--owner", required=True)
    p1.add_argument("--dry-run", action="store_true")
    p1.add_argument("--limit", type=int, default=None)

    sub.add_parser("selftest", help="키 발급 후 딱 한 번 - 응답 구조/좌표 변환 눈으로 확인")

    args = parser.parse_args()
    if args.command == "fill-sources":
        fill_sources(args.city, args.owner, dry_run=args.dry_run, limit=args.limit)
    elif args.command == "selftest":
        selftest()


if __name__ == "__main__":
    main()
