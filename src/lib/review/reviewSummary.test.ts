import { describe, expect, it } from "vitest";
import { summarizeReviewRecords } from "./reviewSummary";
import type { ReviewRecord } from "./reviewData";
import type { Place } from "@/types";

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
    citation: undefined,
    artistCorrections: [],
    ...overrides,
  };
}

describe("summarizeReviewRecords", () => {
  it("status별 카운트를 정확히 센다", () => {
    const summary = summarizeReviewRecords([
      record({ status: "draft" }),
      record({ status: "draft" }),
      record({ status: "verified" }),
      record({ status: "published" }),
    ]);
    expect(summary.total).toBe(4);
    expect(summary.byStatus).toEqual({ draft: 2, verified: 1, published: 1 });
  });

  it("카테고리/아티스트별 카운트를 센다", () => {
    const summary = summarizeReviewRecords([
      record({ place: { ...record().place, category: "food", artistIds: ["bts"] } }),
      record({ place: { ...record().place, category: "shopping", artistIds: ["bts", "enhypen"] } }),
    ]);
    expect(summary.byCategory).toEqual({ food: 1, shopping: 1 });
    expect(summary.byArtist).toEqual({ bts: 2, enhypen: 1 });
  });

  it("KTO 미매칭은 경고로만 집계하고 다른 경고와 섞이지 않는다", () => {
    const summary = summarizeReviewRecords([
      record({ enrichment: undefined }),
      record({ enrichment: { placeId: "p1", status: "unmatched" } as never }),
      record({ enrichment: { placeId: "p1", status: "matched" } as never }),
    ]);
    expect(summary.warnings.noKtoMatch).toBe(2);
  });

  it("citationStatus별 카운트와 relationOverclaim/koEnMismatch를 센다", () => {
    const summary = summarizeReviewRecords([
      record({ citation: { placeId: "p1", citationStatus: "direct", reviewed: false } }),
      record({ citation: { placeId: "p1", citationStatus: "wrong", relationOverclaim: true, reviewed: false } }),
      record({ citation: undefined }), // unreviewed로 집계돼야 함
      record({ citation: { placeId: "p1", citationStatus: "partial", koEnMismatch: true, reviewed: false } }),
    ]);
    expect(summary.byCitationStatus).toEqual({
      unreviewed: 1,
      direct: 1,
      partial: 1,
      weak: 0,
      broken: 0,
      wrong: 1,
    });
    expect(summary.relationOverclaimCount).toBe(1);
    expect(summary.koEnMismatchCount).toBe(1);
  });

  it("verificationBasis별 카운트와 targeted-review 카운트를 센다", () => {
    const summary = summarizeReviewRecords([
      record({
        status: "verified",
        decision: { status: "verified", reviewedAt: "t", verificationBasis: "preview-human-review-migration" },
        citation: { placeId: "p1", citationStatus: "direct", reviewed: false },
      }),
      record({
        status: "verified",
        decision: { status: "verified", reviewedAt: "t", verificationBasis: "manual-review" },
        citation: { placeId: "p1", citationStatus: "direct", reviewed: false },
      }),
      record({ citation: { placeId: "p1", citationStatus: "wrong", reviewed: false } }), // needs targeted review
    ]);
    expect(summary.byVerificationBasis["preview-human-review-migration"]).toBe(1);
    expect(summary.byVerificationBasis["manual-review"]).toBe(1);
    expect(summary.needsTargetedReviewCount).toBe(1);
  });

  it("provenanceAmongVerified는 verified+published만 집계하고 draft는 제외한다(정책 수정)", () => {
    const summary = summarizeReviewRecords([
      record({ status: "verified", citation: { placeId: "p1", citationStatus: "direct", reviewed: false } }),
      record({ status: "verified", citation: { placeId: "p1", citationStatus: "unreviewed", reviewed: false } }),
      record({ status: "published", citation: { placeId: "p1", citationStatus: "weak", reviewed: false } }),
      record({ status: "draft", citation: { placeId: "p1", citationStatus: "unreviewed", reviewed: false } }), // 집계 제외
    ]);
    expect(summary.provenanceAmongVerified).toEqual({
      current_evidence_supported: 1,
      provenance_missing: 1,
      partial: 0,
      weak: 1,
      broken: 0,
    });
  });

  it("draftReasons는 draft 레코드만 실제 모순/구조 결함으로 분류한다 — provenance 전용 draft는 어느 쪽에도 안 잡힌다", () => {
    const summary = summarizeReviewRecords([
      record({ status: "draft", citation: { placeId: "p1", citationStatus: "wrong", reviewed: false } }),
      record({ status: "draft", verify: { errors: ["좌표 오류"], warnings: [] } }),
      record({ status: "draft", citation: { placeId: "p1", citationStatus: "unreviewed", reviewed: false } }), // provenance 전용
      record({ status: "verified" }), // draft 아님 — 집계 제외
    ]);
    expect(summary.draftReasons).toEqual({ contradiction: 1, structural: 1 });
  });

  it("sourceUrl/영문관계/운영시간 누락을 각각 센다", () => {
    const summary = summarizeReviewRecords([
      record({ metadata: { ...record().metadata, sourceUrl: null } }),
      record({ place: { ...record().place, relationTextEn: "" } }),
      record({ place: { ...record().place, openTime: undefined, closeTime: undefined } }),
    ]);
    expect(summary.warnings.missingSource).toBe(1);
    expect(summary.warnings.missingEnglishRelation).toBe(1);
    expect(summary.warnings.missingHours).toBe(1);
  });
});
