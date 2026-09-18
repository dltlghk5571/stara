// TourAPI 원본 item → STARA Place. 아티스트 연결(artistIds)은 절대 채우지 않는다 —
// KTO 데이터의 역할은 "지역 관광으로 확장"이지 "아티스트 장소 생성"이 아니다.

import type { Place, PlaceCategory } from "@/types";
import type { Locale, TourApiRawItem } from "./types";
import { RESTAURANT_CONTENT_TYPE_ID } from "./config";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";

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

  // 한 번의 호출은 ko/en 중 하나만 응답한다. 이름은 두 필드 다 필수라 반대쪽 언어도
  // item.title을 그대로 쓸 수밖에 없지만(정확한 번역 없음 — 이중 조회 병합은 Section H
  // 3번 참고, 필요해지면 추가), 설명문(overview)은 실제로 받은 언어(locale) 쪽에만 넣고
  // 반대쪽은 안전한 일반 안내문으로 채운다 — 다른 언어 원문을 잘못된 언어 라벨로 노출하지
  // 않기 위함(예: 영문 요청이 폴백으로 국문 데이터를 받았는데 relationTextEn에 그 국문
  // 원문이 그대로 남는 사고를 막는다).
  // KTO 원문에는 &ldquo; 같은 HTML 엔티티가 그대로 섞여 오는 경우가 있다 — 신뢰할 HTML로
  // 취급하지 않고(dangerouslySetInnerHTML 안 씀) 순수 텍스트로만 풀어서 저장한다(20절).
  const overview = item.overview?.trim();
  const relationTextKo =
    locale === "ko" && overview
      ? decodeHtmlEntities(overview)
      : "한국관광공사에서 제공하는 지역 관광정보입니다.";
  const relationTextEn =
    locale === "en" && overview
      ? decodeHtmlEntities(overview)
      : "Local tourism info provided by the Korea Tourism Organization.";

  return {
    id: `kto-${item.contentid}`,
    nameKo: decodeHtmlEntities(item.title),
    nameEn: decodeHtmlEntities(item.title),
    latitude,
    longitude,
    category,
    artistIds: [],
    relationTextKo,
    relationTextEn,
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
    address: [item.addr1, item.addr2].filter(Boolean).join(" ")
      ? decodeHtmlEntities([item.addr1, item.addr2].filter(Boolean).join(" "))
      : undefined,
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
