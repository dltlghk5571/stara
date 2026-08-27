import { describe, expect, it } from "vitest";
import { levelFromStamps, nextRewardLabel, stampsUntilNextLevel } from "./gamification";

describe("levelFromStamps", () => {
  it("0개면 레벨 1부터 시작한다", () => {
    expect(levelFromStamps(0)).toBe(1);
  });

  it("3개당 1레벨씩 오른다", () => {
    expect(levelFromStamps(2)).toBe(1);
    expect(levelFromStamps(3)).toBe(2);
    expect(levelFromStamps(6)).toBe(3);
  });
});

describe("stampsUntilNextLevel", () => {
  it("정확히 레벨업 경계면 다음 레벨 전체 분량이 남은 것으로 계산한다", () => {
    expect(stampsUntilNextLevel(3)).toBe(3);
  });

  it("중간이면 나머지만큼만 남는다", () => {
    expect(stampsUntilNextLevel(1)).toBe(2);
  });
});

describe("nextRewardLabel", () => {
  it("항상 문자열 보상 문구를 반환한다", () => {
    expect(typeof nextRewardLabel(0)).toBe("string");
    expect(nextRewardLabel(0).length).toBeGreaterThan(0);
  });
});
