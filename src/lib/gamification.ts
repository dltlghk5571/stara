// 스탬프 수 기준 레벨/보상 게이미피케이션. 순수 계산만 — 실제 보상 지급 로직은 범위 밖(더미 문구).

const STAMPS_PER_LEVEL = 3;

const REWARD_NAMES = [
  "AR 스티커 팩",
  "한정판 포토카드 프레임",
  "K-ROUTE 다이어리 커버",
  "여행자 배지",
  "비밀 성지 지도",
];

export function levelFromStamps(stampCount: number): number {
  return Math.max(1, Math.floor(stampCount / STAMPS_PER_LEVEL) + 1);
}

export function nextRewardLabel(stampCount: number): string {
  const level = levelFromStamps(stampCount);
  return REWARD_NAMES[(level - 1) % REWARD_NAMES.length];
}

/** 다음 레벨까지 남은 스탬프 수 */
export function stampsUntilNextLevel(stampCount: number): number {
  const remainder = stampCount % STAMPS_PER_LEVEL;
  return remainder === 0 ? STAMPS_PER_LEVEL : STAMPS_PER_LEVEL - remainder;
}
