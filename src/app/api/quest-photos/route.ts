import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { questPhotos, users } from "@/db/schema";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    placeId?: string;
    photoUrl?: string;
    note?: string;
  } | null;
  if (!body?.placeId || !body?.photoUrl) {
    return NextResponse.json({ error: "placeId and photoUrl required" }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db
    .insert(questPhotos)
    .values({ userId, placeId: body.placeId, photoUrl: body.photoUrl, note: body.note })
    .returning();

  return NextResponse.json({ photo: row });
}

/** ?username=xxx 로 해당 유저의 컬렉션(공개) 조회 */
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const photos = await db
    .select()
    .from(questPhotos)
    .where(eq(questPhotos.userId, user.id))
    .orderBy(desc(questPhotos.completedAt));

  return NextResponse.json({ user, photos });
}
