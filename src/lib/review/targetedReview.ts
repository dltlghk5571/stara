// "이 레코드가 왜 아직 타겟 리뷰 큐에 있는가"를 매번 인용/검증 데이터에서 다시 계산한다 —
// 별도로 중복 저장하지 않는다(5절: "Do not store duplicated derived state if it can be
// recomputed reliably"). citationStatus나 verify 결과가 바뀌면 이 함수의 출력도 자동으로
// 따라 바뀐다.
//
// 정책 수정(2026-09-18): previewdata는 이 저장소들이 생기기 전에 이미 사람이 여러 근거로
// 검토한 human-reviewed baseline이다. "현재 보존된 citation이 이걸 재구성 못 한다"는
// "이 관계가 거짓이다"를 의미하지 않는다 — traceability 문제와 실제 모순을 절대 같은
// 사유로 섞지 않는다. wrong_attribution/contradiction만 실제 모순이고, 나머지 citation
// 관련 사유는 모두 provenance(추적 가능성) 문제로 명명한다.
//
// 두 번째 정책 수정(같은 날): 사실적 verified 자격과 provenance는 독립된 두 축이다.
// FACTUAL_BLOCKING_REASONS만 draft→verified 이관을 막는다(진짜 모순/미해결/구조 오류/
// ko-en 사실 불일치) — provenance 전용 사유(현재 인용 부재/부분/약함/깨짐, 현재 출처
// 대비 과잉주장)는 절대 factual verified 판정을 막지 않는다. 발행(publish)은 여전히
// checkPublishable이 별도로 더 엄격하게 본다(이 파일과 무관).
import type { ReviewRecord } from "./reviewData";

export type TargetedReviewReason =
  | "wrong_attribution" // citationStatus===wrong — 실제 모순, 엄격하게 유지, factual blocker
  | "contradiction" // artistCorrections에 disposition==="contradicted"인 항목이 있음, factual blocker
  | "unresolved" // artistCorrections에 disposition==="unresolved"인 항목이 있음, factual blocker — B로 뭉뚱그리지 않는다
  | "citation_partial" // provenance-only
  | "citation_weak" // provenance-only
  | "citation_broken" // provenance-only
  | "provenance_missing" // provenance-only — citationStatus===unreviewed 또는 sourceUrl 부재/형식 오류 또는 artistCorrections provenance_missing
  | "relation_overclaim_current_source" // provenance-only — relationText가 "현재 보존된" 출처보다 강하게 주장. 사실관계 자체의 무효를 뜻하지 않음
  | "ko_en_mismatch" // factual blocker — ko/en이 사실관계에서 실제로 어긋남(번역 누락과 다름)
  | "structural_error"; // factual blocker

/** draft→verified factual 이관을 실제로 막는 사유만. provenance 전용 사유는 여기 없다. */
export const FACTUAL_BLOCKING_REASONS: ReadonlySet<TargetedReviewReason> = new Set([
  "structural_error",
  "wrong_attribution",
  "contradiction",
  "unresolved",
  "ko_en_mismatch",
]);

/**
 * 여러 사유가 동시에 해당하면 전부 반환한다(4절: "A record with multiple issues should
 * appear once with all reasons attached") — 호출부가 레코드당 한 번만 렌더링하면서 이
 * 배열 전체를 보여주면 된다.
 */
export function getTargetedReviewReasons(record: ReviewRecord): TargetedReviewReason[] {
  const reasons = new Set<TargetedReviewReason>();

  if (record.verify.errors.length > 0) reasons.add("structural_error");

  const citationStatus = record.citation?.citationStatus ?? "unreviewed";
  if (citationStatus === "wrong") reasons.add("wrong_attribution");
  if (citationStatus === "partial") reasons.add("citation_partial");
  if (citationStatus === "weak") reasons.add("citation_weak");
  if (citationStatus === "broken") reasons.add("citation_broken");
  if (citationStatus === "unreviewed") reasons.add("provenance_missing");
  if (record.provenance.errors.length > 0) reasons.add("provenance_missing"); // sourceUrl 부재/형식 오류 — 별도 축

  if (record.citation?.relationOverclaim) reasons.add("relation_overclaim_current_source");
  if (record.citation?.koEnMismatch) reasons.add("ko_en_mismatch");

  // artistIds 재검토 제안(artist-corrections.json)은 승인 전까지 절대 artistIds를 바꾸지
  //않지만, 리뷰어가 볼 수 있도록 타겟 리뷰 큐에는 계속 남겨둔다. "provenance_missing"과
  // "contradiction"을 반드시 구분한다 — collapse하지 않는다.
  for (const correction of record.artistCorrections) {
    if (correction.status === "applied" || correction.status === "rejected") continue;
    if (correction.disposition === "contradicted") reasons.add("contradiction");
    else if (correction.disposition === "unresolved") reasons.add("unresolved");
    else reasons.add("provenance_missing"); // provenance_missing, 또는 아직 미분류된 항목 — 삭제를 뜻하지 않음
  }

  return Array.from(reasons);
}

export function needsTargetedReview(record: ReviewRecord): boolean {
  return getTargetedReviewReasons(record).length > 0;
}

/** FACTUAL_BLOCKING_REASONS로만 필터링 — provenance 전용 사유는 제외한다. */
export function getFactualBlockers(record: ReviewRecord): TargetedReviewReason[] {
  return getTargetedReviewReasons(record).filter((r) => FACTUAL_BLOCKING_REASONS.has(r));
}

/** draft→verified factual 이관을 실제로 막는 사유가 하나라도 있는가. */
export function hasFactualBlocker(record: ReviewRecord): boolean {
  return getFactualBlockers(record).length > 0;
}

/** 타겟 리뷰 사유 중 provenance 전용(factual verified를 막지 않는) 것만. */
export function getProvenanceOnlyReasons(record: ReviewRecord): TargetedReviewReason[] {
  return getTargetedReviewReasons(record).filter((r) => !FACTUAL_BLOCKING_REASONS.has(r));
}
