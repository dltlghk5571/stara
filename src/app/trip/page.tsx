import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { questPhotos } from "@/db/schema";
import TripShellClient, { type DiaryPhoto, type TripGroup } from "@/components/trip/TripShellClient";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

const VALID_TABS = ["cover", "stamps", "route", "diary"] as const;

export default async function TripPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const initialTab = VALID_TABS.find((t) => t === tab);
  const { userId } = await auth();

  let diaryGroups: TripGroup[] = [];
  if (userId) {
    const db = getDb();
    const rows = await db
      .select()
      .from(questPhotos)
      .where(eq(questPhotos.userId, userId))
      .orderBy(desc(questPhotos.completedAt));

    const photos: DiaryPhoto[] = rows.map((r) => ({
      id: r.id,
      placeId: r.placeId,
      placeName: r.placeName,
      photoUrl: r.photoUrl,
      note: r.note,
      completedAt: r.completedAt.toISOString(),
      tripId: r.tripId,
      tripName: r.tripName,
    }));

    const byKey = new Map<string, TripGroup>();
    for (const photo of photos) {
      const key = photo.tripId ?? "legacy";
      const existing = byKey.get(key);
      if (existing) {
        existing.photos.push(photo);
      } else {
        byKey.set(key, {
          key,
          name: photo.tripName ?? "이전 기록",
          photos: [photo],
        });
      }
    }
    diaryGroups = Array.from(byKey.values());
  }

  return <TripShellClient initialDiaryGroups={diaryGroups} initialTab={initialTab} />;
}
