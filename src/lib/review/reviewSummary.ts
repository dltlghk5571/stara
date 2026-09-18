// 대시보드 요약 카운트 — 순수 함수. "KTO 미매칭"은 경고일 뿐 발행 차단 사유가 아님을
// 명시적으로 별도 카운트로만 둔다(11절).
import type { ReviewRecord, ReviewStatus } from "./reviewData";
import type { CitationStatus } from "./citationStore";
import type { VerificationBasis } from "./reviewStore";
import { needsTargetedReview, getTargetedReviewReasons, getFactualBlockers } from "./targetedReview";

export type ProvenanceBucket = "current_evidence_supported" | "provenance_missing" | "partial" | "weak" | "broken";

function provenanceBucket(reasons: ReturnType<typeof getTargetedReviewReasons>): ProvenanceBucket {
  if (reasons.includes("citation_partial")) return "partial";
  if (reasons.includes("citation_weak")) return "weak";
  if (reasons.includes("citation_broken")) return "broken";
  if (reasons.includes("provenance_missing")) return "provenance_missing";
  return "current_evidence_supported";
}

export interface ReviewSummary {
  total: number;
  byStatus: Record<ReviewStatus, number>;
  byCategory: Record<string, number>;
  byArtist: Record<string, number>;
  byCitationStatus: Record<CitationStatus, number>;
  relationOverclaimCount: number;
  koEnMismatchCount: number;
  /** verified/published 레코드가 어디서 왔는지(이관 vs 수동 검증) — 키 없는 basis는 0으로 취급. */
  byVerificationBasis: Partial<Record<VerificationBasis, number>>;
  needsTargetedReviewCount: number;
  /** verified+published 레코드만의 provenance 상태(정책 수정) — factual verified와 독립된 축. */
  provenanceAmongVerified: Record<ProvenanceBucket, number>;
  /** draft로 남은 이유 — 실제 모순/미해결 vs 구조·ko-en 사실 결함(정책 수정, 11/13절). 한 레코드가 둘 다 걸릴 수 있다. */
  draftReasons: { contradiction: number; structural: number };
  warnings: {
    missingSource: number;
    missingHours: number;
    missingImage: number;
    missingEnglishRelation: number;
    ktoManualReview: number;
    ktoAmbiguous: number;
    noKtoMatch: number;
  };
}

export function summarizeReviewRecords(records: ReviewRecord[]): ReviewSummary {
  const byStatus: Record<ReviewStatus, number> = { draft: 0, verified: 0, published: 0 };
  const byCategory: Record<string, number> = {};
  const byArtist: Record<string, number> = {};
  const byCitationStatus: Record<CitationStatus, number> = {
    unreviewed: 0,
    direct: 0,
    partial: 0,
    weak: 0,
    broken: 0,
    wrong: 0,
  };
  let relationOverclaimCount = 0;
  let koEnMismatchCount = 0;
  const byVerificationBasis: Partial<Record<VerificationBasis, number>> = {};
  let needsTargetedReviewCount = 0;
  const provenanceAmongVerified: Record<ProvenanceBucket, number> = {
    current_evidence_supported: 0,
    provenance_missing: 0,
    partial: 0,
    weak: 0,
    broken: 0,
  };
  const draftReasons = { contradiction: 0, structural: 0 };
  const warnings = {
    missingSource: 0,
    missingHours: 0,
    missingImage: 0,
    missingEnglishRelation: 0,
    ktoManualReview: 0,
    ktoAmbiguous: 0,
    noKtoMatch: 0,
  };

  for (const r of records) {
    byStatus[r.status]++;
    byCategory[r.place.category] = (byCategory[r.place.category] ?? 0) + 1;
    for (const artistId of r.place.artistIds) {
      byArtist[artistId] = (byArtist[artistId] ?? 0) + 1;
    }
    byCitationStatus[r.citation?.citationStatus ?? "unreviewed"]++;
    if (r.citation?.relationOverclaim) relationOverclaimCount++;
    if (r.citation?.koEnMismatch) koEnMismatchCount++;
    if (r.decision?.verificationBasis) {
      byVerificationBasis[r.decision.verificationBasis] = (byVerificationBasis[r.decision.verificationBasis] ?? 0) + 1;
    }
    const reasons = getTargetedReviewReasons(r);
    if (needsTargetedReview(r)) needsTargetedReviewCount++;
    if (r.status === "verified" || r.status === "published") {
      provenanceAmongVerified[provenanceBucket(reasons)]++;
    }
    if (r.status === "draft") {
      const blockers = getFactualBlockers(r);
      if (blockers.some((b) => b === "wrong_attribution" || b === "contradiction" || b === "unresolved")) {
        draftReasons.contradiction++;
      }
      if (blockers.some((b) => b === "structural_error" || b === "ko_en_mismatch")) {
        draftReasons.structural++;
      }
    }
    if (!r.metadata.sourceUrl) warnings.missingSource++;
    if (!r.place.openTime || !r.place.closeTime) warnings.missingHours++;
    if (!r.place.imageUrl && !(r.enrichment?.images?.length)) warnings.missingImage++;
    if (!r.place.relationTextEn.trim()) warnings.missingEnglishRelation++;
    if (r.enrichment?.status === "manual_review") warnings.ktoManualReview++;
    if (r.enrichment?.status === "ambiguous") warnings.ktoAmbiguous++;
    if (!r.enrichment || r.enrichment.status === "unmatched") warnings.noKtoMatch++;
  }

  return {
    total: records.length,
    byStatus,
    byCategory,
    byArtist,
    byCitationStatus,
    relationOverclaimCount,
    koEnMismatchCount,
    byVerificationBasis,
    needsTargetedReviewCount,
    provenanceAmongVerified,
    draftReasons,
    warnings,
  };
}
