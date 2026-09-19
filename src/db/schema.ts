import { boolean, doublePrecision, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { TransitItinerary } from "@/lib/transit/types";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questPhotos = pgTable("quest_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  placeId: text("place_id").notNull(),
  /** 촬영 시점의 장소명 스냅샷(nameKo). 이 컬럼 도입 이전 행은 null —
   *  TripShellClient의 resolvePlaceName이 다른 소스로 폴백한다. */
  placeName: text("place_name"),
  photoUrl: text("photo_url").notNull(),
  note: text("note"),
  /** 어느 여행(루트)에 속하는지 구분. 이 컬럼 도입 이전 행은 null("이전 기록"으로 묶어서 표시). */
  tripId: text("trip_id"),
  /** 다이어리 탭에 보여줄 사람이 읽을 수 있는 루트 이름. tripStore.activeTripName을 그대로 저장해둔다
   *  (별도 trips 테이블 없이, 과거 루트 탭에 사람이 읽을 수 있는 이름을 보여주기 위한 비정규화). */
  tripName: text("trip_name"),
  /** 완료 시점의 place.category 스냅샷 — 배지(badge) 집계용. 장소 데이터가 나중에 바뀌어도
   *  이미 딴 배지가 흔들리지 않도록, placeId로 다시 조회하지 않고 여기 남겨둔다. 이 컬럼
   *  도입 이전 행은 null(배지 집계에서 제외됨 — placeName과 같은 전례). */
  category: text("category"),
  /** 완료 시점의 (place.artistIds.length > 0) 스냅샷 — K-pop 배지 집계용. 마찬가지로
   *  도입 이전 행은 null. */
  isArtistPlace: boolean("is_artist_place"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

/**
 * STARA 자체 API 호출 횟수 카운터(일별) — provider별로 공유되는 예산 집행 테이블. 원래
 * ODsay Basic 플랜(30회/일)을 보호하려고 만들었고, 지금은 TMAP Transit(무료 10회/일)
 * 예산도 같은 테이블·같은 원자적 upsert 메커니즘을 provider 키만 바꿔서 재사용한다
 * (src/lib/transit/quota.ts). 경로/역/버스 같은 실제 응답 데이터는 이 테이블에 담지
 * 않는다 — "오늘 몇 번 호출했는가"라는 카운터만. id는 `${provider}:${date}`
 * (예: "tmap_transit:2026-09-20") — provider+date 조합의 원자적 upsert 대상 키로 쓴다.
 */
export const apiDailyUsage = pgTable("api_daily_usage", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  date: text("date").notNull(), // "YYYY-MM-DD" (UTC)
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * 대중교통 상세 경로(TransitItinerary)의 짧은 수명 캐시 — 같은 구간을 여러 사용자가
 * 반복 요청할 때 업스트림(TMAP Transit 등, 하루 호출 수가 적은 제공사) 호출을 아낀다.
 * 정규화된 STARA TransitItinerary만 저장한다(원본 업스트림 payload 전체는 저장하지 않음).
 * expiresAt이 지난 행은 절대 반환하지 않는다(src/lib/transit/itineraryCache.ts) — TMAP
 * 약관상 파생 데이터를 24시간 이상 보관/재사용할 수 없어서, TTL은 항상 24시간보다 짧게
 * 강제된다. id는 `${provider}:${locale}:${originLat},${originLng}:${destLat},${destLng}`
 * (좌표 5자리 반올림)로 A→B와 B→A가 서로 다른 키가 되도록 방향성을 유지한다. 사용자 신원은
 * 전혀 담지 않는다(개인정보 아님, 경로 데이터).
 */
export const transitItineraryCache = pgTable("transit_itinerary_cache", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  locale: text("locale").notNull(),
  originLat: doublePrecision("origin_lat").notNull(),
  originLng: doublePrecision("origin_lng").notNull(),
  destinationLat: doublePrecision("destination_lat").notNull(),
  destinationLng: doublePrecision("destination_lng").notNull(),
  itineraryJson: jsonb("itinerary_json").$type<TransitItinerary>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});
