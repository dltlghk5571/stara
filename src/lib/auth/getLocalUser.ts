import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";

/** 로그인된 유저의 로컬(Neon) users row. username 미설정이면 null. */
export async function getLocalUser(clerkUserId: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, clerkUserId)).limit(1);
  return row ?? null;
}

/**
 * quest_photos.user_id는 users.id를 참조하므로, 컬렉션북 유저네임을 아직 안 정한
 * 사람도 체크포인트 사진은 저장할 수 있어야 한다 — 없으면 임시 유저네임으로 만들어둔다.
 * 나중에 /collection에서 원하는 이름으로 덮어쓸 수 있다(POST /api/user/username이 upsert).
 */
export async function getOrCreateLocalUser(clerkUserId: string) {
  const existing = await getLocalUser(clerkUserId);
  if (existing) return existing;

  const db = getDb();
  const clerkUser = await currentUser();
  const displayName = clerkUser?.fullName || clerkUser?.username || "STARA 여행자";
  const username = `guest_${clerkUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-10).toLowerCase()}`;

  const [row] = await db
    .insert(users)
    .values({ id: clerkUserId, username, displayName })
    .onConflictDoNothing({ target: users.id })
    .returning();

  return row ?? (await getLocalUser(clerkUserId));
}

export async function getUserByUsername(username: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return row ?? null;
}
