// TMAP(SK Open API) 자동차 경로 안내 — 서버 전용. Route Handler에서만 import할 것.
// TMAP_APP_KEY는 브라우저에 노출되지 않는다(NEXT_PUBLIC_ 접두사 없음).

import { cacheGet, cacheSet } from "@/lib/cache";
import type { Coordinate, DirectionsProvider, RouteResult } from "./types";

const TMAP_API_BASE_URL =
  process.env.TMAP_API_BASE_URL ?? "https://apis.openapi.sk.com/tmap";
const TMAP_TIMEOUT_MS = 5000;

interface TmapFeature {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: { totalDistance?: number; totalTime?: number };
}

interface TmapRouteResponse {
  features?: TmapFeature[];
}

export function parseTmapResponse(json: TmapRouteResponse): RouteResult | null {
  const features = json.features;
  if (!Array.isArray(features) || features.length === 0) return null;

  // TMAP은 각 지점(Point)/구간(LineString) feature마다 그 시점까지의 누적
  // totalDistance/totalTime을 properties에 싣는다 — 가장 큰 값이 경로 총합이다.
  let distanceMeters = 0;
  let durationSeconds = 0;
  const geometry: [number, number][] = [];

  for (const f of features) {
    const d = f.properties?.totalDistance;
    const t = f.properties?.totalTime;
    if (typeof d === "number" && d > distanceMeters) distanceMeters = d;
    if (typeof t === "number" && t > durationSeconds) durationSeconds = t;

    if (f.geometry?.type === "LineString" && Array.isArray(f.geometry.coordinates)) {
      for (const c of f.geometry.coordinates as unknown[]) {
        if (Array.isArray(c) && c.length >= 2 && typeof c[0] === "number" && typeof c[1] === "number") {
          geometry.push([c[1], c[0]]); // TMAP은 [lng,lat] → Leaflet은 [lat,lng]
        }
      }
    }
  }

  if (distanceMeters === 0 && durationSeconds === 0) return null;
  return {
    distanceMeters: Math.round(distanceMeters),
    durationSeconds: Math.round(durationSeconds),
    geometry,
  };
}

/** 실패(키 없음/네트워크/이상 응답 등) 시 null만 반환 — throw하지 않는다. 호출부가 Haversine으로 폴백. */
export const tmapDirectionsProvider: DirectionsProvider = {
  async getRoute(start: Coordinate, end: Coordinate): Promise<RouteResult | null> {
    const appKey = process.env.TMAP_APP_KEY;
    if (!appKey) {
      console.warn("[tmap] TMAP_APP_KEY not set — skipping");
      return null;
    }

    const cacheKey = `tmap:${start.lat},${start.lng}:${end.lat},${end.lng}`;
    const cached = cacheGet<RouteResult>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${TMAP_API_BASE_URL}/routes?version=1`, {
        method: "POST",
        headers: { appKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          startX: String(start.lng),
          startY: String(start.lat),
          endX: String(end.lng),
          endY: String(end.lat),
          reqCoordType: "WGS84GEO",
          resCoordType: "WGS84GEO",
          searchOption: "0",
        }),
        signal: AbortSignal.timeout(TMAP_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) {
        console.error(`[tmap] routes HTTP ${res.status}`);
        return null;
      }
      const json = (await res.json()) as TmapRouteResponse;
      const result = parseTmapResponse(json);
      if (result) cacheSet(cacheKey, result);
      return result;
    } catch (err) {
      console.error("[tmap] routes failed:", err instanceof Error ? err.message : err);
      return null;
    }
  },
};
