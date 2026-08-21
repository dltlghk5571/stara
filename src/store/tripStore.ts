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
}

interface TripActions {
  addPlace: (placeId: string) => void;
  removePlace: (placeId: string) => void;
  addCustomPlace: (place: Place) => void;
  removeCustomPlace: (placeId: string) => void;
  toggleQuest: (questId: string) => void;
  claimStamp: (place: Place) => boolean;
  startTrip: () => void;
  completeTrip: () => void;
  resetTrip: () => void;
  setTripStartTime: (time: string) => void;
  setTripEndTime: (time: string) => void;
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
      resetTrip: () => set(initialState),
      setTripStartTime: (time) => set({ tripStartTime: time }),
      setTripEndTime: (time) => set({ tripEndTime: time }),
      setMainRoute: (places, regionId, artistIds, tripName) =>
        set({
          ...initialState,
          mainRoutePlaces: places.map((p) => ({ ...p, isMainRoute: true })),
          selectedRegionId: regionId,
          selectedArtistIds: artistIds,
          activeTripId: crypto.randomUUID(),
          activeTripName: tripName,
        }),
    }),
    {
      name: "stara-trip-v1",
      storage: createJSONStorage(() => safeStringStorage),
    }
  )
);
