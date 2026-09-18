import { describe, expect, it } from "vitest";
import { computeBadgeProgress, dedupeByPlaceId, type VisitedPlaceSnapshot } from "./badges";
import { BADGE_DEFINITIONS } from "@/data/badges";

function visit(overrides: Partial<VisitedPlaceSnapshot> & Pick<VisitedPlaceSnapshot, "placeId">): VisitedPlaceSnapshot {
  return { category: null, isArtistPlace: false, ...overrides };
}

describe("dedupeByPlaceId", () => {
  it("keeps only the first occurrence of each placeId", () => {
    const rows = [{ placeId: "a", n: 1 }, { placeId: "b", n: 2 }, { placeId: "a", n: 3 }];
    expect(dedupeByPlaceId(rows)).toEqual([{ placeId: "a", n: 1 }, { placeId: "b", n: 2 }]);
  });

  it("empty input stays empty", () => {
    expect(dedupeByPlaceId([])).toEqual([]);
  });
});

describe("computeBadgeProgress", () => {
  it("returns all 12 badge definitions even with zero visits, all unearned", () => {
    const progress = computeBadgeProgress([]);
    expect(progress).toHaveLength(BADGE_DEFINITIONS.length);
    expect(progress.every((p) => p.count === 0 && !p.earned)).toBe(true);
  });

  it("counts food + local_restaurant together under the food badge category", () => {
    const visits = [
      visit({ placeId: "p1", category: "food" }),
      visit({ placeId: "p2", category: "local_restaurant" }),
    ];
    const progress = computeBadgeProgress(visits);
    const foodTier1 = progress.find((p) => p.definition.id === "food-1")!;
    expect(foodTier1.count).toBe(2);
  });

  it("counts photo + local_tourism together under the landmark badge category", () => {
    const visits = [
      visit({ placeId: "p1", category: "photo" }),
      visit({ placeId: "p2", category: "local_tourism" }),
      visit({ placeId: "p3", category: "local_tourism" }),
    ];
    const progress = computeBadgeProgress(visits);
    const landmarkTier1 = progress.find((p) => p.definition.id === "landmark-1")!;
    expect(landmarkTier1.count).toBe(3);
  });

  it("a place with an artist relation counts toward BOTH its category badge and the kpop badge", () => {
    const visits = [visit({ placeId: "p1", category: "food", isArtistPlace: true })];
    const progress = computeBadgeProgress(visits);
    expect(progress.find((p) => p.definition.id === "food-1")!.count).toBe(1);
    expect(progress.find((p) => p.definition.id === "kpop-1")!.count).toBe(1);
  });

  it("marks a badge earned once its count reaches the threshold, not before", () => {
    const fourFoodVisits = Array.from({ length: 4 }, (_, i) => visit({ placeId: `p${i}`, category: "food" }));
    const notYet = computeBadgeProgress(fourFoodVisits).find((p) => p.definition.id === "food-1")!;
    expect(notYet.earned).toBe(false);

    const fiveFoodVisits = Array.from({ length: 5 }, (_, i) => visit({ placeId: `p${i}`, category: "food" }));
    const earned = computeBadgeProgress(fiveFoodVisits).find((p) => p.definition.id === "food-1")!;
    expect(earned.earned).toBe(true);
  });

  it("tier 2 requires its own (higher) threshold independent of tier 1", () => {
    const sevenFoodVisits = Array.from({ length: 7 }, (_, i) => visit({ placeId: `p${i}`, category: "food" }));
    const progress = computeBadgeProgress(sevenFoodVisits);
    expect(progress.find((p) => p.definition.id === "food-1")!.earned).toBe(true); // threshold 5
    expect(progress.find((p) => p.definition.id === "food-2")!.earned).toBe(false); // threshold 10
  });

  it("rows with category=null (pre-migration legacy photos) are excluded from every category count", () => {
    const visits = [visit({ placeId: "p1", category: null, isArtistPlace: null })];
    const progress = computeBadgeProgress(visits);
    expect(progress.every((p) => p.count === 0)).toBe(true);
  });
});
