// STARA 핵심 도메인 타입 정의
// 실제 데이터/API로 교체할 때도 이 타입들은 그대로 유지되도록 설계되어 있습니다.

export type PlaceCategory =
  | "photo"
  | "food"
  | "culture"
  | "shopping"
  | "experience"
  | "local_tourism"
  | "local_restaurant";

/** 필터 UI에 노출되는 5개 장소 유형 (local_tourism/local_restaurant는 자동 보완 전용 풀) */
export const USER_FACING_CATEGORIES: PlaceCategory[] = [
  "food",
  "photo",
  "culture",
  "shopping",
  "experience",
];

export interface Artist {
  id: string;
  name: string;
  nameEn: string;
  imageUrl?: string;
  description?: string;
}

/** 장소 데이터의 출처. 없으면("stara") STARA가 직접 관리하는 데이터. */
export type PlaceSource = "stara" | "kto";

export interface Place {
  id: string;
  nameKo: string;
  nameEn: string;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  artistIds: string[];
  relationTextKo: string;
  relationTextEn: string;
  /** "HH:mm". 없으면 영업시간 제약 없음으로 취급(scheduleCalculator 참고) */
  openTime?: string;
  closeTime?: string;
  dwellMinutes: number;
  imageUrl?: string;
  isFood: boolean;
  isLocalSpot: boolean;
  isMainRoute: boolean;
  questIds: string[];
  /** 데이터 출처. 생략 시 "stara"(자체 관리 데이터)로 취급. */
  source?: PlaceSource;
  /** source가 "kto"일 때 한국관광공사 원본 contentId (상세/이미지 캐시 키로도 사용) */
  contentId?: string;
  address?: string;
  /** regions.ts의 Region.id(예: "seoul"/"busan"/"incheon"). 아티스트 연관 장소가 여러 지역에
   *  걸쳐 수집되면서, 루트 생성 시 다른 지역 장소가 섞여 들어가지 않게 구분하는 용도로
   *  추가됨(export-seoul-dataset.ts가 city_id를 그대로 채운다). 없으면 지역 무관(STARA가
   *  직접 만든 mainRoute/local 자동보완 풀처럼 지역 스코프가 필요 없는 장소). */
  regionId?: string;
}

export type QuestType =
  | "visit"
  | "photo"
  | "food"
  | "shopping"
  | "experience"
  | "language";

export type RewardType = "checkpoint" | "bonus_badge" | "bonus_point";

/**
 * 퀘스트를 "어떻게 완료 처리하는가". 없으면(undefined) manual(체크박스로 직접 완료)로
 * 취급한다 — 기존 퀘스트는 전부 이 필드가 없어도 그대로 동작한다. Quest.type(무엇에 대한
 * 퀘스트인가)과는 별개 축이라 섞지 않는다.
 */
export type QuestVerification = { type: "manual" } | { type: "tmoney_photo" };

export interface Quest {
  id: string;
  placeId?: string;
  segmentId?: string;
  type: QuestType;
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
  required: boolean;
  rewardType: RewardType;
  /** 생략 시 manual(체크박스)로 취급. */
  verification?: QuestVerification;
}

export interface StaraRoute {
  id: string;
  regionId: string;
  nameKo: string;
  nameEn: string;
  startTime: string; // "HH:mm"
  endTimeLimit: string; // "HH:mm"
  mainPlaceIds: string[];
}

export interface Trip {
  selectedArtistIds: string[];
  selectedPlaceIds: string[];
  autoAddedPlaceIds: string[];
  orderedPlaceIds: string[];
  completedQuestIds: string[];
  startedAt: string | null;
  completedAt: string | null;
}

/** 자동 보완된 장소가 왜 추가되었는지 사용자에게 보여주기 위한 메타 정보 */
export interface AutoAddReason {
  placeId: string;
  reasonKo: string;
}

/** 일정 계산 결과: 장소 하나에 대한 방문 스케줄 */
export interface ScheduleStop {
  place: Place;
  order: number;
  arrival: string; // "HH:mm"
  departure: string; // "HH:mm"
  travelMinutesFromPrev: number;
  waitedForOpenMinutes: number;
  isOpenTimeConflict: boolean;
  segmentQuest?: Quest;
}

export interface ScheduleResult {
  stops: ScheduleStop[];
  totalTravelMinutes: number;
  totalDwellMinutes: number;
  endTime: string; // "HH:mm"
  isOverLimit: boolean;
  overLimitMinutes: number;
}
