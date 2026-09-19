import { describe, expect, it } from "vitest";
import { stepChain, transitStepCount, googleMapsDirectionsUrl } from "./presentation";
import type { TransitItinerary, TransitStep } from "./types";

describe("stepChain", () => {
  it("도보/지하철/버스를 아이콘+실제 데이터 체인으로 만든다", () => {
    const steps: TransitStep[] = [
      { type: "walk", durationMinutes: 5, distanceMeters: 380 },
      {
        type: "subway",
        lineName: "수인분당선",
        startName: "서울숲",
        endName: "왕십리",
        stationCount: 2,
        durationMinutes: 6,
      },
      {
        type: "bus",
        busNumber: "421",
        startName: "왕십리역",
        endName: "종점",
        stationCount: 8,
        durationMinutes: 17,
      },
    ];
    expect(stepChain(steps)).toEqual(["🚶", "🚇 수인분당선", "🚌 421"]);
  });

  it("빈 배열이면 빈 체인을 반환한다", () => {
    expect(stepChain([])).toEqual([]);
  });
});

describe("transitStepCount", () => {
  const base: TransitItinerary = {
    fromPlaceId: "A",
    toPlaceId: "B",
    totalMinutes: 30,
    steps: [],
    provider: "odsay",
  };

  it("도보를 제외한 교통수단 구간만 센다", () => {
    const itinerary: TransitItinerary = {
      ...base,
      steps: [
        { type: "walk", durationMinutes: 5, distanceMeters: 100 },
        {
          type: "subway",
          lineName: "2호선",
          startName: "A",
          endName: "B",
          stationCount: 3,
          durationMinutes: 8,
        },
        { type: "bus", busNumber: "100", startName: "A", endName: "B", stationCount: 5, durationMinutes: 10 },
        { type: "walk", durationMinutes: 3, distanceMeters: 50 },
      ],
    };
    expect(transitStepCount(itinerary)).toBe(2);
  });
});

describe("googleMapsDirectionsUrl", () => {
  it("좌표로 대중교통 모드 구글맵 링크를 만든다", () => {
    const url = googleMapsDirectionsUrl(
      { latitude: 37.5, longitude: 127.0 },
      { latitude: 37.51, longitude: 127.01 }
    );
    expect(url).toContain("https://www.google.com/maps/dir/?");
    expect(url).toContain("origin=37.5%2C127");
    expect(url).toContain("destination=37.51%2C127.01");
    expect(url).toContain("travelmode=transit");
  });
});
