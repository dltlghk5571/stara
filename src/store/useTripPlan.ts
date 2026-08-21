import { useMemo } from "react";
import { useTripStore } from "./tripStore";
import { useRouteDirections } from "./useRouteDirections";
import { buildFinalOrder } from "@/lib/autoPlaceSelector";
import { buildSchedule } from "@/lib/scheduleCalculator";
import { travelMinutesBetween } from "@/lib/distance";
import { useTourismCandidates } from "@/lib/tour-api/useTourismCandidates";
import { useRelatedTourismSignal } from "@/lib/tour-api/useRelatedTourismSignal";
import { getPlaceById, MAIN_ROUTE_PLACE_IDS } from "@/data/places";
import type { Place } from "@/types";

export interface RemovalSuggestion {
  place: Place;
  detourMinutes: number;
}

/**
 * selectedPlaceIds(사용자가 고른 장소)만 저장해두고, 최종 방문 순서/자동보완/일정은
 * 매번 이 훅에서 다시 계산한다. 장소를 추가·삭제할 때마다 즉시 최신 결과가 반영된다.
 *
 * 외부 API(TourAPI 후보, TMAP 실제 이동시간)는 전부 비동기라 2단계로 계산한다:
 * 1) 방문 순서는 항상 동기로 즉시 계산(TourAPI 후보가 없으면 dummy 풀 사용)
 * 2) 그 순서의 구간들에 대해서만 TMAP 실제 이동시간을 요청하고, 도착하면 일정만 다시 계산
 *    (TMAP 실패/키없음이면 서버가 이미 구간별로 Haversine 값을 채워서 돌려준다)
 */
const DEFAULT_MAIN_PLACES = MAIN_ROUTE_PLACE_IDS.map(getPlaceById).filter(
  (p): p is Place => !!p
);

/** /main-route 등에서 "지금 확정된 메인 루트"만 필요할 때 쓴다. */
export function useMainRoutePlaces(): Place[] {
  const storedMainRoutePlaces = useTripStore((s) => s.mainRoutePlaces);
  return storedMainRoutePlaces ?? DEFAULT_MAIN_PLACES;
}

export function useTripPlan() {
  const selectedPlaceIds = useTripStore((s) => s.selectedPlaceIds);
  const customPlaces = useTripStore((s) => s.customPlaces);
  const tripStartTime = useTripStore((s) => s.tripStartTime);
  const tripEndTime = useTripStore((s) => s.tripEndTime);
  const mainPlaces = useMainRoutePlaces();
  const selectedNonMainPlaces = selectedPlaceIds
    .map(getPlaceById)
    .filter((p): p is Place => !!p && !p.isMainRoute);
  const { localTourism, restaurants } = useTourismCandidates([
    ...mainPlaces,
    ...selectedNonMainPlaces,
    ...customPlaces,
  ]);
  const relatedTourismScores = useRelatedTourismSignal(mainPlaces);

  const { orderedPlaces, autoAddedPlaceIds, reasons } = useMemo(
    () =>
      buildFinalOrder(
        selectedPlaceIds,
        tripStartTime,
        { localTourism, restaurants, relatedTourismScores },
        mainPlaces,
        customPlaces
      ),
    [selectedPlaceIds, tripStartTime, localTourism, restaurants, relatedTourismScores, mainPlaces, customPlaces]
  );

  const { legs, geometry } = useRouteDirections(orderedPlaces);
  const legDurationOverridesSec = useMemo(() => {
    if (legs.length === 0) return undefined;
    return new Map(legs.map((l) => [`${l.fromId}__${l.toId}`, l.durationSeconds]));
  }, [legs]);

  return useMemo(() => {
    const schedule = buildSchedule(orderedPlaces, tripStartTime, legDurationOverridesSec, tripEndTime);

    const selectedArtistIds = Array.from(
      new Set(orderedPlaces.flatMap((p) => p.artistIds))
    );

    const removableIds = [...selectedPlaceIds, ...customPlaces.map((p) => p.id)];
    const removalSuggestion = schedule.isOverLimit
      ? findRemovalSuggestion(orderedPlaces, removableIds)
      : null;

    return {
      selectedPlaceIds,
      orderedPlaces,
      autoAddedPlaceIds,
      autoAddReasons: reasons,
      selectedArtistIds,
      schedule,
      removalSuggestion,
      routeGeometry: geometry,
    };
  }, [orderedPlaces, autoAddedPlaceIds, reasons, selectedPlaceIds, customPlaces, tripStartTime, tripEndTime, legDurationOverridesSec, geometry]);
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
