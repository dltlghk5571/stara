// route.ts(HTTP, 클라이언트용)와 main-route 서버 컴포넌트가 공유하는 구간 계산 로직.
// 방문 순서(stops)는 이미 STARA(Haversine 삽입 + 자동보완)가 결정한 것을 그대로 받는다 —
// 여기서는 절대 순서를 바꾸거나 순열 탐색을 하지 않고, 구간(leg)별 실제 거리/시간/geometry만 구한다.

import { tmapDirectionsProvider } from "./tmapProvider";
import { haversineDirectionsProvider } from "./haversineProvider";
import type { Coordinate } from "./types";

export interface RouteStop {
  id: string;
  lat: number;
  lng: number;
}

export interface RouteLeg {
  fromId: string;
  toId: string;
  distanceMeters: number;
  durationSeconds: number;
  source: "tmap" | "haversine";
}

export interface RouteLegsResult {
  legs: RouteLeg[];
  geometry: [number, number][];
}

export async function computeRouteLegs(stops: RouteStop[]): Promise<RouteLegsResult> {
  if (stops.length < 2) return { legs: [], geometry: [] };

  const legs: RouteLeg[] = [];
  const geometry: [number, number][] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const from: Coordinate = { lat: stops[i].lat, lng: stops[i].lng };
    const to: Coordinate = { lat: stops[i + 1].lat, lng: stops[i + 1].lng };

    const tmapResult = await tmapDirectionsProvider.getRoute(from, to);
    const result = tmapResult ?? (await haversineDirectionsProvider.getRoute(from, to));

    legs.push({
      fromId: stops[i].id,
      toId: stops[i + 1].id,
      distanceMeters: result.distanceMeters,
      durationSeconds: result.durationSeconds,
      source: tmapResult ? "tmap" : "haversine",
    });

    // 구간 시작점이 이전 구간의 끝점과 겹치므로 두 번째 구간부터는 첫 좌표를 잘라 이어붙인다.
    if (i === 0) geometry.push(...result.geometry);
    else geometry.push(...result.geometry.slice(1));
  }

  return { legs, geometry };
}
