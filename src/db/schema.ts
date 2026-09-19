import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
 * STARA 자체 API 호출 횟수 카운터(일별) — ODsay Basic 플랜의 30회/일 쿼터를 보호하기 위한
 * 우리 쪽 예산 집행용. ODsay 응답(경로/역/버스 데이터)은 여기에도, 다른 어떤 테이블에도
 * 저장하지 않는다 — ODsay는 API 응답값을 저장/재사용하는 것을 원칙적으로 허용하지 않는다
 * (src/lib/transit/quota.ts, src/app/api/transit/route.ts 참고). id는 `${provider}:${date}`
 * (예: "odsay:2026-09-20") — provider+date 조합의 원자적 upsert 대상 키로 쓴다.
 */
export const apiDailyUsage = pgTable("api_daily_usage", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  date: text("date").notNull(), // "YYYY-MM-DD" (UTC)
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
