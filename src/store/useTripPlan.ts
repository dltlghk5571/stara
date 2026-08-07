import { useMemo } from "react";
import { useTripStore } from "./tripStore";
import { buildFinalOrder } from "@/lib/autoPlaceSelector";
import { buildSchedule } from "@/lib/scheduleCalculator";
import { travelMinutesBetween } from "@/lib/distance";
import type { Place } from "@/types";

export interface RemovalSuggestion {
  place: Place;
  detourMinutes: number;
}

/**
 * selectedPlaceIds(사용자가 고른 장소)만 저장해두고, 최종 방문 순서/자동보완/일정은
 * 매번 이 훅에서 다시 계산한다. 장소를 추가·삭제할 때마다 즉시 최신 결과가 반영된다.
 */
export function useTripPlan() {
  const selectedPlaceIds = useTripStore((s) => s.selectedPlaceIds);
  const tripStartTime = useTripStore((s) => s.tripStartTime);

  return useMemo(() => {
    const { orderedPlaces, autoAddedPlaceIds, reasons } = buildFinalOrder(
      selectedPlaceIds,
      tripStartTime
    );
    const schedule = buildSchedule(orderedPlaces, tripStartTime);

    const selectedArtistIds = Array.from(
      new Set(orderedPlaces.flatMap((p) => p.artistIds))
    );

    const removalSuggestion = schedule.isOverLimit
      ? findRemovalSuggestion(orderedPlaces, selectedPlaceIds)
      : null;

    return {
      selectedPlaceIds,
      orderedPlaces,
      autoAddedPlaceIds,
      autoAddReasons: reasons,
      selectedArtistIds,
      schedule,
      removalSuggestion,
    };
  }, [selectedPlaceIds, tripStartTime]);
}

/** 오후 9시를 초과했을 때, 제거하면 이동시간을 가장 많이 아낄 수 있는 사용자 선택 장소를 제안 */
function findRemovalSuggestion(
  orderedPlaces: Place[],
  selectedPlaceIds: string[]
): RemovalSuggestion | null {
  let best: RemovalSuggestion | null = null;

  orderedPlaces.forEach((place, i) => {
    if (place.isMainRoute || !selectedPlaceIds.includes(place.id)) return;

    const prev = orderedPlaces[i - 1];
    const next = orderedPlaces[i + 1];
    let detourMinutes = 0;
    if (prev && next) {
      detourMinutes =
        travelMinutesBetween(prev, place) +
        travelMinutesBetween(place, next) -
        travelMinutesBetween(prev, next);
    } else if (prev) {
      detourMinutes = travelMinutesBetween(prev, place);
    } else if (next) {
      detourMinutes = travelMinutesBetween(place, next);
    }

    if (!best || detourMinutes > best.detourMinutes) {
      best = { place, detourMinutes };
    }
  });

  return best;
}
