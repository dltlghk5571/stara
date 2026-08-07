import { TRAVEL_CONFIG } from "@/config";
import type { Place } from "@/types";

const EARTH_RADIUS_KM = 6371;

/** 두 좌표 간 직선거리(km) 계산 (Haversine 공식) */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 직선거리를 실제 이동시간(분)으로 환산.
 * 짧은 거리는 도보, 먼 거리는 대중교통(고정 오버헤드 포함)으로 가정하는 단순 상수 모델.
 * 향후 DirectionsProvider(TMAP/Kakao 등)로 교체 가능하도록 이 함수만 바꾸면 됨.
 */
export function estimateTravelMinutes(distanceKm: number): number {
  const adjusted = distanceKm * TRAVEL_CONFIG.detourFactor;
  if (adjusted <= TRAVEL_CONFIG.walkThresholdKm) {
    return (adjusted / TRAVEL_CONFIG.walkSpeedKmh) * 60;
  }
  return (
    TRAVEL_CONFIG.transitOverheadMin +
    (adjusted / TRAVEL_CONFIG.transitSpeedKmh) * 60
  );
}

export function travelMinutesBetween(a: Place, b: Place): number {
  return estimateTravelMinutes(haversineKm(a, b));
}
