import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { questPhotos, users } from "@/db/schema";
import TopBar from "@/components/layout/TopBar";
import CollectionShare from "@/components/collection/CollectionShare";
import CollectionGallery from "@/components/collection/CollectionGallery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) return { title: "컬렉션북 - STARA" };

  const title = `${user.displayName}의 컬렉션북 - STARA`;
  const description = "K-pop 여행 체크포인트 인증샷 모음";
  const imageUrl = `/api/collection-card/${username}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: imageUrl, width: 1080, height: 1920 }] },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!user) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#FAF6EF" }}>
        <TopBar title="컬렉션북" backHref="/" />
        <p style={{ padding: 24, textAlign: "center", fontFamily: "Nunito", fontSize: 14, color: "#666" }}>
          존재하지 않는 컬렉션북이에요
        </p>
      </div>
    );
  }

  const photos = await db
    .select()
    .from(questPhotos)
    .where(eq(questPhotos.userId, user.id))
    .orderBy(desc(questPhotos.completedAt));

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#FAF6EF" }}>
      <TopBar title={`${user.displayName}의 컬렉션북`} backHref="/" />
      <main style={{ margin: "0 auto", display: "flex", width: "100%", maxWidth: 400, flex: 1, flexDirection: "column", gap: 16, padding: "20px" }}>
        <CollectionShare username={user.username} />
        <CollectionGallery photos={photos} />
      </main>
    </div>
  );
}
