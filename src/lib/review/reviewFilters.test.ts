import { describe, expect, it } from "vitest";
import { filterReviewRecords } from "./reviewFilters";
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

describe("filterReviewRecords", () => {
  it("status로 필터링한다", () => {
    const records = [record({ status: "draft" }), record({ status: "verified" })];
    expect(filterReviewRecords(records, { status: "verified" })).toHaveLength(1);
  });

  it("artist로 필터링한다", () => {
    const records = [
      record({ place: { ...record().place, artistIds: ["bts"] } }),
      record({ place: { ...record().place, artistIds: ["enhypen"] } }),
    ];
    expect(filterReviewRecords(records, { artist: "enhypen" })).toHaveLength(1);
  });

  it("sourceUrl 누락만 필터링한다", () => {
    const records = [
      record({ metadata: { ...record().metadata, sourceUrl: null } }),
      record({ metadata: { ...record().metadata, sourceUrl: "https://x.com" } }),
    ];
    const result = filterReviewRecords(records, { missingSourceUrl: true });
    expect(result).toHaveLength(1);
    expect(result[0].metadata.sourceUrl).toBeNull();
  });

  it("영문 관계설명 누락만 필터링한다", () => {
    const records = [
      record({ place: { ...record().place, relationTextEn: "" } }),
      record({ place: { ...record().place, relationTextEn: "has text" } }),
    ];
    expect(filterReviewRecords(records, { missingEnglishRelation: true })).toHaveLength(1);
  });

  it("운영시간 누락만 필터링한다", () => {
    const records = [
      record({ place: { ...record().place, openTime: undefined, closeTime: undefined } }),
      record({ place: { ...record().place, openTime: "09:00", closeTime: "18:00" } }),
    ];
    expect(filterReviewRecords(records, { missingHours: true })).toHaveLength(1);
  });

  it("KTO 국문 매칭 상태로 필터링한다", () => {
    const records = [
      record({ enrichment: { placeId: "p1", status: "matched", enStatus: "unmatched" } as never }),
      record({ enrichment: { placeId: "p1", status: "unmatched" } as never }),
    ];
    expect(filterReviewRecords(records, { koStatus: "matched" })).toHaveLength(1);
  });

  it("needsAttention은 verify 에러가 있는 항목만 남긴다", () => {
    const records = [
      record({ verify: { errors: ["sourceUrl 없음"], warnings: [] } }),
      record({ verify: { errors: [], warnings: [] } }),
    ];
    const result = filterReviewRecords(records, { needsAttention: true });
    expect(result).toHaveLength(1);
    expect(result[0].verify.errors.length).toBeGreaterThan(0);
  });

  it("필터가 없으면 전부 돌려준다", () => {
    const records = [record(), record()];
    expect(filterReviewRecords(records, {})).toHaveLength(2);
  });

  it("citationStatus로 필터링한다(없으면 unreviewed로 취급)", () => {
    const records = [
      record({ citation: { placeId: "p1", citationStatus: "direct", reviewed: false } }),
      record({ citation: undefined }),
    ];
    expect(filterReviewRecords(records, { citationStatus: "direct" })).toHaveLength(1);
    expect(filterReviewRecords(records, { citationStatus: "unreviewed" })).toHaveLength(1);
  });

  it("relationOverclaim 플래그가 있는 항목만 필터링한다", () => {
    const records = [
      record({ citation: { placeId: "p1", citationStatus: "partial", relationOverclaim: true, reviewed: false } }),
      record({ citation: { placeId: "p1", citationStatus: "direct", relationOverclaim: false, reviewed: false } }),
    ];
    const result = filterReviewRecords(records, { relationOverclaim: true });
    expect(result).toHaveLength(1);
    expect(result[0].citation?.relationOverclaim).toBe(true);
  });

  it("needsTargetedReview=true는 사유가 있는 레코드만, false는 깨끗한 레코드만 남긴다", () => {
    const clean = record({ citation: { placeId: "p1", citationStatus: "direct", reviewed: false } });
    const flagged = record({ citation: { placeId: "p1", citationStatus: "wrong", reviewed: false } });
    expect(filterReviewRecords([clean, flagged], { needsTargetedReview: true })).toEqual([flagged]);
    expect(filterReviewRecords([clean, flagged], { needsTargetedReview: false })).toEqual([clean]);
  });

  it("verificationBasis로 이관된 레코드와 수동 검증 레코드를 구분한다", () => {
    const migrated = record({ decision: { status: "verified", reviewedAt: "t", verificationBasis: "preview-human-review-migration" } });
    const manual = record({ decision: { status: "verified", reviewedAt: "t", verificationBasis: "manual-review" } });
    const result = filterReviewRecords([migrated, manual], { verificationBasis: "preview-human-review-migration" });
    expect(result).toEqual([migrated]);
  });

  it("hasProvenanceGap=true/false로 '현재 근거로 완전히 뒷받침됨' vs 'provenance gap 있음'을 구분한다", () => {
    const complete = record({
      status: "verified",
      citation: { placeId: "p1", citationStatus: "direct", reviewed: false },
    });
    const gap = record({
      status: "verified",
      citation: { placeId: "p1", citationStatus: "weak", reviewed: false },
    });
    expect(filterReviewRecords([complete, gap], { hasProvenanceGap: false })).toEqual([complete]);
    expect(filterReviewRecords([complete, gap], { hasProvenanceGap: true })).toEqual([gap]);
  });

  it("draftReason='contradiction'은 실제 모순/미해결 레코드만, 'structural'은 구조/ko-en 결함만 남긴다", () => {
    const contradicted = record({
      status: "draft",
      citation: { placeId: "p1", citationStatus: "wrong", reviewed: false },
    });
    const structural = record({ status: "draft", verify: { errors: ["좌표 오류"], warnings: [] } });
    const provenanceOnly = record({
      status: "draft",
      citation: { placeId: "p1", citationStatus: "unreviewed", reviewed: false },
    });
    const all = [contradicted, structural, provenanceOnly];
    expect(filterReviewRecords(all, { draftReason: "contradiction" })).toEqual([contradicted]);
    expect(filterReviewRecords(all, { draftReason: "structural" })).toEqual([structural]);
  });
});
