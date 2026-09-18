"use server";

import { revalidatePath } from "next/cache";
import { setReviewDecision, clearReviewDecision } from "@/lib/review/reviewStore";
import { getReviewRecord } from "@/lib/review/reviewData";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function refresh(placeId: string) {
  revalidatePath("/review");
  revalidatePath(`/review/${placeId}`);
}

/** draft → verified. checkVerifiable에서 나온 에러가 하나라도 있으면 거부한다(자동 승격 없음). */
export async function markVerified(placeId: string, note: string): Promise<ActionResult> {
  const record = getReviewRecord(placeId);
  if (!record) return { ok: false, error: "장소를 찾을 수 없습니다." };
  if (record.verify.errors.length > 0) {
    return { ok: false, error: `검증 실패: ${record.verify.errors.join(" / ")}` };
  }
  setReviewDecision(placeId, {
    status: "verified",
    reviewedAt: new Date().toISOString(),
    note: note || undefined,
  });
  refresh(placeId);
  return { ok: true };
}

/** verified → published. 이미 verified 상태여야 하고, checkPublishable 에러가 없어야 한다. */
export async function markPublished(placeId: string, note: string): Promise<ActionResult> {
  const record = getReviewRecord(placeId);
  if (!record) return { ok: false, error: "장소를 찾을 수 없습니다." };
  if (record.publish.errors.length > 0) {
    return { ok: false, error: `발행 불가: ${record.publish.errors.join(" / ")}` };
  }
  setReviewDecision(placeId, {
    status: "published",
    reviewedAt: new Date().toISOString(),
    note: note || undefined,
  });
  refresh(placeId);
  return { ok: true };
}

/** 인용은 있지만 신뢰도/관련성이 애매할 때 — 상태는 유지하고 재검토 필요 플래그만 세운다. */
export async function flagNeedsReReview(placeId: string, note: string): Promise<ActionResult> {
  const record = getReviewRecord(placeId);
  if (!record || !record.decision) {
    return { ok: false, error: "아직 verified/published 결정이 없어 재검토 플래그를 세울 수 없습니다." };
  }
  setReviewDecision(placeId, {
    status: record.decision.status,
    reviewedAt: new Date().toISOString(),
    note: note || undefined,
    needsReReview: true,
  });
  refresh(placeId);
  return { ok: true };
}

/** 오판정 되돌리기 — 결정 자체를 지워 파이프라인 기본값(draft)으로 복귀시킨다. */
export async function revertToDraft(placeId: string): Promise<ActionResult> {
  clearReviewDecision(placeId);
  refresh(placeId);
  return { ok: true };
}
