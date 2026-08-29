/**
 * STARA 성지 데이터 스키마 (아티팩트 "STARA 성지 데이터 명세서" 기준, 2026-08 개정)
 *
 * 세 개의 파일로 분리한다. 하나로 합치지 않는다 - city_id/artist_id를 장소마다
 * 반복 입력하면 오타로 데이터가 갈라진다. 각 place는 ID로만 다른 파일을 참조한다.
 *
 *   cities.json  (City[])   - city_id · city_name_ko/en
 *   artists.json (Artist[]) - artist_id · artist_name_ko/en
 *   places.json  (Place[])  - city_id, artist_ids[] 로 위 두 파일을 참조
 *
 * 이번 수집이 바꾸는 것: src/data/artists.ts 전체(더미 10명), src/data/places.ts의
 * artistPlaces 30개 블록.
 * 이번 스코프 아님: 메인루트 5곳(경복궁 등, STARA 자체 큐레이션), 로컬 관광지/맛집
 * (TourAPI 자동보완용) - 이 둘은 이 스키마가 다루는 대상이 아님.
 */

// ============================================================
// ID 규칙
// ============================================================
// place_id  — "{artist_id}-{맥락}-{장소슬러그}", 전부 소문자·하이픈, 공백/특수문자 금지.
//             맥락 자리엔 place_category 값을 씀. 예: "iu-cafe-onion-anguk"
// artist_id — 아티스트/그룹명 로마자 슬러그. 멤버 개별 성지는
//             "newjeans-hyein"처럼 "{그룹}-{멤버}"로 하이픈 이어붙임.
// city_id   — 행정구역 코드가 아니라 자유 슬러그(seoul, busan). 한 번 정하면
//             절대 바꾸지 않는다 - 다른 모든 place row가 이 값을 참조함.
// place_id는 파일 전체에서 유일해야 한다. 같은 장소를 다른 아티스트가 겹쳐 쓰면
// 새 row를 만들지 말고 기존 row의 artist_ids 배열에 추가한다.

export interface City {
  city_id: string;       // computed - 자유 슬러그, 한 번 정하면 불변
  city_name_ko: string;  // required
  city_name_en: string;  // required
}

export interface Artist {
  artist_id: string;       // computed - 로마자 슬러그
  artist_name_ko: string;  // required
  artist_name_en: string;  // required
}

export type PlaceCategory =
  | "food"                 // 식당 / 카페·디저트 / 베이커리
  | "shopping"              // 스토어(굿즈·MD 포함) / 시장·거리 / 편집숍·패션
  | "culture"               // 박물관·전시·갤러리 / 역사·전통 / 공연·라이브
  | "activity"              // 공원·자연 / 테마파크·체험 / 레저·스포츠
  | "landmark_observatory"  // 전망대·뷰포인트 / 상징 건축물·거리
  | "kpop";                 // 오피셜한 케이팝 관련 장소(소속사 사옥 등)
// 2026-08-20 팀 회의에서 이 6종으로 확정 (기존 photo/experience 폐지).
// "장소와 아티스트의 관계"가 아니라 "장소 자체의 성격"으로 분류한다 - 예를 들어
// 쇼핑몰에서 MV를 찍었어도 카테고리는 "photo"가 아니라 "shopping". MV 촬영지 /
// 멤버 연고지 / 소속사 공식 공간 / 팬 목격담 같은 "관계" 정보는 카테고리가 아니라
// relation_text에 담는다.
// 세부 규칙: 숙박(호텔/리조트/펜션/풀빌라)은 카테고리가 아니라 이번 스코프에서
// 아예 제외 대상 - places.json에 넣지 않는다. 소속사 사옥은 culture가 아니라
// kpop. 순수 포토존(다른 기능 없이 사진 찍는 용도로만 존재하는 곳)은 별도
// 카테고리를 만들지 않고 landmark_observatory로 흡수.
// 이 밖의 값을 쓰면 나중에 import 스크립트가 깨짐.

export type PlaceStatus = "draft" | "verified" | "published";
// 워크플로우: draft(최초 입력, 출처 미확인 가능) -> verified(출처 확인 완료)
// -> published(앱 반영 대상). 앱은 published만 필터링해서 씀 - draft/verified는
// 절대 앱에 들어가지 않는다.
// 인터뷰 기사/브이로그/공식 SNS 게시물처럼 "확인 가능한 링크"가 없으면 status를
// verified나 published로 올리지 않는다. 확인 안 된 팬 루머는 수집 대상에서 아예 제외.

export interface Place {
  place_id: string;              // computed - 슬러그 규칙대로 지음, 근거 불필요
  city_id: string;                // required - cities.json에 이미 존재하는 값
  artist_ids: string[];           // required - artists.json에 존재하는 값들. 콜라보 장소는 2개 이상
  place_name_ko: string;          // required - 실제 정식 명칭
  place_name_en: string;          // required - 실제 정식 명칭 (두 언어 다 채운다)
  place_category: PlaceCategory;  // required
  latitude: number;               // required - WGS84, 소수점 6자리까지 (지도 우클릭 복사값)
  longitude: number;              // required - WGS84, 소수점 6자리까지
  relation_text_ko: string;       // required - "왜 여기가 성지인지", 사실 기반 한 문장.
                                   //   ** 가장 중요한 규칙: 근거 없이 작성 금지 **
                                   //   (근거 = URL 링크 또는 "인물+구체적 콘텐츠명"이
                                   //   담긴 추적 가능한 인용 - source_url 참고)
  relation_text_en: string;       // required - 같은 내용의 영문 한 문장
  source_url: string;             // required - relation_text의 실제 근거. 실제 URL이
                                   //   가장 좋지만, 링크가 없어도 "인물+구체적 콘텐츠명"이
                                   //   담긴 추적 가능한 인용이면 인정한다(2026-08-25 정책 -
                                   //   케이팝 팬덤 특유의 "단서로 성지 추적" 문화 반영).
                                   //   그 경우 "[콘텐츠 인용 - 링크 미확인] {relation_text}"
                                   //   형태로 저장. 콘텐츠 근거 자체가 없는 맨주장
                                   //   (예: "지민 아버지의 식당")은 여전히 "PENDING".
                                   //   두 경우 다 status는 draft 그대로 - verified 승격에는
                                   //   여전히 사람이 확인한 실제 링크가 필요함
  open_time: string | null;       // optional - "HH:mm" 24시간제, 모르면 null (추정 금지).
                                   //   24시간 운영은 "00:00"-"23:59"
  close_time: string | null;      // optional - 위와 동일
  dwell_minutes: number | null;   // computed - 모르면 카테고리 평균으로 추정
                                   //   (food 45-60 · landmark_observatory 20-30 · shopping 40-60).
                                   //   culture/activity/kpop은 평균 기준이 아직 없음 - 정해지기 전엔 null.
  quest_type: string | null;      // optional - 비우면 카테고리 기본 퀘스트로 폴백
  quest_text_ko: string | null;   // optional - 장소별 창작 콘텐츠, 사실 인용 아님
  quest_text_en: string | null;   // optional
  image_url: string | null;       // optional - 실제 장소 사진
  tour_api_content_id: string | null; // optional - TourAPI 등록 장소면 해당 contentId
  is_food: boolean;               // computed - place_category === "food"에서 기계적으로 파생
  is_local_spot: boolean;         // computed - TourAPI 자동보완 후보 여부. 이 스키마로 직접
                                   //   수집한 성지는 전부 false (로컬 관광지는 별도 스코프)
  status: PlaceStatus;            // required
}
