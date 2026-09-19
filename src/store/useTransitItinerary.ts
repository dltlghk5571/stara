import { useEffect, useState } from "react";
import type { Place } from "@/types";
import type { Locale } from "@/i18n";
import type { TransitGuideResponse } from "@/lib/transit/types";

export type TransitGuideState =
  | { status: "loading" }
  | { status: "ready"; data: TransitGuideResponse }
  | { status: "error" };

// 세션(탭) 동안 같은 구간+로케일로는 다시 요청하지 않도록 모듈 스코프에 캐시한다
// (useRouteDirections.ts와 동일 패턴).
const sessionCache = new Map<string, Promise<TransitGuideResponse | null>>();

function keyOf(from: Place, to: Place, locale: Locale): string {
  return `${from.id}>${to.id}:${locale}`;
}

async function fetchTransitGuide(
  from: Place,
  to: Place,
  locale: Locale
): Promise<TransitGuideResponse | null> {
  try {
    const res = await fetch("/api/transit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromPlaceId: from.id,
        toPlaceId: to.id,
        fromLat: from.latitude,
        fromLng: from.longitude,
        toLat: to.latitude,
        toLng: to.longitude,
        locale,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as TransitGuideResponse;
  } catch {
    return null;
  }
}

/**
 * Place A→B 구간의 이동 안내(도보/ODsay 대중교통/추정치)를 가져온다. 네트워크 실패나
 * 서버 오류는 "error" 상태로만 노출한다 — 호출부(MovementGuide)가 이 경우 Haversine
 * 추정치로 자체 폴백한다(10번 항목: 실패가 여행 진행을 막으면 안 된다).
 */
export function useTransitItinerary(from: Place, to: Place, locale: Locale): TransitGuideState {
  const key = keyOf(from, to, locale);
  const [state, setState] = useState<{ key: string; data: TransitGuideResponse | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let request = sessionCache.get(key);
    if (!request) {
      request = fetchTransitGuide(from, to, locale);
      sessionCache.set(key, request);
    }
    request.then((data) => {
      if (!cancelled) setState({ key, data });
    });
    return () => {
      cancelled = true;
    };
    // key(구간+로케일 signature)만으로 재요청 여부를 판단한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!state || state.key !== key) return { status: "loading" };
  if (!state.data) return { status: "error" };
  return { status: "ready", data: state.data };
}
