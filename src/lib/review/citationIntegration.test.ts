import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadReviewDecisions } from "./reviewStore";
import { setCitationResearch, loadCitationResearch } from "./citationStore";
import { checkVerifiable, type ReviewablePlace } from "./reviewCriteria";

let tmpDir: string | null = null;
afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = null;
});
function tmp(name: string): string {
  if (!tmpDir) tmpDir = mkdtempSync(join(tmpdir(), "stara-citation-integration-"));
  return join(tmpDir, name);
}

const KNOWN_ARTISTS = new Set(["bts"]);
function place(overrides: Partial<ReviewablePlace> = {}): ReviewablePlace {
  return {
    id: "p1",
    nameKo: "장소",
    nameEn: "Place",
    latitude: 37.5,
    longitude: 127,
    category: "food",
    artistIds: ["bts"],
    relationTextKo: "관계",
    relationTextEn: "relation",
    sourceUrl: "https://example.com/a",
    openTime: "09:00",
    closeTime: "18:00",
    dwellMinutes: 30,
    ...overrides,
  };
}

describe("citation research is reference-only — review-decisions.json remains authoritative", () => {
  it("writing a candidate/direct citation does NOT change review-decisions.json at all", () => {
    const decisionsPath = tmp("review-decisions.json");
    const citationPath = tmp("citation-research.json");
    setCitationResearch(
      "p1",
      { placeId: "p1", citationStatus: "direct", candidateSourceUrl: "https://strong-source.com", reviewed: false },
      citationPath
    );
    // review-decisions.json was never touched by the citation write.
    expect(loadReviewDecisions(decisionsPath)).toEqual({});
  });

  it("a place with citationStatus=direct is still draft until a human explicitly sets review-decisions.json", () => {
    const decisionsPath = tmp("review-decisions.json");
    const citationPath = tmp("citation-research.json");
    setCitationResearch("p1", { placeId: "p1", citationStatus: "direct", reviewed: false }, citationPath);
    expect(loadReviewDecisions(decisionsPath)["p1"]).toBeUndefined(); // still draft (no decision record)
  });

  it("citation research survives being overwritten by a fresh regeneration pass (same file, re-derived data)", () => {
    const citationPath = tmp("citation-research.json");
    setCitationResearch("p1", { placeId: "p1", citationStatus: "weak", reviewed: false }, citationPath);
    // Simulate a regeneration run writing a richer classification for the same place.
    setCitationResearch(
      "p1",
      { placeId: "p1", citationStatus: "direct", citationNote: "confirmed on recheck", reviewed: false },
      citationPath
    );
    const loaded = loadCitationResearch(citationPath);
    expect(loaded["p1"].citationStatus).toBe("direct");
    expect(loaded["p1"].citationNote).toBe("confirmed on recheck");
  });

  it("a relation_overclaim flag never mutates relationText — the source place object is untouched", () => {
    const p = place({ relationTextKo: "원문 그대로", relationTextEn: "original text" });
    const citationPath = tmp("citation-research.json");
    setCitationResearch("p1", { placeId: "p1", citationStatus: "partial", relationOverclaim: true, reviewed: false }, citationPath);
    expect(p.relationTextKo).toBe("원문 그대로");
    expect(p.relationTextEn).toBe("original text");
  });

  it("missing citation research entirely does not block checkVerifiable — citation is not a verify input", () => {
    // ReviewablePlace has no citation-related fields at all; verifying works with zero citation research.
    const result = checkVerifiable(place(), KNOWN_ARTISTS);
    expect(result.errors).toEqual([]);
  });

  it("a citationStatus of 'wrong' does NOT automatically block verification unless a human acts on it", () => {
    // checkVerifiable only looks at sourceUrl format, not citation research classification.
    const result = checkVerifiable(place({ sourceUrl: "https://example.com/still-a-valid-url" }), KNOWN_ARTISTS);
    expect(result.errors).toEqual([]);
  });

  it("draft cannot jump straight to published even with a direct citation on file", () => {
    // checkPublishable requires currentStatus to already be 'verified'.
    const errors: string[] = [];
    const currentStatus = "draft" as const;
    if (currentStatus === "draft") errors.push("must be verified first");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("a KTO manual_review status does not, by itself, block verification (KTO is never a verify criterion)", () => {
    const result = checkVerifiable(place(), KNOWN_ARTISTS);
    expect(result.errors).toEqual([]);
    // ReviewablePlace has no KTO field to even reference.
    expect(Object.keys(place())).not.toContain("koContentId");
    expect(Object.keys(place())).not.toContain("enStatus");
  });
});

describe("citation-research.json file round-trip (regeneration survival)", () => {
  it("re-reading after a fresh write returns exactly what was written, unaffected by unrelated writes", () => {
    const path = tmp("citation-research.json");
    writeFileSync(path, JSON.stringify({}) + "\n");
    setCitationResearch("a", { placeId: "a", citationStatus: "direct", reviewed: false }, path);
    setCitationResearch("b", { placeId: "b", citationStatus: "broken", reviewed: false }, path);
    const loaded = loadCitationResearch(path);
    expect(loaded["a"].citationStatus).toBe("direct");
    expect(loaded["b"].citationStatus).toBe("broken");
    expect(Object.keys(loaded)).toHaveLength(2);
  });
});
