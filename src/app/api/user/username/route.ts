import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getLocalUser } from "@/lib/auth/getLocalUser";
import { normalizeUsername, validateUsername } from "@/lib/username";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ user: null }, { status: 401 });
  const user = await getLocalUser(userId);
  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { username?: string } | null;
  if (!body?.username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }
  const username = normalizeUsername(body.username);
  const validation = validateUsername(username);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing && existing.id !== userId) {
    return NextResponse.json({ error: "username taken" }, { status: 409 });
  }

  const clerkUser = await currentUser();
  const displayName = clerkUser?.fullName || clerkUser?.username || username;

  const [row] = await db
    .insert(users)
    .values({ id: userId, username, displayName })
    .onConflictDoUpdate({ target: users.id, set: { username, displayName } })
    .returning();

  return NextResponse.json({ user: row });
}
