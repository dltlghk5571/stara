import { NextRequest, NextResponse } from "next/server";
import { tourismDataProvider, type Locale } from "@/lib/tour-api/provider";

/** 이미지정보 조회. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get("contentId");
  const locale: Locale = searchParams.get("locale") === "en" ? "en" : "ko";

  if (!contentId) {
    return NextResponse.json({ images: [] });
  }

  const images = await tourismDataProvider.getImages(contentId, locale);
  return NextResponse.json({ images });
}
