import { ImageResponse } from "next/og";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { questPhotos, users } from "@/db/schema";
import { getPlaceById } from "@/data/places";

export const runtime = "nodejs";

/** 컬렉션북을 인스타 스토리 비율(9:16) 카드 이미지로 렌더링 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) return new Response("not found", { status: 404 });

  const allPhotos = await db
    .select()
    .from(questPhotos)
    .where(eq(questPhotos.userId, user.id))
    .orderBy(desc(questPhotos.completedAt))
    .limit(6);

  // next/og(Satori)가 못 읽는 포맷 하나 때문에 카드 전체가 500나던 문제 —
  // 업로드 단계에서 HEIC는 이제 JPEG로 변환되지만, 그 전에 저장된 것들을 위한 방어선.
  const photos = allPhotos.filter((p) => !/\.hei[cf](\?|$)/i.test(p.photoUrl));

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1920px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #1e1b2e 0%, #4c1d95 100%)",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", marginBottom: "48px" }}>
          <div style={{ fontSize: 32, color: "#e9d5ff" }}>STARA 컬렉션북</div>
          <div style={{ display: "flex", fontSize: 56, color: "white", fontWeight: 700 }}>
            {user.displayName}의 여행 기록
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
          {photos.map((p) => {
            const place = getPlaceById(p.placeId);
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "472px",
                  borderRadius: "24px",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photoUrl}
                  alt=""
                  width={472}
                  height={472}
                  style={{ objectFit: "cover" }}
                />
                <div style={{ display: "flex", padding: "16px", fontSize: 28, color: "white" }}>
                  {place?.nameKo ?? p.placeId}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 28, color: "#e9d5ff" }}>
          #STARA #스타따라 #{photos.length}개의_체크포인트
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
