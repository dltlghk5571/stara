import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { TransitItinerary } from "@/lib/transit/types";

const getOdsayItineraryMock = vi.fn();
vi.mock("@/lib/transit/odsayClient", () => ({
  getOdsayItinerary: (...args: unknown[]) => getOdsayItineraryMock(...args),
}));

const reserveOdsayCallSlotMock = vi.fn();
const isOdsayEnabledMock = vi.fn();
vi.mock("@/lib/transit/quota", () => ({
  reserveOdsayCallSlot: (...args: unknown[]) => reserveOdsayCallSlotMock(...args),
  isOdsayEnabled: (...args: unknown[]) => isOdsayEnabledMock(...args),
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
  source: "odsay",
};

describe("POST /api/transit", () => {
  beforeEach(() => {
    getOdsayItineraryMock.mockReset();
    reserveOdsayCallSlotMock.mockReset();
    isOdsayEnabledMock.mockReset();
    isOdsayEnabledMock.mockReturnValue(true);
    tmapGetRouteMock.mockReset();
  });

  it("잘못된 좌표는 400을 반환하고 ODsay를 호출하지 않는다", async () => {
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", fromLat: 999, fromLng: 127, toLat: 37.5, toLng: 127, detail: true }));
    expect(res.status).toBe(400);
    expect(getOdsayItineraryMock).not.toHaveBeenCalled();
  });

  describe("도보 구간 — detail 요청이어도 ODsay를 절대 호출하지 않는다", () => {
    it("detail:false (기본 자동 로드)", async () => {
      const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...NEAR }));
      const json = await res.json();
      expect(json.kind).toBe("walk");
      expect(getOdsayItineraryMock).not.toHaveBeenCalled();
      expect(reserveOdsayCallSlotMock).not.toHaveBeenCalled();
    });

    it("detail:true (사용자가 상세 경로를 요청해도)", async () => {
      const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...NEAR, detail: true }));
      const json = await res.json();
      expect(json.kind).toBe("walk");
      expect(getOdsayItineraryMock).not.toHaveBeenCalled();
      expect(reserveOdsayCallSlotMock).not.toHaveBeenCalled();
    });
  });

  describe("자동 로드(detail:false 또는 생략) — 먼 구간이어도 ODsay를 호출하지 않는다", () => {
    it("estimate만 반환하고 ODsay/쿼터를 전혀 건드리지 않는다", async () => {
      tmapGetRouteMock.mockResolvedValue({ distanceMeters: 1400, durationSeconds: 1200, geometry: [] });
      const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR }));
      const json = await res.json();
      expect(json.kind).toBe("estimate");
      expect(json.reason).toBeUndefined();
      expect(getOdsayItineraryMock).not.toHaveBeenCalled();
      expect(reserveOdsayCallSlotMock).not.toHaveBeenCalled();
    });
  });

  describe("상세 요청(detail:true) — 쿼터", () => {
    it("예산 이내면 원자적으로 슬롯을 예약한 뒤 ODsay를 호출한다", async () => {
      reserveOdsayCallSlotMock.mockResolvedValue(true);
      getOdsayItineraryMock.mockResolvedValue(ITINERARY);
      const res = await POST(req({ fromPlaceId: "place-a", toPlaceId: "place-b", ...FAR, detail: true }));
      const json = await res.json();
      expect(reserveOdsayCallSlotMock).toHaveBeenCalledTimes(1);
      expect(getOdsayItineraryMock).toHaveBeenCalledTimes(1);
      expect(json.kind).toBe("itinerary");
    });

    it("예산이 소진됐으면(예약 실패) ODsay를 호출하지 않고 quota_unavailable 추정치를 반환한다", async () => {
      reserveOdsayCallSlotMock.mockResolvedValue(false);
      tmapGetRouteMock.mockResolvedValue({ distanceMeters: 1400, durationSeconds: 1200, geometry: [] });
      const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
      const json = await res.json();
      expect(getOdsayItineraryMock).not.toHaveBeenCalled();
      expect(json).toEqual({ kind: "estimate", durationMinutes: 20, estimateSource: "tmap", reason: "quota_unavailable" });
    });

    it("ODSAY_ENABLED=false면 예약/호출 없이 disabled 추정치를 반환한다", async () => {
      isOdsayEnabledMock.mockReturnValue(false);
      tmapGetRouteMock.mockResolvedValue(null);
      const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
      const json = await res.json();
      expect(reserveOdsayCallSlotMock).not.toHaveBeenCalled();
      expect(getOdsayItineraryMock).not.toHaveBeenCalled();
      expect(json.reason).toBe("disabled");
    });

    it("예약에는 성공했지만 ODsay가 실패하면(null) 이미 소비한 슬롯은 그대로 두고 failed 추정치로 폴백한다", async () => {
      reserveOdsayCallSlotMock.mockResolvedValue(true);
      getOdsayItineraryMock.mockResolvedValue(null);
      tmapGetRouteMock.mockResolvedValue(null);
      const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
      const json = await res.json();
      expect(reserveOdsayCallSlotMock).toHaveBeenCalledTimes(1); // 슬롯은 이미 소비됨 — 되돌리지 않는다
      expect(getOdsayItineraryMock).toHaveBeenCalledTimes(1); // 실제로 시도는 했다
      expect(json.kind).toBe("estimate");
      expect(json.reason).toBe("failed");
    });

    it("예약은 항상 ODsay 호출보다 먼저 일어난다(순서 보장)", async () => {
      const order: string[] = [];
      reserveOdsayCallSlotMock.mockImplementation(async () => {
        order.push("reserve");
        return true;
      });
      getOdsayItineraryMock.mockImplementation(async () => {
        order.push("odsay");
        return ITINERARY;
      });
      await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
      expect(order).toEqual(["reserve", "odsay"]);
    });
  });

  it("fromPlaceId/toPlaceId 순서를 바꾸지 않고 그대로 전달·반환한다", async () => {
    reserveOdsayCallSlotMock.mockResolvedValue(true);
    getOdsayItineraryMock.mockResolvedValue(ITINERARY);
    const res = await POST(req({ fromPlaceId: "place-a", toPlaceId: "place-b", ...FAR, detail: true }));
    const json = await res.json();
    expect(json.itinerary.fromPlaceId).toBe("place-a");
    expect(json.itinerary.toPlaceId).toBe("place-b");
    expect(getOdsayItineraryMock.mock.calls[0][2]).toBe("place-a");
    expect(getOdsayItineraryMock.mock.calls[0][3]).toBe("place-b");
  });

  it("ODsay가 결정한 첫 경로를 그대로 쓴다(대안 경로를 다시 고르지 않는다)", async () => {
    reserveOdsayCallSlotMock.mockResolvedValue(true);
    getOdsayItineraryMock.mockResolvedValue(ITINERARY);
    const res = await POST(req({ fromPlaceId: "place-a", toPlaceId: "place-b", ...FAR, detail: true }));
    const json = await res.json();
    expect(json.itinerary).toEqual(ITINERARY);
  });

  it("ODsay/TMAP이 모두 실패하면 Haversine 추정치로 폴백한다(역·버스 정보를 지어내지 않는다)", async () => {
    reserveOdsayCallSlotMock.mockResolvedValue(true);
    getOdsayItineraryMock.mockResolvedValue(null);
    tmapGetRouteMock.mockResolvedValue(null);
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR, detail: true }));
    const json = await res.json();
    expect(json.kind).toBe("estimate");
    expect(json.estimateSource).toBe("haversine");
    expect(json.steps).toBeUndefined();
    expect(json.itinerary).toBeUndefined();
  });
});
