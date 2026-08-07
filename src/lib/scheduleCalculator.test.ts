import { describe, expect, it } from "vitest";
import { buildSchedule } from "./scheduleCalculator";
import type { Place } from "@/types";

function place(overrides: Partial<Place> & Pick<Place, "id" | "latitude" | "longitude">): Place {
  return {
    nameKo: overrides.id,
    nameEn: overrides.id,
    category: "culture",
    artistIds: [],
    relationTextKo: "",
    relationTextEn: "",
    openTime: "09:00",
    closeTime: "21:00",
    dwellMinutes: 30,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: false,
    questIds: [],
    ...overrides,
  };
}

describe("buildSchedule", () => {
  it("starts the first stop at 09:00", () => {
    const result = buildSchedule([place({ id: "A", latitude: 37.5, longitude: 127 })]);
    expect(result.stops[0].arrival).toBe("09:00");
  });

  it("waits until openTime when arriving early", () => {
    const A = place({ id: "A", latitude: 37.5, longitude: 127, dwellMinutes: 0 });
    const B = place({
      id: "B",
      latitude: 37.5,
      longitude: 127.001, // 아주 가까워서 도착이 오픈 시간보다 이름
      openTime: "11:00",
    });
    const result = buildSchedule([A, B]);
    const stopB = result.stops[1];
    expect(stopB.arrival).toBe("11:00");
    expect(stopB.waitedForOpenMinutes).toBeGreaterThan(0);
  });

  it("flags isOverLimit when the total schedule runs past 21:00", () => {
    // 체류시간을 크게 잡아 21시를 넘기도록 유도
    const places: Place[] = Array.from({ length: 6 }, (_, i) =>
      place({
        id: `P${i}`,
        latitude: 37.5 + i * 0.01,
        longitude: 127 + i * 0.01,
        dwellMinutes: 150,
      })
    );
    const result = buildSchedule(places);
    expect(result.isOverLimit).toBe(true);
    expect(result.overLimitMinutes).toBeGreaterThan(0);
  });

  it("keeps stops within limit when total time fits in 09:00-21:00", () => {
    const places: Place[] = [
      place({ id: "A", latitude: 37.5, longitude: 127, dwellMinutes: 30 }),
      place({ id: "B", latitude: 37.51, longitude: 127.01, dwellMinutes: 30 }),
    ];
    const result = buildSchedule(places);
    expect(result.isOverLimit).toBe(false);
  });
});
