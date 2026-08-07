import { describe, expect, it } from "vitest";
import { findBestInsertion, insertAtBestPosition } from "./routeOptimizer";
import { haversineKm } from "./distance";
import type { Place } from "@/types";

function place(id: string, lat: number, lng: number): Place {
  return {
    id,
    nameKo: id,
    nameEn: id,
    latitude: lat,
    longitude: lng,
    category: "culture",
    artistIds: [],
    relationTextKo: "",
    relationTextEn: "",
    openTime: "00:00",
    closeTime: "23:59",
    dwellMinutes: 30,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: false,
    questIds: [],
  };
}

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm(place("a", 37.5, 127), place("a", 37.5, 127))).toBe(0);
  });

  it("returns roughly the known distance between two Seoul points", () => {
    // 시청(37.5663,126.9779) ~ 강남역(37.4979,127.0276) 실측 약 8~9km
    const km = haversineKm(place("a", 37.5663, 126.9779), place("b", 37.4979, 127.0276));
    expect(km).toBeGreaterThan(7);
    expect(km).toBeLessThan(10);
  });
});

describe("findBestInsertion", () => {
  // 일직선 위의 세 지점 A(0)-B(1)-C(2), 경도만 증가시켜 단순화
  const A = place("A", 37.5, 127.0);
  const B = place("B", 37.5, 127.02);
  const C = place("C", 37.5, 127.04);

  it("inserts a point roughly between A and B at index 1 with ~0 delta", () => {
    const X = place("X", 37.5, 127.01);
    const result = findBestInsertion([A, B, C], X);
    expect(result.index).toBe(1);
    expect(result.deltaKm).toBeCloseTo(0, 1);
  });

  it("appends a far-away point at the end when that is cheapest", () => {
    const farFromC = place("Y", 37.5, 127.06);
    const result = findBestInsertion([A, B, C], farFromC);
    expect(result.index).toBe(3);
  });

  it("insertAtBestPosition keeps the original order intact except the inserted item", () => {
    const X = place("X", 37.5, 127.01);
    const next = insertAtBestPosition([A, B, C], X);
    expect(next.map((p) => p.id)).toEqual(["A", "X", "B", "C"]);
  });
});
