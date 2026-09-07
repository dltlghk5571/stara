import { NextRequest, NextResponse } from "next/server";
import { searchTourismKeyword, type Locale } from "@/lib/tour-api/provider";

/** 키워드 기반 관광정보 검색. locale 미지정 시 영문(EngService2) 기본. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");
  const contentTypeId = searchParams.get("contentTypeId") ?? undefined;
  const locale: Locale = searchParams.get("locale") === "ko" ? "ko" : "en";

  if (!keyword) {
    return NextResponse.json({ places: [] });
  }

  const places = await searchTourismKeyword(keyword, contentTypeId, locale);
  return NextResponse.json({ places });
}
