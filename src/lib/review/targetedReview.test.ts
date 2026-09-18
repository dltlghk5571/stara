import { describe, expect, it } from "vitest";
import {
  getTargetedReviewReasons,
  needsTargetedReview,
  getFactualBlockers,
  hasFactualBlocker,
  FACTUAL_BLOCKING_REASONS,
} from "./targetedReview";
import type { ReviewRecord } from "./reviewData";
import type { Place } from "@/types";
import type { ArtistCorrection } from "./artistCorrectionStore";

function record(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  const place: Omit<Place, "questIds"> = {
    id: "p1",
    nameKo: "장소",
    nameEn: "Place",
    latitude: 37.5,
    longitude: 127,
    category: "food",
    artistIds: ["bts"],
    relationTextKo: "관계",
    relationTextEn: "relation",
    openTime: "09:00",
    closeTime: "18:00",
    dwellMinutes: 30,
    isFood: true,
    isLocalSpot: false,
    isMainRoute: false,
  };
  return {
    place,
    metadata: { id: "p1", status: "draft", sourceUrl: "https://x.com", rawCategory: "food", tourApiMatchStatus: "unmatched" },
    enrichment: undefined,
    status: "draft",
    decision: undefined,
    verify: { errors: [], warnings: [] },
    provenance: { errors: [], warnings: [] },
    publish: { errors: [], warnings: [] },
    citation: { placeId: "p1", citationStatus: "direct", reviewed: false },
    artistCorrections: [],
    ...overrides,
  };
}

function correction(overrides: Partial<ArtistCorrection> = {}): ArtistCorrection {
  return {
    placeId: "p1",
    artistId: "nct",
    action: "needs_evidence_recovery",
    status: "proposed",
    reason: "현재 citation에 없음",
    proposedAt: "t0",
    ...overrides,
  };
}

describe("getTargetedReviewReasons", () => {
  it("깨끗한 레코드(direct citation, 구조 검증 통과, overclaim/mismatch/교정 제안 없음)는 사유가 없다", () => {
    expect(getTargetedReviewReasons(record())).toEqual([]);
    expect(needsTargetedReview(record())).toBe(false);
  });

  it("citationStatus=wrong이면 wrong_attribution을 반환한다 — 실제 모순은 엄격하게 유지", () => {
    const r = record({ citation: { placeId: "p1", citationStatus: "wrong", reviewed: false } });
    expect(getTargetedReviewReasons(r)).toContain("wrong_attribution");
  });

  it("citationStatus=partial이면 citation_partial을 반환한다", () => {
    const r = record({ citation: { placeId: "p1", citationStatus: "partial", reviewed: false } });
    expect(getTargetedReviewReasons(r)).toContain("citation_partial");
  });

  it("citationStatus=weak이면 citation_weak을 반환한다", () => {
    const r = record({ citation: { placeId: "p1", citationStatus: "weak", reviewed: false } });
    expect(getTargetedReviewReasons(r)).toContain("citation_weak");
  });

  it("citationStatus=broken이면 citation_broken을 반환한다", () => {
    const r = record({ citation: { placeId: "p1", citationStatus: "broken", reviewed: false } });
    expect(getTargetedReviewReasons(r)).toContain("citation_broken");
  });

  it("citation이 아예 없거나 unreviewed면 provenance_missing을 반환한다(거짓이라는 뜻이 아님)", () => {
    expect(getTargetedReviewReasons(record({ citation: undefined }))).toContain("provenance_missing");
    expect(
      getTargetedReviewReasons(record({ citation: { placeId: "p1", citationStatus: "unreviewed", reviewed: false } }))
    ).toContain("provenance_missing");
  });

  it("relationOverclaim이면 relation_overclaim_current_source를 반환한다(direct여도)", () => {
    const r = record({ citation: { placeId: "p1", citationStatus: "direct", relationOverclaim: true, reviewed: false } });
    expect(getTargetedReviewReasons(r)).toContain("relation_overclaim_current_source");
  });

  it("koEnMismatch이면 ko_en_mismatch를 반환한다(direct여도)", () => {
    const r = record({ citation: { placeId: "p1", citationStatus: "direct", koEnMismatch: true, reviewed: false } });
    expect(getTargetedReviewReasons(r)).toContain("ko_en_mismatch");
  });

  it("구조 검증 에러가 있으면 structural_error를 반환한다", () => {
    const r = record({ verify: { errors: ["출처 없음"], warnings: [] } });
    expect(getTargetedReviewReasons(r)).toContain("structural_error");
  });

  it("여러 사유가 동시에 해당하면 전부 반환한다(중복 없이 한 레코드에 다 붙음)", () => {
    const r = record({
      verify: { errors: ["에러"], warnings: [] },
      citation: { placeId: "p1", citationStatus: "wrong", relationOverclaim: true, koEnMismatch: true, reviewed: false },
    });
    const reasons = getTargetedReviewReasons(r);
    expect(reasons).toEqual(
      expect.arrayContaining([
        "structural_error",
        "wrong_attribution",
        "relation_overclaim_current_source",
        "ko_en_mismatch",
      ])
    );
    expect(reasons).toHaveLength(4);
  });

  it("artistCorrections에 provenance_missing 항목이 있으면 provenance_missing을 반환한다(citation이 direct여도)", () => {
    const r = record({ artistCorrections: [correction({ disposition: "provenance_missing" })] });
    expect(getTargetedReviewReasons(r)).toEqual(["provenance_missing"]);
  });

  it("disposition이 아직 없는(미분류) 제안도 provenance_missing으로 취급한다 — remove를 의미하지 않는다", () => {
    const r = record({ artistCorrections: [correction({ disposition: undefined })] });
    expect(getTargetedReviewReasons(r)).toEqual(["provenance_missing"]);
  });

  it("artistCorrections에 contradicted 항목이 있으면 contradiction을 반환한다 — provenance_missing과 절대 섞지 않는다", () => {
    const r = record({ artistCorrections: [correction({ disposition: "contradicted" })] });
    const reasons = getTargetedReviewReasons(r);
    expect(reasons).toContain("contradiction");
    expect(reasons).not.toContain("provenance_missing");
  });

  it("artistCorrections에 unresolved 항목이 있으면 unresolved를 반환한다(provenance_missing으로 뭉뚱그리지 않음)", () => {
    const r = record({ artistCorrections: [correction({ disposition: "unresolved" })] });
    const reasons = getTargetedReviewReasons(r);
    expect(reasons).toContain("unresolved");
    expect(reasons).not.toContain("provenance_missing");
  });

  it("provenance.errors(sourceUrl 부재/형식 오류)는 provenance_missing일 뿐 structural_error가 아니다", () => {
    const r = record({ provenance: { errors: ["출처(sourceUrl)가 없습니다."], warnings: [] } });
    const reasons = getTargetedReviewReasons(r);
    expect(reasons).toEqual(["provenance_missing"]);
    expect(reasons).not.toContain("structural_error");
  });

  it("citation_partial/weak/broken/provenance_missing/relation_overclaim_current_source는 factual blocker가 아니다", () => {
    for (const status of ["partial", "weak", "broken", "unreviewed"] as const) {
      const r = record({ citation: { placeId: "p1", citationStatus: status, reviewed: false } });
      expect(getTargetedReviewReasons(r).some((reason) => FACTUAL_BLOCKING_REASONS.has(reason))).toBe(false);
    }
  });

  it("wrong_attribution/contradiction/unresolved/structural_error/ko_en_mismatch는 factual blocker다", () => {
    expect(FACTUAL_BLOCKING_REASONS.has("wrong_attribution")).toBe(true);
    expect(FACTUAL_BLOCKING_REASONS.has("contradiction")).toBe(true);
    expect(FACTUAL_BLOCKING_REASONS.has("unresolved")).toBe(true);
    expect(FACTUAL_BLOCKING_REASONS.has("structural_error")).toBe(true);
    expect(FACTUAL_BLOCKING_REASONS.has("ko_en_mismatch")).toBe(true);
    expect(FACTUAL_BLOCKING_REASONS.has("provenance_missing")).toBe(false);
    expect(FACTUAL_BLOCKING_REASONS.has("citation_partial")).toBe(false);
    expect(FACTUAL_BLOCKING_REASONS.has("citation_weak")).toBe(false);
    expect(FACTUAL_BLOCKING_REASONS.has("citation_broken")).toBe(false);
    expect(FACTUAL_BLOCKING_REASONS.has("relation_overclaim_current_source")).toBe(false);
  });

  it("applied/rejected 상태인 교정 제안은 무시한다", () => {
    const r = record({
      artistCorrections: [
        correction({ status: "applied", disposition: "provenance_missing" }),
        correction({ status: "rejected", disposition: "contradicted" }),
      ],
    });
    expect(getTargetedReviewReasons(r)).toEqual([]);
  });
});

describe("getFactualBlockers / hasFactualBlocker — factual verified 자격은 provenance와 독립이다", () => {
  it("provenance 전용 사유만 있으면 factual blocker가 없다", () => {
    const r = record({
      citation: { placeId: "p1", citationStatus: "weak", relationOverclaim: true, reviewed: false },
      provenance: { errors: ["출처(sourceUrl)가 없습니다."], warnings: [] },
    });
    expect(getFactualBlockers(r)).toEqual([]);
    expect(hasFactualBlocker(r)).toBe(false);
    expect(needsTargetedReview(r)).toBe(true); // 여전히 타겟 리뷰 큐에는 보인다
  });

  it("실제 모순(wrong_attribution)이 있으면 factual blocker다", () => {
    const r = record({ citation: { placeId: "p1", citationStatus: "wrong", reviewed: false } });
    expect(hasFactualBlocker(r)).toBe(true);
    expect(getFactualBlockers(r)).toEqual(["wrong_attribution"]);
  });

  it("structural_error가 있으면 provenance가 전부 깨끗해도 factual blocker다", () => {
    const r = record({ verify: { errors: ["좌표가 유효하지 않습니다."], warnings: [] } });
    expect(hasFactualBlocker(r)).toBe(true);
  });
});
