import { describe, expect, it } from "vitest";
import { parseOdsayResponse } from "./odsayClient";

function walkSub(overrides: Record<string, unknown> = {}) {
  return { trafficType: 3, distance: 380, sectionTime: 5, endName: "서울숲역", ...overrides };
}

function subwaySub(overrides: Record<string, unknown> = {}) {
  return {
    trafficType: 1,
    sectionTime: 6,
    startName: "서울숲",
    endName: "왕십리",
    stationCount: 2,
    way: "왕십리 방면",
    lane: [{ name: "수인분당선" }],
    ...overrides,
  };
}

function busSub(overrides: Record<string, unknown> = {}) {
  return {
    trafficType: 2,
    sectionTime: 17,
    startName: "왕십리역",
    endName: "종점",
    stationCount: 8,
    lane: [{ busNo: "421" }],
    ...overrides,
  };
}

function odsayJson(subPath: unknown[], info: Record<string, unknown> = {}) {
  return { result: { path: [{ info: { totalTime: 34, ...info }, subPath }] } };
}

describe("parseOdsayResponse", () => {
  it("도보 구간을 매핑한다", () => {
    const result = parseOdsayResponse(odsayJson([walkSub()]), "A", "B");
    expect(result?.steps[0]).toEqual({
      type: "walk",
      durationMinutes: 5,
      distanceMeters: 380,
      toName: "서울숲역",
    });
  });

  it("지하철 구간을 매핑한다(노선명/방향/역/정류장 수 포함)", () => {
    const result = parseOdsayResponse(odsayJson([subwaySub()]), "A", "B");
    expect(result?.steps[0]).toEqual({
      type: "subway",
      lineName: "수인분당선",
      direction: "왕십리 방면",
      startName: "서울숲",
      endName: "왕십리",
      stationCount: 2,
      durationMinutes: 6,
    });
  });

  it("버스 구간을 매핑한다(버스번호/역/정류장 수 포함)", () => {
    const result = parseOdsayResponse(odsayJson([busSub()]), "A", "B");
    expect(result?.steps[0]).toEqual({
      type: "bus",
      busNumber: "421",
      startName: "왕십리역",
      endName: "종점",
      stationCount: 8,
      durationMinutes: 17,
    });
  });

  it("버스+지하철 환승 경로를 순서대로 매핑하고 환승 횟수를 계산한다", () => {
    const result = parseOdsayResponse(
      odsayJson([walkSub(), subwaySub(), busSub(), walkSub({ endName: undefined })]),
      "A",
      "B"
    );
    expect(result?.steps.map((s) => s.type)).toEqual(["walk", "subway", "bus", "walk"]);
    expect(result?.transferCount).toBe(1); // subway + bus 2개 구간 - 1
    expect(result?.totalMinutes).toBe(34);
    expect(result?.totalWalkMinutes).toBe(10); // 5 + 5
  });

  it("stationCount가 없으면 0으로 기본값 처리한다", () => {
    const result = parseOdsayResponse(
      odsayJson([subwaySub({ stationCount: undefined })]),
      "A",
      "B"
    );
    expect(result?.steps[0]).toMatchObject({ stationCount: 0 });
  });

  it("지하철 way(방향)가 없으면 direction을 생략한다(undefined) — 지어내지 않는다", () => {
    const result = parseOdsayResponse(odsayJson([subwaySub({ way: undefined })]), "A", "B");
    expect(result?.steps[0]).toMatchObject({ direction: undefined });
  });

  it("lane 데이터가 깨진 지하철/버스 구간이 있으면 경로 전체를 버린다(부분 정보 노출 금지)", () => {
    const noLaneSubway = parseOdsayResponse(
      odsayJson([subwaySub({ lane: [] })]),
      "A",
      "B"
    );
    expect(noLaneSubway).toBeNull();

    const noLaneBus = parseOdsayResponse(odsayJson([busSub({ lane: undefined })]), "A", "B");
    expect(noLaneBus).toBeNull();

    const mixedWithBroken = parseOdsayResponse(
      odsayJson([subwaySub(), busSub({ lane: [{}] })]),
      "A",
      "B"
    );
    expect(mixedWithBroken).toBeNull();
  });

  it("경로가 없으면(path 빈 배열/누락) null을 반환한다", () => {
    expect(parseOdsayResponse({ result: { path: [] } }, "A", "B")).toBeNull();
    expect(parseOdsayResponse({ result: {} }, "A", "B")).toBeNull();
    expect(parseOdsayResponse({}, "A", "B")).toBeNull();
    expect(parseOdsayResponse(null, "A", "B")).toBeNull();
  });

  it("subPath가 비어 있으면 null을 반환한다", () => {
    expect(parseOdsayResponse(odsayJson([]), "A", "B")).toBeNull();
  });

  it("fromPlaceId/toPlaceId와 fare를 그대로 담는다", () => {
    const result = parseOdsayResponse(odsayJson([busSub()], { payment: 1500 }), "place-a", "place-b");
    expect(result?.fromPlaceId).toBe("place-a");
    expect(result?.toPlaceId).toBe("place-b");
    expect(result?.fare).toBe(1500);
    expect(result?.provider).toBe("odsay");
  });
});
