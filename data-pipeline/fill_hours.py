# -*- coding: utf-8 -*-
"""
places.json의 open_time/close_time을 Google Places API (New) Text Search로
채운다. (운영시간 매치.md 참고)

입력/출력 파일은 build_dataset.py와 동일한 --city=/--owner= 규칙으로 정해짐:
    (플래그 없음)            -> preprocessed/final/places.json (정본 - 카카오맵으로
                                좌표 검증 + 사람 검수까지 끝나서 병합된 파일.
                                2026-08-25부터 preprocessed/final/로 분리 -
                                검수 중인 도시별 generated_*와 뒤섞이지 않게)
    --city=seoul --owner=X  -> preprocessed/generated_places_seoul_X.json
                                (build_dataset.py가 만든 도시별 후보 파일에
                                직접 채움 - 정본으로 병합하기 전에 도시 단위로
                                먼저 검수+시간보강까지 끝내고 싶을 때 사용.
                                2026-08 이후 서울/부산/인천을 한 사람이 순서대로
                                처리하게 되면서, 도시마다 이 스크립트를 따로
                                돌릴 수 있게 파라미터화함 - build_dataset.py
                                실행 직후 검수 없이 바로 이어붙이는 건 권장하지
                                않음: 검수 전 후보(노이즈/오태깅 등)에도 Google
                                API 호출이 나가서 유료 쿼터만 낭비하게 됨)
    --preview               -> preprocessed/preview/places.json (MVP 3개
                                도시의 generated_places_*에서 review 플래그
                                남은 행을 뺀 "검수 완료분만 모은 미리보기"
                                스냅샷 - --city/--owner와 같이 못 씀)
같은 규칙으로 city_name_ko 조회용 cities.json도, review_needed.json/백업도
전부 같은 접두어를 씀.

출력:
    {접두어}places.json         - open_time/close_time 채워서 덮어씀
                                   (덮어쓰기 전 .bak으로 백업)
    {접두어}review_needed.json  - 자동으로 못 채운/확인 필요한 항목 모음
        - low_confidence: 매칭 실패 또는 좌표 500m 이상 이탈(오매칭 의심)
        - always_open: 영업시간 개념 없음으로 추정(공원/랜드마크 등) - 빈 값 유지
        - weekday_variation: 요일별 영업시간이 달라서 대표값(최빈값)만 채운 항목
                              (요일별 원본 정보도 같이 기록)

실행:
    python fill_hours.py --dry-run                       # 정본 대상, API 호출 없이 미리보기
    python fill_hours.py --city=seoul --owner=정인지 --dry-run  # 서울 후보 파일 대상
    python fill_hours.py --city=seoul --owner=정인지 --limit 5  # 서울 5건만 실제 호출
    python fill_hours.py --city=seoul --owner=정인지            # 서울 후보 파일 전체 실행
    python fill_hours.py                                  # 정본 전체 실행(이미 채워진 항목은 건너뜀)

안전장치:
    - GOOGLE_PLACES_API_KEY는 .env에서만 읽음(코드에 하드코딩 금지)
    - ./cache/{place_id}.json에 원본 응답을 캐싱 - 재실행 시 이미 조회한 곳은
      API를 다시 호출하지 않음(무료 쿼터 절약, 멱등성)
    - 이미 open_time이 채워진 항목은 애초에 대상에서 제외
    - 이 스크립트는 반드시 로컬/서버 배치 환경에서만 실행한다 - 프론트엔드
      JS에 API 키가 노출되면 남이 도용해서 무료 쿼터를 소진시킬 수 있음.
      GOOGLE_PLACES_API_KEY는 Google Cloud Console에서 IP 제한을 걸어둘 것
      (브라우저 키가 아니라 서버/배치용 키라 "HTTP 리퍼러"가 아니라
      "IP 주소" 제한이 맞는 방식)
"""

import argparse
import json
import os
import shutil
import sys
import time
from collections import Counter
from math import radians, sin, cos, asin, sqrt

import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, "preprocessed")
FINAL_DIR = os.path.join(OUT_DIR, "final")
CACHE_DIR = os.path.join(BASE_DIR, "cache")


PREVIEW_DIR = os.path.join(OUT_DIR, "preview")


def resolve_paths(city, owner, preview=False):
    """build_dataset.py와 동일한 명명 규칙(2026-08-25 확정,
    "generated_{종류}_{도시}_{작성자}.{확장자}") - --city=/--owner=가 없으면
    정본 파일(preprocessed/final/places.json 등, 검수+영업시간까지 끝나서
    병합된 도시만 들어있는 폴더 - 2026-08-25부터 preprocessed/ 바로 밑이
    아니라 final/ 하위로 분리함, 검수 중인 도시별 generated_*와 뒤섞이면
    한눈에 구분이 안 돼서)을, 있으면 해당 도시의
    generated_places_{도시}_{작성자}.json 같은 파일(preprocessed/ 바로
    밑, 아직 검수/병합 전)을 대상으로 삼는다.

    --preview는 세 번째 대상: preprocessed/preview/{cities,places,
    review_needed}.json - MVP 3개 도시(서울/부산/인천)의 generated_places_*
    중 그 도시 review CSV에 _review_notes가 남은(아직 검수 안 끝난) 행을
    제외하고 합쳐둔 "검수 완료분만 모은 미리보기" 스냅샷(final/과 달리
    도시별로 손으로 병합한 게 아니라 review 플래그 유무만으로 자동
    필터링한 것이라, final/에 넣기 전 단계로 보면 됨). generated_*처럼
    아직 fill_hours.py를 안 거쳐서 open_time/close_time이 비어있다."""
    if preview:
        places_path = os.path.join(PREVIEW_DIR, "places.json")
        return {
            "places": places_path,
            "cities": os.path.join(PREVIEW_DIR, "cities.json"),
            "review": os.path.join(PREVIEW_DIR, "review_needed.json"),
            "backup": places_path + ".bak",
        }
    suffix_parts = [p for p in (city, owner) if p]
    if not suffix_parts:
        places_path = os.path.join(FINAL_DIR, "places.json")
        return {
            "places": places_path,
            "cities": os.path.join(FINAL_DIR, "cities.json"),
            "review": os.path.join(FINAL_DIR, "review_needed.json"),
            "backup": places_path + ".bak",
        }
    suffix = "_" + "_".join(suffix_parts)
    places_path = os.path.join(OUT_DIR, f"generated_places{suffix}.json")
    return {
        "places": places_path,
        "cities": os.path.join(OUT_DIR, f"generated_cities{suffix}.json"),
        "review": os.path.join(OUT_DIR, f"generated_review_needed{suffix}.json"),
        "backup": places_path + ".bak",
    }

SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
# FieldMask는 꼭 필요한 것만: regularOpeningHours가 이미 최상위 과금 등급인
# Enterprise SKU를 발동시켜서, 같이 요청한 id/displayName/formattedAddress/
# location(Essentials)·businessStatus(Pro)는 등급을 안 올리므로 추가 비용이
# 없다 - 과금은 요청 필드 중 "가장 비싼 등급" 하나로 매겨지지 요청한 필드
# 개수대로 매겨지지 않는다. 반대로 reviews/photos/rating 같은 Enterprise+
# Atmosphere 등급 필드는 등급을 한 단계 더 올리니 여기 추가하지 말 것.
FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,"
    "places.location,places.regularOpeningHours,places.businessStatus"
)
LOCATION_BIAS_RADIUS_M = 400  # 300~500m 권장 범위의 중간값
MAX_MATCH_DISTANCE_M = 500
REQUEST_DELAY_SEC = 0.15

# regularOpeningHours가 없어도 정상인 장소(상시 개방 야외/포토스팟).
# place_category가 photo면 우선 신뢰하고, 그 외엔 이름에 이 키워드가 있으면 보조로 판단.
ALWAYS_OPEN_NAME_HINTS = (
    "공원", "해변", "해수욕장", "포토", "촬영지", "광장", "전망대", "거리", "바닷가",
    "낚시터", "낚시", "부두", "포구",
)


def safe_print(s):
    # Windows 콘솔(cp949)이 일부 유니코드 문자를 못 그려서 죽는 걸 방지.
    try:
        print(s)
    except UnicodeEncodeError:
        print(s.encode("ascii", "replace").decode("ascii"))


def load_env():
    env_path = os.path.join(BASE_DIR, ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key, val = key.strip(), val.strip()
            if key and key not in os.environ:
                os.environ[key] = val


def haversine_m(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(radians, (lat1, lon1, lat2, lon2))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * 6371000 * asin(sqrt(a))


def text_search(query, lat, lng, api_key):
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body = {
        "textQuery": query,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": LOCATION_BIAS_RADIUS_M,
            }
        },
    }
    resp = requests.post(SEARCH_URL, headers=headers, json=body, timeout=10)
    if not resp.ok:
        raise requests.HTTPError(f"{resp.status_code} {resp.reason}: {resp.text}", response=resp)
    return resp.json()


def cache_path_for(place_id):
    return os.path.join(CACHE_DIR, f"{place_id}.json")


def load_cached(place_id):
    p = cache_path_for(place_id)
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    return None


def save_cache(place_id, data):
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(cache_path_for(place_id), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def extract_weekday_hours(periods):
    """월(1)~금(5)만 대상으로, 요일별 첫 영업시간대를 {day: (open, close)}로."""
    by_day = {}
    for p in periods:
        o = p.get("open") or {}
        day = o.get("day")
        if day not in (1, 2, 3, 4, 5) or day in by_day:
            continue
        open_str = f"{o.get('hour', 0):02d}:{o.get('minute', 0):02d}"
        c = p.get("close")
        # close가 없으면 그날은 자정까지 영업(스펙 규칙: 24시간 운영은 "00:00"-"23:59").
        close_str = f"{c.get('hour', 0):02d}:{c.get('minute', 0):02d}" if c else "23:59"
        by_day[day] = (open_str, close_str)
    return by_day


def looks_always_open(place):
    # "photo" 카테고리는 2026-08-20 회의에서 landmark_observatory로 흡수돼
    # 폐지됨(Data_Preprocessing_Template.ts 참고) - 옛 값 그대로 두면 이 체크가
    # 죽은 코드가 돼서 이름 힌트에만 의존하게 되므로 새 값으로 갱신.
    if place.get("place_category") == "landmark_observatory":
        return True
    name = place.get("place_name_ko") or ""
    return any(hint in name for hint in ALWAYS_OPEN_NAME_HINTS)


def process_place(place, query, raw, review):
    candidates = raw.get("places") or []
    if not candidates:
        review["low_confidence"].append({
            "place_id": place["place_id"], "place_name_ko": place.get("place_name_ko"),
            "query": query, "reason": "검색 결과 없음",
        })
        return False

    best = candidates[0]
    loc = best.get("location") or {}
    if "latitude" not in loc or "longitude" not in loc:
        dist = None
    else:
        dist = haversine_m(place["latitude"], place["longitude"], loc["latitude"], loc["longitude"])

    if dist is None or dist > MAX_MATCH_DISTANCE_M:
        review["low_confidence"].append({
            "place_id": place["place_id"], "place_name_ko": place.get("place_name_ko"),
            "query": query,
            "reason": "좌표 없음" if dist is None else f"기존 좌표에서 {dist:.0f}m 이탈(오매칭 의심)",
            "google_display_name": (best.get("displayName") or {}).get("text"),
            "google_formatted_address": best.get("formattedAddress"),
        })
        return False

    hours = best.get("regularOpeningHours")
    if not hours or not hours.get("periods"):
        bucket = "always_open" if looks_always_open(place) else "low_confidence"
        entry = {
            "place_id": place["place_id"], "place_name_ko": place.get("place_name_ko"),
            "query": query,
            "google_display_name": (best.get("displayName") or {}).get("text"),
            "google_business_status": best.get("businessStatus"),
        }
        if bucket == "low_confidence":
            entry["reason"] = "매칭은 됐으나 영업시간 정보 없음(직접 확인 필요)"
        review[bucket].append(entry)
        return False

    periods = hours["periods"]
    if len(periods) == 1 and "close" not in periods[0]:
        # Google이 24시간 연중무휴를 close 없는 단일 period로 표현하는 경우.
        # 스펙 규칙(24시간 운영은 "00:00"-"23:59")대로 명시적으로 채움.
        place["open_time"] = "00:00"
        place["close_time"] = "23:59"
        return True

    by_day = extract_weekday_hours(periods)
    if not by_day:
        review["low_confidence"].append({
            "place_id": place["place_id"], "place_name_ko": place.get("place_name_ko"),
            "query": query,
            "reason": "평일(월~금) 영업시간 없음(주말 전용 등으로 추정) - 직접 확인 필요",
            "weekday_descriptions": hours.get("weekdayDescriptions"),
        })
        return False

    values = list(by_day.values())
    rep_open, rep_close = Counter(values).most_common(1)[0][0]
    place["open_time"] = rep_open
    place["close_time"] = rep_close

    if len(set(values)) > 1:
        review["weekday_variation"].append({
            "place_id": place["place_id"], "place_name_ko": place.get("place_name_ko"),
            "representative_open": rep_open, "representative_close": rep_close,
            "weekday_descriptions": hours.get("weekdayDescriptions"),
            "by_day_raw": {str(k): v for k, v in by_day.items()},
        })
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="API 호출 없이 대상/쿼리만 출력")
    parser.add_argument("--limit", type=int, default=None, help="처리할 최대 건수(테스트용)")
    parser.add_argument("--city", default=None, help="build_dataset.py와 동일 - 지정하면 정본 대신 "
                         "{city}.{owner}.generated.places.json 등을 대상으로 함")
    parser.add_argument("--owner", default=None, help="build_dataset.py와 동일")
    parser.add_argument("--preview", action="store_true",
                         help="preprocessed/preview/{places,cities,review_needed}.json 대상 - "
                              "--city/--owner와 같이 못 씀")
    args = parser.parse_args()

    if args.preview and (args.city or args.owner):
        safe_print("--preview는 --city/--owner와 같이 쓸 수 없습니다.")
        sys.exit(1)

    paths = resolve_paths(args.city, args.owner, preview=args.preview)
    safe_print(f"대상 파일: {paths['places']}")

    with open(paths["places"], encoding="utf-8") as f:
        places = json.load(f)
    with open(paths["cities"], encoding="utf-8") as f:
        city_ko_by_id = {c["city_id"]: c["city_name_ko"] for c in json.load(f)}

    targets = [p for p in places if not p.get("open_time")]
    if args.limit is not None:
        targets = targets[: args.limit]

    safe_print(f"전체 {len(places)}건 중 대상 {len(targets)}건 (이미 채워진 항목 제외)")

    if args.dry_run:
        for p in targets:
            city_ko = city_ko_by_id.get(p.get("city_id"), "")
            query = f"{p.get('place_name_ko', '')} {city_ko}".strip()
            safe_print(f"  [dry-run] {p['place_id']} -> query={query!r}")
        safe_print("dry-run 종료 (API 호출/파일 변경 없음)")
        return

    load_env()
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
    if not api_key:
        safe_print("GOOGLE_PLACES_API_KEY가 .env에 없습니다. .env.example을 참고해 값을 채워주세요.")
        sys.exit(1)

    review = {"low_confidence": [], "always_open": [], "weekday_variation": []}
    filled = 0
    api_calls = 0

    for i, place in enumerate(targets, 1):
        city_ko = city_ko_by_id.get(place.get("city_id"), "")
        query = f"{place.get('place_name_ko', '')} {city_ko}".strip()

        cached = load_cached(place["place_id"])
        if cached is not None:
            raw = cached
        else:
            try:
                raw = text_search(query, place["latitude"], place["longitude"], api_key)
            except requests.RequestException as e:
                safe_print(f"  [실패] {place['place_id']} ({query!r}) -> {e}")
                review["low_confidence"].append({
                    "place_id": place["place_id"], "place_name_ko": place.get("place_name_ko"),
                    "query": query, "reason": f"API 호출 실패: {e}",
                })
                continue
            save_cache(place["place_id"], raw)
            api_calls += 1
            time.sleep(REQUEST_DELAY_SEC)

        if process_place(place, query, raw, review):
            filled += 1

        safe_print(f"  ({i}/{len(targets)}) {place['place_id']} 처리 완료 - API 호출 누적 {api_calls}건")

    os.makedirs(os.path.dirname(paths["places"]), exist_ok=True)
    if os.path.exists(paths["places"]):
        shutil.copy(paths["places"], paths["backup"])
    with open(paths["places"], "w", encoding="utf-8") as f:
        json.dump(places, f, ensure_ascii=False, indent=2)
    with open(paths["review"], "w", encoding="utf-8") as f:
        json.dump(review, f, ensure_ascii=False, indent=2)

    n_review = sum(len(v) for v in review.values())
    safe_print("")
    safe_print("=== 실행 요약 ===")
    safe_print(f"처리 대상: {len(targets)}건")
    safe_print(f"자동 채움: {filled}건")
    safe_print(f"검토 필요: {n_review}건 (low_confidence={len(review['low_confidence'])}, "
               f"always_open={len(review['always_open'])}, weekday_variation={len(review['weekday_variation'])})")
    safe_print(f"이번 실행 API 호출 수: {api_calls}건")
    safe_print(f"백업: {paths['backup']}")
    safe_print(f"검토 리포트: {paths['review']}")


if __name__ == "__main__":
    main()
