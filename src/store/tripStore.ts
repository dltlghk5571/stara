import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getQuestsForPlace } from "@/data/quests";
import { safeStringStorage } from "@/lib/storage";
import { TRIP_START_TIME, TRIP_END_LIMIT } from "@/config";
import type { Place } from "@/types";

// 실제로 저장이 필요한 최소 상태만 보관한다.
// orderedPlaceIds / autoAddedPlaceIds 는 selectedPlaceIds로부터
// 항상 동일하게 재계산 가능하므로(useTripPlan 훅) 중복 저장하지 않는다.
interface TripState {
  selectedPlaceIds: string[];
  /** 지도 탭/검색으로 직접 추가한 장소(TourAPI 등 정적 PLACES 배열에 없는 장소) — id만으론
   *  getPlaceById로 못 찾으므로 selectedPlaceIds와 별도로 전체 객체를 들고 있는다. */
  customPlaces: Place[];
  completedQuestIds: string[];
  earnedStampIds: string[];
  startedAt: string | null;
  completedAt: string | null;
  /** 여행 출발 예정 시각("HH:mm"). 일정 계산의 기준점. */
  tripStartTime: string;
  /** 여행 종료 희망 시각("HH:mm"). 이 시각을 넘기면 일정 초과 경고가 뜬다. */
  tripEndTime: string;
  /** 온보딩에서 고른 메인 루트. null이면 기존 서울 고정 루트를 그대로 사용한다. */
  mainRoutePlaces: Place[] | null;
  /** 온보딩 아티스트 선택 화면에서 고른 아티스트 id들. */
  selectedArtistIds: string[];
  /** 온보딩 지역 선택 화면에서 고른 지역. */
  selectedRegionId: string | null;
  /** 진행 중인 여행을 구분하는 id. quest_photos.tripId로도 저장되어 다이어리에서 루트별로 묶는 데 쓰인다. */
  activeTripId: string | null;
  /** 다이어리 탭에 보여줄 사람이 읽을 수 있는 루트 이름(예: "서울 · 포토 & 감성"). */
  activeTripName: string | null;
  /** 이 localStorage 여행 상태를 마지막으로 바인딩한 Clerk userId. 브라우저 로컬 persist라
   *  Clerk 계정과 무관하게 남아있을 수 있어서, 같은 브라우저에서 다른 계정(특히 테스터
   *  계정)으로 전환됐을 때 이전 계정의 진행 상황이 새어 보이지 않도록 이 값으로 구분한다. */
  ownerUserId: string | null;
}

interface TripActions {
  addPlace: (placeId: string) => void;
  removePlace: (placeId: string) => void;
  addCustomPlace: (place: Place) => void;
  removeCustomPlace: (placeId: string) => void;
  toggleQuest: (questId: string) => void;
  /** 멱등 완료 처리 — 서버 검증(예: T-money 인증)처럼 "체크박스 토글"이 아니라 "성공 시에만
   *  한 방향으로 완료"해야 하는 퀘스트용. 이미 완료된 questId를 다시 넣어도 아무 변화 없다. */
  completeQuest: (questId: string) => void;
  claimStamp: (place: Place) => boolean;
  startTrip: () => void;
  completeTrip: () => void;
  resetTrip: () => void;
  setTripStartTime: (time: string) => void;
  setTripEndTime: (time: string) => void;
  /**
   * 인증된 Clerk userId가 바뀔 때마다 호출해야 한다(TripOwnershipGuard가 전역에서 담당).
   * ownerUserId가 없으면(첫 바인딩) 지금 있는 로컬 상태를 그대로 보존하며 바인딩만 한다.
   * 이미 같은 유저면 아무것도 하지 않는다. 다른 유저로 바뀌면 여행 상태 전체를 초기화하고
   * 새 유저로 다시 바인딩한다 — "다른 브라우저 세션에서 로그아웃 후 다른 계정으로 로그인"
   * 같은 로그아웃 자체보다는, 실제로 인증된 유저가 바뀌었는지를 기준으로 판단한다.
   */
  bindUser: (userId: string) => void;
  /** 온보딩에서 루트안을 확정할 때 호출 — 새 여행을 시작하며 메인 루트를 앉힌다. */
  setMainRoute: (
    places: Place[],
    regionId: string,
    artistIds: string[],
    tripName: string
  ) => void;
}

const initialState: TripState = {
  selectedPlaceIds: [],
  customPlaces: [],
  completedQuestIds: [],
  earnedStampIds: [],
  startedAt: null,
  completedAt: null,
  tripStartTime: TRIP_START_TIME,
  tripEndTime: TRIP_END_LIMIT,
  mainRoutePlaces: null,
  selectedArtistIds: [],
  selectedRegionId: null,
  activeTripId: null,
  activeTripName: null,
  ownerUserId: null,
};

export const useTripStore = create<TripState & TripActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addPlace: (placeId) =>
        set((s) =>
          s.selectedPlaceIds.includes(placeId)
            ? s
            : { selectedPlaceIds: [...s.selectedPlaceIds, placeId] }
        ),

      removePlace: (placeId) =>
        set((s) => ({
          selectedPlaceIds: s.selectedPlaceIds.filter((id) => id !== placeId),
        })),

      addCustomPlace: (place) =>
        set((s) =>
          s.customPlaces.some((p) => p.id === place.id)
            ? s
            : { customPlaces: [...s.customPlaces, place] }
        ),

      removeCustomPlace: (placeId) =>
        set((s) => ({
          customPlaces: s.customPlaces.filter((p) => p.id !== placeId),
        })),

      toggleQuest: (questId) =>
        set((s) => ({
          completedQuestIds: s.completedQuestIds.includes(questId)
            ? s.completedQuestIds.filter((id) => id !== questId)
            : [...s.completedQuestIds, questId],
        })),

      completeQuest: (questId) =>
        set((s) =>
          s.completedQuestIds.includes(questId)
            ? s
            : { completedQuestIds: [...s.completedQuestIds, questId] }
        ),

      claimStamp: (place) => {
        const requiredQuestIds = getQuestsForPlace(place)
          .filter((q) => q.required)
          .map((q) => q.id);
        const { completedQuestIds, earnedStampIds } = get();
        const allDone = requiredQuestIds.every((id) =>
          completedQuestIds.includes(id)
        );
        if (!allDone) return false;
        const stampId = `stamp-${place.id}`;
        if (!earnedStampIds.includes(stampId)) {
          set({ earnedStampIds: [...earnedStampIds, stampId] });
        }
        return true;
      },

      startTrip: () => set({ startedAt: new Date().toISOString() }),
      completeTrip: () => set({ completedAt: new Date().toISOString() }),
      // 소유자 바인딩은 유지한다 — "여행 리셋"은 계정 전환을 뜻하지 않는다(14절: 로그아웃
      // 자체가 아니라 실제 유저 전환만 초기화 트리거가 되어야 한다).
      resetTrip: () => set((s) => ({ ...initialState, ownerUserId: s.ownerUserId })),
      setTripStartTime: (time) => set({ tripStartTime: time }),
      setTripEndTime: (time) => set({ tripEndTime: time }),
      setMainRoute: (places, regionId, artistIds, tripName) =>
        set((s) => ({
          ...initialState,
          ownerUserId: s.ownerUserId,
          mainRoutePlaces: places.map((p) => ({ ...p, isMainRoute: true })),
          selectedRegionId: regionId,
          selectedArtistIds: artistIds,
          activeTripId: crypto.randomUUID(),
          activeTripName: tripName,
        })),

      bindUser: (userId) =>
        set((s) => {
          if (s.ownerUserId === userId) return s; // 이미 같은 유저 — 불필요한 갱신 없음
          if (s.ownerUserId === null) return { ...s, ownerUserId: userId }; // 첫 바인딩 — 기존 상태 보존
          return { ...initialState, ownerUserId: userId }; // 다른 유저로 전환 — 이전 유저 진행 상황 전부 초기화
        }),
    }),
    {
      name: "stara-trip-v1",
      storage: createJSONStorage(() => safeStringStorage),
    }
  )
);
