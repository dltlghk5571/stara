import { NextRequest, NextResponse } from "next/server";
import { tourismDataProvider, type Locale } from "@/lib/tour-api/provider";
import { TOUR_SEARCH_RADIUS_METERS } from "@/config";

/** 위치 기반 관광정보 조회. 실패해도 항상 200 + 빈 배열을 반환해 호출부가 dummy로 자연스럽게 폴백하게 한다. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const contentTypeId = searchParams.get("contentTypeId") ?? undefined;
  const radius = Number(searchParams.get("radius") ?? TOUR_SEARCH_RADIUS_METERS);
  const locale: Locale = searchParams.get("locale") === "en" ? "en" : "ko";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ places: [] });
  }

  const places = await tourismDataProvider.getNearby(
    { lat, lng, radius: Number.isFinite(radius) ? radius : TOUR_SEARCH_RADIUS_METERS, contentTypeId },
    locale
  );

  return NextResponse.json({ places });
}
