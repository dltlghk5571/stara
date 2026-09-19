import { NextRequest, NextResponse } from "next/server";
import { haversineKm, estimateTravelMinutes } from "@/lib/distance";
import { TRAVEL_CONFIG } from "@/config";
import { tmapDirectionsProvider } from "@/lib/directions/tmapProvider";
import { getOdsayItinerary } from "@/lib/transit/odsayClient";
import type { TransitGuideResponse } from "@/lib/transit/types";

interface Body {
  fromPlaceId?: unknown;
  toPlaceId?: unknown;
  fromLat?: unknown;
  fromLng?: unknown;
  toLat?: unknown;
  toLng?: unknown;
  locale?: unknown;
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

/**
 * Place A→B 구간의 실제 이동 안내. 도보 임계값 이내면 ODsay를 호출하지 않고(6번 항목),
 * 그보다 먼 구간만 ODsay 대중교통 경로를 요청한다. ODsay가 실패/키없음/경로없음이면
 * 기존 TMAP → Haversine 순으로 추정치를 폴백한다(10번 항목) — 절대 역/버스 정보를
 * 지어내지 않는다. 좌표는 여기서 검증하고, 임의의 upstream URL은 클라이언트가 지정할 수
 * 없다(15번 항목).
 */
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const locale: "ko" | "en" = body.locale === "en" ? "en" : "ko";
  const validated = validateBody(body);
  if (!validated) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }
  const { fromPlaceId, toPlaceId, fromLat, fromLng, toLat, toLng } = validated;

  const origin = { latitude: fromLat, longitude: fromLng };
  const destination = { latitude: toLat, longitude: toLng };
  const km = haversineKm(origin, destination);

  if (km * TRAVEL_CONFIG.detourFactor <= TRAVEL_CONFIG.walkThresholdKm) {
    const response: TransitGuideResponse = {
      kind: "walk",
      durationMinutes: Math.round(estimateTravelMinutes(km)),
      distanceMeters: Math.round(km * 1000),
    };
    return NextResponse.json(response);
  }

  const itinerary = await getOdsayItinerary(
    { lat: fromLat, lng: fromLng },
    { lat: toLat, lng: toLng },
    fromPlaceId,
    toPlaceId,
    locale
  );

  if (itinerary) {
    const response: TransitGuideResponse = { kind: "itinerary", itinerary };
    return NextResponse.json(response);
  }

  const tmapResult = await tmapDirectionsProvider.getRoute(
    { lat: fromLat, lng: fromLng },
    { lat: toLat, lng: toLng }
  );
  const response: TransitGuideResponse = tmapResult
    ? { kind: "estimate", durationMinutes: Math.round(tmapResult.durationSeconds / 60), estimateSource: "tmap" }
    : { kind: "estimate", durationMinutes: Math.round(estimateTravelMinutes(km)), estimateSource: "haversine" };
  return NextResponse.json(response);
}
