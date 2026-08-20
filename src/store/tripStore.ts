import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getQuestsForPlace } from "@/data/quests";
import { safeStringStorage } from "@/lib/storage";
import { TRIP_START_TIME } from "@/config";
import type { Place } from "@/types";

// 실제로 저장이 필요한 최소 상태만 보관한다.
// orderedPlaceIds / autoAddedPlaceIds 는 selectedPlaceIds로부터
// 항상 동일하게 재계산 가능하므로(useTripPlan 훅) 중복 저장하지 않는다.
interface TripState {
  selectedPlaceIds: string[];
  completedQuestIds: string[];
  earnedStampIds: string[];
  startedAt: string | null;
  completedAt: string | null;
  /** 여행 출발 예정 시각("HH:mm"). 일정 계산의 기준점. */
  tripStartTime: string;
  /** 온보딩에서 고른 메인 루트. null이면 기존 서울 고정 루트를 그대로 사용한다. */
  mainRoutePlaces: Place[] | null;
  /** 온보딩 아티스트 선택 화면에서 고른 아티스트 id들. */
  selectedArtistIds: string[];
  /** 온보딩 지역 선택 화면에서 고른 지역. */
  selectedRegionId: string | null;
}

interface TripActions {
  addPlace: (placeId: string) => void;
  removePlace: (placeId: string) => void;
  toggleQuest: (questId: string) => void;
  claimStamp: (place: Place) => boolean;
  startTrip: () => void;
  completeTrip: () => void;
  resetTrip: () => void;
  setTripStartTime: (time: string) => void;
  /** 온보딩에서 루트안을 확정할 때 호출 — 새 여행을 시작하며 메인 루트를 앉힌다. */
  setMainRoute: (places: Place[], regionId: string, artistIds: string[]) => void;
}

const initialState: TripState = {
  selectedPlaceIds: [],
  completedQuestIds: [],
  earnedStampIds: [],
  startedAt: null,
  completedAt: null,
  tripStartTime: TRIP_START_TIME,
  mainRoutePlaces: null,
  selectedArtistIds: [],
  selectedRegionId: null,
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
      setMainRoute: (places, regionId, artistIds) =>
        set({
          ...initialState,
          mainRoutePlaces: places.map((p) => ({ ...p, isMainRoute: true })),
          selectedRegionId: regionId,
          selectedArtistIds: artistIds,
        }),
    }),
    {
      name: "stara-trip-v1",
      storage: createJSONStorage(() => safeStringStorage),
    }
  )
);
