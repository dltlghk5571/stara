// Badge-count based level/reward gamification. Pure calculation only — actual
// reward fulfilment is out of scope (labels are placeholder copy).

const BADGES_PER_LEVEL = 3;
const REWARD_COUNT = 5;

export function levelFromBadges(earnedBadgeCount: number): number {
  return Math.max(1, Math.floor(earnedBadgeCount / BADGES_PER_LEVEL) + 1);
}

/** Dictionary key (`trip.rewards.rewardN`) for the reward at the current level.
 *  The consumer resolves it via `t()` so the copy stays in the dictionary. */
export function nextRewardKey(earnedBadgeCount: number): string {
  const level = levelFromBadges(earnedBadgeCount);
  return `trip.rewards.reward${((level - 1) % REWARD_COUNT) + 1}`;
}

/** Badges remaining until the next level. */
export function badgesUntilNextLevel(earnedBadgeCount: number): number {
  const remainder = earnedBadgeCount % BADGES_PER_LEVEL;
  return remainder === 0 ? BADGES_PER_LEVEL : BADGES_PER_LEVEL - remainder;
}
