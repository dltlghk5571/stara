// 하드코딩된 숫자를 모아둔 설정 파일.
// 이동시간 추정 로직을 바꾸고 싶다면 이 파일만 수정하면 됩니다.

export const TRIP_START_TIME = "09:00";
export const TRIP_END_LIMIT = "21:00";

export const LUNCH_WINDOW = { start: "11:30", end: "14:00" };
export const DINNER_WINDOW = { start: "17:30", end: "20:00" };

export const REQUIRED_FOOD_COUNT = 2;
export const REQUIRED_LOCAL_TOURISM_COUNT = 1;

/** 이동시간 추정 규칙 (도보/대중교통 단순 상수 모델) */
export const TRAVEL_CONFIG = {
  /** 직선거리를 실제 도로/골목 이동거리로 보정하는 계수 */
  detourFactor: 1.3,
  /** 이 거리(km) 이하는 도보로 가정 */
  walkThresholdKm: 1.2,
  walkSpeedKmh: 4.3,
  transitSpeedKmh: 20,
  /** 대중교통 이용 시 대기/환승에 드는 고정 시간(분) */
  transitOverheadMin: 12,
};

export const MIN_TOUCH_TARGET_PX = 44;

/** 아티스트 장소 주변에서 한국관광공사 관광정보를 검색할 반경(m). 하드코딩 금지 — 여기서만 수정. */
export const TOUR_SEARCH_RADIUS_METERS = Number(
  process.env.TOUR_SEARCH_RADIUS_METERS ?? 2000
);

/** 미션 인증 시 사용자 위치가 장소로부터 이 반경(m) 안이어야 통과로 본다. */
export const GPS_MISSION_RADIUS_METERS = 200;

/** 미션 인증 GPS 검증 기능 스위치. false면 위치를 아예 확인하지 않고 항상 통과시킨다(잠시 꺼둠). */
export const GPS_MISSION_CHECK_ENABLED = false;
