// ─────────────────────────────────────────────────────────
// 서울 실제 K-pop 성지 장소 데이터(SEOUL_PLACES, scripts/export-seoul-dataset.ts 산출물) +
// STARA 운영자가 직접 큐레이션한 메인 루트/로컬 관광지·맛집 자동보완 풀.
//   1. category는 PlaceCategory 타입 중 하나 (필터 UI에는 5종만 노출됨)
//   2. isMainRoute=true 장소는 삭제 불가능한 STARA 공식 루트로 취급됨
//   3. isLocalSpot && !isFood => 로컬 관광지 자동보완 후보
//      isLocalSpot && isFood  => 로컬 맛집 자동보완 후보
//   4. questIds는 quests.ts 에서 `q-${place.id}` 규칙으로 자동 생성되므로
//      새 장소를 추가하면 퀘스트는 자동으로 따라옴
// ─────────────────────────────────────────────────────────
import type { Place } from "@/types";
import { SEOUL_PLACES } from "./generated/seoulPlaces";

type PlaceDraft = Omit<Place, "questIds">;

const artistPlaces: PlaceDraft[] = SEOUL_PLACES;

// STARA 운영자가 미리 제작한 서울 대표 메인 루트 (기본 순서 유지 대상)
const mainRoutePlaces: PlaceDraft[] = [
  {
    id: "main-gyeongbokgung",
    nameKo: "경복궁",
    nameEn: "Gyeongbokgung Palace",
    latitude: 37.5796,
    longitude: 126.977,
    category: "culture",
    artistIds: [],
    relationTextKo: "다수의 K-pop 화보와 홍보 영상이 촬영된 서울 대표 고궁입니다.",
    relationTextEn: "A landmark palace featured in many K-pop pictorials and promo videos.",
    openTime: "09:00",
    closeTime: "18:00",
    dwellMinutes: 60,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: true,
  },
  {
    id: "main-ikseondong",
    nameKo: "익선동 한옥거리",
    nameEn: "Ikseondong Hanok Street",
    latitude: 37.5732,
    longitude: 126.9909,
    category: "culture",
    artistIds: [],
    relationTextKo: "한옥 감성 카페 거리로, 여러 아티스트의 브이로그 촬영지로 사랑받는 곳입니다.",
    relationTextEn: "A hanok cafe street loved as a vlog filming location by many artists.",
    openTime: "10:00",
    closeTime: "22:00",
    dwellMinutes: 50,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: true,
  },
  {
    id: "main-myeongdong",
    nameKo: "명동거리",
    nameEn: "Myeongdong Street",
    latitude: 37.5636,
    longitude: 126.9834,
    category: "shopping",
    artistIds: [],
    relationTextKo: "K-뷰티와 K-패션의 중심지로, 글로벌 팬들의 필수 쇼핑 코스입니다.",
    relationTextEn: "The heart of K-beauty and K-fashion, a must-visit shopping course for global fans.",
    openTime: "10:00",
    closeTime: "22:00",
    dwellMinutes: 60,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: true,
  },
  {
    id: "main-hongdae",
    nameKo: "홍대 거리공연 거리",
    nameEn: "Hongdae Busking Street",
    latitude: 37.5563,
    longitude: 126.9238,
    category: "culture",
    artistIds: [],
    relationTextKo: "수많은 아티스트가 데뷔 전 거리공연을 하던 홍대의 상징적인 거리입니다.",
    relationTextEn: "An iconic Hongdae street where many artists busked before their debut.",
    openTime: "10:00",
    closeTime: "22:00",
    dwellMinutes: 50,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: true,
  },
  {
    id: "main-banpo",
    nameKo: "반포 한강공원",
    nameEn: "Banpo Hangang Park",
    latitude: 37.5125,
    longitude: 126.9966,
    category: "experience",
    artistIds: [],
    relationTextKo: "무지개 분수와 야경으로 유명한 한강공원으로, 뮤직비디오 단골 배경지입니다.",
    relationTextEn: "Famous for its rainbow fountain and night view, a frequent MV backdrop.",
    openTime: "09:00",
    closeTime: "21:00",
    dwellMinutes: 40,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: true,
  },
];

// 자동 보완용 로컬 관광지 후보 (placeCategory: local_tourism)
const localTourismPlaces: PlaceDraft[] = [
  {
    id: "local-tourism-nseoultower",
    nameKo: "N서울타워",
    nameEn: "N Seoul Tower",
    latitude: 37.5512,
    longitude: 126.9882,
    category: "local_tourism",
    artistIds: [],
    relationTextKo: "서울 전경을 한눈에 볼 수 있는 대표 관광 명소입니다.",
    relationTextEn: "A signature Seoul viewpoint overlooking the whole city.",
    openTime: "10:00",
    closeTime: "23:00",
    dwellMinutes: 50,
    isFood: false,
    isLocalSpot: true,
    isMainRoute: false,
  },
  {
    id: "local-tourism-changdeokgung",
    nameKo: "창덕궁",
    nameEn: "Changdeokgung Palace",
    latitude: 37.5792,
    longitude: 126.991,
    category: "local_tourism",
    artistIds: [],
    relationTextKo: "유네스코 세계문화유산으로 지정된 고즈넉한 궁궐입니다.",
    relationTextEn: "A serene UNESCO World Heritage palace.",
    openTime: "09:00",
    closeTime: "17:30",
    dwellMinutes: 50,
    isFood: false,
    isLocalSpot: true,
    isMainRoute: false,
  },
  {
    id: "local-tourism-cheonggyecheon",
    nameKo: "청계천 광장",
    nameEn: "Cheonggyecheon Plaza",
    latitude: 37.5696,
    longitude: 126.9784,
    category: "local_tourism",
    artistIds: [],
    relationTextKo: "도심 속 하천 산책로로, 짧게 걷기 좋은 서울 로컬 명소입니다.",
    relationTextEn: "An urban stream walkway, a great local Seoul spot for a short stroll.",
    openTime: "00:00",
    closeTime: "23:59",
    dwellMinutes: 30,
    isFood: false,
    isLocalSpot: true,
    isMainRoute: false,
  },
  {
    id: "local-tourism-lotteworldtower",
    nameKo: "롯데월드타워 전망대",
    nameEn: "Lotte World Tower Observatory",
    latitude: 37.5125,
    longitude: 127.1025,
    category: "local_tourism",
    artistIds: [],
    relationTextKo: "서울에서 가장 높은 전망대에서 도시 전경을 감상할 수 있습니다.",
    relationTextEn: "Enjoy the city view from Seoul's tallest observatory.",
    openTime: "10:00",
    closeTime: "22:00",
    dwellMinutes: 50,
    isFood: false,
    isLocalSpot: true,
    isMainRoute: false,
  },
];

// 자동 보완용 로컬 맛집 후보 (placeCategory: local_restaurant)
const localRestaurantPlaces: PlaceDraft[] = [
  {
    id: "local-restaurant-jongno-gukbap",
    nameKo: "종로 로컬 국밥집",
    nameEn: "Jongno Local Gukbap House",
    latitude: 37.57,
    longitude: 126.985,
    category: "local_restaurant",
    artistIds: [],
    relationTextKo: "현지인들도 즐겨 찾는 서울 로컬 국밥 맛집입니다.",
    relationTextEn: "A local gukbap restaurant loved by Seoul residents.",
    openTime: "09:00",
    closeTime: "21:00",
    dwellMinutes: 50,
    isFood: true,
    isLocalSpot: true,
    isMainRoute: false,
  },
  {
    id: "local-restaurant-hongdae-bunsik",
    nameKo: "홍대 분식거리 맛집",
    nameEn: "Hongdae Street Food Alley",
    latitude: 37.5558,
    longitude: 126.925,
    category: "local_restaurant",
    artistIds: [],
    relationTextKo: "떡볶이, 튀김 등 한국식 길거리 분식을 즐길 수 있는 거리입니다.",
    relationTextEn: "A street offering Korean street food like tteokbokki and fried snacks.",
    openTime: "10:00",
    closeTime: "22:00",
    dwellMinutes: 40,
    isFood: true,
    isLocalSpot: true,
    isMainRoute: false,
  },
  {
    id: "local-restaurant-gangnam-samgyeopsal",
    nameKo: "강남 삼겹살집",
    nameEn: "Gangnam Samgyeopsal House",
    latitude: 37.4985,
    longitude: 127.028,
    category: "local_restaurant",
    artistIds: [],
    relationTextKo: "한국식 삼겹살을 제대로 즐길 수 있는 강남 로컬 맛집입니다.",
    relationTextEn: "A Gangnam local restaurant for authentic Korean grilled pork belly.",
    openTime: "11:00",
    closeTime: "23:00",
    dwellMinutes: 60,
    isFood: true,
    isLocalSpot: true,
    isMainRoute: false,
  },
  {
    id: "local-restaurant-jamsil-hansik",
    nameKo: "잠실 한식당",
    nameEn: "Jamsil Korean Restaurant",
    latitude: 37.513,
    longitude: 127.0995,
    category: "local_restaurant",
    artistIds: [],
    relationTextKo: "정갈한 한상차림을 맛볼 수 있는 잠실 로컬 한식당입니다.",
    relationTextEn: "A Jamsil local restaurant serving a full Korean table setting.",
    openTime: "10:30",
    closeTime: "21:30",
    dwellMinutes: 55,
    isFood: true,
    isLocalSpot: true,
    isMainRoute: false,
  },
  {
    id: "local-restaurant-seongsu-brunch",
    nameKo: "성수 브런치 카페",
    nameEn: "Seongsu Brunch Cafe",
    latitude: 37.544,
    longitude: 127.0565,
    category: "local_restaurant",
    artistIds: [],
    relationTextKo: "감각적인 공간에서 브런치를 즐길 수 있는 성수 로컬 카페입니다.",
    relationTextEn: "A stylish Seongsu local cafe for brunch.",
    openTime: "09:00",
    closeTime: "20:00",
    dwellMinutes: 45,
    isFood: true,
    isLocalSpot: true,
    isMainRoute: false,
  },
  {
    id: "local-restaurant-yeouido-naengmyeon",
    nameKo: "여의도 냉면집",
    nameEn: "Yeouido Naengmyeon House",
    latitude: 37.5215,
    longitude: 126.925,
    category: "local_restaurant",
    artistIds: [],
    relationTextKo: "시원한 평양냉면으로 유명한 여의도 로컬 맛집입니다.",
    relationTextEn: "A Yeouido local restaurant famous for cold Pyongyang-style naengmyeon.",
    openTime: "11:00",
    closeTime: "21:00",
    dwellMinutes: 45,
    isFood: true,
    isLocalSpot: true,
    isMainRoute: false,
  },
];

const allDrafts: PlaceDraft[] = [
  ...artistPlaces,
  ...mainRoutePlaces,
  ...localTourismPlaces,
  ...localRestaurantPlaces,
];

export const PLACES: Place[] = allDrafts.map((p) => ({
  ...p,
  questIds: [`q-${p.id}`],
}));

export function getPlaceById(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

export const MAIN_ROUTE_PLACE_IDS: string[] = mainRoutePlaces.map((p) => p.id);
export const LOCAL_TOURISM_PLACES = PLACES.filter(
  (p) => p.isLocalSpot && !p.isFood
);
export const LOCAL_RESTAURANT_PLACES = PLACES.filter(
  (p) => p.isLocalSpot && p.isFood
);
export const ARTIST_PLACES = PLACES.filter((p) => p.artistIds.length > 0);
