import { estimateTravelMinutes, haversineKm } from "./distance";
import type { Place } from "@/types";

export interface InsertionResult {
  index: number; // candidate가 들어갈 위치 (order[index] 앞에 삽입됨)
  deltaKm: number; // 이 위치에 삽입했을 때 늘어나는 총 이동거리
}

/**
 * 메인 루트 순서를 뼈대로 유지하면서, 새 장소(candidate)를 삽입했을 때
 * 이동거리 증가량(delta)이 가장 작은 위치를 찾는다.
 *
 * order = [A, B, C, D] 이고 candidate = X 라면 다음 5개 후보를 비교한다.
 *   X-A-B-C-D / A-X-B-C-D / A-B-X-C-D / A-B-C-X-D / A-B-C-D-X
 * delta = dist(prev, X) + dist(X, next) - dist(prev, next)
 */
export function findBestInsertion(
  order: Place[],
  candidate: Place
): InsertionResult {
  if (order.length === 0) {
    return { index: 0, deltaKm: 0 };
  }

  let best: InsertionResult = {
    index: 0,
    deltaKm: haversineKm(candidate, order[0]),
  };

  for (let i = 1; i < order.length; i++) {
    const prev = order[i - 1];
    const next = order[i];
    const delta =
      haversineKm(prev, candidate) +
      haversineKm(candidate, next) -
      haversineKm(prev, next);
    if (delta < best.deltaKm) {
      best = { index: i, deltaKm: delta };
    }
  }

  const lastDelta = haversineKm(order[order.length - 1], candidate);
  if (lastDelta < best.deltaKm) {
    best = { index: order.length, deltaKm: lastDelta };
  }

  return best;
}

/** 카드에 표시할 "예상 추가시간" - 최적 위치에 넣었을 때 늘어나는 이동시간 + 체류시간 */
export function estimateAddedMinutes(order: Place[], candidate: Place): number {
  const { deltaKm } = findBestInsertion(order, candidate);
  return Math.round(estimateTravelMinutes(deltaKm) + candidate.dwellMinutes);
}

/** candidate를 delta가 가장 작은 위치에 삽입한 새 배열을 반환 */
export function insertAtBestPosition(order: Place[], candidate: Place): Place[] {
  const { index } = findBestInsertion(order, candidate);
  const next = [...order];
  next.splice(index, 0, candidate);
  return next;
}
