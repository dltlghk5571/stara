import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getQuestsForPlace } from "@/data/quests";
import { safeStringStorage } from "@/lib/storage";
import { TRIP_START_TIME } from "@/config";

// 실제로 저장이 필요한 최소 상태만 보관한다.
// orderedPlaceIds / autoAddedPlaceIds / selectedArtistIds 는 selectedPlaceIds로부터
// 항상 동일하게 재계산 가능하므로(useTripPlan 훅) 중복 저장하지 않는다.
interface TripState {
  selectedPlaceIds: string[];
  completedQuestIds: string[];
  earnedStampIds: string[];
  startedAt: string | null;
  completedAt: string | null;
  /** 여행 출발 예정 시각("HH:mm"). 일정 계산의 기준점. */
  tripStartTime: string;
}

interface TripActions {
  addPlace: (placeId: string) => void;
  removePlace: (placeId: string) => void;
  toggleQuest: (questId: string) => void;
  claimStamp: (placeId: string) => boolean;
  startTrip: () => void;
  completeTrip: () => void;
  resetTrip: () => void;
  setTripStartTime: (time: string) => void;
}

const initialState: TripState = {
  selectedPlaceIds: [],
  completedQuestIds: [],
  earnedStampIds: [],
  startedAt: null,
  completedAt: null,
  tripStartTime: TRIP_START_TIME,
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

      claimStamp: (placeId) => {
        const requiredQuestIds = getQuestsForPlace(placeId)
          .filter((q) => q.required)
          .map((q) => q.id);
        const { completedQuestIds, earnedStampIds } = get();
        const allDone = requiredQuestIds.every((id) =>
          completedQuestIds.includes(id)
        );
        if (!allDone) return false;
        const stampId = `stamp-${placeId}`;
        if (!earnedStampIds.includes(stampId)) {
          set({ earnedStampIds: [...earnedStampIds, stampId] });
        }
        return true;
      },

      startTrip: () => set({ startedAt: new Date().toISOString() }),
      completeTrip: () => set({ completedAt: new Date().toISOString() }),
      resetTrip: () => set(initialState),
      setTripStartTime: (time) => set({ tripStartTime: time }),
    }),
    {
      name: "stara-trip-v1",
      storage: createJSONStorage(() => safeStringStorage),
    }
  )
);
