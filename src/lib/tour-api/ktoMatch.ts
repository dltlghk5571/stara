// STARA 실장소 ↔ KTO(TourAPI) 후보 매칭 스코어링. LLM 미사용 — 이름 유사도/거리/주소만으로
// 결정적 점수를 내고, 고정 임계값으로 상태를 가른다(scripts/kto-match.ts에서 사용).

export type MatchStatus = "matched" | "unmatched" | "ambiguous" | "manual_review";
export type MatchedBy =
  | "existing-content-id"
  | "keyword-coordinate"
  | "nearby-coordinate"
  | "manual";

// 영문(EngService2) 매칭 전용 상태. "unavailable"은 스코어링으로 나온 결과가 아니라(그건
// MatchStatus 네 값으로 충분) 상위(scripts/kto-match.ts)에서 "국문이 matched가 아니라서 영문
// 매칭 자체를 시도조차 안 했다"는 뜻으로만 붙인다 — KTO 장소 정체성(국문)과 영문 관광정보
// 존재 여부는 서로 다른 질문이라는 걸 타입으로도 드러낸다.
export type EnMatchStatus = MatchStatus | "unavailable";
export type EnMatchedBy = "nameEn-keyword" | "nearby-coordinate" | "manual";

export interface KtoCandidate {
  contentId: string;
  contentTypeId: string;
  title: string;
  distanceMeters: number;
  address?: string;
}

export interface ScoredCandidate extends KtoCandidate {
  matchScore: number;
}

export interface ClassifyResult {
  status: MatchStatus;
  best?: ScoredCandidate;
  candidateCount: number;
}

// 가중치: 이름 유사도가 가장 신뢰할 만한 신호(같은 장소면 이름이 제일 안 흔들림), 거리는 보조.
// 주소는 STARA 파이프라인 스키마에 address 필드가 없어 비교 불가한 경우가 대부분이라 약하게 둔다.
export const W_TITLE = 0.6;
export const W_DISTANCE = 0.3;
export const W_ADDRESS = 0.1;

// matchScore >= AUTO_MATCH_THRESHOLD 이고 1·2등 차이가 AMBIGUOUS_MARGIN 이상이면 자동 확정.
export const AUTO_MATCH_THRESHOLD = 0.82;
// MANUAL_REVIEW_THRESHOLD ≤ matchScore < AUTO_MATCH_THRESHOLD 는 사람 확인 대상.
export const MANUAL_REVIEW_THRESHOLD = 0.55;
// matchScore < MANUAL_REVIEW_THRESHOLD 면 unmatched.
export const AMBIGUOUS_MARGIN = 0.08;
// 이 거리(m) 밖의 후보는 이름이 비슷해도 후보에서 제외한다(동명이인 매장 등).
export const MAX_CANDIDATE_DISTANCE_METERS = 800;

function normalizeTitle(s: string): string {
  return s.replace(/[\s·・\-()（）]/g, "").toLowerCase();
}

/** Levenshtein 편집거리. 외부 fuzzy-match 라이브러리 없이도 이 규모(문자열 길이 <30, ~200건)엔 충분. */
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** 0(무관)~1(동일) 이름 유사도. 정규화 후 완전일치/부분일치를 먼저 보고, 아니면 편집거리 비율. */
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const maxLen = Math.max(na.length, nb.length);
  return Math.max(0, 1 - levenshtein(na, nb) / maxLen);
}

/** 0(MAX_CANDIDATE_DISTANCE_METERS 이상)~1(같은 지점) 거리 점수. 선형 감쇠. */
export function distanceScore(distanceMeters: number): number {
  if (distanceMeters >= MAX_CANDIDATE_DISTANCE_METERS) return 0;
  return 1 - distanceMeters / MAX_CANDIDATE_DISTANCE_METERS;
}

/** STARA 쪽 주소가 없으면(파이프라인 스키마에 없는 게 보통) 중립값(0.5) — 있고 없고로 점수를 왜곡하지 않는다. */
export function addressScore(
  staraAddress: string | undefined,
  candidateAddress: string | undefined
): number {
  if (!staraAddress || !candidateAddress) return 0.5;
  return titleSimilarity(staraAddress, candidateAddress);
}

export function scoreCandidate(
  placeName: string,
  candidate: KtoCandidate,
  staraAddress?: string
): ScoredCandidate {
  const matchScore =
    titleSimilarity(placeName, candidate.title) * W_TITLE +
    distanceScore(candidate.distanceMeters) * W_DISTANCE +
    addressScore(staraAddress, candidate.address) * W_ADDRESS;
  return { ...candidate, matchScore };
}

/**
 * 점수화된 후보 목록 → 최종 상태. 결정적(같은 입력엔 항상 같은 결과) — LLM 판단 없음.
 * 1등이 임계 미만이면 unmatched, MANUAL_REVIEW~AUTO_MATCH 사이면 manual_review,
 * AUTO_MATCH 이상이어도 2등과 차이가 근소하면(동률급) ambiguous로 낮춘다 — "첫 결과 그냥 채택" 금지.
 */
export function classifyCandidates(candidates: ScoredCandidate[]): ClassifyResult {
  if (candidates.length === 0) return { status: "unmatched", candidateCount: 0 };

  const sorted = [...candidates].sort((a, b) => b.matchScore - a.matchScore);
  const [best, second] = sorted;

  if (best.matchScore < MANUAL_REVIEW_THRESHOLD) {
    return { status: "unmatched", candidateCount: candidates.length };
  }
  if (best.matchScore < AUTO_MATCH_THRESHOLD) {
    return { status: "manual_review", best, candidateCount: candidates.length };
  }
  if (second && best.matchScore - second.matchScore < AMBIGUOUS_MARGIN) {
    return { status: "ambiguous", best, candidateCount: candidates.length };
  }
  return { status: "matched", best, candidateCount: candidates.length };
}

/**
 * 같은 contentId가 두 곳 이상 "matched"로 잡히면 매칭 오류일 확률이 높다 —
 * 하나의 공식 KTO 장소가 서로 다른 두 STARA 장소일 수 없으므로 전부 manual_review로 낮춘다.
 * 국문(status/koContentId)과 영문(enStatus/enContentId) 판정이 서로 다른 필드라서 어느 쪽을
 * 볼지 콜백으로 받는다 — 두 번 호출해서 각각 독립적으로 중복을 잡는다(scripts/kto-match.ts).
 */
export function dedupeMatchedContentIds<T>(
  results: T[],
  getStatus: (r: T) => MatchStatus | EnMatchStatus | undefined,
  getContentId: (r: T) => string | undefined,
  downgrade: (r: T) => T
): T[] {
  const counts = new Map<string, number>();
  for (const r of results) {
    if (getStatus(r) === "matched") {
      const id = getContentId(r);
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return results.map((r) => {
    if (getStatus(r) !== "matched") return r;
    const id = getContentId(r);
    return id && (counts.get(id) ?? 0) > 1 ? downgrade(r) : r;
  });
}
