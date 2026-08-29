// TourAPI 원본 item → STARA Place. 아티스트 연결(artistIds)은 절대 채우지 않는다 —
// KTO 데이터의 역할은 "지역 관광으로 확장"이지 "아티스트 장소 생성"이 아니다.

import type { Place, PlaceCategory } from "@/types";
import type { Locale, TourApiRawItem } from "./types";
import { RESTAURANT_CONTENT_TYPE_ID } from "./config";

const DEFAULT_DWELL_MINUTES = 45;
// KTO 원본에는 구조화된 개장/마감 시각이 없는 경우가 많아, scheduleCalculator가
// 대기/충돌 로직으로 막히지 않도록 상시 운영으로 가정한다.
const DEFAULT_OPEN_TIME = "00:00";
const DEFAULT_CLOSE_TIME = "23:59";

export function mapTourItemToPlace(item: TourApiRawItem, locale: Locale = "ko"): Place | null {
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

  // ponytail: 한 번의 호출은 ko/en 중 하나만 응답하므로 요청하지 않은 쪽 언어 필드는
  // 정확한 번역이 없다 — item.title을 그대로 폴백으로 쓴다(빈 문자열보다 낫고, Place
  // 스키마가 두 필드 다 필수라 불가피함). 두 언어를 동시에 정확히 채우려면 ko/en을
  // 각각 조회해 contentId로 병합해야 함(Section H 3번, 필요해지면 추가). locale 인자를
  // 남겨두는 이유는 이 함수를 호출하는 쪽이 "이 title이 어느 언어인지" 알고 있다는
  // 사실 자체를 명시적으로 만들어, 향후 이중 조회 병합 로직을 여기에 붙이기 쉽게 하기 위함.
  const koTitle = locale === "ko" ? item.title : item.title;
  const enTitle = locale === "en" ? item.title : item.title;

  return {
    id: `kto-${item.contentid}`,
    nameKo: koTitle,
    nameEn: enTitle,
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

export function mapTourItemsToPlaces(items: TourApiRawItem[], locale: Locale = "ko"): Place[] {
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const item of items) {
    const place = mapTourItemToPlace(item, locale);
    if (place && !seen.has(place.id)) {
      seen.add(place.id);
      places.push(place);
    }
  }
  return places;
}
