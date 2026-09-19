import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { TransitItinerary } from "@/lib/transit/types";

const getOdsayItineraryMock = vi.fn();
vi.mock("@/lib/transit/odsayClient", () => ({
  getOdsayItinerary: (...args: unknown[]) => getOdsayItineraryMock(...args),
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
    tmapGetRouteMock.mockReset();
  });

  it("잘못된 좌표는 400을 반환하고 ODsay를 호출하지 않는다", async () => {
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", fromLat: 999, fromLng: 127, toLat: 37.5, toLng: 127 }));
    expect(res.status).toBe(400);
    expect(getOdsayItineraryMock).not.toHaveBeenCalled();
  });

  it("가까운 구간(도보 임계값 이내)은 ODsay를 호출하지 않고 walk를 반환한다", async () => {
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...NEAR }));
    const json = await res.json();
    expect(json.kind).toBe("walk");
    expect(getOdsayItineraryMock).not.toHaveBeenCalled();
  });

  it("먼 구간은 ODsay 경로를 요청한다", async () => {
    getOdsayItineraryMock.mockResolvedValue(ITINERARY);
    const res = await POST(req({ fromPlaceId: "place-a", toPlaceId: "place-b", ...FAR }));
    const json = await res.json();
    expect(getOdsayItineraryMock).toHaveBeenCalledTimes(1);
    expect(json.kind).toBe("itinerary");
  });

  it("fromPlaceId/toPlaceId 순서를 바꾸지 않고 그대로 전달·반환한다", async () => {
    getOdsayItineraryMock.mockResolvedValue(ITINERARY);
    const res = await POST(req({ fromPlaceId: "place-a", toPlaceId: "place-b", ...FAR }));
    const json = await res.json();
    expect(json.itinerary.fromPlaceId).toBe("place-a");
    expect(json.itinerary.toPlaceId).toBe("place-b");
    // getOdsayItinerary(origin, destination, fromPlaceId, toPlaceId, locale) 순서 그대로 호출됐는지
    expect(getOdsayItineraryMock.mock.calls[0][2]).toBe("place-a");
    expect(getOdsayItineraryMock.mock.calls[0][3]).toBe("place-b");
  });

  it("ODsay가 결정한 첫 경로를 그대로 쓴다(대안 경로를 다시 고르지 않는다)", async () => {
    getOdsayItineraryMock.mockResolvedValue(ITINERARY);
    const res = await POST(req({ fromPlaceId: "place-a", toPlaceId: "place-b", ...FAR }));
    const json = await res.json();
    expect(json.itinerary).toEqual(ITINERARY);
  });

  it("ODsay가 실패하면(null) TMAP 추정치로 폴백한다", async () => {
    getOdsayItineraryMock.mockResolvedValue(null);
    tmapGetRouteMock.mockResolvedValue({ distanceMeters: 1400, durationSeconds: 1200, geometry: [] });
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR }));
    const json = await res.json();
    expect(json).toEqual({ kind: "estimate", durationMinutes: 20, estimateSource: "tmap" });
  });

  it("ODsay와 TMAP이 모두 실패하면 Haversine 추정치로 폴백한다", async () => {
    getOdsayItineraryMock.mockResolvedValue(null);
    tmapGetRouteMock.mockResolvedValue(null);
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR }));
    const json = await res.json();
    expect(json.kind).toBe("estimate");
    expect(json.estimateSource).toBe("haversine");
    expect(typeof json.durationMinutes).toBe("number");
  });

  it("ODsay/TMAP 실패에도 실제 역·버스 정보를 지어내지 않는다(estimate에는 steps가 없다)", async () => {
    getOdsayItineraryMock.mockResolvedValue(null);
    tmapGetRouteMock.mockResolvedValue(null);
    const res = await POST(req({ fromPlaceId: "a", toPlaceId: "b", ...FAR }));
    const json = await res.json();
    expect(json.steps).toBeUndefined();
    expect(json.itinerary).toBeUndefined();
  });
});
