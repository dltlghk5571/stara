import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { TransitItinerary } from "@/lib/transit/types";

const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

const getTmapTransitItineraryMock = vi.fn();
vi.mock("@/lib/transit/tmapTransitClient", () => ({
  getTmapTransitItinerary: (...args: unknown[]) => getTmapTransitItineraryMock(...args),
}));

const reserveTmapTransitCallSlotMock = vi.fn();
const isTmapTransitEnabledMock = vi.fn();
vi.mock("@/lib/transit/quota", () => ({
  reserveTmapTransitCallSlot: (...args: unknown[]) => reserveTmapTransitCallSlotMock(...args),
  isTmapTransitEnabled: (...args: unknown[]) => isTmapTransitEnabledMock(...args),
}));

const getCachedItineraryMock = vi.fn();
const setCachedItineraryMock = vi.fn();
vi.mock("@/lib/transit/itineraryCache", () => ({
  getCachedItinerary: (...args: unknown[]) => getCachedItineraryMock(...args),
  setCachedItinerary: (...args: unknown[]) => setCachedItineraryMock(...args),
}));

const tmapGetRouteMock = vi.fn();
vi.mock("@/lib/directions/tmapProvider", () => ({
  tmapDirectionsProvider: { getRoute: (...args: unknown[]) => tmapGetRouteMock(...args) },
}));

// 모킹 이후에 import해야 라우트가 모킹된 모듈을 집어간다.
const { POST } = await import("./route");

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/transit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const NEAR = { fromLat: 37.5, fromLng: 127.0, toLat: 37.5001, toLng: 127.0001 }; // ~15m, 도보 거리
const FAR = { fromLat: 37.5, fromLng: 127.0, toLat: 37.51, toLng: 127.01 }; // ~1.4km, 도보 임계값 초과

const ITINERARY: TransitItinerary = {
  fromPlaceId: "place-a",
  toPlaceId: "place-b",
  totalMinutes: 34,
  transferCount: 1,
  steps: [
    { type: "walk", durationMinutes: 5, distanceMeters: 380 },
    {
      type: "subway",
      lineName: "수인분당선",
      startName: "서울숲",
      endName: "왕십리",
      stationCount: 2,
      durationMinutes: 6,
    },
  ],
  provider: "tmap_transit",
};

describe("POST /api/transit", () => {
  beforeEach(() => {
    authMock.mockReset();
    authMock.mockResolvedValue({ userId: "user_1" }); // 기본값: 로그인 상태 — 명시적으로 오버라이드하지 않는 한
    getTmapTransitItineraryMock.mockReset();
    reserveTmapTransitCallSlotMock.mockReset();
    isTmapTransitEnabledMock.mockReset();
    isTmapTransitEnabledMock.mockReturnValue(true);
    getCachedItineraryMock.mockReset();
    getCachedItineraryMock.mockResolvedValue(null);
    setCachedItineraryMock.mockReset();
    tmapGetRouteMock.mockReset();
  });

  it("잘못된 좌표는 400을 반환하고 TMAP Transit을 호출하지 않는다", async () => {
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", fromLat: 999, fromLng: 127, toLat: 37.5, toLng: 127, detail: true }));
    expect(res.status).toBe(400);
    expect(getTmapTransitItineraryMock).not.toHaveBeenCalled();
  });

  describe("도보 구간 — detail 요청이어도, 미인증이어도 TMAP Transit을 절대 호출하지 않는다", () => {
    it("detail:false (기본 자동 로드)", async () => {
      const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...NEAR }));
      const json = await res.json();
      expect(json.kind).toBe("walk");
      expect(getTmapTransitItineraryMock).not.toHaveBeenCalled();
      expect(reserveTmapTransitCallSlotMock).not.toHaveBeenCalled();
    });

    it("detail:true + 미인증이어도 도보 구간이면 인증 체크보다 먼저 walk를 반환한다", async () => {
      authMock.mockResolvedValue({ userId: null });
      const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...NEAR, detail: true }));
      const json = await res.json();
      expect(json.kind).toBe("walk");
      expect(getTmapTransitItineraryMock).not.toHaveBeenCalled();
      expect(reserveTmapTransitCallSlotMock).not.toHaveBeenCalled();
    });
  });

  it("자동 로드(detail:false)는 먼 구간이어도 TMAP Transit/쿼터를 전혀 건드리지 않는다", async () => {
    tmapGetRouteMock.mockResolvedValue({ distanceMeters: 1400, durationSeconds: 1200, geometry: [] });
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR }));
    const json = await res.json();
    expect(json.kind).toBe("estimate");
    expect(json.reason).toBeUndefined();
    expect(getTmapTransitItineraryMock).not.toHaveBeenCalled();
    expect(reserveTmapTransitCallSlotMock).not.toHaveBeenCalled();
    expect(getCachedItineraryMock).not.toHaveBeenCalled();
  });

  it("미인증 사용자의 detail:true(먼 구간)는 401로 거부되고 쿼터를 건드리지 않는다", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
    expect(res.status).toBe(401);
    expect(getCachedItineraryMock).not.toHaveBeenCalled();
    expect(reserveTmapTransitCallSlotMock).not.toHaveBeenCalled();
    expect(getTmapTransitItineraryMock).not.toHaveBeenCalled();
  });

  it("요청 바디의 isTester/isAdmin 같은 자기신고 값으로는 인증을 우회할 수 없다", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await POST(
      req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true, isTester: true, isAdmin: true, canUseTransit: true })
    );
    expect(res.status).toBe(401);
  });

  it("인증된 사용자의 캐시 히트는 쿼터를 예약하지도, TMAP Transit을 호출하지도 않는다", async () => {
    getCachedItineraryMock.mockResolvedValue(ITINERARY);
    const res = await POST(req({ fromPlaceId: "place-a", toPlaceId: "place-b", ...FAR, detail: true }));
    const json = await res.json();
    expect(json.kind).toBe("itinerary");
    expect(json.itinerary).toEqual(ITINERARY);
    expect(reserveTmapTransitCallSlotMock).not.toHaveBeenCalled();
    expect(getTmapTransitItineraryMock).not.toHaveBeenCalled();
  });

  it("인증된 사용자의 캐시 미스 + 예산 이내면 원자적으로 슬롯을 예약한 뒤 TMAP Transit을 호출한다", async () => {
    reserveTmapTransitCallSlotMock.mockResolvedValue(true);
    getTmapTransitItineraryMock.mockResolvedValue(ITINERARY);
    const res = await POST(req({ fromPlaceId: "place-a", toPlaceId: "place-b", ...FAR, detail: true }));
    const json = await res.json();
    expect(reserveTmapTransitCallSlotMock).toHaveBeenCalledTimes(1);
    expect(getTmapTransitItineraryMock).toHaveBeenCalledTimes(1);
    expect(json.kind).toBe("itinerary");
  });

  it("TMAP Transit 성공 시 정규화된 itinerary를 캐시에 저장한다", async () => {
    reserveTmapTransitCallSlotMock.mockResolvedValue(true);
    getTmapTransitItineraryMock.mockResolvedValue(ITINERARY);
    await POST(req({ fromPlaceId: "place-a", toPlaceId: "place-b", ...FAR, detail: true, locale: "ko" }));
    expect(setCachedItineraryMock).toHaveBeenCalledTimes(1);
    expect(setCachedItineraryMock).toHaveBeenCalledWith("tmap_transit", "ko", { lat: 37.5, lng: 127.0 }, { lat: 37.51, lng: 127.01 }, ITINERARY);
  });

  it("캐시 조회는 쿼터 예약보다 먼저 일어난다(23번 항목 순서)", async () => {
    const order: string[] = [];
    getCachedItineraryMock.mockImplementation(async () => {
      order.push("cache");
      return null;
    });
    reserveTmapTransitCallSlotMock.mockImplementation(async () => {
      order.push("reserve");
      return true;
    });
    getTmapTransitItineraryMock.mockImplementation(async () => {
      order.push("upstream");
      return ITINERARY;
    });
    await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
    expect(order).toEqual(["cache", "reserve", "upstream"]);
  });

  it("예산이 소진됐으면(예약 실패) TMAP Transit을 호출하지 않고 quota_unavailable 추정치를 반환한다", async () => {
    reserveTmapTransitCallSlotMock.mockResolvedValue(false);
    tmapGetRouteMock.mockResolvedValue({ distanceMeters: 1400, durationSeconds: 1200, geometry: [] });
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
    const json = await res.json();
    expect(getTmapTransitItineraryMock).not.toHaveBeenCalled();
    expect(json).toEqual({ kind: "estimate", durationMinutes: 20, estimateSource: "tmap", reason: "quota_unavailable" });
  });

  it("TMAP_TRANSIT_ENABLED=false면 캐시/예약/호출 없이 disabled 추정치를 반환한다", async () => {
    isTmapTransitEnabledMock.mockReturnValue(false);
    tmapGetRouteMock.mockResolvedValue(null);
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
    const json = await res.json();
    expect(getCachedItineraryMock).not.toHaveBeenCalled();
    expect(reserveTmapTransitCallSlotMock).not.toHaveBeenCalled();
    expect(getTmapTransitItineraryMock).not.toHaveBeenCalled();
    expect(json.reason).toBe("disabled");
  });

  it("예약에는 성공했지만 TMAP Transit이 실패하면(null) 이미 소비한 슬롯은 그대로 두고 failed 추정치로 폴백한다", async () => {
    reserveTmapTransitCallSlotMock.mockResolvedValue(true);
    getTmapTransitItineraryMock.mockResolvedValue(null);
    tmapGetRouteMock.mockResolvedValue(null);
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
    const json = await res.json();
    expect(reserveTmapTransitCallSlotMock).toHaveBeenCalledTimes(1); // 슬롯은 이미 소비됨 — 되돌리지 않는다
    expect(getTmapTransitItineraryMock).toHaveBeenCalledTimes(1);
    expect(setCachedItineraryMock).not.toHaveBeenCalled(); // 실패한 응답은 캐시하지 않는다
    expect(json.kind).toBe("estimate");
    expect(json.reason).toBe("failed");
  });

  it("경로없음/오류 응답도(TMAP+Haversine 모두 실패) 역·버스 정보를 지어내지 않고 Haversine으로 폴백한다", async () => {
    reserveTmapTransitCallSlotMock.mockResolvedValue(true);
    getTmapTransitItineraryMock.mockResolvedValue(null);
    tmapGetRouteMock.mockResolvedValue(null);
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
    const json = await res.json();
    expect(json.kind).toBe("estimate");
    expect(json.estimateSource).toBe("haversine");
    expect(json.steps).toBeUndefined();
    expect(json.itinerary).toBeUndefined();
  });

  it("상위 업스트림 원본 오류/키 값을 절대 응답에 노출하지 않는다", async () => {
    reserveTmapTransitCallSlotMock.mockResolvedValue(true);
    getTmapTransitItineraryMock.mockResolvedValue(null);
    tmapGetRouteMock.mockResolvedValue(null);
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
    const text = JSON.stringify(await res.json());
    expect(text).not.toMatch(/appKey|apiKey|TMAP_TRANSIT_API_KEY/i);
  });

  it("fromPlaceId/toPlaceId 순서를 바꾸지 않고 그대로 전달·반환한다", async () => {
    reserveTmapTransitCallSlotMock.mockResolvedValue(true);
    getTmapTransitItineraryMock.mockResolvedValue(ITINERARY);
    const res = await POST(req({ fromPlaceId: "place-a", toPlaceId: "place-b", ...FAR, detail: true }));
    const json = await res.json();
    expect(json.itinerary.fromPlaceId).toBe("place-a");
    expect(json.itinerary.toPlaceId).toBe("place-b");
    expect(getTmapTransitItineraryMock.mock.calls[0][2]).toBe("place-a");
    expect(getTmapTransitItineraryMock.mock.calls[0][3]).toBe("place-b");
  });
});
