// 대시보드 필터링 — 순수 함수라 URL 파싱/렌더링과 분리해서 테스트할 수 있다.
import type { PlaceCategory } from "@/types";
import type { MatchStatus, EnMatchStatus } from "@/lib/tour-api/ktoMatch";
import type { ReviewRecord, ReviewStatus } from "./reviewData";
import type { CitationStatus } from "./citationStore";
import type { VerificationBasis } from "./reviewStore";
import { needsTargetedReview, getFactualBlockers, getProvenanceOnlyReasons } from "./targetedReview";

export interface ReviewFilters {
  status?: ReviewStatus;
  artist?: string;
  category?: PlaceCategory;
  missingSourceUrl?: boolean;
  missingEnglishRelation?: boolean;
  missingHours?: boolean;
  koStatus?: MatchStatus;
  enStatus?: EnMatchStatus;
  /** verified 승격을 막는 에러가 하나라도 있는 항목만. */
  needsAttention?: boolean;
  citationStatus?: CitationStatus;
  relationOverclaim?: boolean;
  koEnMismatch?: boolean;
  /** getTargetedReviewReasons가 하나라도 사유를 낸 레코드만(6절 "Needs targeted review" 필터). */
  needsTargetedReview?: boolean;
  verificationBasis?: VerificationBasis;
  /**
   * provenance 전용 사유(citation_partial/weak/broken/provenance_missing/relation_overclaim_current_source)가
   * 있는지 — factual verified 여부와는 독립인 축이다(정책 수정). true=있음, false=없음(현재 근거로 완전히 뒷받침됨).
   */
  hasProvenanceGap?: boolean;
  /** draft로 남은 이유를 좁힌다 — "contradiction"(실제 모순/미해결) vs "structural"(구조/ko-en 사실 결함). */
  draftReason?: "contradiction" | "structural";
}

export function filterReviewRecords(records: ReviewRecord[], filters: ReviewFilters): ReviewRecord[] {
  return records.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.artist && !r.place.artistIds.includes(filters.artist)) return false;
    if (filters.category && r.place.category !== filters.category) return false;
    if (filters.missingSourceUrl && r.metadata.sourceUrl) return false;
    if (filters.missingEnglishRelation && r.place.relationTextEn.trim()) return false;
    if (filters.missingHours && r.place.openTime && r.place.closeTime) return false;
    if (filters.koStatus && r.enrichment?.status !== filters.koStatus) return false;
    if (filters.enStatus && (r.enrichment?.enStatus ?? "unavailable") !== filters.enStatus) return false;
    if (filters.needsAttention && r.verify.errors.length === 0) return false;
    if (filters.citationStatus && (r.citation?.citationStatus ?? "unreviewed") !== filters.citationStatus) return false;
    if (filters.relationOverclaim && !r.citation?.relationOverclaim) return false;
    if (filters.koEnMismatch && !r.citation?.koEnMismatch) return false;
    if (filters.needsTargetedReview !== undefined && needsTargetedReview(r) !== filters.needsTargetedReview) return false;
    if (filters.verificationBasis && r.decision?.verificationBasis !== filters.verificationBasis) return false;
    if (filters.hasProvenanceGap !== undefined && (getProvenanceOnlyReasons(r).length > 0) !== filters.hasProvenanceGap) {
      return false;
    }
    if (filters.draftReason) {
      const blockers = getFactualBlockers(r);
      const isContradiction = blockers.some(
        (b) => b === "wrong_attribution" || b === "contradiction" || b === "unresolved"
      );
      const isStructural = blockers.some((b) => b === "structural_error" || b === "ko_en_mismatch");
      if (filters.draftReason === "contradiction" && !isContradiction) return false;
      if (filters.draftReason === "structural" && !isStructural) return false;
    }
    return true;
  });
}
