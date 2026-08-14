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
      <div className="flex min-h-screen flex-col">
        <TopBar title="컬렉션북" backHref="/" />
        <p className="p-6 text-center text-sm text-slate-500">존재하지 않는 컬렉션북이에요</p>
      </div>
    );
  }

  const photos = await db
    .select()
    .from(questPhotos)
    .where(eq(questPhotos.userId, user.id))
    .orderBy(desc(questPhotos.completedAt));

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={`${user.displayName}의 컬렉션북`} backHref="/" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-6">
        <CollectionShare username={user.username} />
        <CollectionGallery photos={photos} />
      </main>
    </div>
  );
}
