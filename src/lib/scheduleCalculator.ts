import type { Place, ScheduleResult, ScheduleStop } from "@/types";
import { travelMinutesBetween } from "./distance";
import { toHHMM, toMinutes } from "./time";
import { TRIP_END_LIMIT, TRIP_START_TIME } from "@/config";
import { SUB_QUEST_TEMPLATES } from "@/data/quests";

/**
 * 순서가 정해진 장소 목록으로 09:00 출발 기준 방문 일정을 계산한다.
 * - 도착이 운영 시작 전이면 오픈 시간까지 대기
 * - 도착이 운영 종료 후면 isOpenTimeConflict 플래그만 세우고 진행(경고 용도)
 * - 각 구간(prev->curr)에는 서브 퀘스트 풀에서 하나씩 순환 배정
 * - legDurationOverridesSec에 구간(`${prevId}__${placeId}`)별 실제 이동시간(초, TMAP 등)이
 *   있으면 그걸 쓰고, 없는 구간만 기존 Haversine 추정치로 계산한다(구간 단위 폴백).
 */
export function buildSchedule(
  orderedPlaces: Place[],
  startTime: string = TRIP_START_TIME,
  legDurationOverridesSec?: Map<string, number>
): ScheduleResult {
  const stops: ScheduleStop[] = [];
  let totalTravelMinutes = 0;
  let totalDwellMinutes = 0;
  let cursor = toMinutes(startTime);

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

      const template = SUB_QUEST_TEMPLATES[(i - 1) % SUB_QUEST_TEMPLATES.length];
      segmentQuest = {
        ...template,
        id: `subquest-${segmentId}`,
        segmentId,
      };
    }

    const openMin = toMinutes(place.openTime);
    const closeMin = toMinutes(place.closeTime);

    let waitedForOpenMinutes = 0;
    if (cursor < openMin) {
      waitedForOpenMinutes = openMin - cursor;
      cursor = openMin;
    }
    const isOpenTimeConflict = cursor > closeMin;

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
  const limitMinutes = toMinutes(TRIP_END_LIMIT);

  return {
    stops,
    totalTravelMinutes: Math.round(totalTravelMinutes),
    totalDwellMinutes,
    endTime: toHHMM(endMinutes),
    isOverLimit: endMinutes > limitMinutes,
    overLimitMinutes: Math.max(0, Math.round(endMinutes - limitMinutes)),
  };
}
