// 한국관광공사 TourAPI(KorService2) 설정.
// 서비스 자체는 apis.data.go.kr/B551011/KorService2 로 고정되어 있고,
// contentTypeId 코드는 공식적으로 안정된 값이라 상수로 고정한다.

export const TOUR_API_BASE_URL =
  process.env.TOUR_API_BASE_URL ?? "https://apis.data.go.kr/B551011/KorService2";

// 영문 관광정보 서비스_GW. 오퍼레이션 이름/파라미터 이름은 국문(KorService2)과 동일한 규격이지만,
// contentTypeId 값 자체는 실제 API로 확인한 결과 서로 다른 체계다 — 아래 EN_CONTENT_TYPE_ID 참고.
export const TOUR_API_EN_BASE_URL =
  process.env.TOUR_API_EN_BASE_URL ?? "https://apis.data.go.kr/B551011/EngService2";

export const TOUR_API_TIMEOUT_MS = 5000;

/** TourAPI 공식 contentTypeId 코드 (KorService2 기준) */
export const TOUR_CONTENT_TYPE_ID = {
  TOURIST_SPOT: "12",
  CULTURAL_FACILITY: "14",
  RESTAURANT: "39",
} as const;

/**
 * EngService2는 contentTypeId가 KorService2와 다른 체계를 쓴다(실제 호출로 확인:
 * 국문 39/음식점으로 EngService2를 조회하면 에러 없이 0건만 온다). 이 프로젝트가 실제로
 * 쓰는 세 카테고리만 매핑 — 안 쓰는 카테고리(쇼핑/숙박/레포츠 등)까지 미리 채워둘 필요는 없다.
 */
export const EN_CONTENT_TYPE_ID: Record<string, string> = {
  [TOUR_CONTENT_TYPE_ID.TOURIST_SPOT]: "76",
  [TOUR_CONTENT_TYPE_ID.CULTURAL_FACILITY]: "78",
  [TOUR_CONTENT_TYPE_ID.RESTAURANT]: "82",
};

/** 로컬 관광지 자동보완 후보로 쓸 콘텐츠 타입 (관광지 + 문화시설) */
export const LOCAL_TOURISM_CONTENT_TYPE_IDS: string[] = [
  TOUR_CONTENT_TYPE_ID.TOURIST_SPOT,
  TOUR_CONTENT_TYPE_ID.CULTURAL_FACILITY,
];

export const RESTAURANT_CONTENT_TYPE_ID: string = TOUR_CONTENT_TYPE_ID.RESTAURANT;
