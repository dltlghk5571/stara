import { NextRequest, NextResponse } from "next/server";
import { haversineKm, estimateTravelMinutes } from "@/lib/distance";
import { TRAVEL_CONFIG } from "@/config";
import { tmapDirectionsProvider } from "@/lib/directions/tmapProvider";
import { getOdsayItinerary } from "@/lib/transit/odsayClient";
import { isOdsayEnabled, reserveOdsayCallSlot } from "@/lib/transit/quota";
import type { TransitGuideResponse } from "@/lib/transit/types";

interface Body {
  fromPlaceId?: unknown;
  toPlaceId?: unknown;
  fromLat?: unknown;
  fromLng?: unknown;
  toLat?: unknown;
  toLng?: unknown;
  locale?: unknown;
  /** 사용자가 "상세 대중교통 경로 보기"를 눌렀을 때만 true. 없거나 false면 ODsay를 절대
   *  호출하지 않고 기존 TMAP/Haversine 추정치만 반환한다(자동 로드 시 항상 이 경로). */
  detail?: unknown;
}

interface ValidatedBody {
  fromPlaceId: string;
  toPlaceId: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}

function isValidLat(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= -90 && n <= 90;
}

function isValidLng(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= -180 && n <= 180;
}

function validateBody(body: Body): ValidatedBody | null {
  const { fromPlaceId, toPlaceId, fromLat, fromLng, toLat, toLng } = body;
  if (
    typeof fromPlaceId !== "string" ||
    typeof toPlaceId !== "string" ||
    !isValidLat(fromLat) ||
    !isValidLng(fromLng) ||
    !isValidLat(toLat) ||
    !isValidLng(toLng)
  ) {
    return null;
  }
  return { fromPlaceId, toPlaceId, fromLat, fromLng, toLat, toLng };
}

async function estimateResponse(
  km: number,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  reason?: "disabled" | "quota_unavailable" | "failed"
): Promise<TransitGuideResponse> {
  const tmapResult = await tmapDirectionsProvider.getRoute(from, to);
  return tmapResult
    ? {
        kind: "estimate",
        durationMinutes: Math.round(tmapResult.durationSeconds / 60),
        estimateSource: "tmap",
        reason,
      }
    : {
        kind: "estimate",
        durationMinutes: Math.round(estimateTravelMinutes(km)),
        estimateSource: "haversine",
        reason,
      };
}

/**
 * Place A→B 구간의 이동 안내. 도보 임계값 이내면 detail 요청이어도 ODsay를 절대 호출하지
 * 않는다(4번 항목) — 항상 즉시 walk를 반환한다.
 *
 * 그보다 먼 구간은 detail:true일 때만 ODsay를 고려한다(2/3번 항목 — 기본 자동 로드는
 * detail:false로 estimate만 반환, ODsay 호출 0회). detail:true면: ODSAY_ENABLED=false →
 * "disabled"; 오늘치 예산 소진(원자적 예약 실패) → "quota_unavailable"; 예약엔 성공했지만
 * ODsay 응답이 실패/경로없음/malformed → "failed". 세 경우 모두 TMAP → Haversine 추정치로
 * 폴백하고, 절대 역/버스 정보를 지어내지 않는다(12번 항목).
 *
 * 좌표는 여기서 검증하고, 임의의 upstream URL은 클라이언트가 지정할 수 없다(15번 항목).
 */
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const locale: "ko" | "en" = body.locale === "en" ? "en" : "ko";
  const detail = body.detail === true;
  const validated = validateBody(body);
  if (!validated) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }
  const { fromPlaceId, toPlaceId, fromLat, fromLng, toLat, toLng } = validated;

  const origin = { latitude: fromLat, longitude: fromLng };
  const destination = { latitude: toLat, longitude: toLng };
  const km = haversineKm(origin, destination);
  const from = { lat: fromLat, lng: fromLng };
  const to = { lat: toLat, lng: toLng };

  if (km * TRAVEL_CONFIG.detourFactor <= TRAVEL_CONFIG.walkThresholdKm) {
    const response: TransitGuideResponse = {
      kind: "walk",
      durationMinutes: Math.round(estimateTravelMinutes(km)),
      distanceMeters: Math.round(km * 1000),
    };
    return NextResponse.json(response);
  }

  if (!detail) {
    return NextResponse.json(await estimateResponse(km, from, to));
  }

  if (!isOdsayEnabled()) {
    return NextResponse.json(await estimateResponse(km, from, to, "disabled"));
  }

  const reserved = await reserveOdsayCallSlot();
  if (!reserved) {
    return NextResponse.json(await estimateResponse(km, from, to, "quota_unavailable"));
  }

  const itinerary = await getOdsayItinerary(from, to, fromPlaceId, toPlaceId, locale);
  if (itinerary) {
    const response: TransitGuideResponse = { kind: "itinerary", itinerary };
    return NextResponse.json(response);
  }

  return NextResponse.json(await estimateResponse(km, from, to, "failed"));
}
