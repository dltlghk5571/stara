// 대중교통 상세 경로(TransitItinerary)의 짧은 수명 캐시. TMAP 약관상 API 파생 데이터를
// 24시간 이상 보관/재사용할 수 없다 — 그래서 TTL은 항상 애플리케이션 레벨에서 24시간보다
// 짧게 강제된다(MAX_CACHE_TTL_MINUTES). 정규화된 STARA TransitItinerary만 저장하고,
// 원본 업스트림 payload 전체는 저장하지 않는다. 사용자 신원은 전혀 담지 않는다.

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { transitItineraryCache } from "@/db/schema";
import type { Coordinate, TransitItinerary } from "./types";

const DEFAULT_CACHE_TTL_MINUTES = 360; // 6시간
/** 하드 세이프티 캡 — TMAP 약관(24시간 미만)을 절대 넘지 않도록 애플리케이션에서 강제한다. */
const MAX_CACHE_TTL_MINUTES = 1380; // 23시간

/** TMAP_TRANSIT_CACHE_TTL_MINUTES이 없거나 잘못된 값이면 기본값(360분)을 쓰고,
 *  23시간(1380분)을 넘는 설정은 항상 클램프한다 — 절대 24시간 이상 쓰지 않는다. */
export function getTmapTransitCacheTtlMinutes(): number {
  const raw = Number(process.env.TMAP_TRANSIT_CACHE_TTL_MINUTES);
  const value = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_CACHE_TTL_MINUTES;
  return Math.min(value, MAX_CACHE_TTL_MINUTES);
}

function roundCoord(n: number): string {
  return n.toFixed(5); // 약 1.1m 정밀도 — 부동소수점 흔들림엔 안정적이면서 서로 다른 장소를 뭉개지 않는다
}

/** A→B와 B→A가 서로 다른 키가 되도록 방향성을 유지한다(원점/도착점을 바꾸지 않음). */
export function buildCacheKey(
  provider: string,
  locale: string,
  origin: Coordinate,
  destination: Coordinate
): string {
  return `${provider}:${locale}:${roundCoord(origin.lat)},${roundCoord(origin.lng)}:${roundCoord(destination.lat)},${roundCoord(destination.lng)}`;
}

/** 만료 여부만 판단하는 순수 함수 — 실제 캐시 조회 로직에서 그대로 쓰고, 단위 테스트도
 *  이 함수로 한다(DB 없이 만료 규칙 자체를 검증). */
export function isCacheRowExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

/** 캐시 히트면 정규화된 itinerary를, 미스(없음 또는 만료)면 null을 반환한다. 만료된 행은
 *  절대 반환하지 않는다 — 조회하면서 발견하면 기회주의적으로 지운다(실패해도 조회 결과에는
 *  영향 없음). */
export async function getCachedItinerary(
  provider: string,
  locale: string,
  origin: Coordinate,
  destination: Coordinate
): Promise<TransitItinerary | null> {
  const id = buildCacheKey(provider, locale, origin, destination);
  const db = getDb();
  const rows = await db
    .select({ itineraryJson: transitItineraryCache.itineraryJson, expiresAt: transitItineraryCache.expiresAt })
    .from(transitItineraryCache)
    .where(eq(transitItineraryCache.id, id));
  const row = rows[0];
  if (!row) return null;

  if (isCacheRowExpired(row.expiresAt)) {
    await db
      .delete(transitItineraryCache)
      .where(eq(transitItineraryCache.id, id))
      .catch(() => {}); // 기회주의적 삭제 — 실패해도 "만료됐으니 미스"라는 결론은 바뀌지 않는다
    return null;
  }
  return row.itineraryJson;
}

/** provider+locale+좌표 조합으로 정규화된 itinerary를 짧은 TTL로 저장(덮어쓰기)한다. */
export async function setCachedItinerary(
  provider: string,
  locale: string,
  origin: Coordinate,
  destination: Coordinate,
  itinerary: TransitItinerary
): Promise<void> {
  const id = buildCacheKey(provider, locale, origin, destination);
  const ttlMinutes = getTmapTransitCacheTtlMinutes();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  const db = getDb();

  await db
    .insert(transitItineraryCache)
    .values({
      id,
      provider,
      locale,
      originLat: origin.lat,
      originLng: origin.lng,
      destinationLat: destination.lat,
      destinationLng: destination.lng,
      itineraryJson: itinerary,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: transitItineraryCache.id,
      set: { itineraryJson: itinerary, expiresAt, createdAt: sql`now()` },
    });
}
