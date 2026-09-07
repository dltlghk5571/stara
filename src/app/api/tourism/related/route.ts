import { NextRequest, NextResponse } from "next/server";
import { getRelatedTourismScores, type RelatedTourismAnchor } from "@/lib/tour-api/relatedTourism";
import type { Locale } from "@/lib/tour-api/types";

/** anchor 장소 이름/시군구코드 목록을 받아 "장소명 -> 연관도 점수(0~1)" 맵을 반환한다. */
export async function POST(request: NextRequest) {
  let body: { anchors?: RelatedTourismAnchor[]; locale?: Locale };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ scores: {} });
  }

  const anchors = Array.isArray(body.anchors) ? body.anchors : [];
  const locale: Locale = body.locale === "ko" ? "ko" : "en";
  const scores = await getRelatedTourismScores(anchors, locale);
  return NextResponse.json({ scores: Object.fromEntries(scores) });
}
