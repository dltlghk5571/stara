// 일회성 백필 스크립트 — quest_photos.category/is_artist_place 컬럼 도입 이전에 생성된
// 행은 두 값이 NULL이라 computeBadgeProgress(badges.ts)에서 조용히 집계 제외됐다
// ("일부 계정에서 1/3이 0/3으로 보임" 버그의 원인). placeId로 현재 장소 데이터를 다시
// 조회해서 채워 넣는다 — static 장소(ARTIST_PLACES 등)는 즉시, kto-* 제네릭 장소는
// TourAPI detailCommon2를 한 번씩 호출해서 contenttypeid로 카테고리를 판정한다
// (mapper.ts의 판정 로직과 동일).
//
// 실행: npm run data:backfill-quest-photo-categories
import { and, eq, isNull, sql as rawSql } from "drizzle-orm";
import { getDb } from "../src/db";
import { questPhotos } from "../src/db/schema";
import { getPlaceById } from "../src/data/places";
import { fetchDetailCommon } from "../src/lib/tour-api/client";
import { RESTAURANT_CONTENT_TYPE_ID, EN_CONTENT_TYPE_ID } from "../src/lib/tour-api/config";
import type { PlaceCategory } from "../src/types";

async function resolveKtoCategory(contentId: string): Promise<PlaceCategory | null> {
  const items = await fetchDetailCommon(contentId);
  const item = items.find((i) => i.contentid === contentId);
  if (!item) return null;
  const isFood =
    item.contenttypeid === RESTAURANT_CONTENT_TYPE_ID ||
    item.contenttypeid === EN_CONTENT_TYPE_ID[RESTAURANT_CONTENT_TYPE_ID];
  return isFood ? "local_restaurant" : "local_tourism";
}

async function main() {
  const db = getDb();

  const rows = await db
    .select({ placeId: questPhotos.placeId })
    .from(questPhotos)
    .where(isNull(questPhotos.category));
  const distinctPlaceIds = [...new Set(rows.map((r) => r.placeId))];

  console.log(`NULL category rows: ${rows.length} across ${distinctPlaceIds.length} distinct places`);

  let updatedRows = 0;
  const unresolved: string[] = [];

  for (const placeId of distinctPlaceIds) {
    let category: PlaceCategory | null = null;
    let isArtistPlace = false;

    if (placeId.startsWith("kto-")) {
      const contentId = placeId.slice("kto-".length);
      try {
        category = await resolveKtoCategory(contentId);
      } catch (e) {
        console.error(`  kto lookup failed for ${placeId}:`, (e as Error).message);
      }
      isArtistPlace = false; // mapper.ts: kto- 장소는 artistIds를 절대 채우지 않는다
    } else {
      const place = getPlaceById(placeId);
      if (place) {
        category = place.category;
        isArtistPlace = place.artistIds.length > 0;
      }
    }

    if (!category) {
      unresolved.push(placeId);
      continue;
    }

    await db
      .update(questPhotos)
      .set({ category, isArtistPlace })
      .where(and(eq(questPhotos.placeId, placeId), isNull(questPhotos.category)));
    console.log(`  ${placeId} -> category=${category} isArtistPlace=${isArtistPlace}`);
    updatedRows++;
  }

  const remaining = await db
    .select({ n: rawSql<number>`count(*)::int` })
    .from(questPhotos)
    .where(isNull(questPhotos.category));

  console.log(`\nBackfilled ${updatedRows}/${distinctPlaceIds.length} distinct places.`);
  if (unresolved.length > 0) {
    console.log(`Unresolved place_ids (left NULL, place no longer exists in data): ${unresolved.join(", ")}`);
  }
  console.log(`Remaining NULL category rows: ${remaining[0].n}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
