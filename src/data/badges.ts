// ─────────────────────────────────────────────────────────
// 배지(badge) 카탈로그 — 정적 콘텐츠. 6개 카테고리 × 2단계(Lv.1/Lv.2) = 12개.
// Quest 데이터(quests.ts)와 같은 패턴: titleKo/titleEn/descriptionKo/descriptionEn을
// 데이터에 직접 담고, i18n 사전은 UI 크롬(탭 라벨, "N곳 방문" 같은 문구)에만 쓴다.
// 실제 콘텐츠로 교체하려면 이 배열의 문구/threshold만 수정하면 된다.
// ─────────────────────────────────────────────────────────
import type { PlaceCategory } from "@/types";

export type BadgeCategoryId = "food" | "shopping" | "culture" | "activity" | "landmark" | "kpop";
export type BadgeTier = 1 | 2;

export interface BadgeDefinition {
  id: string; // `${categoryId}-${tier}`
  categoryId: BadgeCategoryId;
  tier: BadgeTier;
  /** 이 배지를 따는 데 필요한 고유 장소 방문 수 */
  threshold: number;
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
}

export const BADGE_CATEGORY_STYLE: Record<
  BadgeCategoryId,
  { icon: string; color: string; labelKo: string; labelEn: string }
> = {
  food: { icon: "🍴", color: "#FF3B5C", labelKo: "푸드", labelEn: "Food" },
  shopping: { icon: "🛍️", color: "#E040D0", labelKo: "쇼핑", labelEn: "Shopping" },
  culture: { icon: "🏛️", color: "#FFC633", labelKo: "컬처", labelEn: "Culture" },
  activity: { icon: "🌿", color: "#2ECC71", labelKo: "액티비티", labelEn: "Activity" },
  landmark: { icon: "🖼️", color: "#29B6E8", labelKo: "랜드마크", labelEn: "Landmark" },
  kpop: { icon: "⭐", color: "#8B5CF6", labelKo: "K-POP", labelEn: "K-POP" },
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "food-1",
    categoryId: "food",
    tier: 1,
    threshold: 5,
    titleKo: "푸디",
    titleEn: "Foodie",
    descriptionKo: "레스토랑, 카페, 디저트 가게, 베이커리 등 음식 장소 5곳을 방문해보세요.",
    descriptionEn: "Visit 5 food spots including restaurants, cafés, dessert shops, or bakeries.",
  },
  {
    id: "food-2",
    categoryId: "food",
    tier: 2,
    threshold: 10,
    titleKo: "푸드 익스플로러",
    titleEn: "Food Explorer",
    descriptionKo: "여행 중 음식 장소 10곳을 방문해보세요.",
    descriptionEn: "Visit 10 food spots across your travels.",
  },
  {
    id: "shopping-1",
    categoryId: "shopping",
    tier: 1,
    threshold: 5,
    titleKo: "쇼퍼",
    titleEn: "Shopper",
    descriptionKo: "상점, 시장, 거리, 편집숍 등 쇼핑 장소 5곳을 방문해보세요.",
    descriptionEn: "Visit 5 shopping spots, including stores, markets, streets, or select shops.",
  },
  {
    id: "shopping-2",
    categoryId: "shopping",
    tier: 2,
    threshold: 10,
    titleKo: "쇼핑 헌터",
    titleEn: "Shopping Hunter",
    descriptionKo: "여행 중 쇼핑 장소 10곳을 발견해보세요.",
    descriptionEn: "Discover 10 shopping spots across your travels.",
  },
  {
    id: "culture-1",
    categoryId: "culture",
    tier: 1,
    threshold: 5,
    titleKo: "컬처 시커",
    titleEn: "Culture Seeker",
    descriptionKo: "박물관, 전시, 갤러리, 유적지, 전통 명소 등 문화 장소 5곳을 방문해보세요.",
    descriptionEn: "Visit 5 cultural spots, including museums, exhibitions, galleries, historical sites, or traditional attractions.",
  },
  {
    id: "culture-2",
    categoryId: "culture",
    tier: 2,
    threshold: 10,
    titleKo: "컬처 컬렉터",
    titleEn: "Culture Collector",
    descriptionKo: "문화 장소 10곳을 방문하고 새로운 경험을 모아보세요.",
    descriptionEn: "Visit 10 cultural spots and collect new experiences.",
  },
  {
    id: "activity-1",
    categoryId: "activity",
    tier: 1,
    threshold: 3,
    titleKo: "어드벤처러",
    titleEn: "Adventurer",
    descriptionKo: "공원, 자연 명소, 테마파크, 레저, 스포츠 등 액티비티 3곳을 경험해보세요.",
    descriptionEn: "Experience 3 activity spots, including parks, nature spots, theme parks, leisure, or sports.",
  },
  {
    id: "activity-2",
    categoryId: "activity",
    tier: 2,
    threshold: 7,
    titleKo: "어드벤처 마스터",
    titleEn: "Adventure Master",
    descriptionKo: "여행 중 서로 다른 액티비티 7곳을 경험해보세요.",
    descriptionEn: "Experience 7 different activities across your travels.",
  },
  {
    id: "landmark-1",
    categoryId: "landmark",
    tier: 1,
    threshold: 3,
    titleKo: "랜드마크 헌터",
    titleEn: "Landmark Hunter",
    descriptionKo: "랜드마크, 전망대, 관측소 3곳을 방문해보세요.",
    descriptionEn: "Visit 3 landmarks, viewpoints, or observatories.",
  },
  {
    id: "landmark-2",
    categoryId: "landmark",
    tier: 2,
    threshold: 7,
    titleKo: "랜드마크 익스플로러",
    titleEn: "Landmark Explorer",
    descriptionKo: "상징적인 랜드마크 7곳을 발견해보세요.",
    descriptionEn: "Discover 7 iconic landmarks across your travels.",
  },
  {
    id: "kpop-1",
    categoryId: "kpop",
    tier: 1,
    threshold: 3,
    titleKo: "스타 팔로워",
    titleEn: "Star Follower",
    descriptionKo: "K-POP 관련 장소 3곳을 방문해보세요.",
    descriptionEn: "Visit 3 K-POP-related places.",
  },
  {
    id: "kpop-2",
    categoryId: "kpop",
    tier: 2,
    threshold: 7,
    titleKo: "스타 체이서",
    titleEn: "Star Chaser",
    descriptionKo: "당신의 스타를 따라 K-POP 관련 장소 7곳을 방문해보세요.",
    descriptionEn: "Follow your stars to 7 K-POP-related places.",
  },
];

/**
 * STARA의 PlaceCategory → 배지 카테고리 매핑. STARA에는 별도의 "랜드마크" 카테고리가
 * 없어서, 전망대/포토스팟 성격의 "photo"와 자동보완용 "local_tourism"을 landmark로
 * 묶었다. "local_restaurant"(로컬 맛집)는 food로 묶었다. K-pop 배지는 카테고리가 아니라
 * artistIds 유무로 별도 집계한다(computeBadgeProgress 참고) — 카테고리 배지와 중복 집계될
 * 수 있다(예: 아티스트가 연결된 food 장소는 food 배지와 kpop 배지 둘 다에 카운트됨).
 */
export function badgeCategoryForPlaceCategory(category: PlaceCategory): BadgeCategoryId | null {
  switch (category) {
    case "food":
    case "local_restaurant":
      return "food";
    case "shopping":
      return "shopping";
    case "culture":
      return "culture";
    case "experience":
      return "activity";
    case "photo":
    case "local_tourism":
      return "landmark";
    default:
      return null;
  }
}
