import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeMigrationCandidates, migratePreviewReviewedRecords, MIGRATION_VERIFICATION_NOTE } from "./previewMigration";
import { loadReviewDecisions } from "./reviewStore";
import type { ReviewRecord } from "./reviewData";
import type { Place } from "@/types";

let tmpDir: string | null = null;
afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = null;
});
function tmpPath(): string {
  tmpDir = mkdtempSync(join(tmpdir(), "stara-migration-"));
  return join(tmpDir, "review-decisions.json");
}

function record(id: string, overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  const place: Omit<Place, "questIds"> = {
    id,
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
    metadata: { id, status: "draft", sourceUrl: "https://x.com", rawCategory: "food", tourApiMatchStatus: "unmatched" },
    enrichment: undefined,
    status: "draft",
    decision: undefined,
    verify: { errors: [], warnings: [] },
    provenance: { errors: [], warnings: [] },
    publish: { errors: [], warnings: [] },
    citation: { placeId: id, citationStatus: "direct", reviewed: false },
    artistCorrections: [],
    ...overrides,
  };
}

describe("computeMigrationCandidates", () => {
  it("깨끗한 direct-citation 프리뷰 레코드는 후보로 인정된다", () => {
    const candidates = computeMigrationCandidates([record("p1")]);
    expect(candidates.map((r) => r.place.id)).toEqual(["p1"]);
  });

  it("wrong citation(실제 모순)은 후보에서 제외된다", () => {
    const r = record("p1", { citation: { placeId: "p1", citationStatus: "wrong", reviewed: false } });
    expect(computeMigrationCandidates([r])).toEqual([]);
  });

  it("relationOverclaim은 provenance 전용 사유라 더 이상 후보에서 제외하지 않는다(정책 수정)", () => {
    const r = record("p1", { citation: { placeId: "p1", citationStatus: "direct", relationOverclaim: true, reviewed: false } });
    expect(computeMigrationCandidates([r]).map((x) => x.place.id)).toEqual(["p1"]);
  });

  it("koEnMismatch(ko/en 사실 불일치)는 factual blocker라 여전히 후보에서 제외된다", () => {
    const r = record("p1", { citation: { placeId: "p1", citationStatus: "direct", koEnMismatch: true, reviewed: false } });
    expect(computeMigrationCandidates([r])).toEqual([]);
  });

  it("partial citation은 provenance 전용 사유라 더 이상 후보에서 제외하지 않는다(정책 수정)", () => {
    const r = record("p1", { citation: { placeId: "p1", citationStatus: "partial", reviewed: false } });
    expect(computeMigrationCandidates([r]).map((x) => x.place.id)).toEqual(["p1"]);
  });

  it("weak citation은 provenance 전용 사유라 더 이상 후보에서 제외하지 않는다(정책 수정)", () => {
    const r = record("p1", { citation: { placeId: "p1", citationStatus: "weak", reviewed: false } });
    expect(computeMigrationCandidates([r]).map((x) => x.place.id)).toEqual(["p1"]);
  });

  it("broken citation은 provenance 전용 사유라 더 이상 후보에서 제외하지 않는다(정책 수정)", () => {
    const r = record("p1", { citation: { placeId: "p1", citationStatus: "broken", reviewed: false } });
    expect(computeMigrationCandidates([r]).map((x) => x.place.id)).toEqual(["p1"]);
  });

  it("missing citation(unreviewed)은 provenance 전용 사유라 더 이상 후보에서 제외하지 않는다(정책 수정)", () => {
    const r = record("p1", { citation: undefined });
    expect(computeMigrationCandidates([r]).map((x) => x.place.id)).toEqual(["p1"]);
  });

  it("sourceUrl이 없어도(provenance 전용) 후보에서 제외하지 않는다", () => {
    const r = record("p1", { provenance: { errors: ["출처(sourceUrl)가 없습니다."], warnings: [] } });
    expect(computeMigrationCandidates([r]).map((x) => x.place.id)).toEqual(["p1"]);
  });

  it("artistCorrections에 provenance_missing 항목이 있어도(7건 재분류) 후보에서 제외하지 않는다", () => {
    const r = record("p1", {
      artistCorrections: [
        {
          placeId: "p1",
          artistId: "nct",
          action: "needs_evidence_recovery",
          status: "proposed",
          reason: "현재 citation에 없음",
          proposedAt: "t0",
          disposition: "provenance_missing",
        },
      ],
    });
    expect(computeMigrationCandidates([r]).map((x) => x.place.id)).toEqual(["p1"]);
  });

  it("artistCorrections에 contradicted 항목이 있으면 후보에서 제외된다", () => {
    const r = record("p1", {
      artistCorrections: [
        {
          placeId: "p1",
          artistId: "nct",
          action: "remove_artist_relation",
          status: "proposed",
          reason: "다른 아티스트로 특정됨",
          proposedAt: "t0",
          disposition: "contradicted",
        },
      ],
    });
    expect(computeMigrationCandidates([r])).toEqual([]);
  });

  it("구조 검증 에러가 있으면 후보에서 제외된다", () => {
    const r = record("p1", { verify: { errors: ["출처 없음"], warnings: [] } });
    expect(computeMigrationCandidates([r])).toEqual([]);
  });

  it("이미 리뷰 결정(decision)이 있는 레코드는 후보에서 제외된다(기존 수동 검증 보호)", () => {
    const r = record("p1", { decision: { status: "verified", reviewedAt: "t0", verificationBasis: "manual-review" } });
    expect(computeMigrationCandidates([r])).toEqual([]);
  });
});

describe("migratePreviewReviewedRecords", () => {
  it("후보만 verified로 옮기고 provenance를 남긴다", () => {
    const path = tmpPath();
    const result = migratePreviewReviewedRecords([record("p1"), record("p2", { citation: { placeId: "p2", citationStatus: "wrong", reviewed: false } })], path);
    expect(result.migratedPlaceIds).toEqual(["p1"]);
    const decisions = loadReviewDecisions(path);
    expect(decisions["p1"].status).toBe("verified");
    expect(decisions["p1"].verificationBasis).toBe("preview-human-review-migration");
    expect(decisions["p1"].verificationNote).toBe(MIGRATION_VERIFICATION_NOTE);
    expect(decisions["p2"]).toBeUndefined();
  });

  it("published로는 절대 옮기지 않는다", () => {
    const path = tmpPath();
    migratePreviewReviewedRecords([record("p1")], path);
    expect(loadReviewDecisions(path)["p1"].status).toBe("verified");
    expect(loadReviewDecisions(path)["p1"].status).not.toBe("published");
  });

  it("Place 객체는 전혀 건드리지 않는다", () => {
    const path = tmpPath();
    const r = record("p1");
    const originalPlace = { ...r.place };
    migratePreviewReviewedRecords([r], path);
    expect(r.place).toEqual(originalPlace);
  });

  it("재실행해도 멱등이다 — 이미 이관된 레코드는 다시 쓰지 않는다", () => {
    const path = tmpPath();
    const first = migratePreviewReviewedRecords([record("p1")], path);
    expect(first.migratedPlaceIds).toEqual(["p1"]);

    // 두 번째 실행: 이번엔 record가 이미 decision을 가진 상태로 들어온다(loadReviewRecords가 실제로 그렇게 함).
    const decisions = loadReviewDecisions(path);
    const second = migratePreviewReviewedRecords(
      [record("p1", { decision: decisions["p1"], status: "verified" })],
      path
    );
    expect(second.migratedPlaceIds).toEqual([]);
  });

  it("이미 수동으로 verified된 레코드는 이관 대상이 아니라 그대로 보존된다(손상 없음)", () => {
    const path = tmpPath();
    const manualDecision = { status: "verified" as const, reviewedAt: "t0", verificationBasis: "manual-review" as const, note: "직접 확인함" };
    const r = record("p1", { decision: manualDecision, status: "verified" });
    migratePreviewReviewedRecords([r], path);
    // 이관 스크립트가 아무것도 안 썼으므로 파일 자체가 비어있어야 한다(덮어쓰지 않음).
    expect(loadReviewDecisions(path)["p1"]).toBeUndefined();
  });
});
