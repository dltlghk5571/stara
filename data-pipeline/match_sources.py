# -*- coding: utf-8 -*-
"""
"from drive/전처리_초안_임서준.json" (2주 전 만든 초안, source_url 붙어있는 게 많음)에서
지금 우리 places.json의 source_url="PENDING" 항목과 같은 장소를 찾아 출처 후보를 매칭.

결과는 절대 json으로 덮어쓰지 않고 CSV로만 출력함 (사람이 직접 확인 후 반영하는 용도).

사용법: python match_sources.py
"""

import csv
import json
import os

from build_dataset import is_same_place, normalize_place_key, canonical_artist, _artist_key

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DRAFT_PATH = os.path.join(BASE_DIR, "from drive", "전처리_초안_임서준.json")
PLACES_PATH = os.path.join(BASE_DIR, "preprocessed", "final", "places.json")
OUT_PATH = os.path.join(BASE_DIR, "preprocessed", "source_url_matches.csv")


def artist_group_key(name):
    """place.json의 artist_id(예: "enhypen-sunoo")에서 그룹 부분만 뽑아 비교용 키로."""
    return name.split("-")[0]


def main():
    print("임서준 초안 로딩 중 (25,561건, 시간 좀 걸림)...")
    with open(DRAFT_PATH, encoding="utf-8") as f:
        draft = json.load(f)

    # 정규화된 place_name -> [(artist_name, source_url, place_name_en, place_name_ko), ...]
    draft_by_key = {}
    for item in draft:
        name = item.get("place_name_en") or item.get("place_name_ko")
        src = item.get("source_url")
        if not name or not src:
            continue
        key = normalize_place_key(name)
        draft_by_key.setdefault(key, []).append((
            item.get("artist_name"), src, item.get("place_name_en"), item.get("place_name_ko"),
        ))
    print(f"  출처 있는 항목 {sum(len(v) for v in draft_by_key.values())}건, 고유 장소명 {len(draft_by_key)}개")

    with open(PLACES_PATH, encoding="utf-8") as f:
        places = json.load(f)
    pending = [p for p in places if p.get("source_url") == "PENDING"]
    print(f"places.json 중 PENDING: {len(pending)}건")

    rows = []
    for p in pending:
        our_name = p.get("place_name_en") or p.get("place_name_ko")
        our_key = normalize_place_key(our_name)
        our_groups = {artist_group_key(a) for a in p.get("artist_ids", [])}

        # 1) 정규화 키 완전/포함 일치 먼저 시도
        candidates = draft_by_key.get(our_key, [])
        if not candidates:
            # 2) 못 찾으면 전체를 is_same_place로 느슨하게 재검색 (더 느림, PENDING만 대상이라 감당 가능)
            for key, entries in draft_by_key.items():
                if is_same_place(our_name, key):
                    candidates.extend(entries)

        if not candidates:
            rows.append({
                "place_id": p["place_id"], "place_name_ko": p["place_name_ko"],
                "artist_ids": ";".join(p["artist_ids"]),
                "matched_source_url": "", "matched_artist": "", "matched_place_name": "",
                "match_note": "매칭 없음",
            })
            continue

        # 아티스트(그룹) 일치하는 후보 우선
        artist_matched = [c for c in candidates if _artist_key(canonical_artist(c[0])) in our_groups]
        best = artist_matched or candidates

        seen_urls = []
        for artist_name, src, name_en, name_ko in best:
            if src not in seen_urls:
                seen_urls.append(src)

        rows.append({
            "place_id": p["place_id"], "place_name_ko": p["place_name_ko"],
            "artist_ids": ";".join(p["artist_ids"]),
            "matched_source_url": "; ".join(seen_urls),
            "matched_artist": "; ".join(dict.fromkeys(a for a, *_ in best if a)),
            "matched_place_name": (best[0][2] or best[0][3] or ""),
            "match_note": "아티스트 일치" if artist_matched else "장소명만 일치(아티스트 다름 - 확인 필요)",
        })

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "place_id", "place_name_ko", "artist_ids",
            "matched_source_url", "matched_artist", "matched_place_name", "match_note",
        ])
        writer.writeheader()
        writer.writerows(rows)

    found = sum(1 for r in rows if r["matched_source_url"])
    print(f"매칭 성공: {found}/{len(pending)} -> {OUT_PATH}")


if __name__ == "__main__":
    main()
