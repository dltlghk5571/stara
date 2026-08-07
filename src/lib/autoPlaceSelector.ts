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

/**
 * 메인 루트 + 사용자가 선택한 장소를 합쳐 최종 방문 순서를 만들고,
 * 로컬 관광지 1곳 이상 / 음식점 2곳 이상이 되도록 자동 보완한다.
 */
export function buildFinalOrder(
  selectedPlaceIds: string[],
  startTime?: string
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

  // 1) 로컬 관광지 최소 1곳 보장
  const hasLocalTourism = order.some((p) => p.isLocalSpot && !p.isFood);
  if (!hasLocalTourism) {
    const candidate = pickClosestCandidate(order, LOCAL_TOURISM_PLACES);
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

  // 2) 음식점 최소 2곳 보장 (점심/저녁 시간대 우선 고려)
  let foodCount = order.filter((p) => p.isFood).length;
  const usedRestaurantIds = new Set(
    order.filter((p) => p.isFood).map((p) => p.id)
  );
  while (foodCount < REQUIRED_FOOD_COUNT) {
    const remaining = LOCAL_RESTAURANT_PLACES.filter(
      (p) => !usedRestaurantIds.has(p.id)
    );
    if (remaining.length === 0) break;

    const best = pickBestRestaurant(order, remaining, startTime);
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
  candidates: Place[]
): Place | undefined {
  let best: { place: Place; deltaKm: number } | undefined;
  for (const c of candidates) {
    const { deltaKm } = findBestInsertion(currentOrder, c);
    if (!best || deltaKm < best.deltaKm) best = { place: c, deltaKm };
  }
  return best?.place;
}

function pickBestRestaurant(
  currentOrder: Place[],
  candidates: Place[],
  startTime?: string
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
    // 점심/저녁 시간대에 맞지 않는 후보는 페널티를 줘서 후순위로 보냄
    const score = deltaKm + (fitsLunch || fitsDinner ? 0 : 1000);

    if (!best || score < best.score) {
      best = { place: c, score, fitsLunch, fitsDinner };
    }
  }

  return best;
}
