// 배지 진행도 계산 — 순수 함수, DB/네트워크 접근 없음. 서버 컴포넌트(trip/page.tsx)가
// quest_photos에서 읽어온 행을 넘기면, 카테고리별 + K-pop 고유 방문 수를 세어 12개
// 배지 전부에 대한 진행 상태를 돌려준다.
import { BADGE_DEFINITIONS, badgeCategoryForPlaceCategory, type BadgeCategoryId, type BadgeDefinition } from "@/data/badges";
import type { PlaceCategory } from "@/types";

/** quest_photos 행 하나에서 배지 집계에 필요한 스냅샷만 뽑은 모양. 도입 이전 행은
 *  category/isArtistPlace가 null이라 집계에서 자연히 제외된다. */
export interface VisitedPlaceSnapshot {
  placeId: string;
  category: PlaceCategory | null;
  isArtistPlace: boolean | null;
}

export interface BadgeProgress {
  definition: BadgeDefinition;
  count: number;
  earned: boolean;
}

/** 같은 placeId가 여러 번 나오면(재제출 등 예외 상황 대비) 첫 번째 것만 남긴다 — 배지는
 *  "고유 장소 수"를 세므로 중복이 있으면 실제보다 부풀려진다. */
export function dedupeByPlaceId<T extends { placeId: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const row of rows) {
    if (!seen.has(row.placeId)) {
      seen.add(row.placeId);
      result.push(row);
    }
  }
  return result;
}

/** visits는 이미 placeId 기준으로 중복 제거된 상태여야 한다(dedupeByPlaceId 참고). */
export function computeBadgeProgress(visits: VisitedPlaceSnapshot[]): BadgeProgress[] {
  const counts: Record<BadgeCategoryId, number> = {
    food: 0,
    shopping: 0,
    culture: 0,
    activity: 0,
    landmark: 0,
    kpop: 0,
  };

  for (const visit of visits) {
    if (visit.category) {
      const categoryId = badgeCategoryForPlaceCategory(visit.category);
      if (categoryId) counts[categoryId]++;
    }
    if (visit.isArtistPlace) counts.kpop++;
  }

  return BADGE_DEFINITIONS.map((definition) => {
    const count = counts[definition.categoryId];
    return { definition, count, earned: count >= definition.threshold };
  });
}
