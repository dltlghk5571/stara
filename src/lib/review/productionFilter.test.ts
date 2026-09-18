import { describe, expect, it } from "vitest";
import { isProductionReady, filterPublishedPlaces, filterPreviewPlaces } from "./productionFilter";
import type { Place, PlaceCategory } from "@/types";
import type { SeoulPlaceMetadata } from "@/data/generated/seoulPlaceMetadata";

function place(id: string, category: PlaceCategory = "food"): Place {
  return {
    id,
    nameKo: id,
    nameEn: id,
    latitude: 37.5,
    longitude: 127,
    category,
    artistIds: ["a"],
    relationTextKo: "",
    relationTextEn: "",
    dwellMinutes: 30,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: false,
    questIds: [],
  };
}

function meta(id: string, status: string): SeoulPlaceMetadata {
  return { id, status, sourceUrl: null, rawCategory: "food", tourApiMatchStatus: "unmatched" };
}

describe("isProductionReady", () => {
  it("published만 true", () => {
    expect(isProductionReady(meta("p1", "published"))).toBe(true);
    expect(isProductionReady(meta("p1", "verified"))).toBe(false);
    expect(isProductionReady(meta("p1", "draft"))).toBe(false);
  });

  it("메타데이터가 없으면(예: 서울 외 지역) false", () => {
    expect(isProductionReady(undefined)).toBe(false);
  });
});

describe("filterPublishedPlaces", () => {
  it("published인 것만 남긴다", () => {
    const places = [place("p1"), place("p2"), place("p3")];
    const metaMap = new Map([
      ["p1", meta("p1", "published")],
      ["p2", meta("p2", "verified")],
      ["p3", meta("p3", "draft")],
    ]);
    const result = filterPublishedPlaces(places, metaMap);
    expect(result.map((p) => p.id)).toEqual(["p1"]);
  });

  it("모두 draft면(현재 실제 상태) 프로덕션 필터 결과는 빈 배열이다", () => {
    const places = [place("p1"), place("p2")];
    const metaMap = new Map([
      ["p1", meta("p1", "draft")],
      ["p2", meta("p2", "draft")],
    ]);
    expect(filterPublishedPlaces(places, metaMap)).toEqual([]);
  });
});

describe("filterPreviewPlaces", () => {
  it("draft를 포함해 전부 그대로 돌려준다 — 프로덕션 정책과 분리", () => {
    const places = [place("p1"), place("p2")];
    expect(filterPreviewPlaces(places)).toEqual(places);
  });
});
