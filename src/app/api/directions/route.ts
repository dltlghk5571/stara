import { NextRequest, NextResponse } from "next/server";
import { computeRouteLegs, type RouteStop } from "@/lib/directions/computeRouteLegs";

/** 클라이언트(useRouteDirections)가 호출하는 구간별 실제 경로 API. */
export async function POST(request: NextRequest) {
  let body: { stops?: RouteStop[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ legs: [], geometry: [] });
  }

  const stops = Array.isArray(body.stops) ? body.stops : [];
  const result = await computeRouteLegs(stops);
  return NextResponse.json(result);
}
