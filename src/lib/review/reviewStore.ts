// 리뷰 결정의 단일 권위 소스: previewdata/review-decisions.json.
// previewdata/places.json(파이프라인 산출물)은 build_dataset.py가 재실행되면 status를
// 전부 "draft"로 되돌리는 값이라(주석 "rerun-wipes-manual-edits" 참고) 여기에 사람의
// 판단을 직접 적으면 다음 파이프라인 실행에 사라진다 — 그래서 이 파일을 pipeline 산출물과
// 완전히 분리된 별도 파일로 둔다. build_dataset.py/fill_hours.py/naver_hub.py는 이 파일을
// 절대 건드리지 않고, 오직 리뷰 UI/스크립트만 쓴다. export-seoul-dataset.ts가 이 파일을
// previewdata/places.json 위에 덮어씌워 seoulPlaceMetadata.ts의 최종 status를 만든다.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_REVIEW_DECISIONS_PATH = join(process.cwd(), "previewdata", "review-decisions.json");

export type VerificationBasis =
  /** 기존 previewdata 휴먼 리뷰를 새 상태 시스템으로 이관한 것 — 새로 처음부터 검증한 게 아니다. */
  | "preview-human-review-migration"
  /** /review UI에서 리뷰어가 직접 처음부터 검토해 승인. */
  | "manual-review"
  /** 타겟 리뷰(오류/미비 인용 등) 조치 후 재검증. */
  | "manual-review-after-remediation";

export interface ReviewDecision {
  status: "verified" | "published";
  reviewedAt: string;
  /** 선택 — 익명 로컬 도구로도 쓸 수 있게 필수로 두지 않는다(불필요한 개인정보 저장 지양, 9절). */
  reviewer?: string;
  note?: string;
  /** 인용은 있지만 신뢰도/관련성이 애매해 사람이 다시 봐야 하면 true. 자동 판단으로 세우지 않는다. */
  needsReReview?: boolean;
  /** 이 verified/published 판정이 어디서 왔는지 — 프리뷰 리뷰 이관인지, 새 수동 검토인지 구분한다. */
  verificationBasis?: VerificationBasis;
  verificationNote?: string;
}

export type ReviewDecisions = Record<string, ReviewDecision>;

export function loadReviewDecisions(path: string = DEFAULT_REVIEW_DECISIONS_PATH): ReviewDecisions {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8")) as ReviewDecisions;
}

export function saveReviewDecisions(
  decisions: ReviewDecisions,
  path: string = DEFAULT_REVIEW_DECISIONS_PATH
): void {
  writeFileSync(path, JSON.stringify(decisions, null, 2) + "\n");
}

/** 한 장소의 결정을 기록한다 — 리뷰어의 명시적 액션에서만 호출되어야 한다(자동 승격 금지). */
export function setReviewDecision(
  placeId: string,
  decision: ReviewDecision,
  path: string = DEFAULT_REVIEW_DECISIONS_PATH
): ReviewDecisions {
  const decisions = loadReviewDecisions(path);
  decisions[placeId] = decision;
  saveReviewDecisions(decisions, path);
  return decisions;
}

/** draft로 되돌린다(오판정 수정용) — review-decisions.json에서 항목을 지우면 파이프라인 기본값(draft)로 복귀. */
export function clearReviewDecision(
  placeId: string,
  path: string = DEFAULT_REVIEW_DECISIONS_PATH
): ReviewDecisions {
  const decisions = loadReviewDecisions(path);
  delete decisions[placeId];
  saveReviewDecisions(decisions, path);
  return decisions;
}
