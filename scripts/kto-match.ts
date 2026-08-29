// 서울 실장소(previewdata/places.json) ↔ KTO(TourAPI) contentId 매칭.
// 실행: npx dotenv -e .env.local -- npx tsx scripts/kto-match.ts [sourceDir]
//   sourceDir 기본값 previewdata/ — export-seoul-dataset.ts와 동일한 소스를 공유한다.
//
// I절 5-priority chain:
//   1) 이미 tour_api_content_id가 있으면 스킵
//   2) place_name_ko로 searchKeyword2 → 거리(haversine)+이름유사도로 확신 매칭
//   3) 후보가 없거나 애매하면 장소 좌표 주변 locationBasedList2로 재검색
//   4) 그래도 애매(후보 0 또는 2개 이상 동률) → 자동매칭 금지, 리뷰큐에 기록
//   5) 그래도 없음 → 그대로 둠(삭제하지 않음)
//
// previewdata/places.json의 tour_api_content_id 필드를 확신 매칭 건만 직접 채워 넣는다.
// export-seoul-dataset.ts가 이 필드를 그대로 읽으므로 별도 연동 코드가 필요 없다.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchSearchKeyword, fetchLocationBasedList } from "../src/lib/tour-api/client";
import { haversineKm } from "../src/lib/distance";

const sourceDir = process.argv[2] ?? "previewdata";
const CITY_ID = "seoul";
const KEYWORD_MATCH_RADIUS_KM = 0.5; // 300~500m 중 상한
const NEARBY_SEARCH_RADIUS_M = 300;

interface PipelinePlace {
  place_id: string;
  city_id: string;
  place_name_ko: string;
  latitude: number;
  longitude: number;
  tour_api_content_id: string | null;
  [key: string]: unknown;
}

export interface Candidate {
  contentid: string;
  title: string;
  distanceKm: number;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

/** 공백/특수문자 제거 후 부분일치 여부만 본다 — 이 규모(~100건)엔 fuzzy 라이브러리가 과함. */
function normalize(s: string): string {
  return s.replace(/[\s·・\-()（）]/g, "").toLowerCase();
}

export function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

function toCandidates(
  items: { contentid: string; title: string; mapx?: string; mapy?: string }[],
  origin: { latitude: number; longitude: number }
): Candidate[] {
  return items
    .filter((it) => it.contentid && it.title && it.mapx && it.mapy)
    .map((it) => ({
      contentid: it.contentid,
      title: it.title,
      distanceKm: haversineKm(origin, {
        latitude: Number(it.mapy),
        longitude: Number(it.mapx),
      }),
    }));
}

/** 이름 유사 + 거리 임계 내 후보만 남긴다. 정확히 1개면 확신 매칭. */
export function pickConfidentMatch(
  candidates: Candidate[],
  placeName: string,
  radiusKm: number
): Candidate | null {
  const confident = candidates.filter(
    (c) => c.distanceKm <= radiusKm && namesLikelyMatch(c.title, placeName)
  );
  return confident.length === 1 ? confident[0] : null;
}

async function matchPlace(
  place: PipelinePlace
): Promise<{ contentId: string } | { review: Candidate[] } | null> {
  const origin = { latitude: place.latitude, longitude: place.longitude };

  const keywordItems = await fetchSearchKeyword({ keyword: place.place_name_ko });
  const keywordCandidates = toCandidates(keywordItems, origin);
  const keywordMatch = pickConfidentMatch(
    keywordCandidates,
    place.place_name_ko,
    KEYWORD_MATCH_RADIUS_KM
  );
  if (keywordMatch) return { contentId: keywordMatch.contentid };

  const nearbyItems = await fetchLocationBasedList({
    mapX: place.longitude,
    mapY: place.latitude,
    radius: NEARBY_SEARCH_RADIUS_M,
  });
  const nearbyCandidates = toCandidates(nearbyItems, origin);
  const nearbyMatch = pickConfidentMatch(
    nearbyCandidates,
    place.place_name_ko,
    NEARBY_SEARCH_RADIUS_M / 1000
  );
  if (nearbyMatch) return { contentId: nearbyMatch.contentid };

  const allCandidates = [...keywordCandidates, ...nearbyCandidates];
  if (allCandidates.length === 0) return null; // Priority 5: KTO에 없음, 그대로 둠
  return { review: allCandidates }; // Priority 4: 애매함, 리뷰큐로
}

async function main() {
  const placesPath = join(sourceDir, "places.json");
  const places = readJson<PipelinePlace[]>(placesPath);

  writeFileSync(`${placesPath}.bak`, JSON.stringify(places, null, 2));

  const reviewQueue: { place_id: string; place_name_ko: string; candidates: Candidate[] }[] = [];
  let matched = 0;
  let skipped = 0;
  let noMatch = 0;

  for (const place of places) {
    if (place.city_id !== CITY_ID) continue;
    if (place.tour_api_content_id) {
      skipped++;
      continue;
    }

    const result = await matchPlace(place);
    if (result && "contentId" in result) {
      place.tour_api_content_id = result.contentId;
      matched++;
    } else if (result && "review" in result) {
      reviewQueue.push({
        place_id: place.place_id,
        place_name_ko: place.place_name_ko,
        candidates: result.review,
      });
    } else {
      noMatch++;
    }
  }

  writeFileSync(placesPath, JSON.stringify(places, null, 2));
  writeFileSync(
    join(sourceDir, "kto-review-queue.json"),
    JSON.stringify(reviewQueue, null, 2)
  );

  console.log(
    `KTO matching done — matched: ${matched}, already-had-contentId: ${skipped}, no-candidate: ${noMatch}, needs-review: ${reviewQueue.length}`
  );
}

// vitest가 이 파일을 import할 때 실제 API 호출/파일쓰기가 실행되지 않도록 CLI 직접 실행일 때만 돈다.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
