// 리뷰 페이지(서버 컴포넌트/액션)에서만 쓰는 데이터 조립 — fs를 읽으므로 서버 전용.
// SEOUL_PLACES/SEOUL_PLACE_METADATA는 마지막 export 시점 스냅샷이고, review-decisions.json은
// 리뷰어가 방금 누른 결정까지 항상 최신이다 — status는 review-decisions.json을 다시 한번
// 위에 덮어써서(export 스크립트와 동일한 규칙) 재export 전에도 화면이 정확하게 보이게 한다.
import { SEOUL_PLACES } from "@/data/generated/seoulPlaces";
import { SEOUL_PLACE_METADATA, type SeoulPlaceMetadata } from "@/data/generated/seoulPlaceMetadata";
import { SEOUL_TOURISM_ENRICHMENT, type SeoulTourismEnrichment } from "@/data/generated/seoulTourismEnrichment";
import { SEOUL_ARTISTS } from "@/data/generated/seoulArtists";
import type { Place } from "@/types";
import {
  checkVerifiable,
  checkPublishable,
  checkProvenance,
  type CheckResult,
  type ReviewablePlace,
} from "./reviewCriteria";
import { loadReviewDecisions, type ReviewDecision } from "./reviewStore";
import { loadCitationResearch, type CitationResearch } from "./citationStore";
import { loadArtistCorrections, type ArtistCorrection } from "./artistCorrectionStore";

export type ReviewStatus = "draft" | "verified" | "published";

/** SEOUL_PLACES는 questIds 없이 export된다(quests.ts가 place.id로 즉석 생성) — 있는 그대로 반영. */
export type ReviewPlace = Omit<Place, "questIds">;

export interface ReviewRecord {
  place: ReviewPlace;
  metadata: SeoulPlaceMetadata;
  enrichment: SeoulTourismEnrichment | undefined;
  status: ReviewStatus;
  decision: ReviewDecision | undefined;
  /** 사실/구조적 유효성만(정책 수정) — sourceUrl은 여기 없다. verified 승격 게이트. */
  verify: CheckResult;
  /** sourceUrl 존재/형식(traceability 축) — verified를 막지 않는다. checkPublishable에서만 결합된다. */
  provenance: CheckResult;
  publish: CheckResult;
  /** 인용 리서치(citation-research.json) — 참고 정보일 뿐, status에는 전혀 영향을 주지 않는다. */
  citation: CitationResearch | undefined;
  /** 아티스트 관계 교정 제안(artist-corrections.json) — 제안일 뿐, artistIds/status에는 영향을 주지 않는다. */
  artistCorrections: ArtistCorrection[];
}

function toReviewStatus(s: string): ReviewStatus {
  return s === "verified" || s === "published" ? s : "draft";
}

function toReviewablePlace(place: ReviewPlace, metadata: SeoulPlaceMetadata | undefined): ReviewablePlace {
  return {
    id: place.id,
    nameKo: place.nameKo,
    nameEn: place.nameEn,
    latitude: place.latitude,
    longitude: place.longitude,
    category: place.category,
    artistIds: place.artistIds,
    relationTextKo: place.relationTextKo,
    relationTextEn: place.relationTextEn,
    sourceUrl: metadata?.sourceUrl ?? null,
    openTime: place.openTime ?? null,
    closeTime: place.closeTime ?? null,
    dwellMinutes: place.dwellMinutes,
  };
}

export function loadReviewRecords(): ReviewRecord[] {
  const metadataById = new Map(SEOUL_PLACE_METADATA.map((m) => [m.id, m]));
  const enrichmentById = new Map(SEOUL_TOURISM_ENRICHMENT.map((e) => [e.placeId, e]));
  const knownArtistIds = new Set(SEOUL_ARTISTS.map((a) => a.id));
  const decisions = loadReviewDecisions();
  const citations = loadCitationResearch();
  const artistCorrections = loadArtistCorrections();

  return SEOUL_PLACES.map((place) => {
    const metadata = metadataById.get(place.id);
    // 마지막 export 스냅샷 위에 방금 저장된 결정을 한 번 더 덮어써 항상 최신 status를 보여준다.
    const decision = decisions[place.id];
    const status = toReviewStatus(decision?.status ?? metadata?.status ?? "draft");
    const reviewable = toReviewablePlace(place, metadata);

    return {
      place,
      metadata: metadata ?? {
        id: place.id,
        status: "draft",
        sourceUrl: null,
        rawCategory: place.category,
        tourApiMatchStatus: "unmatched",
      },
      enrichment: enrichmentById.get(place.id),
      status,
      decision,
      verify: checkVerifiable(reviewable, knownArtistIds),
      provenance: checkProvenance(reviewable),
      publish: checkPublishable(reviewable, knownArtistIds, status),
      citation: citations[place.id],
      artistCorrections: artistCorrections[place.id] ?? [],
    };
  });
}

export function getReviewRecord(placeId: string): ReviewRecord | undefined {
  return loadReviewRecords().find((r) => r.place.id === placeId);
}
