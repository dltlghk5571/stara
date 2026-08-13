import { NextRequest, NextResponse } from "next/server";
import { tourismDataProvider, type Locale } from "@/lib/tour-api/provider";

/** 공통 상세정보 + 유형별 소개정보(운영시간 등)를 합쳐서 반환. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get("contentId");
  const contentTypeId = searchParams.get("contentTypeId");
  const locale: Locale = searchParams.get("locale") === "en" ? "en" : "ko";

  if (!contentId || !contentTypeId) {
    return NextResponse.json({ detail: null });
  }

  const detail = await tourismDataProvider.getDetail(contentId, contentTypeId, locale);
  return NextResponse.json({ detail });
}
