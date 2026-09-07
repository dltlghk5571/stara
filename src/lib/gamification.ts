// Stamp-count based level/reward gamification. Pure calculation only — actual
// reward fulfilment is out of scope (labels are placeholder copy).

const STAMPS_PER_LEVEL = 3;
const REWARD_COUNT = 5;

export function levelFromStamps(stampCount: number): number {
  return Math.max(1, Math.floor(stampCount / STAMPS_PER_LEVEL) + 1);
}

/** Dictionary key (`trip.rewards.rewardN`) for the reward at the current level.
 *  The consumer resolves it via `t()` so the copy stays in the dictionary. */
export function nextRewardKey(stampCount: number): string {
  const level = levelFromStamps(stampCount);
  return `trip.rewards.reward${((level - 1) % REWARD_COUNT) + 1}`;
}

/** Stamps remaining until the next level. */
export function stampsUntilNextLevel(stampCount: number): number {
  const remainder = stampCount % STAMPS_PER_LEVEL;
  return remainder === 0 ? STAMPS_PER_LEVEL : STAMPS_PER_LEVEL - remainder;
}
