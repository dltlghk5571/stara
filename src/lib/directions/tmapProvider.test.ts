import { describe, expect, it } from "vitest";
import { parseTmapResponse } from "./tmapProvider";

describe("parseTmapResponse", () => {
  it("정상 응답에서 총 거리/시간과 geometry를 뽑아낸다", () => {
    const result = parseTmapResponse({
      features: [
        { properties: { totalDistance: 0, totalTime: 0 } },
        {
          geometry: { type: "LineString", coordinates: [[127.0, 37.5], [127.001, 37.501]] },
          properties: { totalDistance: 150, totalTime: 120 },
        },
        {
          geometry: { type: "LineString", coordinates: [[127.001, 37.501], [127.002, 37.502]] },
          properties: { totalDistance: 300, totalTime: 240 },
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result?.distanceMeters).toBe(300);
    expect(result?.durationSeconds).toBe(240);
    // TMAP [lng,lat] -> [lat,lng]로 뒤집혔는지 확인
    expect(result?.geometry[0]).toEqual([37.5, 127.0]);
    expect(result?.geometry.length).toBe(4);
  });

  it("features가 없으면 null을 반환한다", () => {
    expect(parseTmapResponse({})).toBeNull();
    expect(parseTmapResponse({ features: [] })).toBeNull();
  });

  it("숫자 properties가 전혀 없는 이상 응답이면 null을 반환한다", () => {
    const result = parseTmapResponse({
      features: [{ geometry: { type: "LineString", coordinates: [[127, 37.5]] } }],
    });
    expect(result).toBeNull();
  });

  it("좌표가 깨진 경우 해당 포인트만 건너뛴다", () => {
    const result = parseTmapResponse({
      features: [
        {
          geometry: { type: "LineString", coordinates: [[127, 37.5], "broken", [127.1, 37.6]] },
          properties: { totalDistance: 100, totalTime: 60 },
        },
      ],
    });
    expect(result?.geometry).toEqual([
      [37.5, 127],
      [37.6, 127.1],
    ]);
  });
});
