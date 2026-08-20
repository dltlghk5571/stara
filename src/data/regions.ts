// ─────────────────────────────────────────────────────────
// 지역(온보딩 지역 선택) 데이터.
// Place 스키마와는 완전히 별개 — 실제 촬영지 데이터 유무와 무관하게
// 지도 UI에 8개 지역을 전부 보여주되, 실제로 루트 생성이 가능한
// 지역만 available=true로 표시한다.
//   - 서울: ARTIST_PLACES(places.ts) 기반 대표 아티스트 데이터 보유
//   - 인천/부산: 장소 데이터 수집 진행 중 — TourAPI만으로 루트 생성
//   - 나머지 5개: 지도에는 보이지만 "준비중"
// ─────────────────────────────────────────────────────────

export interface Region {
  id: string;
  nameKo: string;
  nameEn: string;
  available: boolean;
  /** TourAPI 위치기반 조회에 쓸 지역 중심 좌표(시청/도청 등) */
  centerLat: number;
  centerLng: number;
  descriptionKo: string;
  descriptionEn: string;
  /** 실제 아티스트-장소 연결 데이터가 있는 지역만 채움(현재는 서울뿐) */
  representativeArtistId?: string;
}

export const REGIONS: Region[] = [
  {
    id: "seoul",
    nameKo: "서울",
    nameEn: "Seoul",
    available: true,
    centerLat: 37.5665,
    centerLng: 126.978,
    descriptionKo: "궁궐 배경부터 심야 편의점 씬까지 — 가장 상징적인 K-드라마·K-팝 촬영지가 모여있는 지역입니다.",
    descriptionEn: "From palace backdrops to late-night convenience store scenes — this region hosts some of the most iconic K-drama and K-pop filming spots.",
    representativeArtistId: "artist-01",
  },
  {
    id: "incheon",
    nameKo: "인천",
    nameEn: "Incheon",
    available: true,
    centerLat: 37.4563,
    centerLng: 126.7052,
    descriptionKo: "공항 도시이자 개항의 역사가 남아있는 인천의 관광지를 TourAPI로 소개합니다.",
    descriptionEn: "Incheon's airport-city history and open-port heritage, curated live from TourAPI.",
  },
  {
    id: "busan",
    nameKo: "부산",
    nameEn: "Busan",
    available: true,
    centerLat: 35.1796,
    centerLng: 129.0756,
    descriptionKo: "바다와 도시가 맞닿은 부산의 명소를 TourAPI로 소개합니다.",
    descriptionEn: "Where the sea meets the city — Busan's highlights, curated live from TourAPI.",
  },
  {
    id: "gangwon",
    nameKo: "강원",
    nameEn: "Gangwon",
    available: false,
    centerLat: 37.8228,
    centerLng: 128.1555,
    descriptionKo: "곧 만나요 — 준비 중인 지역입니다.",
    descriptionEn: "Coming soon.",
  },
  {
    id: "gyeonggi",
    nameKo: "경기",
    nameEn: "Gyeonggi",
    available: false,
    centerLat: 37.4138,
    centerLng: 127.5183,
    descriptionKo: "곧 만나요 — 준비 중인 지역입니다.",
    descriptionEn: "Coming soon.",
  },
  {
    id: "gyeongsang",
    nameKo: "경상",
    nameEn: "Gyeongsang",
    available: false,
    centerLat: 35.8722,
    centerLng: 128.6025,
    descriptionKo: "곧 만나요 — 준비 중인 지역입니다.",
    descriptionEn: "Coming soon.",
  },
  {
    id: "jeolla",
    nameKo: "전라",
    nameEn: "Jeolla",
    available: false,
    centerLat: 35.1595,
    centerLng: 126.8526,
    descriptionKo: "곧 만나요 — 준비 중인 지역입니다.",
    descriptionEn: "Coming soon.",
  },
  {
    id: "chungcheong",
    nameKo: "충청",
    nameEn: "Chungcheong",
    available: false,
    centerLat: 36.3504,
    centerLng: 127.3845,
    descriptionKo: "곧 만나요 — 준비 중인 지역입니다.",
    descriptionEn: "Coming soon.",
  },
  {
    id: "jeju",
    nameKo: "제주",
    nameEn: "Jeju",
    available: false,
    centerLat: 33.4996,
    centerLng: 126.5312,
    descriptionKo: "곧 만나요 — 준비 중인 지역입니다.",
    descriptionEn: "Coming soon.",
  },
];

export function getRegionById(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}
