import { describe, expect, it } from "vitest";
import { scoreCandidate } from "./rankingSignal";

describe("scoreCandidate", () => {
  it("식사 시간대에 맞으면 거리(km)만큼만 점수가 된다", () => {
    expect(scoreCandidate({ deltaKm: 1.2, fitsMealWindow: true })).toBeCloseTo(1.2);
  });

  it("식사 시간대를 벗어나면 큰 페널티가 붙는다", () => {
    const score = scoreCandidate({ deltaKm: 1.2, fitsMealWindow: false });
    expect(score).toBeGreaterThan(900);
  });

  it("relatedTourismScore가 없으면(아직 API 미연동) 결과에 영향이 없다", () => {
    const withDefault = scoreCandidate({ deltaKm: 2, fitsMealWindow: true });
    const withExplicitZero = scoreCandidate({ deltaKm: 2, fitsMealWindow: true, relatedTourismScore: 0 });
    expect(withDefault).toBe(withExplicitZero);
  });

  it("relatedTourismScore가 높을수록(연관성 강할수록) 점수가 낮아져 우선순위가 올라간다", () => {
    const withoutSignal = scoreCandidate({ deltaKm: 2, fitsMealWindow: true, relatedTourismScore: 0 });
    const withSignal = scoreCandidate({ deltaKm: 2, fitsMealWindow: true, relatedTourismScore: 1 });
    expect(withSignal).toBeLessThan(withoutSignal);
  });
});
