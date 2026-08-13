import { describe, expect, it } from "vitest";
import { buildFinalOrder } from "./autoPlaceSelector";
import { LOCAL_RESTAURANT_PLACES } from "@/data/places";
import type { Place } from "@/types";

function kotRestaurant(id: string, latitude: number, longitude: number): Place {
  return {
    id,
    nameKo: id,
    nameEn: id,
    latitude,
    longitude,
    category: "local_restaurant",
    artistIds: [],
    relationTextKo: "",
    relationTextEn: "",
    openTime: "00:00",
    closeTime: "23:59",
    dwellMinutes: 45,
    isFood: true,
    isLocalSpot: true,
    isMainRoute: false,
    questIds: [],
    source: "kto",
  };
}

const dummyRestaurantIds = new Set(LOCAL_RESTAURANT_PLACES.map((p) => p.id));

describe("buildFinalOrder", () => {
  it("아무것도 선택하지 않아도 로컬 관광지 1곳 + 음식점 2곳을 자동 보완한다", () => {
    const result = buildFinalOrder([]);
    expect(result.orderedPlaces.filter((p) => p.isFood)).toHaveLength(2);
    expect(
      result.orderedPlaces.some((p) => p.isLocalSpot && !p.isFood)
    ).toBe(true);
  });

  it("음식점이 아닌 일반 장소만 선택하면 음식점 2곳이 자동 추가된다", () => {
    const result = buildFinalOrder(["place-01-photo"]);
    expect(result.orderedPlaces.filter((p) => p.isFood)).toHaveLength(2);
    expect(result.orderedPlaces.some((p) => p.id === "place-01-photo")).toBe(
      true
    );
  });

  it("음식점(아티스트 장소)을 1곳 선택하면 음식점 1곳만 자동 추가된다", () => {
    const result = buildFinalOrder(["place-01-food"]);
    const foodPlaces = result.orderedPlaces.filter((p) => p.isFood);
    expect(foodPlaces).toHaveLength(2);
    const autoAddedFood = result.autoAddedPlaceIds.filter((id) =>
      dummyRestaurantIds.has(id)
    );
    expect(autoAddedFood).toHaveLength(1);
  });

  it("음식점을 2곳 이상 선택하면 음식점을 추가로 자동 추가하지 않는다", () => {
    const result = buildFinalOrder(["place-01-food", "place-02-food"]);
    expect(result.orderedPlaces.filter((p) => p.isFood)).toHaveLength(2);
    const autoAddedFood = result.autoAddedPlaceIds.filter((id) =>
      dummyRestaurantIds.has(id)
    );
    expect(autoAddedFood).toHaveLength(0);
  });

  it("TourAPI 후보가 주어지면 dummy 대신 그 풀에서 음식점을 자동 추가한다", () => {
    const kto1 = kotRestaurant("kto-1", 37.57, 126.985);
    const kto2 = kotRestaurant("kto-2", 37.556, 126.925);
    const result = buildFinalOrder(["place-01-photo"], undefined, {
      restaurants: [kto1, kto2],
    });
    expect(result.autoAddedPlaceIds).toContain("kto-1");
    expect(result.autoAddedPlaceIds).toContain("kto-2");
    const autoAddedDummy = result.autoAddedPlaceIds.filter((id) =>
      dummyRestaurantIds.has(id)
    );
    expect(autoAddedDummy).toHaveLength(0);
  });

  it("TourAPI 후보가 빈 배열이면(실패/무응답) dummy 풀로 폴백한다", () => {
    const result = buildFinalOrder(["place-01-photo"], undefined, {
      restaurants: [],
    });
    const autoAddedDummy = result.autoAddedPlaceIds.filter((id) =>
      dummyRestaurantIds.has(id)
    );
    expect(autoAddedDummy).toHaveLength(2);
  });
});
