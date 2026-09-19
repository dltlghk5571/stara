import type { Place, ScheduleResult, ScheduleStop } from "@/types";
import { travelMinutesBetween, isTransitSegment } from "./distance";
import { toHHMM, toMinutes } from "./time";
import { TRIP_END_LIMIT, TRIP_START_TIME } from "@/config";
import { TMONEY_SEGMENT_QUEST_TEMPLATE, buildLanguageSubQuest } from "@/data/quests";

/**
 * T-money 인증 퀘스트를 배정할 구간 인덱스(0-based)를 계산한다. 여행 중 대중교통
 * 구간이 하나라도 있으면 첫 구간(인덱스 0)에 배정한다 — 실제로 버스를 타기 전, 여정을
 * 시작하자마자 카드부터 인증하라는 취지. 대중교통 구간이 전혀 없거나(전부 도보) 구간이
 * 하나도 없으면(장소 1개 이하) -1을 반환해 "이 여행에는 배정하지 않음"을 뜻한다.
 */
export function pickTmoneySegmentIndex(segmentCount: number, hasTransitSegment: boolean): number {
  if (segmentCount <= 0 || !hasTransitSegment) return -1;
  return 0;
}

/**
 * 순서가 정해진 장소 목록으로 09:00 출발 기준 방문 일정을 계산한다.
 * - 도착이 운영 시작 전이면 오픈 시간까지 대기
 * - 도착이 운영 종료 후면 isOpenTimeConflict 플래그만 세우고 진행(경고 용도)
 * - 대중교통 구간이 하나라도 있으면 첫 구간(인덱스 0)에만 T-money 인증 퀘스트를 배정하고
 *   (여행당 정확히 1회, pickTmoneySegmentIndex 참고), 나머지 구간에는 그 구간의 "다음
 *   행선지" 장소 카테고리에 맞는 한국어 문구 퀘스트를 즉석에서 만들어 배정한다
 *   (buildLanguageSubQuest 참고). 전부 도보 구간이면 T-money 퀘스트 자체를 배정하지 않는다.
 * - legDurationOverridesSec에 구간(`${prevId}__${placeId}`)별 실제 이동시간(초, TMAP 등)이
 *   있으면 그걸 쓰고, 없는 구간만 기존 Haversine 추정치로 계산한다(구간 단위 폴백).
 */
export function buildSchedule(
  orderedPlaces: Place[],
  startTime: string = TRIP_START_TIME,
  legDurationOverridesSec?: Map<string, number>,
  endTimeLimit: string = TRIP_END_LIMIT
): ScheduleResult {
  const stops: ScheduleStop[] = [];
  let totalTravelMinutes = 0;
  let totalDwellMinutes = 0;
  let cursor = toMinutes(startTime);

  const segmentCount = Math.max(0, orderedPlaces.length - 1);
  const hasTransitSegment = orderedPlaces.some(
    (place, i) => i > 0 && isTransitSegment(orderedPlaces[i - 1], place)
  );
  const tmoneySegmentIndex = pickTmoneySegmentIndex(segmentCount, hasTransitSegment);

  orderedPlaces.forEach((place, i) => {
    let travelMinutesFromPrev = 0;
    let segmentQuest: ScheduleStop["segmentQuest"];

    if (i > 0) {
      const prev = orderedPlaces[i - 1];
      const segmentId = `${prev.id}__${place.id}`;
      const overrideSec = legDurationOverridesSec?.get(segmentId);
      travelMinutesFromPrev =
        overrideSec !== undefined ? overrideSec / 60 : travelMinutesBetween(prev, place);
      cursor += travelMinutesFromPrev;
      totalTravelMinutes += travelMinutesFromPrev;

      const segmentIndex = i - 1;
      const template =
        segmentIndex === tmoneySegmentIndex ? TMONEY_SEGMENT_QUEST_TEMPLATE : buildLanguageSubQuest(place);
      segmentQuest = {
        ...template,
        id: `subquest-${segmentId}`,
        segmentId,
      };
    }

    const openMin = place.openTime ? toMinutes(place.openTime) : null;
    const closeMin = place.closeTime ? toMinutes(place.closeTime) : null;

    let waitedForOpenMinutes = 0;
    if (openMin !== null && cursor < openMin) {
      waitedForOpenMinutes = openMin - cursor;
      cursor = openMin;
    }
    const isOpenTimeConflict = closeMin !== null && cursor > closeMin;

    const arrival = cursor;
    cursor += place.dwellMinutes;
    totalDwellMinutes += place.dwellMinutes;

    stops.push({
      place,
      order: i + 1,
      arrival: toHHMM(arrival),
      departure: toHHMM(cursor),
      travelMinutesFromPrev,
      waitedForOpenMinutes,
      isOpenTimeConflict,
      segmentQuest,
    });
  });

  const endMinutes = cursor;
  const limitMinutes = toMinutes(endTimeLimit);

  return {
    stops,
    totalTravelMinutes: Math.round(totalTravelMinutes),
    totalDwellMinutes,
    endTime: toHHMM(endMinutes),
    isOverLimit: endMinutes > limitMinutes,
    overLimitMinutes: Math.max(0, Math.round(endMinutes - limitMinutes)),
  };
}
