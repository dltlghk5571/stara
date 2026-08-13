import { NextRequest, NextResponse } from "next/server";
import { searchTourismKeyword } from "@/lib/tour-api/provider";

/** 키워드 기반 관광정보 검색 (국문 전용). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");
  const contentTypeId = searchParams.get("contentTypeId") ?? undefined;

  if (!keyword) {
    return NextResponse.json({ places: [] });
  }

  const places = await searchTourismKeyword(keyword, contentTypeId);
  return NextResponse.json({ places });
}
