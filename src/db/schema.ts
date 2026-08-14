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
  photoUrl: text("photo_url").notNull(),
  note: text("note"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});
