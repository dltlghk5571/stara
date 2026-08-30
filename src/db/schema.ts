import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});
