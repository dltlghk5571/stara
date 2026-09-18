// 일회성(재실행 가능/멱등) 이관: 기존 previewdata 휴먼 리뷰 결과를 review-decisions.json의
// verified 상태로 옮긴다. 어떤 레코드도 published로는 옮기지 않는다 — 그건 항상 별도의 명시적
// 액션이다. 정책 수정(2026-09-18): factual verified 자격은 FACTUAL_BLOCKING_REASONS(실제
// 모순/미해결/구조 오류/ko-en 사실 불일치)만 본다 — provenance 전용 사유(인용 부재/부분/약함/
// 깨짐, 현재 출처 대비 과잉주장)는 더 이상 이관을 막지 않는다.
// 실행: npx tsx scripts/migrate-preview-review.ts
import { loadReviewRecords, type ReviewRecord } from "../src/lib/review/reviewData";
import { computeMigrationCandidates, migratePreviewReviewedRecords } from "../src/lib/review/previewMigration";
import {
  getTargetedReviewReasons,
  getFactualBlockers,
  hasFactualBlocker,
  type TargetedReviewReason,
} from "../src/lib/review/targetedReview";

type ProvenanceBucket = "current_evidence_supported" | "provenance_missing" | "partial" | "weak" | "broken";

function provenanceBucket(r: ReviewRecord): ProvenanceBucket {
  const reasons = getTargetedReviewReasons(r);
  if (reasons.includes("citation_partial")) return "partial";
  if (reasons.includes("citation_weak")) return "weak";
  if (reasons.includes("citation_broken")) return "broken";
  if (reasons.includes("provenance_missing")) return "provenance_missing";
  return "current_evidence_supported";
}

function emptyProvenanceCounts(): Record<ProvenanceBucket, number> {
  return { current_evidence_supported: 0, provenance_missing: 0, partial: 0, weak: 0, broken: 0 };
}

function main() {
  const records = loadReviewRecords();
  const alreadyDecided = records.filter((r) => r.decision);
  const notYetDecided = records.filter((r) => !r.decision);
  const candidates = computeMigrationCandidates(records);
  const excluded = notYetDecided.filter((r) => hasFactualBlocker(r));

  console.log("=== DRY RUN (before writing anything) ===");
  console.log(`TOTAL PREVIEW RECORDS: ${records.length}`);
  console.log(`ALREADY VERIFIED/PUBLISHED (existing decision — never overwritten): ${alreadyDecided.length}`);
  console.log(`NEW LEGACY-REVIEW MIGRATION CANDIDATES: ${candidates.length}`);
  console.log(`\nEXCLUDED FROM MIGRATION (no decision yet, but a factual blocker exists): ${excluded.length}`);
  const blockerCounts: Partial<Record<TargetedReviewReason, number>> = {};
  for (const r of excluded) {
    for (const reason of getFactualBlockers(r)) blockerCounts[reason] = (blockerCounts[reason] ?? 0) + 1;
  }
  for (const [reason, count] of Object.entries(blockerCounts)) console.log(`  - ${reason}: ${count}`);
  if (excluded.length > 0) {
    console.log("  place ids:");
    for (const r of excluded) console.log(`    ${r.place.id} — ${getFactualBlockers(r).join(", ")}`);
  }

  const candidateProvenance = emptyProvenanceCounts();
  for (const r of candidates) candidateProvenance[provenanceBucket(r)]++;
  console.log("\nAmong migration candidates, provenance state:");
  for (const [bucket, count] of Object.entries(candidateProvenance)) console.log(`  ${bucket}: ${count}`);

  console.log("\n=== MIGRATING ===");
  const result = migratePreviewReviewedRecords(records);
  console.log(`Migrated to verified: ${result.migratedPlaceIds.length}`);

  // 이관 후 재조회(방금 쓴 review-decisions.json 반영)해서 정확한 사후 통계를 낸다.
  const after = loadReviewRecords();
  const byStatus = { draft: 0, verified: 0, published: 0 };
  const byBasis: Record<string, number> = {};
  for (const r of after) {
    byStatus[r.status]++;
    if (r.decision?.verificationBasis) {
      byBasis[r.decision.verificationBasis] = (byBasis[r.decision.verificationBasis] ?? 0) + 1;
    }
  }

  const verifiedProvenance = emptyProvenanceCounts();
  for (const r of after) {
    if (r.status !== "draft") verifiedProvenance[provenanceBucket(r)]++;
  }

  const draftRecords = after.filter((r) => r.status === "draft");
  const draftReasons = { contradiction: 0, unresolved: 0, structural_or_factual: 0 };
  for (const r of draftRecords) {
    const blockers = getFactualBlockers(r);
    if (blockers.includes("wrong_attribution") || blockers.includes("contradiction")) draftReasons.contradiction++;
    if (blockers.includes("unresolved")) draftReasons.unresolved++;
    if (blockers.includes("structural_error") || blockers.includes("ko_en_mismatch")) draftReasons.structural_or_factual++;
  }

  console.log("\n=== POST-MIGRATION REPORT ===");
  console.log(`TOTAL: ${after.length}`);
  console.log("\nEDITORIAL STATUS:");
  console.log(`  draft: ${byStatus.draft}`);
  console.log(`  verified: ${byStatus.verified}`);
  console.log(`  published: ${byStatus.published}`);
  console.log("\nVERIFICATION BASIS:");
  for (const [basis, count] of Object.entries(byBasis)) console.log(`  ${basis}: ${count}`);
  console.log("\nPROVENANCE AMONG VERIFIED(+published):");
  for (const [bucket, count] of Object.entries(verifiedProvenance)) console.log(`  ${bucket}: ${count}`);
  console.log("\nDRAFT REASONS (a draft record may count in more than one bucket):");
  console.log(`  contradiction (wrong_attribution/contradiction): ${draftReasons.contradiction}`);
  console.log(`  unresolved: ${draftReasons.unresolved}`);
  console.log(`  structural/other factual defect (structural_error/ko_en_mismatch): ${draftReasons.structural_or_factual}`);
  console.log(`  draft records with NO factual blocker at all (still not yet decided by a human): ${draftRecords.filter((r) => !hasFactualBlocker(r)).length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
