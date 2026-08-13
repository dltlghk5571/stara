import type { AutoAddReason, Place } from "@/types";
import {
  LOCAL_RESTAURANT_PLACES,
  LOCAL_TOURISM_PLACES,
  MAIN_ROUTE_PLACE_IDS,
  getPlaceById,
} from "@/data/places";
import { findBestInsertion, insertAtBestPosition } from "./routeOptimizer";
import { buildSchedule } from "./scheduleCalculator";
import { toMinutes, isWithinWindow } from "./time";
import { scoreCandidate } from "./tour-api/rankingSignal";
import {
  DINNER_WINDOW,
  LUNCH_WINDOW,
  REQUIRED_FOOD_COUNT,
} from "@/config";

export interface AutoSelectorResult {
  orderedPlaces: Place[];
  autoAddedPlaceIds: string[];
  reasons: AutoAddReason[];
}

/** 한국관광공사 등 외부에서 가져온 자동보완 후보 풀. 비어있으면 기존 dummy 풀을 그대로 사용한다. */
export interface AutoSelectorCandidates {
  localTourism?: Place[];
  restaurants?: Place[];
  /** 장소명 -> 연관 관광지 점수(0~1). 없으면 scoreCandidate가 0(중립)으로 처리한다. */
  relatedTourismScores?: Map<string, number>;
}

/**
 * 메인 루트 + 사용자가 선택한 장소를 합쳐 최종 방문 순서를 만들고,
 * 로컬 관광지 1곳 이상 / 음식점 2곳 이상이 되도록 자동 보완한다.
 */
export function buildFinalOrder(
  selectedPlaceIds: string[],
  startTime?: string,
  extraCandidates?: AutoSelectorCandidates
): AutoSelectorResult {
  const mainPlaces = MAIN_ROUTE_PLACE_IDS.map((id) => getPlaceById(id)).filter(
    (p): p is Place => !!p
  );
  const selectedPlaces = selectedPlaceIds
    .map((id) => getPlaceById(id))
    .filter((p): p is Place => !!p && !p.isMainRoute);

  let order: Place[] = [...mainPlaces];
  for (const place of selectedPlaces) {
    order = insertAtBestPosition(order, place);
  }

  const autoAddedPlaceIds: string[] = [];
  const reasons: AutoAddReason[] = [];

  // 1) 로컬 관광지 최소 1곳 보장 (TourAPI 후보가 있으면 우선, 없으면 dummy로 폴백)
  const localTourismPool = extraCandidates?.localTourism?.length
    ? extraCandidates.localTourism
    : LOCAL_TOURISM_PLACES;
  const hasLocalTourism = order.some((p) => p.isLocalSpot && !p.isFood);
  if (!hasLocalTourism) {
    const candidate = pickClosestCandidate(
      order,
      localTourismPool,
      extraCandidates?.relatedTourismScores
    );
    if (candidate) {
      order = insertAtBestPosition(order, candidate);
      autoAddedPlaceIds.push(candidate.id);
      reasons.push({
        placeId: candidate.id,
        reasonKo:
          "K-pop 장소 주변에서 함께 방문하기 좋은 서울 로컬 관광지를 추가했습니다.",
      });
    }
  }

  // 2) 음식점 최소 2곳 보장 (점심/저녁 시간대 우선 고려, TourAPI 후보 우선 사용)
  const restaurantPool = extraCandidates?.restaurants?.length
    ? extraCandidates.restaurants
    : LOCAL_RESTAURANT_PLACES;
  let foodCount = order.filter((p) => p.isFood).length;
  const usedRestaurantIds = new Set(
    order.filter((p) => p.isFood).map((p) => p.id)
  );
  while (foodCount < REQUIRED_FOOD_COUNT) {
    const remaining = restaurantPool.filter(
      (p) => !usedRestaurantIds.has(p.id)
    );
    if (remaining.length === 0) break;

    const best = pickBestRestaurant(
      order,
      remaining,
      startTime,
      extraCandidates?.relatedTourismScores
    );
    order = insertAtBestPosition(order, best.place);
    usedRestaurantIds.add(best.place.id);
    autoAddedPlaceIds.push(best.place.id);
    reasons.push({
      placeId: best.place.id,
      reasonKo: best.fitsLunch
        ? "코스에 점심 식사 장소가 없어 점심 식당을 추가했습니다."
        : best.fitsDinner
        ? "오후 일정이 길어 저녁 식당을 추가했습니다."
        : "코스에 식사 장소가 부족해 로컬 식당을 추가했습니다.",
    });
    foodCount++;
  }

  return { orderedPlaces: order, autoAddedPlaceIds, reasons };
}

function pickClosestCandidate(
  currentOrder: Place[],
  candidates: Place[],
  relatedTourismScores?: Map<string, number>
): Place | undefined {
  let best: { place: Place; score: number } | undefined;
  for (const c of candidates) {
    const { deltaKm } = findBestInsertion(currentOrder, c);
    // 로컬 관광지 보완에는 식사 시간대가 적용되지 않으므로 fitsMealWindow는 항상 true로 둔다.
    const score = scoreCandidate({
      deltaKm,
      fitsMealWindow: true,
      relatedTourismScore: relatedTourismScores?.get(c.nameKo),
    });
    if (!best || score < best.score) best = { place: c, score };
  }
  return best?.place;
}

function pickBestRestaurant(
  currentOrder: Place[],
  candidates: Place[],
  startTime?: string,
  relatedTourismScores?: Map<string, number>
) {
  let best!: {
    place: Place;
    score: number;
    fitsLunch: boolean;
    fitsDinner: boolean;
  };

  for (const c of candidates) {
    const { index, deltaKm } = findBestInsertion(currentOrder, c);
    const tentative = [...currentOrder];
    tentative.splice(index, 0, c);
    const schedule = buildSchedule(tentative, startTime);
    const stop = schedule.stops.find((s) => s.place.id === c.id);
    const arrivalMin = stop ? toMinutes(stop.arrival) : Infinity;
    const fitsLunch = isWithinWindow(arrivalMin, LUNCH_WINDOW);
    const fitsDinner = isWithinWindow(arrivalMin, DINNER_WINDOW);
    const score = scoreCandidate({
      deltaKm,
      fitsMealWindow: fitsLunch || fitsDinner,
      relatedTourismScore: relatedTourismScores?.get(c.nameKo),
    });

    if (!best || score < best.score) {
      best = { place: c, score, fitsLunch, fitsDinner };
    }
  }

  return best;
}
