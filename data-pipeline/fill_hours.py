# -*- coding: utf-8 -*-
"""
preprocessed/places.json의 open_time/close_time을 Google Places API (New)
Text Search로 채운다. (운영시간 매치.md 참고)

입력: preprocessed/places.json (정본 - 카카오맵으로 좌표 검증된 상태)
출력:
    preprocessed/places.json      - open_time/close_time 채워서 덮어씀
                                     (덮어쓰기 전 places.json.bak으로 백업)
    preprocessed/review_needed.json - 자동으로 못 채운/확인 필요한 항목 모음
        - low_confidence: 매칭 실패 또는 좌표 500m 이상 이탈(오매칭 의심)
        - always_open: 영업시간 개념 없음으로 추정(공원/포토스팟 등) - 빈 값 유지
        - weekday_variation: 요일별 영업시간이 달라서 대표값(최빈값)만 채운 항목
                              (요일별 원본 정보도 같이 기록)

실행:
    python fill_hours.py --dry-run          # API 호출 없이 대상/쿼리만 미리보기
    python fill_hours.py --limit 5          # 실제로 5건만 호출해서 결과 확인
    python fill_hours.py                    # 전체 실행(이미 채워진 항목은 건너뜀)

안전장치:
    - GOOGLE_PLACES_API_KEY는 .env에서만 읽음(코드에 하드코딩 금지)
    - ./cache/{place_id}.json에 원본 응답을 캐싱 - 재실행 시 이미 조회한 곳은
      API를 다시 호출하지 않음(무료 쿼터 절약, 멱등성)
    - 이미 open_time이 채워진 항목은 애초에 대상에서 제외
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
PLACES_PATH = os.path.join(OUT_DIR, "places.json")
CITIES_PATH = os.path.join(OUT_DIR, "cities.json")
BACKUP_PATH = PLACES_PATH + ".bak"
REVIEW_PATH = os.path.join(OUT_DIR, "review_needed.json")
CACHE_DIR = os.path.join(BASE_DIR, "cache")

SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
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
    if place.get("place_category") == "photo":
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
    args = parser.parse_args()

    with open(PLACES_PATH, encoding="utf-8") as f:
        places = json.load(f)
    with open(CITIES_PATH, encoding="utf-8") as f:
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

    if os.path.exists(PLACES_PATH):
        shutil.copy(PLACES_PATH, BACKUP_PATH)
    with open(PLACES_PATH, "w", encoding="utf-8") as f:
        json.dump(places, f, ensure_ascii=False, indent=2)
    with open(REVIEW_PATH, "w", encoding="utf-8") as f:
        json.dump(review, f, ensure_ascii=False, indent=2)

    n_review = sum(len(v) for v in review.values())
    safe_print("")
    safe_print("=== 실행 요약 ===")
    safe_print(f"처리 대상: {len(targets)}건")
    safe_print(f"자동 채움: {filled}건")
    safe_print(f"검토 필요: {n_review}건 (low_confidence={len(review['low_confidence'])}, "
               f"always_open={len(review['always_open'])}, weekday_variation={len(review['weekday_variation'])})")
    safe_print(f"이번 실행 API 호출 수: {api_calls}건")
    safe_print(f"백업: {BACKUP_PATH}")
    safe_print(f"검토 리포트: {REVIEW_PATH}")


if __name__ == "__main__":
    main()
