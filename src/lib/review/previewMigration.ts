// 일회성(재실행 가능/멱등) 이관: 기존 previewdata 휴먼 리뷰를 새 verified 상태 시스템으로
// 옮긴다. 이것은 "raw 레코드를 처음부터 알고리즘으로 검증"하는 게 아니다 — 164곳은 이미
// previewdata에 들어오기 전에 사람이 한 번 검토했다는 전제(사용자 확인)를 받아들이고,
// 그 위에 인용 감사(citation-research.json)가 "새로 발견한 예외"만 걸러내는 구조다.
//
// 정책 수정(2026-09-18): factual verified 자격은 FACTUAL_BLOCKING_REASONS(구조 오류,
// 실제 모순, 미해결, ko/en 사실 불일치)만 본다. provenance 전용 사유(현재 인용 부재/
// 부분/약함/깨짐, 현재 출처 대비 과잉주장)는 더 이상 이관을 막지 않는다 — previewdata
// 자체가 이미 human-reviewed baseline이므로, 현재 보존된 인용이 그 근거를 재구성 못
// 한다는 것만으로 "검증 안 됨"으로 되돌리지 않는다.
import type { ReviewRecord } from "./reviewData";
import { hasFactualBlocker } from "./targetedReview";
import { setReviewDecision, type ReviewDecision } from "./reviewStore";

export const MIGRATION_VERIFICATION_NOTE =
  "prior preview human review accepted; no factual blocker (contradiction/unresolved/structural error) found by subsequent audit — provenance gaps, if any, are tracked separately and do not affect this status";

/**
 * "이미 검토된 것으로 인정할 수 있는" 후보 = factual blocker(hasFactualBlocker)가 없고,
 * 아직 아무 리뷰 결정도 없는(!r.decision) 레코드. provenance 전용 사유(인용 부재/부분/
 * 약함/깨짐 등)는 후보에서 제외하지 않는다 — 별도 축이다. 이미 사람이 내린 결정(수동
 * 검증이든 이전 이관이든)은 절대 덮어쓰지 않는다 — 그래서 이 함수를 반복 실행해도
 * 멱등이다(이미 결정된 건 다시 후보에 안 잡힘).
 */
export function computeMigrationCandidates(records: ReviewRecord[]): ReviewRecord[] {
  return records.filter((r) => !hasFactualBlocker(r) && !r.decision);
}

export interface MigrationResult {
  migratedPlaceIds: string[];
}

/** review-decisions.json에 실제로 쓴다 — 오직 이 함수 호출로만 draft→verified 이관이 일어난다. */
export function migratePreviewReviewedRecords(records: ReviewRecord[], path?: string): MigrationResult {
  const candidates = computeMigrationCandidates(records);
  const reviewedAt = new Date().toISOString();
  for (const r of candidates) {
    const decision: ReviewDecision = {
      status: "verified",
      reviewedAt,
      verificationBasis: "preview-human-review-migration",
      verificationNote: MIGRATION_VERIFICATION_NOTE,
    };
    setReviewDecision(r.place.id, decision, path);
  }
  return { migratedPlaceIds: candidates.map((r) => r.place.id) };
}
