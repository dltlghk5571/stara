import { describe, expect, it } from "vitest";
import { levelFromBadges, nextRewardKey, badgesUntilNextLevel } from "./gamification";

describe("levelFromBadges", () => {
  it("0개면 레벨 1부터 시작한다", () => {
    expect(levelFromBadges(0)).toBe(1);
  });

  it("3개당 1레벨씩 오른다", () => {
    expect(levelFromBadges(2)).toBe(1);
    expect(levelFromBadges(3)).toBe(2);
    expect(levelFromBadges(6)).toBe(3);
  });
});

describe("badgesUntilNextLevel", () => {
  it("정확히 레벨업 경계면 다음 레벨 전체 분량이 남은 것으로 계산한다", () => {
    expect(badgesUntilNextLevel(3)).toBe(3);
  });

  it("중간이면 나머지만큼만 남는다", () => {
    expect(badgesUntilNextLevel(1)).toBe(2);
  });
});

describe("nextRewardKey", () => {
  it("항상 trip.rewards.rewardN 형태의 사전 키를 반환한다", () => {
    expect(nextRewardKey(0)).toMatch(/^trip\.rewards\.reward[1-5]$/);
    expect(nextRewardKey(15)).toMatch(/^trip\.rewards\.reward[1-5]$/);
  });
});
