// 3개 루트 옵션의 "테마" 정의 + 순수 스코어링/거리 유틸.
// 164곳 실데이터 분석(2026-09-17) 근거:
//   category 분포 — food 89, experience 30, shopping 21, photo 17, culture 7 (총 164)
//   food가 절반 이상을 차지하고, shopping+experience가 51곳(31%)인데 기존 3테마(photo/culture/food)엔
//   전혀 안 들어가 폴백으로만 노출됐다. 반대로 culture(7)/photo(17)는 표본이 얇다.
// 그래서 "카테고리 = 테마" 1:1 매핑 대신, 테마마다 카테고리별 가중치(affinity)를 두고
// 점수로 순위를 매긴다 — 표본이 얇은 카테고리도 완전히 배제되지 않고, 대신 세 테마의
// "색깔"은 affinity 차이로 분명하게 갈린다(3절/5절/6절).
import type { Place, PlaceCategory } from "@/types";

export interface RouteTheme {
  id: string;
  labelKo: string;
  labelEn: string;
  descriptionKo: string;
  descriptionEn: string;
  /** 카테고리별 이 테마와의 어울림 정도(0~1). 높을수록 우선 배치된다. */
  categoryAffinity: Record<PlaceCategory, number>;
  /** 이 테마의 TourAPI 자동보완에 쓸 콘텐츠타입(관광지12/문화시설14/음식점39). */
  contentTypeId: string;
}

/**
 * 3개 루트 = 3가지 서로 다른 "여행 성격". Place.category를 그대로 테마 이름으로 쓰지 않는다.
 * local_tourism/local_restaurant는 아티스트 장소에는 절대 안 붙는 카테고리(자동보완 전용 풀)라
 * 값 자체는 실사용되지 않지만, Record<PlaceCategory,...>로 타입을 완전하게 두기 위해 중립값을 둔다.
 */
export const ROUTE_THEMES: RouteTheme[] = [
  {
    id: "fan-highlights",
    labelKo: "팬 하이라이트",
    labelEn: "Fan Highlights",
    descriptionKo: "아티스트와 가장 상징적으로 연결된 장소 위주의 코스",
    descriptionEn: "The most iconic real places tied to your artists",
    categoryAffinity: {
      photo: 1.0,
      culture: 0.95,
      experience: 0.55,
      shopping: 0.45,
      food: 0.4,
      local_tourism: 0.5,
      local_restaurant: 0.5,
    },
    contentTypeId: "12", // 관광지
  },
  {
    id: "k-culture-explorer",
    labelKo: "K-컬처 익스플로러",
    labelEn: "K-Culture Explorer",
    descriptionKo: "문화·체험·포토 장소로 채운 코스",
    descriptionEn: "Culture, experiences, and photo spots your artists connect to",
    categoryAffinity: {
      culture: 1.0,
      experience: 0.9,
      photo: 0.7,
      shopping: 0.35,
      food: 0.35,
      local_tourism: 0.5,
      local_restaurant: 0.5,
    },
    contentTypeId: "14", // 문화시설
  },
  {
    id: "shop-and-taste",
    labelKo: "쇼핑 & 맛집",
    labelEn: "Shop & Taste",
    descriptionKo: "쇼핑·맛집 장소로 채운 코스",
    descriptionEn: "Shopping and food spots connected to your artists",
    categoryAffinity: {
      shopping: 1.0,
      food: 0.85,
      experience: 0.6,
      photo: 0.3,
      culture: 0.3,
      local_tourism: 0.5,
      local_restaurant: 0.5,
    },
    contentTypeId: "39", // 음식점
  },
];

// 여러 선택 아티스트가 겹치는 공유 성지는(11곳 실측 확인) "팬이라면 놓치기 아까운 곳"이라
// 소폭 가산한다 — 과하게 주면 특정 인기 장소가 세 루트 전부를 잠식하므로 작게 둔다.
export const MULTI_ARTIST_BONUS = 0.15;
// 이미 다른 루트안의 앵커로 쓴 장소는 우선순위를 크게 낮춘다(완전 배제는 아님 — newjeans처럼
// 장소가 1곳뿐인 아티스트는 재사용 외에 선택지가 없으므로 "배제"가 아니라 "후순위"로만 둔다).
export const CROSS_ROUTE_REUSE_PENALTY = 0.5;

/**
 * 결정적 점수 — LLM 없음, 전부 고정 상수. 같은 입력엔 항상 같은 출력.
 * score = categoryAffinity + (선택 아티스트 2명 이상 겹치면 보너스) - (다른 루트에서 이미 쓴 앵커면 페널티)
 * "선택 아티스트와의 연관성" 자체는 별도 항으로 안 둔다 — 이 함수에 들어오는 후보는 이미
 * placesForArtists()로 걸러진 선택 아티스트 장소뿐이라 전부 동일하게 관련 있고, 실질적으로
 * 차별화되는 지점은 "몇 명의 선택 아티스트가 겹치는가"뿐이라 그게 곧 multiArtistBonus다.
 */
export function themeScore(
  place: Place,
  theme: RouteTheme,
  selectedArtistIds: string[],
  usedAnchorIds: ReadonlySet<string>
): number {
  const affinity = theme.categoryAffinity[place.category];
  const coveredArtists = place.artistIds.filter((id) => selectedArtistIds.includes(id));
  const multiArtistBonus = coveredArtists.length > 1 ? MULTI_ARTIST_BONUS : 0;
  const reusePenalty = usedAnchorIds.has(place.id) ? CROSS_ROUTE_REUSE_PENALTY : 0;
  return affinity + multiArtistBonus - reusePenalty;
}

/** 두 루트(Place[])가 얼마나 겹치는지 — |교집합| / |합집합|. 0=완전히 다름, 1=완전히 동일. */
export function jaccardOverlap(a: Place[], b: Place[]): number {
  const idsA = new Set(a.map((p) => p.id));
  const idsB = new Set(b.map((p) => p.id));
  if (idsA.size === 0 && idsB.size === 0) return 0;
  let intersection = 0;
  for (const id of idsA) if (idsB.has(id)) intersection++;
  const union = new Set([...idsA, ...idsB]).size;
  return union === 0 ? 0 : intersection / union;
}
