// "이 place 집합(예: published만)만으로 아티스트별 루트가 여전히 만들어지는가"를 시뮬레이션.
// 실제 buildRouteOptions를 그대로 재사용한다(로직 복제 금지) — TourAPI 후보는 오프라인
// 시뮬레이션이라 빈 배열로 둔다(13절, "발행 데이터만으로" 앵커가 있는지가 핵심 질문).
import type { Place, PlaceCategory } from "@/types";
import { placesForArtists } from "@/lib/artistPlaceSelector";
import { buildRouteOptions } from "@/lib/tour-api/useRouteOptions";

export interface ArtistRouteSurvivability {
  artistId: string;
  placeCount: number;
  /** 실제로 생성된 루트안 개수(0~3) — 앵커가 하나도 없으면 0. */
  routeThemesGenerated: number;
  hasAnyAnchor: boolean;
  categoryDistribution: Partial<Record<PlaceCategory, number>>;
}

export function simulateRouteSurvivability(
  places: Place[],
  artistIds: string[]
): ArtistRouteSurvivability[] {
  return artistIds.map((artistId) => {
    const anchors = placesForArtists(places, [artistId]);
    const options = buildRouteOptions(anchors, [artistId], [[], [], []]);
    const categoryDistribution: Partial<Record<PlaceCategory, number>> = {};
    for (const p of anchors) {
      categoryDistribution[p.category] = (categoryDistribution[p.category] ?? 0) + 1;
    }
    return {
      artistId,
      placeCount: anchors.length,
      routeThemesGenerated: options.length,
      hasAnyAnchor: anchors.length > 0,
      categoryDistribution,
    };
  });
}
