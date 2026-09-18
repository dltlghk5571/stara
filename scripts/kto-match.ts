// STARA 실장소(previewdata/places.json) ↔ KTO(TourAPI) 매칭 + 영문 관광정보 보강.
// 실행: npm run data:kto-match [-- --force] [sourceDir]
//   --force: 이미 처리된 장소도 다시 매칭한다(기본은 건너뜀 — API 쿼터 절약, 재실행 가능하게).
//
// 국문(KorService2)과 영문(EngService2)은 완전히 별개의 contentId 공간을 쓴다(실측 확인 —
// 예: 리움미술관 KorService2=130525, EngService2=268217). 그래서 이 둘은 독립된 매칭 과정이고,
// sidecar도 koContentId/enContentId를 분리해서 갖는다. 국문 매칭이 "KTO 장소 정체성"이고,
// 영문 매칭은 그 정체성과 무관하게 "영문 관광정보가 있는가"라는 별개의 질문이다 — 영문이
// 없다고 국문 매칭을 무효화하지 않는다.
//
// 국문 5-priority 체인(결정적 점수 기반, src/lib/tour-api/ktoMatch.ts — LLM 미사용):
//   1) tour_api_content_id(파이프라인) 또는 이전 실행의 koContentId가 있으면 detailCommon으로
//      지리적 타당성만 검증(재검색 안 함)
//   2) place_name_ko로 KorService2 searchKeyword2 → 점수화(이름+거리+주소) → AUTO_MATCH면 확정
//   3) 약하면 좌표 주변 KorService2 locationBasedList2로 재검색 → 점수화, 더 나은 쪽 채택
//   4) 그래도 애매(1·2등 동률급)면 ambiguous, 임계 사이면 manual_review
//   5) 후보가 없으면 unmatched — STARA 장소 자체는 그대로 유지한다(삭제 안 함)
//
// 영문 매칭(국문이 matched인 곳만 시도 — 아니면 enStatus="unavailable"):
//   1) place_name_en이 있으면 그 이름으로 EngService2 searchKeyword2 → 영문 제목끼리 점수화
//      (국문 이름을 영문 후보 제목과 비교하지 않는다 — 3절)
//   2) nameEn이 없거나 키워드 검색이 약하면 좌표 주변 EngService2 locationBasedList2로 폴백.
//      이때는 이름 비교 없이 거리만으로 판단하는데, titleScore=0으로 스코어 공식 자체가
//      AUTO_MATCH 문턱을 절대 못 넘게 막는다 — "지리적으로만 확신"하는 영문 매칭은 자동
//      확정되지 않는다(정밀도 우선, 4절). 그래도 확신이 안 서면 정직하게 unavailable/unmatched로
//      남긴다 — 없는 영문 정보를 지어내지 않는다.
//
// STARA의 artistIds/relationTextKo/relationTextEn/questIds/sourceUrl/nameKo/nameEn/openTime/
// closeTime은 여기서 절대 건드리지 않는다 — 매칭·보강 결과는 seoulTourismEnrichment.ts
// sidecar에만 쓴다. status=draft인 STARA 장소 상태도 이 단계에서 바꾸지 않는다.
// previewdata/places.json도 건드리지 않는다 — 재실행 시 재사용은 sidecar 자체(이전 결과)로 한다.
//
// 필요 환경변수: TOUR_API_KEY(.env.local) — 없으면 client.ts가 빈 배열을 돌려주므로
// 전부 unmatched로 끝난다(에러 아님, 재실행 가능).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  fetchSearchKeyword,
  fetchLocationBasedList,
  fetchDetailCommon,
  fetchDetailIntro,
  fetchDetailImages,
} from "../src/lib/tour-api/client";
import { TOUR_API_EN_BASE_URL } from "../src/lib/tour-api/config";
import { haversineKm } from "../src/lib/distance";
import {
  scoreCandidate,
  classifyCandidates,
  dedupeMatchedContentIds,
  MAX_CANDIDATE_DISTANCE_METERS,
  type KtoCandidate,
  type ScoredCandidate,
  type MatchStatus,
  type MatchedBy,
  type EnMatchStatus,
  type EnMatchedBy,
} from "../src/lib/tour-api/ktoMatch";
import type { TourApiRawItem } from "../src/lib/tour-api/types";

const args = process.argv.slice(2);
const cliForce = args.includes("--force");
const sourceDir = args.find((a) => !a.startsWith("--")) ?? "previewdata";
const CITY_ID = "seoul";
const OUTPUT_PATH = join("src/data/generated/seoulTourismEnrichment.ts");

interface PipelinePlace {
  place_id: string;
  city_id: string;
  place_name_ko: string;
  place_name_en: string;
  latitude: number;
  longitude: number;
  tour_api_content_id: string | null;
}

export interface SeoulTourismEnrichment {
  placeId: string;
  // 국문(KorService2) 매칭 — "이 STARA 장소가 KTO의 어느 장소인가"라는 정체성 질문.
  status: MatchStatus;
  koContentId?: string;
  koContentTypeId?: string;
  matchScore?: number;
  matchedBy?: MatchedBy;
  distanceMeters?: number;
  candidateCount?: number;
  // 영문(EngService2) 매칭 — 국문 정체성과 별개로 "영문 관광정보가 있는가"라는 질문.
  // status가 matched가 아니면 아예 시도하지 않으므로 enStatus="unavailable".
  enStatus?: EnMatchStatus;
  enContentId?: string;
  enContentTypeId?: string;
  enMatchScore?: number;
  enMatchedBy?: EnMatchedBy;
  enCandidateCount?: number;
  enTitle?: string;
  enAddress?: string;
  enOverview?: string;
  images?: string[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function toCandidates(
  items: TourApiRawItem[],
  origin: { latitude: number; longitude: number }
): KtoCandidate[] {
  return items
    .filter((it) => it.contentid && it.title && it.mapx && it.mapy)
    .map((it) => ({
      contentId: it.contentid,
      contentTypeId: it.contenttypeid,
      title: it.title,
      distanceMeters:
        haversineKm(origin, { latitude: Number(it.mapy), longitude: Number(it.mapx) }) * 1000,
      address: [it.addr1, it.addr2].filter(Boolean).join(" ") || undefined,
    }));
}

export interface MatchDeps {
  searchKeyword: typeof fetchSearchKeyword;
  locationBasedList: typeof fetchLocationBasedList;
  detailCommon: typeof fetchDetailCommon;
  detailIntro: typeof fetchDetailIntro;
  detailImages: typeof fetchDetailImages;
}

export const liveDeps: MatchDeps = {
  searchKeyword: fetchSearchKeyword,
  locationBasedList: fetchLocationBasedList,
  detailCommon: fetchDetailCommon,
  detailIntro: fetchDetailIntro,
  detailImages: fetchDetailImages,
};

const STATUS_RANK: Record<MatchStatus, number> = {
  matched: 3,
  manual_review: 2,
  ambiguous: 1,
  unmatched: 0,
};

interface MatchOutcome {
  status: MatchStatus;
  best?: ScoredCandidate;
  candidateCount?: number;
  matchedBy?: MatchedBy;
}

/** 국문 Priority 2(키워드) → 약하면 Priority 3(좌표 주변). 둘 중 더 나은 쪽을 채택한다. */
async function matchKoreanByKeywordThenNearby(
  place: PipelinePlace,
  deps: MatchDeps
): Promise<MatchOutcome> {
  const origin = { latitude: place.latitude, longitude: place.longitude };

  const keywordItems = await deps.searchKeyword({ keyword: place.place_name_ko });
  const keywordScored = toCandidates(keywordItems, origin).map((c) =>
    scoreCandidate(place.place_name_ko, c)
  );
  const keywordResult = classifyCandidates(keywordScored);
  if (keywordResult.status === "matched") {
    return { ...keywordResult, matchedBy: "keyword-coordinate" };
  }

  const nearbyItems = await deps.locationBasedList({
    mapX: place.longitude,
    mapY: place.latitude,
    radius: MAX_CANDIDATE_DISTANCE_METERS,
  });
  const nearbyScored = toCandidates(nearbyItems, origin).map((c) =>
    scoreCandidate(place.place_name_ko, c)
  );
  const nearbyResult = classifyCandidates(nearbyScored);

  const candidateCount = keywordResult.candidateCount + nearbyResult.candidateCount;
  if (STATUS_RANK[nearbyResult.status] > STATUS_RANK[keywordResult.status]) {
    return { ...nearbyResult, candidateCount, matchedBy: "nearby-coordinate" };
  }
  return {
    ...keywordResult,
    candidateCount,
    matchedBy: keywordResult.status === "unmatched" ? undefined : "keyword-coordinate",
  };
}

/** 국문 Priority 1: 이미 알고 있는 contentId(파이프라인 또는 이전 실행 sidecar)는 재검색하지 않고 지리적 타당성만 검증한다. */
async function verifyExistingKoreanContentId(
  place: PipelinePlace,
  contentId: string,
  deps: MatchDeps
): Promise<MatchOutcome | null> {
  const detail = await deps.detailCommon(contentId);
  const item = detail[0];
  if (!item || !item.mapx || !item.mapy) return null;

  const distanceMeters =
    haversineKm(
      { latitude: place.latitude, longitude: place.longitude },
      { latitude: Number(item.mapy), longitude: Number(item.mapx) }
    ) * 1000;

  if (distanceMeters >= MAX_CANDIDATE_DISTANCE_METERS) return null; // 지리적으로 말이 안 됨 → Priority 2로 폴백

  return {
    status: "matched",
    matchedBy: "existing-content-id",
    best: {
      contentId,
      contentTypeId: item.contenttypeid,
      title: item.title,
      distanceMeters,
      matchScore: 1,
    },
  };
}

interface EnMatchOutcome {
  status: EnMatchStatus;
  best?: ScoredCandidate;
  candidateCount?: number;
  matchedBy?: EnMatchedBy;
}

/**
 * 영문(EngService2) 매칭 — 국문 매칭과 완전히 독립된 과정. STARA의 curated nameEn을 1순위
 * 검색어로 쓴다(국문 이름을 영문 후보와 비교하지 않는다 — 3절). nameEn이 없거나 키워드
 * 검색이 약하면 좌표 주변 검색으로 폴백하되, 이름 비교 없이 거리만으로는 scoreCandidate의
 * titleScore가 0으로 고정돼 AUTO_MATCH 문턱을 절대 넘지 못한다 — "지리적으로만 확신"하는
 * 영문 매칭이 자동 확정되는 일을 스코어 공식 자체가 막는다(4절, 정밀도 우선).
 */
async function matchEnglish(place: PipelinePlace, deps: MatchDeps): Promise<EnMatchOutcome> {
  const origin = { latitude: place.latitude, longitude: place.longitude };
  const nameEn = place.place_name_en?.trim();

  let keywordResult: { status: MatchStatus; candidateCount: number; best?: ScoredCandidate } = {
    status: "unmatched",
    candidateCount: 0,
  };
  if (nameEn) {
    const items = await deps.searchKeyword({ keyword: nameEn }, TOUR_API_EN_BASE_URL);
    const scored = toCandidates(items, origin).map((c) => scoreCandidate(nameEn, c));
    keywordResult = classifyCandidates(scored);
    if (keywordResult.status === "matched") {
      return { ...keywordResult, matchedBy: "nameEn-keyword" };
    }
  }

  const nearbyItems = await deps.locationBasedList(
    { mapX: place.longitude, mapY: place.latitude, radius: MAX_CANDIDATE_DISTANCE_METERS },
    TOUR_API_EN_BASE_URL
  );
  // nameEn이 없으면 빈 문자열로 스코어링 → titleSimilarity가 항상 0(정직한 "이름 근거 없음").
  const nearbyScored = toCandidates(nearbyItems, origin).map((c) => scoreCandidate(nameEn ?? "", c));
  const nearbyResult = classifyCandidates(nearbyScored);

  const candidateCount = keywordResult.candidateCount + nearbyResult.candidateCount;
  if (STATUS_RANK[nearbyResult.status] > STATUS_RANK[keywordResult.status]) {
    return { ...nearbyResult, candidateCount, matchedBy: "nearby-coordinate" };
  }
  return {
    ...keywordResult,
    candidateCount,
    matchedBy: keywordResult.status === "unmatched" ? undefined : "nameEn-keyword",
  };
}

/** 확정된 enContentId의 상세/이미지를 가져온다(검색은 matchEnglish에서 이미 끝남). */
async function fetchEnglishDetail(
  enContentId: string,
  enContentTypeId: string,
  deps: MatchDeps
): Promise<Pick<SeoulTourismEnrichment, "enTitle" | "enAddress" | "enOverview" | "images">> {
  const [common, , images] = await Promise.all([
    deps.detailCommon(enContentId, TOUR_API_EN_BASE_URL),
    deps.detailIntro(enContentId, enContentTypeId, TOUR_API_EN_BASE_URL),
    deps.detailImages(enContentId, TOUR_API_EN_BASE_URL),
  ]);
  // 요청한 contentId와 응답의 contentid가 다르면(실측으로 관찰된 API 이상 응답) 무조건 버린다.
  const item = common.find((c) => c.contentid === enContentId);
  return {
    enTitle: item?.title || undefined,
    enAddress: [item?.addr1, item?.addr2].filter(Boolean).join(" ") || undefined,
    enOverview: item?.overview?.trim() || undefined,
    images: images.map((i) => i.originimgurl).filter(Boolean),
  };
}

/** 한 장소를 매칭+보강한다. force가 아니고 이전 결과가 있으면 네트워크 호출 없이 그대로 재사용한다. */
export async function matchAndEnrichPlace(
  place: PipelinePlace,
  deps: MatchDeps,
  previous?: SeoulTourismEnrichment,
  force = false
): Promise<SeoulTourismEnrichment> {
  if (!force && previous) return previous;

  // 파이프라인 필드 또는 "이전 실행에서 이미 확정한 koContentId"를 재사용한다 — --force로
  // 다시 돌 때도 국문 쪽은 재검색 없이 한 번의 검증 호출로 끝나 쿼터를 아낀다(8절).
  const knownKoreanContentId =
    place.tour_api_content_id ?? (previous?.status === "matched" ? previous.koContentId : undefined);

  let result: MatchOutcome | null = null;
  if (knownKoreanContentId) {
    result = await verifyExistingKoreanContentId(place, knownKoreanContentId, deps);
  }
  if (!result) {
    result = await matchKoreanByKeywordThenNearby(place, deps);
  }

  const base: SeoulTourismEnrichment = {
    placeId: place.place_id,
    status: result.status,
    koContentId: result.best?.contentId,
    koContentTypeId: result.best?.contentTypeId,
    matchScore: result.best?.matchScore,
    matchedBy: result.status === "unmatched" ? undefined : result.matchedBy,
    distanceMeters: result.best?.distanceMeters,
    candidateCount: result.candidateCount,
  };

  // 국문이 matched가 아니면 영문 매칭 자체를 시도하지 않는다 — "정체성이 불확실한데 영문만
  // 확신한다"는 모순을 피한다. 영문이 없다고 국문 매칭을 무효화하지도 않는다(2절).
  if (base.status !== "matched" || !base.koContentId || !base.koContentTypeId) {
    return { ...base, enStatus: "unavailable" };
  }

  const enResult = await matchEnglish(place, deps);
  const enBase: Pick<
    SeoulTourismEnrichment,
    "enStatus" | "enContentId" | "enContentTypeId" | "enMatchScore" | "enMatchedBy" | "enCandidateCount"
  > = {
    enStatus: enResult.status,
    enContentId: enResult.best?.contentId,
    enContentTypeId: enResult.best?.contentTypeId,
    enMatchScore: enResult.best?.matchScore,
    enMatchedBy: enResult.status === "unmatched" ? undefined : enResult.matchedBy,
    enCandidateCount: enResult.candidateCount,
  };

  if (enResult.status !== "matched" || !enBase.enContentId || !enBase.enContentTypeId) {
    return { ...base, ...enBase }; // 영문 콘텐츠 없음 — 날조하지 않고 비워둔다(4/7절).
  }

  const detail = await fetchEnglishDetail(enBase.enContentId, enBase.enContentTypeId, deps);
  return { ...base, ...enBase, ...detail };
}

/** 동시 실행 개수를 제한한다 — 164곳을 전부 한 번에 쏘지 않기 위한 최소한의 동시성 제어. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function loadPrevious(): Promise<Map<string, SeoulTourismEnrichment>> {
  try {
    // 템플릿 리터럴 경로 — 파일이 없을 수도 있는 첫 실행을 tsc가 정적 모듈로 강제 확인하지
    // 않도록 일부러 리터럴이 아닌 형태로 둔다(런타임에만 존재 여부가 결정됨).
    const path = `../${OUTPUT_PATH}`;
    const mod = (await import(path)) as {
      SEOUL_TOURISM_ENRICHMENT: SeoulTourismEnrichment[];
    };
    return new Map(mod.SEOUL_TOURISM_ENRICHMENT.map((e) => [e.placeId, e]));
  } catch {
    return new Map(); // 첫 실행 — 아직 생성된 sidecar가 없다.
  }
}

function toRecordTs(e: SeoulTourismEnrichment): string {
  return `  ${JSON.stringify(e)}`;
}

function printReport(results: SeoulTourismEnrichment[]): void {
  const koCount = (status: MatchStatus) => results.filter((r) => r.status === status).length;
  const matched = results.filter((r) => r.status === "matched");
  const enCount = (status: EnMatchStatus) => matched.filter((r) => r.enStatus === status).length;

  // "몇 곳이 최종 matched인가"와 "그 방법을 거친 후보가 몇 건 평가됐는가"는 다른 질문이다 —
  // 이전 리포트는 후자를 "MATCH SOURCE"라는 이름으로 내보내 최종 matched처럼 오독됐다.
  // matchedBy는 matched/ambiguous/manual_review 전부에 붙으므로 둘을 분리해서 낸다.
  const finalMatchedBy = (by: MatchedBy) => matched.filter((r) => r.matchedBy === by).length;
  const candidatesEvaluatedBy = (by: MatchedBy) =>
    results.filter((r) => r.matchedBy === by && r.status !== "unmatched").length;

  const withEnTitle = matched.filter((r) => r.enTitle).length;
  const withEnOverview = matched.filter((r) => r.enOverview).length;
  const withEnAddress = matched.filter((r) => r.enAddress).length;
  const withKtoImage = matched.filter((r) => r.images && r.images.length > 0).length;

  console.log("\n=== KTO matching audit ===");
  console.log(`TOTAL STARA PLACES: ${results.length}`);
  console.log("\nKOREAN (KTO place identity):");
  console.log(`  matched: ${koCount("matched")}`);
  console.log(`  unmatched: ${koCount("unmatched")}`);
  console.log(`  ambiguous: ${koCount("ambiguous")}`);
  console.log(`  manual_review: ${koCount("manual_review")}`);
  console.log(`\nENGLISH among Korean-matched places (${matched.length}):`);
  console.log(`  matched: ${enCount("matched")}`);
  console.log(`  unmatched: ${enCount("unmatched")}`);
  console.log(`  ambiguous: ${enCount("ambiguous")}`);
  console.log(`  manual_review: ${enCount("manual_review")}`);

  console.log("\nFINAL MATCHED BY METHOD (Korean, status=matched only):");
  console.log(`  existing contentId: ${finalMatchedBy("existing-content-id")}`);
  console.log(`  keyword-coordinate: ${finalMatchedBy("keyword-coordinate")}`);
  console.log(`  nearby-coordinate: ${finalMatchedBy("nearby-coordinate")}`);
  console.log("\nCANDIDATES EVALUATED BY METHOD (Korean, matched+ambiguous+manual_review):");
  console.log(`  existing contentId: ${candidatesEvaluatedBy("existing-content-id")}`);
  console.log(`  keyword-coordinate: ${candidatesEvaluatedBy("keyword-coordinate")}`);
  console.log(`  nearby-coordinate: ${candidatesEvaluatedBy("nearby-coordinate")}`);

  console.log(`\nENGLISH TITLE COVERAGE (of Korean-matched): ${withEnTitle}/${matched.length}`);
  console.log(`ENGLISH OVERVIEW COVERAGE (of Korean-matched): ${withEnOverview}/${matched.length}`);
  console.log(`ENGLISH ADDRESS COVERAGE (of Korean-matched): ${withEnAddress}/${matched.length}`);
  console.log(`ENGLISH IMAGE COVERAGE (of Korean-matched): ${withKtoImage}/${matched.length}`);

  const needsReview = results.filter(
    (r) => r.status === "ambiguous" || r.status === "manual_review"
  );
  const unmatchedIds = results.filter((r) => r.status === "unmatched").map((r) => r.placeId);
  if (needsReview.length > 0) {
    console.log(`\nAMBIGUOUS / MANUAL REVIEW (${needsReview.length}):`);
    for (const r of needsReview) console.log(`  - ${r.placeId} (${r.status}, score=${r.matchScore?.toFixed(2)})`);
  }
  if (unmatchedIds.length > 0) {
    console.log(`\nUNMATCHED (${unmatchedIds.length}): ${unmatchedIds.join(", ")}`);
  }
}

async function main() {
  const places = readJson<PipelinePlace[]>(join(sourceDir, "places.json")).filter(
    (p) => p.city_id === CITY_ID
  );
  const previous = await loadPrevious();

  const results = await mapWithConcurrency(places, 5, (place) =>
    matchAndEnrichPlace(place, liveDeps, previous.get(place.place_id), cliForce)
  );

  // 국문/영문 contentId 중복은 서로 다른 필드라 독립적으로 각각 잡는다.
  let deduped = dedupeMatchedContentIds(
    results,
    (r) => r.status,
    (r) => r.koContentId,
    (r) => ({ ...r, status: "manual_review" as MatchStatus })
  );
  deduped = dedupeMatchedContentIds(
    deduped,
    (r) => r.enStatus,
    (r) => r.enContentId,
    (r) => ({ ...r, enStatus: "manual_review" as EnMatchStatus })
  );

  const ts = `// AUTO-GENERATED by scripts/kto-match.ts — 직접 수정하지 마세요.
// 소스: ${sourceDir}/places.json + TourAPI(KorService2/EngService2). placeId로 join해서 쓴다.
// STARA의 artistIds/relationText/quest/sourceUrl은 여기서 절대 덮어쓰지 않는다 — KTO는 보강 정보일 뿐.
// koContentId(KorService2)와 enContentId(EngService2)는 서로 다른 ID 공간이다 — 절대 섞어 쓰지 말 것.
export interface SeoulTourismEnrichment {
  placeId: string;
  status: "matched" | "unmatched" | "ambiguous" | "manual_review";
  koContentId?: string;
  koContentTypeId?: string;
  matchScore?: number;
  matchedBy?: "existing-content-id" | "keyword-coordinate" | "nearby-coordinate" | "manual";
  distanceMeters?: number;
  candidateCount?: number;
  enStatus?: "matched" | "unmatched" | "ambiguous" | "manual_review" | "unavailable";
  enContentId?: string;
  enContentTypeId?: string;
  enMatchScore?: number;
  enMatchedBy?: "nameEn-keyword" | "nearby-coordinate" | "manual";
  enCandidateCount?: number;
  enTitle?: string;
  enAddress?: string;
  enOverview?: string;
  images?: string[];
}

export const SEOUL_TOURISM_ENRICHMENT: SeoulTourismEnrichment[] = [
${deduped.map(toRecordTs).join(",\n")}
];
`;
  writeFileSync(OUTPUT_PATH, ts);
  printReport(deduped);
}

// vitest가 이 파일을 import할 때 실제 API 호출/파일쓰기가 실행되지 않도록 CLI 직접 실행일 때만 돈다.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
