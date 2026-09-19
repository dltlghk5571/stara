import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { haversineKm, estimateTravelMinutes } from "@/lib/distance";
import { TRAVEL_CONFIG } from "@/config";
import { tmapDirectionsProvider } from "@/lib/directions/tmapProvider";
import { getTmapTransitItinerary } from "@/lib/transit/tmapTransitClient";
import { isTmapTransitEnabled, reserveTmapTransitCallSlot } from "@/lib/transit/quota";
import { getCachedItinerary, setCachedItinerary } from "@/lib/transit/itineraryCache";
import type { TransitGuideResponse } from "@/lib/transit/types";

const TMAP_TRANSIT_PROVIDER = "tmap_transit";

interface Body {
  fromPlaceId?: unknown;
  toPlaceId?: unknown;
  fromLat?: unknown;
  fromLng?: unknown;
  toLat?: unknown;
  toLng?: unknown;
  locale?: unknown;
  /** 사용자가 "상세 대중교통 경로 보기"를 눌렀을 때만 true. 없거나 false면 TMAP Transit을
   *  절대 호출하지 않고 기존 TMAP 이동시간/Haversine 추정치만 반환한다(자동 로드 시 항상
   *  이 경로 — 13/24번 항목). */
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
 * Place A→B 구간의 이동 안내. 도보 임계값 이내면 detail 요청이어도 TMAP Transit을 절대
 * 호출하지 않는다(14번 항목) — 항상 즉시 walk를 반환하고, 인증도 요구하지 않는다.
 *
 * 그보다 먼 구간은 detail:true일 때만 TMAP Transit을 고려한다(13번 항목 — 기본 자동
 * 로드는 detail:false로 estimate만 반환, 업스트림 호출 0회, 인증 불필요). detail:true는
 * 반드시 로그인된 Clerk 사용자여야 한다(17번 항목 — 익명 트래픽이 8/일 예산을 소모하지
 * 못하게). 순서는: 캐시 조회(쿼터 소모 없음) → 미스면 원자적 쿼터 예약 → 예약 성공 시만
 * TMAP Transit 호출 → 성공하면 정규화해 캐시에 저장(23번 항목, 쿼터 예약은 캐시 조회
 * *이후*에만 일어난다). TMAP_TRANSIT_ENABLED=false거나 예산이 소진됐거나 호출이
 * 실패하면 항상 TMAP 이동시간 → Haversine 추정치로 폴백한다 — 절대 역/버스 정보를
 * 지어내지 않는다(25번 항목).
 *
 * 좌표는 여기서 검증하고, 임의의 upstream URL은 클라이언트가 지정할 수 없다.
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

  // detail:true부터는 쿼터를 소모할 수 있는 경로다 — 인증된 사용자만 허용한다. 요청 바디의
  // isTester/isAdmin 같은 자기신고 값은 절대 신뢰하지 않고, Clerk 세션에서만 판단한다.
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isTmapTransitEnabled()) {
    return NextResponse.json(await estimateResponse(km, from, to, "disabled"));
  }

  const cached = await getCachedItinerary(TMAP_TRANSIT_PROVIDER, locale, from, to);
  if (cached) {
    const response: TransitGuideResponse = { kind: "itinerary", itinerary: cached };
    return NextResponse.json(response);
  }

  const reserved = await reserveTmapTransitCallSlot();
  if (!reserved) {
    return NextResponse.json(await estimateResponse(km, from, to, "quota_unavailable"));
  }

  const itinerary = await getTmapTransitItinerary(from, to, fromPlaceId, toPlaceId, locale);
  if (itinerary) {
    await setCachedItinerary(TMAP_TRANSIT_PROVIDER, locale, from, to, itinerary);
    const response: TransitGuideResponse = { kind: "itinerary", itinerary };
    return NextResponse.json(response);
  }

  return NextResponse.json(await estimateResponse(km, from, to, "failed"));
}
