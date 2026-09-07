import type { Metadata } from "next";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { questPhotos, users } from "@/db/schema";
import { parseLocale, LOCALE_COOKIE, getDictionary, translate } from "@/i18n";
import TopBar from "@/components/layout/TopBar";
import CollectionShare from "@/components/collection/CollectionShare";
import CollectionGallery from "@/components/collection/CollectionGallery";

async function dict() {
  return getDictionary(parseLocale((await cookies()).get(LOCALE_COOKIE)?.value));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const d = await dict();
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) return { title: translate(d, "collection.metaTitleFallback") };

  const title = translate(d, "collection.metaTitleOwner", { name: user.displayName });
  const description = translate(d, "collection.metaDescription");
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
  const d = await dict();
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!user) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#FAF6EF" }}>
        <TopBar title={translate(d, "collection.bookTitle")} backHref="/" />
        <p style={{ padding: 24, textAlign: "center", fontFamily: "Nunito", fontSize: 14, color: "#666" }}>
          {translate(d, "collection.notFound")}
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
      <TopBar title={translate(d, "collection.ownerBook", { name: user.displayName })} backHref="/" />
      <main style={{ margin: "0 auto", display: "flex", width: "100%", maxWidth: 400, flex: 1, flexDirection: "column", gap: 16, padding: "20px" }}>
        <CollectionShare username={user.username} />
        <CollectionGallery photos={photos} />
      </main>
    </div>
  );
}
