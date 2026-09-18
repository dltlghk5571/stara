import { describe, expect, it } from "vitest";
import { simulateRouteSurvivability } from "./routeSurvivability";
import type { Place, PlaceCategory } from "@/types";

function place(id: string, category: PlaceCategory, artistIds: string[]): Place {
  return {
    id,
    nameKo: id,
    nameEn: id,
    latitude: 37.5,
    longitude: 127,
    category,
    artistIds,
    relationTextKo: "",
    relationTextEn: "",
    dwellMinutes: 30,
    isFood: category === "food",
    isLocalSpot: false,
    isMainRoute: false,
    questIds: [],
  };
}

describe("simulateRouteSurvivability", () => {
  it("앵커가 있으면 3개 루트안이 전부 생성된다고 보고한다", () => {
    const places = [place("p1", "food", ["a"]), place("p2", "shopping", ["a"])];
    const [result] = simulateRouteSurvivability(places, ["a"]);
    expect(result.hasAnyAnchor).toBe(true);
    expect(result.routeThemesGenerated).toBe(3);
    expect(result.placeCount).toBe(2);
  });

  it("이 필터 집합에 해당 아티스트 장소가 0개면 루트가 하나도 안 만들어진다고 보고한다", () => {
    const places = [place("p1", "food", ["b"])]; // artist "a"의 장소는 없음
    const [result] = simulateRouteSurvivability(places, ["a"]);
    expect(result.hasAnyAnchor).toBe(false);
    expect(result.routeThemesGenerated).toBe(0);
    expect(result.placeCount).toBe(0);
  });

  it("여러 아티스트를 한 번에 평가할 수 있다", () => {
    const places = [place("p1", "food", ["a"]), place("p2", "shopping", ["b"])];
    const results = simulateRouteSurvivability(places, ["a", "b", "c"]);
    expect(results.map((r) => r.artistId)).toEqual(["a", "b", "c"]);
    expect(results.find((r) => r.artistId === "c")!.hasAnyAnchor).toBe(false);
  });

  it("카테고리 분포를 정확히 집계한다", () => {
    const places = [
      place("p1", "food", ["a"]),
      place("p2", "food", ["a"]),
      place("p3", "shopping", ["a"]),
    ];
    const [result] = simulateRouteSurvivability(places, ["a"]);
    expect(result.categoryDistribution).toEqual({ food: 2, shopping: 1 });
  });
});
