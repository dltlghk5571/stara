// TMAP(SK Open API) 대중교통 경로 안내(Public Transit) — 서버 전용. 기존 TMAP 자동차
// 길찾기(src/lib/directions/tmapProvider.ts, TMAP_APP_KEY)와는 완전히 다른 제품/쿼터다 —
// 같은 appKey가 이 상품에도 권한이 있다고 가정하지 않는다. 전용 서버 전용 키
// TMAP_TRANSIT_API_KEY를 따로 쓴다(NEXT_PUBLIC_ 접두사 없음, 브라우저에 노출 안 함).
//
// TMAP 약관상 API 파생 데이터를 24시간 이상 보관/재사용할 수 없다 — 이 응답을 캐시하는
// 쪽(itineraryCache.ts)은 항상 그보다 짧은 TTL을 강제한다.
//
// 응답에서 식별에 필요한 필드(노선명/버스번호/역이름)가 하나라도 빠진 구간이 있으면 그
// 경로 전체를 버린다(부분적으로 틀린 정보를 보여주지 않기 위함 — odsayClient.ts와 동일 원칙).

import type { Coordinate, TransitItinerary, TransitStep } from "./types";

const TMAP_TRANSIT_BASE_URL =
  process.env.TMAP_TRANSIT_API_BASE_URL ?? "https://apis.openapi.sk.com/transit/routes";
const TMAP_TRANSIT_TIMEOUT_MS = 8000;

interface TmapTransitStation {
  stationName?: string;
  [key: string]: unknown;
}

interface TmapTransitLeg {
  mode?: string;
  sectionTime?: number; // 초
  distance?: number; // m
  route?: string;
  start?: { name?: string };
  end?: { name?: string };
  passStopList?: { stationList?: TmapTransitStation[] };
  Lane?: Array<{ route?: string }>;
  lane?: Array<{ route?: string }>;
}

interface TmapTransitFare {
  regular?: { totalFare?: number };
}

interface TmapTransitItineraryRaw {
  totalTime?: number; // 초
  transferCount?: number;
  totalWalkTime?: number; // 초
  fare?: number | TmapTransitFare;
  legs?: TmapTransitLeg[];
}

interface TmapTransitResponse {
  metaData?: { plan?: { itineraries?: TmapTransitItineraryRaw[] } };
}

function toMinutes(seconds: number | undefined): number {
  return typeof seconds === "number" ? Math.round(seconds / 60) : 0;
}

/** "간선:400" 같은 카테고리 접두사가 있으면 마지막 콜론 뒤의 실제 번호만 표시용으로
 *  취한다 — 원본 값을 다른 번호로 바꿔치기하지 않고, 있는 그대로에서 포맷만 정리한다. */
function cleanRouteLabel(route: string): string {
  const idx = route.lastIndexOf(":");
  return idx >= 0 ? route.slice(idx + 1).trim() : route.trim();
}

/** route가 없을 때만 Lane/lane(대소문자 케이스가 실제 응답에서 다를 수 있음)에서
 *  실제 노선 값을 보조적으로 찾는다 — 그래도 없으면 지어내지 않고 null. */
function fallbackRouteFromLane(leg: TmapTransitLeg): string | null {
  const lane = leg.Lane ?? leg.lane;
  const value = lane?.[0]?.route;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stationCountOf(leg: TmapTransitLeg): number {
  const list = leg.passStopList?.stationList;
  return Array.isArray(list) ? list.length : 0;
}

function mapLeg(leg: TmapTransitLeg): TransitStep | null {
  const durationMinutes = toMinutes(leg.sectionTime);

  switch (leg.mode) {
    case "WALK":
      return {
        type: "walk",
        durationMinutes,
        distanceMeters: typeof leg.distance === "number" ? leg.distance : 0,
        toName: leg.end?.name?.trim() || undefined,
      };
    case "SUBWAY": {
      const lineName = (typeof leg.route === "string" && leg.route.trim()) || fallbackRouteFromLane(leg);
      if (!lineName || !leg.start?.name || !leg.end?.name) return null;
      return {
        type: "subway",
        lineName,
        // TMAP이 실제 방향/행선지 필드를 주지 않으면 지어내지 않는다(10번 항목) — direction 생략.
        startName: leg.start.name,
        endName: leg.end.name,
        stationCount: stationCountOf(leg),
        durationMinutes,
      };
    }
    case "BUS": {
      const rawRoute = (typeof leg.route === "string" && leg.route.trim()) || fallbackRouteFromLane(leg);
      if (!rawRoute || !leg.start?.name || !leg.end?.name) return null;
      return {
        type: "bus",
        busNumber: cleanRouteLabel(rawRoute),
        startName: leg.start.name,
        endName: leg.end.name,
        stationCount: stationCountOf(leg),
        durationMinutes,
      };
    }
    default:
      // EXPRESSBUS/TRAIN/AIRPLANE/FERRY 등 — STARA의 TransitStep 모델에 안전하게
      // 표현할 수 없는 모드다. 지어내지 않고 이 구간을 신뢰 불가로 표시한다(호출부가
      // 경로 전체를 버리고 추정치로 폴백).
      return null;
  }
}

/**
 * TMAP 응답에서 첫 번째(count:1로 요청한 유일한) itinerary만 골라 STARA의
 * TransitItinerary로 변환한다. legs 중 하나라도 안전하게 매핑할 수 없으면(식별 필드
 * 누락, 지원하지 않는 모드) 경로 전체를 버리고 null을 반환한다 — 상위 호출부가 추정치
 * 폴백으로 넘어간다("절대 지어내지 않는다" 원칙).
 */
export function parseTmapTransitResponse(
  json: unknown,
  fromPlaceId: string,
  toPlaceId: string
): TransitItinerary | null {
  const itineraries = (json as TmapTransitResponse | null | undefined)?.metaData?.plan?.itineraries;
  if (!Array.isArray(itineraries) || itineraries.length === 0) return null;

  const first = itineraries[0];
  const legs = first?.legs;
  if (!Array.isArray(legs) || legs.length === 0) return null;

  const steps: TransitStep[] = [];
  for (const leg of legs) {
    const step = mapLeg(leg);
    if (!step) return null; // 식별 불가/미지원 구간이 하나라도 있으면 경로 전체를 버린다
    steps.push(step);
  }

  const totalMinutes =
    typeof first.totalTime === "number" ? toMinutes(first.totalTime) : steps.reduce((sum, s) => sum + s.durationMinutes, 0);

  const transitStepCount = steps.filter((s) => s.type !== "walk").length;
  const transferCount =
    typeof first.transferCount === "number" ? first.transferCount : transitStepCount > 0 ? Math.max(0, transitStepCount - 1) : undefined;

  const walkSteps = steps.filter((s) => s.type === "walk");
  const totalWalkMinutes =
    typeof first.totalWalkTime === "number"
      ? toMinutes(first.totalWalkTime)
      : walkSteps.length > 0
        ? walkSteps.reduce((sum, s) => sum + s.durationMinutes, 0)
        : undefined;

  const fare =
    typeof first.fare === "number"
      ? first.fare
      : typeof first.fare?.regular?.totalFare === "number"
        ? first.fare.regular.totalFare
        : undefined;

  return {
    fromPlaceId,
    toPlaceId,
    totalMinutes,
    transferCount,
    totalWalkMinutes,
    fare,
    steps,
    provider: "tmap_transit",
  };
}

/** 실패(키 없음/네트워크/이상 응답/경로 없음 등) 시 null만 반환 — throw하지 않는다.
 *  호출부(route.ts)가 캐시 예약을 이미 소비한 채로 추정치로 폴백한다. */
export async function getTmapTransitItinerary(
  origin: Coordinate,
  destination: Coordinate,
  fromPlaceId: string,
  toPlaceId: string,
  locale: "ko" | "en"
): Promise<TransitItinerary | null> {
  const appKey = process.env.TMAP_TRANSIT_API_KEY;
  if (!appKey) {
    console.warn("[tmap-transit] TMAP_TRANSIT_API_KEY not set — skipping");
    return null;
  }

  try {
    const res = await fetch(TMAP_TRANSIT_BASE_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        appKey,
      },
      body: JSON.stringify({
        startX: String(origin.lng),
        startY: String(origin.lat),
        endX: String(destination.lng),
        endY: String(destination.lat),
        count: 1,
        lang: locale === "en" ? 1 : 0,
        format: "json",
      }),
      signal: AbortSignal.timeout(TMAP_TRANSIT_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[tmap-transit] HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as TmapTransitResponse;
    return parseTmapTransitResponse(json, fromPlaceId, toPlaceId);
  } catch (err) {
    console.error("[tmap-transit] request failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
