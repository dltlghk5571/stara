import { describe, expect, it } from "vitest";
import { parseTmapTransitResponse } from "./tmapTransitClient";

function walkLeg(overrides: Record<string, unknown> = {}) {
  return { mode: "WALK", sectionTime: 300, distance: 380, end: { name: "서울숲역" }, ...overrides };
}

function subwayLeg(overrides: Record<string, unknown> = {}) {
  return {
    mode: "SUBWAY",
    sectionTime: 360,
    route: "수인분당선",
    start: { name: "서울숲" },
    end: { name: "왕십리" },
    passStopList: { stationList: [{ stationName: "서울숲" }, { stationName: "왕십리" }] },
    ...overrides,
  };
}

function busLeg(overrides: Record<string, unknown> = {}) {
  return {
    mode: "BUS",
    sectionTime: 1020,
    route: "421",
    start: { name: "왕십리역" },
    end: { name: "종점" },
    passStopList: {
      stationList: Array.from({ length: 8 }, (_, i) => ({ stationName: `정류장${i}` })),
    },
    ...overrides,
  };
}

function tmapJson(legs: unknown[], itineraryOverrides: Record<string, unknown> = {}) {
  return {
    metaData: {
      plan: {
        itineraries: [{ totalTime: 2040, legs, ...itineraryOverrides }],
      },
    },
  };
}

describe("parseTmapTransitResponse", () => {
  it("WALK 단독 구간을 매핑한다", () => {
    const result = parseTmapTransitResponse(tmapJson([walkLeg()]), "A", "B");
    expect(result?.steps).toEqual([{ type: "walk", durationMinutes: 5, distanceMeters: 380, toName: "서울숲역" }]);
  });

  it("SUBWAY 구간을 매핑한다(노선명/역/정거장 수, 방향은 지어내지 않음)", () => {
    const result = parseTmapTransitResponse(tmapJson([subwayLeg()]), "A", "B");
    expect(result?.steps[0]).toEqual({
      type: "subway",
      lineName: "수인분당선",
      startName: "서울숲",
      endName: "왕십리",
      stationCount: 2,
      durationMinutes: 6,
    });
    expect(result?.steps[0]).not.toHaveProperty("direction");
  });

  it("BUS 구간을 매핑한다(버스번호/역/정거장 수)", () => {
    const result = parseTmapTransitResponse(tmapJson([busLeg()]), "A", "B");
    expect(result?.steps[0]).toEqual({
      type: "bus",
      busNumber: "421",
      startName: "왕십리역",
      endName: "종점",
      stationCount: 8,
      durationMinutes: 17,
    });
  });

  it("WALK + SUBWAY + WALK 순서를 그대로 매핑한다", () => {
    const result = parseTmapTransitResponse(tmapJson([walkLeg(), subwayLeg(), walkLeg({ end: { name: "도착지" } })]), "A", "B");
    expect(result?.steps.map((s) => s.type)).toEqual(["walk", "subway", "walk"]);
  });

  it("WALK + BUS + WALK 순서를 그대로 매핑한다", () => {
    const result = parseTmapTransitResponse(tmapJson([walkLeg(), busLeg(), walkLeg({ end: undefined })]), "A", "B");
    expect(result?.steps.map((s) => s.type)).toEqual(["walk", "bus", "walk"]);
  });

  it("BUS+SUBWAY 환승 경로를 매핑하고 환승 횟수를 계산한다", () => {
    const result = parseTmapTransitResponse(
      tmapJson([walkLeg(), subwayLeg(), busLeg(), walkLeg()], { transferCount: 1 }),
      "A",
      "B"
    );
    expect(result?.steps.map((s) => s.type)).toEqual(["walk", "subway", "bus", "walk"]);
    expect(result?.transferCount).toBe(1);
  });

  it("transferCount가 응답에 없으면 도보 제외 교통수단 구간 수 - 1로 계산한다", () => {
    const result = parseTmapTransitResponse(tmapJson([subwayLeg(), busLeg()]), "A", "B");
    expect(result?.transferCount).toBe(1);
  });

  it("여러 정류장을 가진 stationList의 개수를 정확히 센다", () => {
    const longBus = busLeg({
      passStopList: { stationList: Array.from({ length: 15 }, () => ({ stationName: "x" })) },
    });
    const result = parseTmapTransitResponse(tmapJson([longBus]), "A", "B");
    expect(result?.steps[0]).toMatchObject({ stationCount: 15 });
  });

  it("fare(숫자)를 그대로 담는다", () => {
    const result = parseTmapTransitResponse(tmapJson([busLeg()], { fare: 1500 }), "A", "B");
    expect(result?.fare).toBe(1500);
  });

  it("fare가 { regular: { totalFare } } 형태로 와도 추출한다", () => {
    const result = parseTmapTransitResponse(tmapJson([busLeg()], { fare: { regular: { totalFare: 1550 } } }), "A", "B");
    expect(result?.fare).toBe(1550);
  });

  it("한국어 노선명을 그대로 담는다", () => {
    const result = parseTmapTransitResponse(tmapJson([subwayLeg({ route: "2호선" })]), "A", "B");
    expect(result?.steps[0]).toMatchObject({ lineName: "2호선" });
  });

  it("영문 노선명을 그대로 담는다(번역하지 않고 API가 준 값 그대로)", () => {
    const result = parseTmapTransitResponse(tmapJson([subwayLeg({ route: "Line 2" })]), "A", "B");
    expect(result?.steps[0]).toMatchObject({ lineName: "Line 2" });
  });

  it("route가 없어도 Lane[0].route가 있으면 보조로 쓴다", () => {
    const result = parseTmapTransitResponse(
      tmapJson([busLeg({ route: undefined, Lane: [{ route: "402" }] })]),
      "A",
      "B"
    );
    expect(result?.steps[0]).toMatchObject({ busNumber: "402" });
  });

  it("route가 없어도 소문자 lane[0].route(케이스 차이)가 있으면 보조로 쓴다", () => {
    const result = parseTmapTransitResponse(
      tmapJson([busLeg({ route: undefined, lane: [{ route: "402" }] })]),
      "A",
      "B"
    );
    expect(result?.steps[0]).toMatchObject({ busNumber: "402" });
  });

  it('카테고리 접두사("간선:400")는 표시용으로 정리하되 원래 번호를 바꾸지 않는다', () => {
    const result = parseTmapTransitResponse(tmapJson([busLeg({ route: "간선:400" })]), "A", "B");
    expect(result?.steps[0]).toMatchObject({ busNumber: "400" });
  });

  it("route/Lane 둘 다 없는 SUBWAY 구간은(필수 식별 누락) 경로 전체를 버린다", () => {
    const result = parseTmapTransitResponse(tmapJson([subwayLeg({ route: undefined, Lane: undefined, lane: undefined })]), "A", "B");
    expect(result).toBeNull();
  });

  it("route/Lane 둘 다 없는 BUS 구간은(필수 식별 누락) 경로 전체를 버린다", () => {
    const result = parseTmapTransitResponse(tmapJson([busLeg({ route: undefined, Lane: undefined, lane: undefined })]), "A", "B");
    expect(result).toBeNull();
  });

  it("start/end 이름이 없는 교통수단 구간은 경로 전체를 버린다", () => {
    const result = parseTmapTransitResponse(tmapJson([subwayLeg({ start: undefined })]), "A", "B");
    expect(result).toBeNull();
  });

  it("지원하지 않는 모드(AIRPLANE 등)가 섞여 있으면 경로 전체를 버린다(부분 노출 금지)", () => {
    const result = parseTmapTransitResponse(tmapJson([walkLeg(), { mode: "AIRPLANE", sectionTime: 3600 }]), "A", "B");
    expect(result).toBeNull();
  });

  it("itineraries가 비어 있으면 null을 반환한다(경로 없음)", () => {
    expect(parseTmapTransitResponse({ metaData: { plan: { itineraries: [] } } }, "A", "B")).toBeNull();
  });

  it("legs가 비어 있으면 null을 반환한다", () => {
    expect(parseTmapTransitResponse(tmapJson([]), "A", "B")).toBeNull();
  });

  it("metaData/plan/itineraries가 아예 없는 오류 응답이면 null을 반환한다", () => {
    expect(parseTmapTransitResponse({}, "A", "B")).toBeNull();
    expect(parseTmapTransitResponse(null, "A", "B")).toBeNull();
    expect(parseTmapTransitResponse({ error: { message: "invalid appKey" } }, "A", "B")).toBeNull();
  });

  it("fromPlaceId/toPlaceId와 provider를 그대로 담는다", () => {
    const result = parseTmapTransitResponse(tmapJson([walkLeg()]), "place-a", "place-b");
    expect(result?.fromPlaceId).toBe("place-a");
    expect(result?.toPlaceId).toBe("place-b");
    expect(result?.provider).toBe("tmap_transit");
  });
});
