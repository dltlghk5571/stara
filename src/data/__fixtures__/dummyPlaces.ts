// 더미 아티스트 장소 데이터 (실존 인물 아님). 프로덕션에서는 더 이상 쓰이지 않고
// 테스트 전용 fixture로만 남아있다(실서울 데이터로 교체된 히스토리는 PROGRESS.md 참고).
import type { Place, PlaceCategory } from "@/types";

type PlaceDraft = Omit<Place, "questIds">;

const ARTIST_HUBS: { lat: number; lng: number; area: string }[] = [
  { lat: 37.5563, lng: 126.9236, area: "홍대" },
  { lat: 37.5347, lng: 126.9947, area: "이태원" },
  { lat: 37.4979, lng: 127.0276, area: "강남" },
  { lat: 37.5133, lng: 127.1001, area: "잠실" },
  { lat: 37.5663, lng: 126.9925, area: "을지로" },
  { lat: 37.5732, lng: 126.9862, area: "인사동" },
  { lat: 37.5445, lng: 127.0559, area: "성수" },
  { lat: 37.5219, lng: 126.9245, area: "여의도" },
  { lat: 37.5665, lng: 127.0093, area: "동대문" },
  { lat: 37.5048, lng: 127.0046, area: "서초" },
];

const THIRD_CATEGORY: PlaceCategory[] = [
  "culture",
  "shopping",
  "experience",
  "culture",
  "shopping",
  "experience",
  "culture",
  "shopping",
  "experience",
  "culture",
];

function jitter(base: number, i: number, sign: 1 | -1): number {
  return base + sign * (0.0015 + i * 0.0008);
}

const artistPlaces: PlaceDraft[] = ARTIST_HUBS.flatMap((hub, idx) => {
  const n = String(idx + 1).padStart(2, "0");
  const artistId = `artist-${n}`;
  const artistName = `아티스트 ${n}`;

  const photo: PlaceDraft = {
    id: `place-${n}-photo`,
    nameKo: `${hub.area} 포토존 (${artistName} 화보 촬영지)`,
    nameEn: `${hub.area} Photo Spot (Artist ${n} Photoshoot Location)`,
    latitude: jitter(hub.lat, idx, 1),
    longitude: jitter(hub.lng, idx, 1),
    category: "photo",
    artistIds: [artistId],
    relationTextKo: `${artistName}가 화보와 뮤직비디오를 촬영한 장소입니다. 같은 구도로 사진을 남겨보세요.`,
    relationTextEn: `${artistName} shot a photoshoot and music video here. Try recreating the same angle.`,
    openTime: "09:00",
    closeTime: "21:00",
    dwellMinutes: 30,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: false,
  };

  const food: PlaceDraft = {
    id: `place-${n}-food`,
    nameKo: `${hub.area} ${artistName} 단골 식당`,
    nameEn: `${hub.area} Artist ${n}'s Favorite Restaurant`,
    latitude: jitter(hub.lat, idx, -1),
    longitude: jitter(hub.lng, idx, 1),
    category: "food",
    artistIds: [artistId],
    relationTextKo: `${artistName}가 인터뷰에서 즐겨찾는다고 언급한 식당입니다. 대표 메뉴를 함께 즐겨보세요.`,
    relationTextEn: `${artistName} mentioned this as a favorite spot in an interview. Try the signature menu.`,
    openTime: "10:30",
    closeTime: "21:30",
    dwellMinutes: 60,
    isFood: true,
    isLocalSpot: false,
    isMainRoute: false,
  };

  const thirdCategory = THIRD_CATEGORY[idx];
  const thirdMeta: Record<
    PlaceCategory,
    { suffix: string; relKo: string; relEn: string; dwell: number }
  > = {
    culture: {
      suffix: "소속사 사옥 앞",
      relKo: `${artistName}가 데뷔 전 연습생으로 지낸 소속사 인근입니다. 팬들의 성지순례 장소로 알려져 있습니다.`,
      relEn: `Near the agency building where ${artistName} trained as a trainee. Known as a fan pilgrimage spot.`,
      dwell: 20,
    },
    shopping: {
      suffix: "굿즈 팝업 거리",
      relKo: `${artistName}의 팬 굿즈 팝업스토어가 자주 열리는 거리입니다.`,
      relEn: `A street where pop-up stores for ${artistName}'s fan merchandise are frequently held.`,
      dwell: 40,
    },
    experience: {
      suffix: "팬사인회 개최지",
      relKo: `${artistName}의 팬사인회가 열렸던 공간으로, 데뷔 초 무대 영상 속 배경이기도 합니다.`,
      relEn: `A venue that hosted ${artistName}'s fan signing event, also seen in early debut stage footage.`,
      dwell: 30,
    },
    photo: { suffix: "", relKo: "", relEn: "", dwell: 30 },
    food: { suffix: "", relKo: "", relEn: "", dwell: 30 },
    local_tourism: { suffix: "", relKo: "", relEn: "", dwell: 30 },
    local_restaurant: { suffix: "", relKo: "", relEn: "", dwell: 30 },
  };
  const meta = thirdMeta[thirdCategory];

  const third: PlaceDraft = {
    id: `place-${n}-third`,
    nameKo: `${hub.area} ${meta.suffix}`,
    nameEn: `${hub.area} ${artistName} Spot`,
    latitude: jitter(hub.lat, idx, -1),
    longitude: jitter(hub.lng, idx, -1),
    category: thirdCategory,
    artistIds: [artistId],
    relationTextKo: meta.relKo,
    relationTextEn: meta.relEn,
    openTime: "10:00",
    closeTime: "20:00",
    dwellMinutes: meta.dwell,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: false,
  };

  return [photo, food, third];
});

const sharedPlace = artistPlaces.find((p) => p.id === "place-05-third");
if (sharedPlace) {
  sharedPlace.artistIds = [...sharedPlace.artistIds, "artist-06"];
  sharedPlace.relationTextKo = `아티스트 05와 아티스트 06이 함께 협업 촬영을 진행한 장소입니다. ${sharedPlace.relationTextKo}`;
  sharedPlace.relationTextEn = `A location where Artist 05 and Artist 06 filmed a collaboration. ${sharedPlace.relationTextEn}`;
}

/** 테스트 전용 더미 아티스트 장소 (place-01-photo, place-01-food, place-01-third, ...) */
export const DUMMY_ARTIST_PLACES: Place[] = artistPlaces.map((p) => ({
  ...p,
  questIds: [`q-${p.id}`],
}));
