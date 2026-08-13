// TourAPI 후보를 고를 때 쓰는 종합 점수. score가 낮을수록 좋은 후보다
// (현재 루트에 삽입하는 비용이 작고, 식사 시간대에 맞고, 연관 관광지 신호가 강함).
//
// relatedTourismScore는 한국관광공사 "관광지별 연관 관광지" API에서 가져올 0~1 신호를 위한
// 자리다. 그 API 연동은 아직 없으므로(스펙 확정 전) 항상 0(중립)으로 전달되고, 이 점수는
// 절대 "실시간 방문량"이나 "실시간 관광객 이동"처럼 표현하지 않는다 — 순수 랭킹 보정용이다.

export interface CandidateScoreInput {
  deltaKm: number;
  fitsMealWindow: boolean;
  /** 0(연관 없음)~1(강한 연관). 아직 API 미연동이면 항상 0. */
  relatedTourismScore?: number;
}

const MEAL_WINDOW_MISS_PENALTY = 1000;
// 연관 관광지 신호가 최대치(1)일 때 최대 0.5km만큼만 순위를 끌어올린다 —
// 거리/식사시간 적합도가 여전히 지배적인 기준이 되도록 가중치를 낮게 둔다.
const RELATED_TOURISM_WEIGHT = 0.5;

export function scoreCandidate({
  deltaKm,
  fitsMealWindow,
  relatedTourismScore = 0,
}: CandidateScoreInput): number {
  return (
    deltaKm +
    (fitsMealWindow ? 0 : MEAL_WINDOW_MISS_PENALTY) -
    relatedTourismScore * RELATED_TOURISM_WEIGHT
  );
}

/** 향후 "관광지별 연관 관광지" API가 확정되면 이 인터페이스를 구현해 위 score에 연결한다. */
export interface RelatedTourismSignalProvider {
  getRelatedScore(contentId: string): Promise<number>;
}

export const relatedTourismSignalProvider: RelatedTourismSignalProvider = {
  async getRelatedScore(): Promise<number> {
    // TODO(Phase 7 future): 공식 "관광지별 연관 관광지" API 스펙 확정 후 구현.
    // 지금은 항상 0을 반환해 scoreCandidate의 랭킹에 영향을 주지 않는다(no-op).
    return 0;
  },
};
