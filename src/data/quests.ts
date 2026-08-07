// ─────────────────────────────────────────────────────────
// 퀘스트 데이터
// 체크포인트 퀘스트(필수)는 장소 카테고리를 기반으로 자동 생성됩니다.
//   -> 새 장소를 추가하면 퀘스트도 자동으로 생성되므로 별도 작업이 필요 없습니다.
// 서브 퀘스트(선택)는 이동 구간(segment)에 배치되는 보너스 퀘스트 풀이며,
// scheduleCalculator.ts 가 각 구간에 하나씩 순환 배정합니다.
// 실제 콘텐츠로 교체하려면 QUEST_TEXT_BY_CATEGORY / SUB_QUEST_TEMPLATES 의
// 텍스트만 수정하면 됩니다.
// ─────────────────────────────────────────────────────────
import type { PlaceCategory, Quest, QuestType } from "@/types";
import { PLACES } from "./places";

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

export const QUESTS: Quest[] = PLACES.map((place) => {
  const t = QUEST_TEXT_BY_CATEGORY[place.category];
  return {
    id: `q-${place.id}`,
    placeId: place.id,
    type: t.type,
    titleKo: t.titleKo,
    titleEn: t.titleEn,
    descriptionKo: `[${place.nameKo}] ${t.descKo}`,
    descriptionEn: `[${place.nameEn}] ${t.descEn}`,
    required: true,
    rewardType: "stamp",
    stampId: `stamp-${place.id}`,
  } satisfies Quest;
});

export function getQuestsForPlace(placeId: string): Quest[] {
  return QUESTS.filter((q) => q.placeId === placeId);
}

/** 이동 구간(핀 사이)에 배치되는 보너스 서브 퀘스트 템플릿 풀 */
export const SUB_QUEST_TEMPLATES: Omit<
  Quest,
  "id" | "segmentId" | "stampId"
>[] = [
  {
    type: "language",
    titleKo: "한국어 한마디: 밥 한 공기 주세요",
    titleEn: "Korean phrase: One more bowl of rice, please",
    descriptionKo: "이동 중 실용 한국어 표현을 익혀보세요: '밥 한 공기 주세요'",
    descriptionEn: "Learn a practical Korean phrase while moving: 'One more bowl of rice, please'",
    required: false,
    rewardType: "bonus_stamp",
  },
  {
    type: "language",
    titleKo: "한국어 한마디: 영수증은 필요 없어요",
    titleEn: "Korean phrase: I don't need a receipt",
    descriptionKo: "이동 중 실용 한국어 표현을 익혀보세요: '영수증은 필요 없어요'",
    descriptionEn: "Learn a practical Korean phrase while moving: 'I don't need a receipt'",
    required: false,
    rewardType: "bonus_stamp",
  },
  {
    type: "experience",
    titleKo: "교통카드로 이동하기",
    titleEn: "Ride using a transit card",
    descriptionKo: "다음 장소까지 교통카드를 이용해 이동해보세요.",
    descriptionEn: "Use a transit card to get to the next location.",
    required: false,
    rewardType: "bonus_point",
  },
  {
    type: "experience",
    titleKo: "지하철 다음 역 한글로 읽기",
    titleEn: "Read the next subway station in Hangeul",
    descriptionKo: "지하철을 탔다면 다음 역 이름을 한글로 읽어보세요.",
    descriptionEn: "If you're on the subway, try reading the next station's name in Hangeul.",
    required: false,
    rewardType: "bonus_point",
  },
  {
    type: "experience",
    titleKo: "한글 간판 3개 찾기",
    titleEn: "Spot 3 Hangeul signboards",
    descriptionKo: "이동하면서 한글로 된 간판을 3개 찾아보세요.",
    descriptionEn: "While walking, find 3 signboards written in Hangeul.",
    required: false,
    rewardType: "bonus_point",
  },
  {
    type: "language",
    titleKo: "한국어 한마디: 이거 얼마예요?",
    titleEn: "Korean phrase: How much is this?",
    descriptionKo: "이동 중 실용 한국어 표현을 익혀보세요: '이거 얼마예요?'",
    descriptionEn: "Learn a practical Korean phrase while moving: 'How much is this?'",
    required: false,
    rewardType: "bonus_point",
  },
];
