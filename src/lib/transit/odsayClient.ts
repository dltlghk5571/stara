// ODsay Lab 대중교통 경로 안내 API — 서버 전용. Route Handler에서만 import할 것.
// ODSAY_API_KEY는 브라우저에 노출되지 않는다(NEXT_PUBLIC_ 접두사 없음).
//
// ODsay는 실시간 도착정보가 아니라 정적 경로 데이터를 기준으로 안내한다 — "약 N분"으로만
// 표현하고, "3분 후 도착" 같은 실시간 문구는 쓰지 않는다.
//
// 응답을 캐시하지 않는다(의도적) — ODsay는 API 응답값을 저장/재사용하는 것을 원칙적으로
// 허용하지 않는다. TMAP과 달리 여기엔 src/lib/cache.ts를 쓰지 않는다. 대신 호출 자체를
// 드물게 만든다: 이 함수는 사용자가 명시적으로 "상세 경로 보기"를 눌렀고(detail:true) 쿼터
// 예약에 성공했을 때만 route.ts에서 호출된다(src/lib/transit/quota.ts 참고).
import type { Coordinate, TransitItinerary, TransitStep } from "./types";

const ODSAY_BASE_URL =
  process.env.ODSAY_API_BASE_URL ?? "https://api.odsay.com/v1/api/searchPubTransPathT";
const ODSAY_TIMEOUT_MS = 6000;

interface OdsayLane {
  name?: string;
  busNo?: string;
}

interface OdsaySubPath {
  trafficType?: number; // 1=지하철, 2=버스, 3=도보
  distance?: number; // m
  sectionTime?: number; // 분
  startName?: string;
  endName?: string;
  stationCount?: number;
  way?: string; // 지하철 진행 방향(예: "왕십리 방면")
  lane?: OdsayLane[];
}

interface OdsayPathInfo {
  totalTime?: number; // 분
  payment?: number; // 원
}

interface OdsayPath {
  info?: OdsayPathInfo;
  subPath?: OdsaySubPath[];
}

interface OdsayResponse {
  result?: { path?: OdsayPath[] };
}

function mapSubPath(sub: OdsaySubPath): TransitStep | null {
  const durationMinutes = typeof sub.sectionTime === "number" ? sub.sectionTime : 0;

  switch (sub.trafficType) {
    case 3: // 도보
      return {
        type: "walk",
        durationMinutes,
        distanceMeters: typeof sub.distance === "number" ? sub.distance : 0,
        toName: typeof sub.endName === "string" && sub.endName.trim() ? sub.endName.trim() : undefined,
      };
    case 1: { // 지하철
      const lineName = sub.lane?.[0]?.name;
      if (!lineName || !sub.startName || !sub.endName) return null;
      return {
        type: "subway",
        lineName,
        direction: sub.way || undefined,
        startName: sub.startName,
        endName: sub.endName,
        stationCount: typeof sub.stationCount === "number" ? sub.stationCount : 0,
        durationMinutes,
      };
    }
    case 2: { // 버스
      const busNumber = sub.lane?.[0]?.busNo;
      if (!busNumber || !sub.startName || !sub.endName) return null;
      return {
        type: "bus",
        busNumber,
        startName: sub.startName,
        endName: sub.endName,
        stationCount: typeof sub.stationCount === "number" ? sub.stationCount : 0,
        durationMinutes,
      };
    }
    default:
      return null;
  }
}

/**
 * ODsay 응답에서 첫 번째(추천) 경로만 골라 STARA의 TransitItinerary로 변환한다(5번 항목:
 * 이번 단계에서는 대안 경로 UI를 만들지 않음). subPath 중 하나라도 식별에 필요한 필드
 * (노선명/버스번호/역이름)가 없으면 그 경로 전체를 신뢰할 수 없다고 보고 null을 반환한다
 * — 구간을 하나 빼먹은 채 부분적으로 보여주는 것보다, 상위 호출부가 추정치 폴백으로
 * 넘어가는 편이 안전하다("절대 지어내지 않는다" 원칙).
 */
export function parseOdsayResponse(
  json: unknown,
  fromPlaceId: string,
  toPlaceId: string
): TransitItinerary | null {
  const paths = (json as OdsayResponse | null | undefined)?.result?.path;
  if (!Array.isArray(paths) || paths.length === 0) return null;

  const first = paths[0];
  const subPaths = first?.subPath;
  if (!Array.isArray(subPaths) || subPaths.length === 0) return null;

  const steps: TransitStep[] = [];
  for (const sub of subPaths) {
    const step = mapSubPath(sub);
    if (!step) return null; // 식별 불가한 구간이 하나라도 있으면 경로 전체를 버린다
    steps.push(step);
  }

  const totalMinutes =
    typeof first.info?.totalTime === "number"
      ? first.info.totalTime
      : steps.reduce((sum, s) => sum + s.durationMinutes, 0);

  const transitStepCount = steps.filter((s) => s.type !== "walk").length;
  const transferCount = transitStepCount > 0 ? Math.max(0, transitStepCount - 1) : undefined;

  const walkSteps = steps.filter((s) => s.type === "walk");
  const totalWalkMinutes =
    walkSteps.length > 0 ? walkSteps.reduce((sum, s) => sum + s.durationMinutes, 0) : undefined;

  const fare = typeof first.info?.payment === "number" ? first.info.payment : undefined;

  return {
    fromPlaceId,
    toPlaceId,
    totalMinutes,
    transferCount,
    totalWalkMinutes,
    fare,
    steps,
    source: "odsay",
  };
}

/** 실패(키 없음/네트워크/이상 응답/경로 없음 등) 시 null만 반환 — throw하지 않는다. 호출부가 추정치로 폴백. */
export async function getOdsayItinerary(
  origin: Coordinate,
  destination: Coordinate,
  fromPlaceId: string,
  toPlaceId: string,
  locale: "ko" | "en"
): Promise<TransitItinerary | null> {
  const apiKey = process.env.ODSAY_API_KEY;
  if (!apiKey) {
    console.warn("[odsay] ODSAY_API_KEY not set — skipping");
    return null;
  }

  try {
    const params = new URLSearchParams({
      SX: String(origin.lng),
      SY: String(origin.lat),
      EX: String(destination.lng),
      EY: String(destination.lat),
      apiKey,
      lang: locale === "en" ? "1" : "0",
      output: "json",
    });
    const res = await fetch(`${ODSAY_BASE_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(ODSAY_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[odsay] HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as OdsayResponse;
    return parseOdsayResponse(json, fromPlaceId, toPlaceId);
  } catch (err) {
    console.error("[odsay] request failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
