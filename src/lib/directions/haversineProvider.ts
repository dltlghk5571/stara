// 기존 lib/distance.ts의 Haversine 추정치를 DirectionsProvider 인터페이스로 감싼 것.
// 새 수식은 없음 — TMAP 실패 시의 폴백 전용이며 항상 성공한다.

import { estimateTravelMinutes, haversineKm } from "@/lib/distance";
import type { Coordinate, RouteResult } from "./types";

// DirectionsProvider로 타입을 못박지 않고 추론에 맡긴다 — getRoute가 항상 non-null을 반환한다는
// 사실을 타입에 그대로 남겨서, 이걸 폴백으로 쓰는 곳(api/directions)에서 null 체크가 필요 없게 한다.
export const haversineDirectionsProvider = {
  async getRoute(start: Coordinate, end: Coordinate): Promise<RouteResult> {
    const km = haversineKm(
      { latitude: start.lat, longitude: start.lng },
      { latitude: end.lat, longitude: end.lng }
    );
    const minutes = estimateTravelMinutes(km);
    return {
      distanceMeters: Math.round(km * 1000),
      durationSeconds: Math.round(minutes * 60),
      geometry: [
        [start.lat, start.lng],
        [end.lat, end.lng],
      ],
    };
  },
};
