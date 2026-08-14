import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

/** 로그인된 유저의 로컬(Neon) users row. username 미설정이면 null. */
export async function getLocalUser(clerkUserId: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, clerkUserId)).limit(1);
  return row ?? null;
}

export async function getUserByUsername(username: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return row ?? null;
}
