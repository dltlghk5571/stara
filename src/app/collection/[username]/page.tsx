import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import TopBar from "@/components/layout/TopBar";
import CollectionShare from "@/components/collection/CollectionShare";

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

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={`${user.displayName}의 컬렉션북`} backHref="/" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-6">
        <CollectionShare username={user.username} />
      </main>
    </div>
  );
}
