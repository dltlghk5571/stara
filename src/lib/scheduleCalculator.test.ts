import { describe, expect, it } from "vitest";
import { buildSchedule, pickTmoneySegmentIndex } from "./scheduleCalculator";
import { SUB_QUEST_TEMPLATES } from "@/data/quests";
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

  it("legDurationOverridesSec가 있는 구간은 Haversine 대신 그 값을 쓴다", () => {
    const A = place({ id: "A", latitude: 37.5, longitude: 127, dwellMinutes: 0 });
    const B = place({ id: "B", latitude: 37.51, longitude: 127.01, dwellMinutes: 0 });
    const overrides = new Map([["A__B", 600]]); // 실제 이동시간 10분(600초)이라고 가정
    const result = buildSchedule([A, B], "09:00", overrides);
    expect(result.stops[1].travelMinutesFromPrev).toBe(10);
    expect(result.stops[1].arrival).toBe("09:10");
  });

  it("override가 없는 구간은 기존 Haversine 추정치를 그대로 쓴다(구간 단위 폴백)", () => {
    const A = place({ id: "A", latitude: 37.5, longitude: 127, dwellMinutes: 0 });
    const B = place({ id: "B", latitude: 37.51, longitude: 127.01, dwellMinutes: 0 });
    const withoutOverride = buildSchedule([A, B]);
    const withUnrelatedOverride = buildSchedule([A, B], "09:00", new Map([["X__Y", 1]]));
    expect(withUnrelatedOverride.stops[1].travelMinutesFromPrev).toBe(
      withoutOverride.stops[1].travelMinutesFromPrev
    );
  });
});

function places(n: number): Place[] {
  return Array.from({ length: n }, (_, i) =>
    place({ id: `P${i}`, latitude: 37.5 + i * 0.01, longitude: 127 + i * 0.01, dwellMinutes: 5 })
  );
}

function tmoneySegments(stops: ReturnType<typeof buildSchedule>["stops"]) {
  return stops.filter((s) => s.segmentQuest?.verification?.type === "tmoney_photo");
}

describe("pickTmoneySegmentIndex", () => {
  it("구간이 없으면(장소 0~1개) -1을 반환한다", () => {
    expect(pickTmoneySegmentIndex(0)).toBe(-1);
  });

  it("구간이 1개면 그 구간(인덱스 0)을 반환한다 — 짧은 루트도 반드시 배정된다", () => {
    expect(pickTmoneySegmentIndex(1)).toBe(0);
  });

  it("구간이 여러 개면 중간 인덱스를 결정론적으로 반환한다", () => {
    expect(pickTmoneySegmentIndex(4)).toBe(1);
    expect(pickTmoneySegmentIndex(9)).toBe(4);
  });

  it("같은 입력이면 항상 같은 결과다(랜덤 없음)", () => {
    expect(pickTmoneySegmentIndex(7)).toBe(pickTmoneySegmentIndex(7));
  });
});

describe("buildSchedule — T-money 세그먼트 퀘스트 배정", () => {
  it("장소가 1개(구간 0개)면 세그먼트 퀘스트 자체가 없다 — 짧은 루트 동작 정의", () => {
    const result = buildSchedule(places(1));
    expect(result.stops.every((s) => !s.segmentQuest)).toBe(true);
  });

  it("장소가 2개(구간 1개)면 그 유일한 구간이 T-money 퀘스트다 — 짧은 루트도 반드시 1회 배정", () => {
    const result = buildSchedule(places(2));
    const tmoney = tmoneySegments(result.stops);
    expect(tmoney).toHaveLength(1);
    expect(result.stops[1].segmentQuest?.verification).toEqual({ type: "tmoney_photo" });
  });

  it("여행당 T-money 퀘스트는 정확히 1개만 생성된다(구간이 많아도)", () => {
    const result = buildSchedule(places(8)); // 구간 7개
    expect(tmoneySegments(result.stops)).toHaveLength(1);
  });

  it("T-money 퀘스트는 결정론적 '중간' 구간에 배정된다", () => {
    const result = buildSchedule(places(5)); // 구간 4개 -> pickTmoneySegmentIndex(4) === 1 -> stops[2] (segmentIndex 1)
    expect(result.stops[2].segmentQuest?.verification?.type).toBe("tmoney_photo");
    expect(result.stops[1].segmentQuest?.verification).toBeUndefined();
    expect(result.stops[3].segmentQuest?.verification).toBeUndefined();
  });

  it("T-money가 아닌 구간은 여전히 기존 보너스 퀘스트 풀을 순환 배정한다", () => {
    const result = buildSchedule(places(5));
    const nonTmoney = result.stops.slice(1).filter((s) => s.segmentQuest?.verification?.type !== "tmoney_photo");
    for (const stop of nonTmoney) {
      expect(SUB_QUEST_TEMPLATES.some((t) => t.titleKo === stop.segmentQuest?.titleKo)).toBe(true);
    }
  });

  it("같은 장소 목록으로 다시 계산해도 같은 구간에 T-money가 배정된다(결정론적)", () => {
    const p = places(6);
    const first = tmoneySegments(buildSchedule(p).stops)[0]?.segmentQuest?.segmentId;
    const second = tmoneySegments(buildSchedule(p).stops)[0]?.segmentQuest?.segmentId;
    expect(first).toBe(second);
  });

  it("각 세그먼트 퀘스트는 segmentId 기반 고유 id를 가진다(T-money 포함)", () => {
    const result = buildSchedule(places(3));
    const ids = result.stops.slice(1).map((s) => s.segmentQuest?.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id?.startsWith("subquest-"))).toBe(true);
  });
});
