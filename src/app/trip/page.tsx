import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { questPhotos } from "@/db/schema";
import { parseLocale, LOCALE_COOKIE, getDictionary, translate } from "@/i18n";
import { computeBadgeProgress, dedupeByPlaceId, type BadgeProgress, type VisitedPlaceSnapshot } from "@/lib/badges";
import TripShellClient, { type DiaryPhoto, type TripGroup } from "@/components/trip/TripShellClient";
import type { PlaceCategory } from "@/types";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

const VALID_TABS = ["cover", "badges", "route", "diary"] as const;

export default async function TripPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const initialTab = VALID_TABS.find((t) => t === tab);
  const { userId } = await auth();
  const dict = getDictionary(parseLocale((await cookies()).get(LOCALE_COOKIE)?.value));
  const prevRecordLabel = translate(dict, "trip.prevRecord");

  let diaryGroups: TripGroup[] = [];
  let badgeProgress: BadgeProgress[] = computeBadgeProgress([]);

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
          name: photo.tripName ?? prevRecordLabel,
          photos: [photo],
        });
      }
    }
    diaryGroups = Array.from(byKey.values());

    // 배지는 스탬프와 달리 "이번 여행"이 아니라 계정 전체 누적 방문 기준이라, 위 다이어리
    // 조회와 같은 rows를 재사용해 계산한다(별도 쿼리/테이블 없음 — category/isArtistPlace는
    // MissionSheet가 완료 시점에 quest_photos에 스냅샷으로 남긴 값). 같은 placeId가 여러 번
    // 있으면(예외적 재제출) 고유 장소 수만 세야 하므로 먼저 중복 제거한다.
    const visits: VisitedPlaceSnapshot[] = rows.map((r) => ({
      placeId: r.placeId,
      // DB 컬럼은 text — 이 값은 항상 MissionSheet가 place.category를 그대로 쓴 것이므로
      // PlaceCategory로 좁혀도 안전하다(도입 이전 행은 null).
      category: r.category as PlaceCategory | null,
      isArtistPlace: r.isArtistPlace,
    }));
    badgeProgress = computeBadgeProgress(dedupeByPlaceId(visits));
  }

  return <TripShellClient initialDiaryGroups={diaryGroups} initialBadges={badgeProgress} initialTab={initialTab} />;
}
