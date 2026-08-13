// 한국관광공사 TourAPI(KorService2) 설정.
// 서비스 자체는 apis.data.go.kr/B551011/KorService2 로 고정되어 있고,
// contentTypeId 코드는 공식적으로 안정된 값이라 상수로 고정한다.

export const TOUR_API_BASE_URL =
  process.env.TOUR_API_BASE_URL ?? "https://apis.data.go.kr/B551011/KorService2";

// 영문 관광정보 서비스_GW. 오퍼레이션 이름/파라미터는 국문(KorService2)과 동일한 규격이다.
export const TOUR_API_EN_BASE_URL =
  process.env.TOUR_API_EN_BASE_URL ?? "https://apis.data.go.kr/B551011/EngService2";

export const TOUR_API_TIMEOUT_MS = 5000;

/** TourAPI 공식 contentTypeId 코드 */
export const TOUR_CONTENT_TYPE_ID = {
  TOURIST_SPOT: "12",
  CULTURAL_FACILITY: "14",
  RESTAURANT: "39",
} as const;

/** 로컬 관광지 자동보완 후보로 쓸 콘텐츠 타입 (관광지 + 문화시설) */
export const LOCAL_TOURISM_CONTENT_TYPE_IDS: string[] = [
  TOUR_CONTENT_TYPE_ID.TOURIST_SPOT,
  TOUR_CONTENT_TYPE_ID.CULTURAL_FACILITY,
];

export const RESTAURANT_CONTENT_TYPE_ID: string = TOUR_CONTENT_TYPE_ID.RESTAURANT;
