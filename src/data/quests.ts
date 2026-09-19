// ─────────────────────────────────────────────────────────
// 퀘스트 데이터
// 체크포인트 퀘스트(필수)는 장소 카테고리를 기반으로 자동 생성됩니다.
//   -> 새 장소를 추가하면 퀘스트도 자동으로 생성되므로 별도 작업이 필요 없습니다.
// 서브 퀘스트(선택)는 이동 구간(segment)에 배치되는 보너스 퀘스트 풀이며,
// scheduleCalculator.ts 가 각 구간에 하나씩 순환 배정합니다.
// 실제 콘텐츠로 교체하려면 QUEST_TEXT_BY_CATEGORY / SUB_QUEST_TEMPLATES 의
// 텍스트만 수정하면 됩니다.
// ─────────────────────────────────────────────────────────
import type { Place, Quest, QuestType, PlaceCategory } from "@/types";
import { badgeCategoryForPlaceCategory } from "./badges";
import { phrasesForTheme, type PhrasebankThemeId } from "./phrasebank";
import { getArtistById } from "./artists";

const QUEST_TEXT_BY_CATEGORY: Record<
  PlaceCategory,
  { type: QuestType; titleKo: string; titleEn: string; descKo: string; descEn: string }
> = {
  photo: {
    type: "photo",
    titleKo: "오마주샷 남기기",
    titleEn: "Take a homage photo",
    descKo: "이 장소에서 아티스트와 같은 구도로 인증샷을 남겨보세요.",
    descEn: "Take a photo here with the same framing as the artist.",
  },
  food: {
    type: "food",
    titleKo: "대표 메뉴 맛보기",
    titleEn: "Try the signature menu",
    descKo: "이곳의 대표 메뉴를 주문해서 즐겨보세요.",
    descEn: "Order and enjoy the signature menu here.",
  },
  culture: {
    type: "visit",
    titleKo: "장소 방문 인증",
    titleEn: "Check in at this spot",
    descKo: "장소를 둘러보고 방문을 완료 체크해주세요.",
    descEn: "Look around and mark this visit as complete.",
  },
  shopping: {
    type: "shopping",
    titleKo: "굿즈/기념품 둘러보기",
    titleEn: "Browse goods & souvenirs",
    descKo: "마음에 드는 굿즈나 기념품을 찾아보세요.",
    descEn: "Look for goods or souvenirs you like.",
  },
  experience: {
    type: "experience",
    titleKo: "현장 체험하기",
    titleEn: "Try the on-site experience",
    descKo: "이 장소의 대표 체험을 직접 해보세요.",
    descEn: "Try the signature experience at this location.",
  },
  local_tourism: {
    type: "visit",
    titleKo: "로컬 명소 방문",
    titleEn: "Visit the local landmark",
    descKo: "서울 로컬 명소를 둘러보고 방문을 완료 체크해주세요.",
    descEn: "Explore this local Seoul landmark and check in.",
  },
  local_restaurant: {
    type: "food",
    titleKo: "로컬 맛집 체험",
    titleEn: "Try the local restaurant",
    descKo: "서울 로컬 맛집의 대표 메뉴를 즐겨보세요.",
    descEn: "Enjoy the signature dish at this local restaurant.",
  },
};

/**
 * 장소별 개별 퀘스트 데이터. place.id로 등록해두면 category template보다 우선 사용된다.
 * 아직 수집된 개별 퀘스트 콘텐츠가 없어 비어 있다 — 채워지는 대로 자동으로 category
 * template을 대체한다(getQuestsForPlace 참고).
 */
const PLACE_QUEST_OVERRIDES: Record<
  string,
  { type: QuestType; titleKo: string; titleEn: string; descKo: string; descEn: string }
> = {};

/**
 * 장소의 필수 체크포인트 퀘스트를 즉석에서 계산한다. place.category만 있으면
 * 되므로, 정적 PLACES 배열에 없는 TourAPI(kto-*) 장소에도 항상 동일하게 동작한다
 * (이전엔 PLACES로만 미리 빌드해둔 QUESTS 테이블을 조회했기 때문에, TourAPI 장소는
 * 필수 퀘스트가 0개로 잡혀 완료 조건 없이 통과되는 버그가 있었다).
 * 개별 장소 퀘스트(PLACE_QUEST_OVERRIDES)가 있으면 그것을 우선 쓰고, 없으면
 * category template으로 폴백한다. id(`q-${place.id}`)가 "이 장소 미션을 완료했는가"의
 * 유일한 근거다(tripStore.completedQuestIds에 포함되는지로 판단) — 배지 집계는 여기가
 * 아니라 quest_photos 테이블 기준으로 서버에서 따로 계산한다(src/lib/badges.ts 참고).
 */
export function getQuestsForPlace(place: Place): Quest[] {
  const t = PLACE_QUEST_OVERRIDES[place.id] ?? QUEST_TEXT_BY_CATEGORY[place.category];
  return [
    {
      id: `q-${place.id}`,
      placeId: place.id,
      type: t.type,
      titleKo: t.titleKo,
      titleEn: t.titleEn,
      descriptionKo: `[${place.nameKo}] ${t.descKo}`,
      descriptionEn: `[${place.nameEn}] ${t.descEn}`,
      required: true,
      rewardType: "checkpoint",
    },
  ];
}

/**
 * AI 사진 인증 세그먼트 퀘스트 — 여행 중 대중교통 구간이 하나라도 있으면 여행당 정확히
 * 한 번, 첫 구간(인덱스 0)에만 배정된다(scheduleCalculator.ts 참고) — 실제로 버스를
 * 타기 전에 미리 인증하라는 취지. 전부 도보 구간이면 아예 배정되지 않는다. 나머지
 * 구간처럼 SUB_QUEST_TEMPLATES를 순환 배정하지 않는다 — 그래서 이 풀에는 포함하지 않고
 * 별도 상수로 둔다. GPS 검증 없음(사진/사물 인증 퀘스트).
 */
export const TMONEY_SEGMENT_QUEST_TEMPLATE: Omit<Quest, "id" | "segmentId"> = {
  type: "experience",
  titleKo: "T-money 카드 인증하기",
  titleEn: "Show your T-money card",
  descriptionKo: "사용 중인 T-money 카드 전체가 보이도록 사진을 찍어 인증해보세요.",
  descriptionEn: "Take a clear photo of your T-money card to complete this challenge.",
  required: false,
  rewardType: "bonus_point",
  verification: { type: "tmoney_photo" },
};

/** place.id로부터 phrases 배열 안의 결정론적 인덱스를 고른다(랜덤 없음, 같은 장소는 항상 같은 문구). */
function pickPhraseIndex(seed: string, count: number): number {
  if (count <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % count;
}

/**
 * 이동 구간(핀과 핀 사이)의 보너스 서브 퀘스트를 "다음 행선지" 장소에 맞춰 즉석에서
 * 만든다 — theme_phrasebank.json(src/data/phrasebank.ts)에서 장소 카테고리에 맞는 테마의
 * 문구를 하나 골라 언어 학습 퀘스트로 감싼다. 아티스트와 연관된 장소(artistIds 있음)는
 * 카테고리보다 kpop 테마를 우선한다. T-money 세그먼트(TMONEY_SEGMENT_QUEST_TEMPLATE)에는
 * 쓰이지 않는다 — scheduleCalculator.ts가 그 구간만 따로 배정한다.
 */
export function buildLanguageSubQuest(place: Place): Omit<Quest, "id" | "segmentId"> {
  const theme: PhrasebankThemeId =
    place.artistIds.length > 0 ? "kpop" : badgeCategoryForPlaceCategory(place.category) ?? "basic";
  const phrases = phrasesForTheme(theme);
  const phrase = phrases[pickPhraseIndex(place.id, phrases.length)];

  const artist = theme === "kpop" ? getArtistById(place.artistIds[0]) : undefined;
  const ko = phrase.ko.replace("{A}", artist?.name ?? "아티스트");
  const en = phrase.en.replace("{A}", artist?.nameEn ?? "the artist");

  return {
    type: "language",
    titleKo: `한국어 한마디: ${ko}`,
    titleEn: `Korean phrase: ${en}`,
    descriptionKo: `다음 장소로 이동하며 실용 한국어 표현을 익혀보세요: '${ko}' (${phrase.romanization})`,
    descriptionEn: `Learn a practical Korean phrase on the way to your next stop: '${en}'`,
    required: false,
    rewardType: "bonus_badge",
  };
}
