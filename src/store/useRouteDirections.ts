import { useEffect, useState } from "react";
import type { Place } from "@/types";

interface RouteLeg {
  fromId: string;
  toId: string;
  distanceMeters: number;
  durationSeconds: number;
  source: "tmap" | "haversine";
}

export interface RouteDirectionsResult {
  legs: RouteLeg[];
  geometry: [number, number][];
}

const EMPTY: RouteDirectionsResult = { legs: [], geometry: [] };

// 세션(탭) 동안 같은 방문 순서로는 다시 요청하지 않도록 모듈 스코프에 캐시한다.
const sessionCache = new Map<string, Promise<RouteDirectionsResult>>();

function stopsKeyOf(places: Place[]): string {
  return places.map((p) => p.id).join(">");
}

async function fetchDirections(places: Place[]): Promise<RouteDirectionsResult> {
  try {
    const res = await fetch("/api/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stops: places.map((p) => ({ id: p.id, lat: p.latitude, lng: p.longitude })),
      }),
    });
    if (!res.ok) return EMPTY;
    return (await res.json()) as RouteDirectionsResult;
  } catch {
    return EMPTY;
  }
}

interface Loaded {
  key: string;
  result: RouteDirectionsResult;
}

/**
 * orderedPlaces의 구간별 실제 이동거리/시간/geometry를 가져온다.
 * TMAP 실패/키없음이면 서버가 이미 구간별로 Haversine 폴백을 적용한 결과가 온다.
 */
export function useRouteDirections(orderedPlaces: Place[]): RouteDirectionsResult {
  const key = orderedPlaces.length >= 2 ? stopsKeyOf(orderedPlaces) : null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!key) return;

    let cancelled = false;
    let request = sessionCache.get(key);
    if (!request) {
      request = fetchDirections(orderedPlaces);
      sessionCache.set(key, request);
    }

    request.then((result) => {
      if (!cancelled) setLoaded({ key, result });
    });

    return () => {
      cancelled = true;
    };
    // key(방문 순서 signature)만으로 재요청 여부를 판단한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key || !loaded || loaded.key !== key) return EMPTY;
  return loaded.result;
}
