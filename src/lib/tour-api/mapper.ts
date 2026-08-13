// TourAPI 원본 item → STARA Place. 아티스트 연결(artistIds)은 절대 채우지 않는다 —
// KTO 데이터의 역할은 "지역 관광으로 확장"이지 "아티스트 장소 생성"이 아니다.

import type { Place, PlaceCategory } from "@/types";
import type { TourApiRawItem } from "./types";
import { RESTAURANT_CONTENT_TYPE_ID } from "./config";

const DEFAULT_DWELL_MINUTES = 45;
// KTO 원본에는 구조화된 개장/마감 시각이 없는 경우가 많아, scheduleCalculator가
// 대기/충돌 로직으로 막히지 않도록 상시 운영으로 가정한다.
const DEFAULT_OPEN_TIME = "00:00";
const DEFAULT_CLOSE_TIME = "23:59";

export function mapTourItemToPlace(item: TourApiRawItem): Place | null {
  const latitude = Number(item.mapy);
  const longitude = Number(item.mapx);
  if (
    !item.contentid ||
    !item.title ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const isFood = item.contenttypeid === RESTAURANT_CONTENT_TYPE_ID;
  const category: PlaceCategory = isFood ? "local_restaurant" : "local_tourism";

  return {
    id: `kto-${item.contentid}`,
    nameKo: item.title,
    nameEn: item.title,
    latitude,
    longitude,
    category,
    artistIds: [],
    relationTextKo: item.overview?.trim() || "한국관광공사에서 제공하는 지역 관광정보입니다.",
    relationTextEn:
      item.overview?.trim() ||
      "Local tourism info provided by the Korea Tourism Organization.",
    openTime: DEFAULT_OPEN_TIME,
    closeTime: DEFAULT_CLOSE_TIME,
    dwellMinutes: DEFAULT_DWELL_MINUTES,
    imageUrl: item.firstimage || item.firstimage2 || undefined,
    isFood,
    isLocalSpot: true,
    isMainRoute: false,
    questIds: [],
    source: "kto",
    contentId: item.contentid,
    address: [item.addr1, item.addr2].filter(Boolean).join(" ") || undefined,
  };
}

export function mapTourItemsToPlaces(items: TourApiRawItem[]): Place[] {
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const item of items) {
    const place = mapTourItemToPlace(item);
    if (place && !seen.has(place.id)) {
      seen.add(place.id);
      places.push(place);
    }
  }
  return places;
}
