// data-pipeline 산출물(JSON) → 웹 SEOUL_ARTISTS/SEOUL_PLACES 정적 TS 산출물 생성.
// 실행: npx tsx scripts/export-seoul-dataset.ts [sourceDir]
//   sourceDir 기본값 previewdata/ — 파이프라인이 preprocessed/final/로 옮기면 인자로 넘기면 됨.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mapPipelineCategory } from "../src/lib/categoryAdapter";
import { loadReviewDecisions } from "../src/lib/review/reviewStore";

const sourceDir = process.argv[2] ?? "previewdata";

// O-1: 전량 draft이므로 status 필터 없음(Demo Mode). 소스에 있는 city_id는 전부 내보낸다 —
// 특정 도시만 골라 넣던 하드코딩(과거 CITY_ID="seoul")을 없애서, 파이프라인이 새 지역을
// 수집해 places.json에 추가하기만 하면 이 스크립트를 다시 안 고쳐도 자동으로 반영된다.
// 각 장소엔 city_id를 그대로 Place.regionId로 채워서, 루트 생성 로직(useRouteOptions.ts)이
// 선택된 지역과 다른 지역의 장소가 섞여 들어가지 않게 걸러낼 수 있게 한다.

// previewdata/places.json의 status는 파이프라인이 항상 "draft"로만 쓴다(재실행하면 원상복구됨).
// verified/published는 오직 review-decisions.json(사람이 리뷰 UI로 명시적으로 쓴 파일)에서만
// 온다 — 이 export 스크립트가 그 둘을 합쳐 최종 status를 만든다. review-decisions.json에 없는
// place는 파이프라인 기본값(draft) 그대로 유지된다. 이 과정에서 자동 승격은 절대 없다.
const reviewDecisions = loadReviewDecisions(join(sourceDir, "review-decisions.json"));

// O-2 관련: culture/activity/kpop만 파이프라인에 dwell_minutes 평균값이 없음(실측 확인됨).
// 나머지 카테고리는 파이프라인이 항상 채워주므로 폴백 대상이 아님.
const DWELL_FALLBACK_BY_PIPELINE_CATEGORY: Record<string, number> = {
  culture: 30,
  activity: 40,
  kpop: 15,
};

interface PipelineArtist {
  artist_id: string;
  artist_name_ko: string;
  artist_name_en: string;
  image_url?: string | null;
}

interface PipelinePlace {
  place_id: string;
  city_id: string;
  artist_ids: string[];
  place_name_ko: string;
  place_name_en: string;
  place_category: string;
  latitude: number;
  longitude: number;
  relation_text_ko: string;
  relation_text_en: string;
  source_url: string | null;
  open_time: string | null;
  close_time: string | null;
  dwell_minutes: number | null;
  quest_type: string | null;
  quest_text_ko: string | null;
  quest_text_en: string | null;
  image_url: string | null;
  tour_api_content_id: string | null;
  is_local_spot: boolean;
  status: string;
}

// content 검증 메타데이터 — Place에는 넣지 않는다(스키마 변경 금지, CLAUDE.md 참고).
// draft/verified/published 상태와 근거 링크는 앱이 아니라 검수자를 위한 정보.
interface SeoulPlaceMetadata {
  id: string;
  status: string;
  sourceUrl: string | null;
  rawCategory: string;
  tourApiMatchStatus: "matched" | "unmatched";
}

function toMetadataTs(p: PipelinePlace): string {
  const decision = reviewDecisions[p.place_id];
  const meta: SeoulPlaceMetadata = {
    id: p.place_id,
    status: decision?.status ?? p.status,
    sourceUrl: p.source_url,
    rawCategory: p.place_category,
    tourApiMatchStatus: p.tour_api_content_id ? "matched" : "unmatched",
  };
  return `  ${JSON.stringify(meta)}`;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

const artists = readJson<PipelineArtist[]>(join(sourceDir, "artists.json"));
const places = readJson<PipelinePlace[]>(join(sourceDir, "places.json"));

const seoulPlaces = places; // 이름은 유지하되(아래 seoulPlaces.ts 등 산출물 파일명과 맞춤) 전체 도시를 담는다.
const seoulArtistIds = new Set(seoulPlaces.flatMap((p) => p.artist_ids));
const seoulArtists = artists.filter((a) => seoulArtistIds.has(a.artist_id));

function toArtistTs(a: PipelineArtist): string {
  const fields: string[] = [
    `id: ${JSON.stringify(a.artist_id)}`,
    `name: ${JSON.stringify(a.artist_name_ko)}`,
    `nameEn: ${JSON.stringify(a.artist_name_en)}`,
  ];
  if (a.image_url) fields.push(`imageUrl: ${JSON.stringify(a.image_url)}`);
  return `  {\n    ${fields.join(",\n    ")},\n  }`;
}

function toPlaceTs(p: PipelinePlace): string {
  const category = mapPipelineCategory(p.place_category);
  const dwellMinutes =
    p.dwell_minutes ?? DWELL_FALLBACK_BY_PIPELINE_CATEGORY[p.place_category] ?? 30;

  const fields: string[] = [
    `id: ${JSON.stringify(p.place_id)}`,
    `nameKo: ${JSON.stringify(p.place_name_ko)}`,
    `nameEn: ${JSON.stringify(p.place_name_en)}`,
    `latitude: ${p.latitude}`,
    `longitude: ${p.longitude}`,
    `category: ${JSON.stringify(category)}`,
    `artistIds: ${JSON.stringify(p.artist_ids)}`,
    `regionId: ${JSON.stringify(p.city_id)}`,
    `relationTextKo: ${JSON.stringify(p.relation_text_ko)}`,
    `relationTextEn: ${JSON.stringify(p.relation_text_en)}`,
  ];
  if (p.open_time) fields.push(`openTime: ${JSON.stringify(p.open_time)}`);
  if (p.close_time) fields.push(`closeTime: ${JSON.stringify(p.close_time)}`);
  fields.push(`dwellMinutes: ${dwellMinutes}`);
  if (p.image_url) fields.push(`imageUrl: ${JSON.stringify(p.image_url)}`);
  fields.push(`isFood: ${category === "food"}`);
  // 파이프라인이 직접 수집한 성지는 전부 false(local_tourism/restaurant 자동보완 풀과 무관, E절 참고)
  fields.push(`isLocalSpot: false`);
  fields.push(`isMainRoute: false`);
  if (p.tour_api_content_id) {
    fields.push(`source: "kto"`);
    fields.push(`contentId: ${JSON.stringify(p.tour_api_content_id)}`);
  }

  return `  {\n    ${fields.join(",\n    ")},\n  }`;
}

const artistsTs = `// AUTO-GENERATED by scripts/export-seoul-dataset.ts — 직접 수정하지 마세요.
// 소스: ${sourceDir}/artists.json (places.json에 실제로 장소가 있는 아티스트만, 도시 무관)
import type { Artist } from "@/types";

export const SEOUL_ARTISTS: Artist[] = [
${seoulArtists.map(toArtistTs).join(",\n")}
];
`;

const placesTs = `// AUTO-GENERATED by scripts/export-seoul-dataset.ts — 직접 수정하지 마세요.
// 소스: ${sourceDir}/places.json (모든 city_id, status 필터 없음 — Demo Mode).
// city_id는 그대로 regionId로 들어간다 — 지역별로 걸러 쓰려면 그 필드를 보면 된다.
import type { Place } from "@/types";

type SeoulPlaceDraft = Omit<Place, "questIds">;

export const SEOUL_PLACES: SeoulPlaceDraft[] = [
${seoulPlaces.map(toPlaceTs).join(",\n")}
];
`;

const metadataTs = `// AUTO-GENERATED by scripts/export-seoul-dataset.ts — 직접 수정하지 마세요.
// 소스: ${sourceDir}/places.json + ${sourceDir}/review-decisions.json — 콘텐츠 검수용 sidecar.
// Place id로 join해서 쓴다. status는 리뷰 결정(review-decisions.json)이 있으면 그 값, 없으면
// 파이프라인 기본값(draft)이다 — 이 export 과정에서 자동 승격은 절대 일어나지 않는다.
// Place 스키마에는 넣지 않는 필드(status/sourceUrl/rawCategory/tourApiMatchStatus)만 여기 둔다.
export interface SeoulPlaceMetadata {
  id: string;
  status: string;
  sourceUrl: string | null;
  rawCategory: string;
  tourApiMatchStatus: "matched" | "unmatched";
}

export const SEOUL_PLACE_METADATA: SeoulPlaceMetadata[] = [
${seoulPlaces.map(toMetadataTs).join(",\n")}
];
`;

writeFileSync(join("src/data/generated/seoulArtists.ts"), artistsTs);
writeFileSync(join("src/data/generated/seoulPlaces.ts"), placesTs);
writeFileSync(join("src/data/generated/seoulPlaceMetadata.ts"), metadataTs);

console.log(
  `Exported ${seoulArtists.length} artists, ${seoulPlaces.length} places, ${seoulPlaces.length} metadata rows (source: ${sourceDir})`
);
