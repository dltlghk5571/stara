import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { validateUsername } from "@/lib/username";

/** 로그인된 유저의 로컬(Neon) users row. username 미설정이면 null. */
export async function getLocalUser(clerkUserId: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, clerkUserId)).limit(1);
  return row ?? null;
}

/** Clerk 계정의 username/이메일 앞부분을 기본 아이디 후보로 쓴다 — 가입 때 쓴 이름과 최대한 맞춤. */
function deriveUsernameCandidate(clerkUser: User | null, idSuffix: string): string {
  const raw = clerkUser?.username || clerkUser?.emailAddresses[0]?.emailAddress.split("@")[0] || "";
  const sanitized = raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  if (sanitized.length >= 3 && validateUsername(sanitized).ok) return sanitized;
  return `guest_${idSuffix}`;
}

/**
 * quest_photos.user_id는 users.id를 참조하므로, 컬렉션북 유저네임을 아직 안 정한
 * 사람도 체크포인트 사진은 저장할 수 있어야 한다 — 없으면 로그인 계정 기반 유저네임으로
 * 만들어둔다. 나중에 /collection에서 원하는 이름으로 덮어쓸 수 있다(username upsert).
 */
export async function getOrCreateLocalUser(clerkUserId: string) {
  const existing = await getLocalUser(clerkUserId);
  if (existing) return existing;

  const db = getDb();
  const clerkUser = await currentUser();
  const displayName = clerkUser?.fullName || clerkUser?.username || "STARA 여행자";
  const idSuffix = clerkUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toLowerCase();
  const candidate = deriveUsernameCandidate(clerkUser, idSuffix);

  try {
    const [row] = await db
      .insert(users)
      .values({ id: clerkUserId, username: candidate, displayName })
      .onConflictDoNothing({ target: users.id })
      .returning();
    return row ?? (await getLocalUser(clerkUserId));
  } catch (error) {
    // username 중복(다른 사람이 같은 아이디를 이미 씀) — 접미사 붙여 재시도
    const isUniqueViolation =
      error instanceof Error && (error as { cause?: { code?: string } }).cause?.code === "23505";
    if (!isUniqueViolation) throw error;

    const fallbackUsername = `${candidate}_${idSuffix.slice(-4)}`.slice(0, 20);
    const [row] = await db
      .insert(users)
      .values({ id: clerkUserId, username: fallbackUsername, displayName })
      .onConflictDoNothing({ target: users.id })
      .returning();
    return row ?? (await getLocalUser(clerkUserId));
  }
}

export async function getUserByUsername(username: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return row ?? null;
}
