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
  description: string;
}

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
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
  dwellMinutes: number;
  imageUrl?: string;
  isFood: boolean;
  isLocalSpot: boolean;
  isMainRoute: boolean;
  questIds: string[];
}

export type QuestType =
  | "visit"
  | "photo"
  | "food"
  | "shopping"
  | "experience"
  | "language";

export type RewardType = "stamp" | "bonus_stamp" | "bonus_point";

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
  stampId?: string;
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
  earnedStampIds: string[];
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
