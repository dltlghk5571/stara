import { describe, expect, it } from "vitest";
import {
  titleSimilarity,
  distanceScore,
  scoreCandidate,
  classifyCandidates,
  type KtoCandidate,
} from "./ktoMatch";

function candidate(overrides: Partial<KtoCandidate>): KtoCandidate {
  return {
    contentId: "1",
    contentTypeId: "12",
    title: "경복궁",
    distanceMeters: 50,
    ...overrides,
  };
}

describe("titleSimilarity", () => {
  it("동일 이름은 1", () => {
    expect(titleSimilarity("모수 서울", "모수 서울")).toBe(1);
  });
  it("공백/구두점만 다르면 거의 1", () => {
    expect(titleSimilarity("모수 서울", "모수서울")).toBe(1);
  });
  it("무관한 이름은 낮은 점수", () => {
    expect(titleSimilarity("모수 서울", "로코스 비비큐 경리단길본점")).toBeLessThan(0.3);
  });
});

describe("distanceScore", () => {
  it("같은 지점은 1", () => {
    expect(distanceScore(0)).toBe(1);
  });
  it("임계 거리 이상은 0", () => {
    expect(distanceScore(800)).toBe(0);
    expect(distanceScore(2000)).toBe(0);
  });
});

describe("classifyCandidates — 결정적 매칭 상태 판정", () => {
  it("정확한 한글 이름 + 근접 좌표 → matched", () => {
    const scored = [scoreCandidate("경복궁", candidate({ title: "경복궁", distanceMeters: 20 }))];
    expect(classifyCandidates(scored).status).toBe("matched");
  });

  it("이름은 같지만 지리적으로 먼 후보는 거부(unmatched 또는 manual_review, matched 아님)", () => {
    const scored = [
      scoreCandidate("경복궁", candidate({ title: "경복궁", distanceMeters: 5000 })),
    ];
    const result = classifyCandidates(scored);
    expect(result.status).not.toBe("matched");
  });

  it("애매한 복수 후보(점수 근소 차)는 ambiguous로 낮춘다", () => {
    // 둘 다 "경복궁"을 포함하는 부분일치(유사도 0.85로 동일)에 거리까지 같아 점수가 정확히 동률.
    const scored = [
      scoreCandidate(
        "경복궁",
        candidate({ contentId: "1", title: "경복궁 후문", distanceMeters: 20 })
      ),
      scoreCandidate(
        "경복궁",
        candidate({ contentId: "2", title: "경복궁 정문", distanceMeters: 20 })
      ),
    ];
    expect(classifyCandidates(scored).status).toBe("ambiguous");
  });

  it("후보가 없으면 unmatched", () => {
    expect(classifyCandidates([]).status).toBe("unmatched");
  });

  it("약한 매칭(임계 사이)은 manual_review", () => {
    const scored = [
      scoreCandidate("모수 서울", candidate({ title: "모수하우스", distanceMeters: 400 })),
    ];
    expect(["manual_review", "unmatched"]).toContain(classifyCandidates(scored).status);
  });

  it("같은 입력이면 반복 호출해도 항상 같은 결과(결정적)", () => {
    const scored = [scoreCandidate("경복궁", candidate({ title: "경복궁", distanceMeters: 20 }))];
    const r1 = classifyCandidates(scored);
    const r2 = classifyCandidates(scored);
    expect(r1.status).toBe(r2.status);
    expect(r1.best?.matchScore).toBe(r2.best?.matchScore);
  });
});
