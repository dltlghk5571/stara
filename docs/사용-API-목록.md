# STARA 사용 API 목록

코드 기준(2026-09) 실제 호출되는 외부 API 전수 조사. 한국관광공사 오픈API와
그 외 API 두 그룹으로 정리.

## 1. 한국관광공사(TourAPI) Open API

서버 전용(`src/lib/tour-api/client.ts`)으로만 호출하며, 서비스키는
`TOUR_API_KEY` 환경변수로 관리하고 브라우저에 노출하지 않는다.

| API명(operation) | 게이트웨이 | 용도 | 사용 위치 |
|---|---|---|---|
| `locationBasedList2` | KorService2 / EngService2 | 좌표+반경 기준 주변 관광지·음식점 조회. 코스에 로컬 맛집/명소가 부족할 때 자동 보완 | `fetchLocationBasedList` |
| `searchKeyword2` | KorService2 / EngService2 | 장소명 키워드 검색. STARA 장소 데이터와 TourAPI contentId 매칭(`kto-match.ts`)에 사용 | `fetchSearchKeyword` |
| `detailCommon2` | KorService2 / EngService2 | contentId 기준 공통 상세정보(개요·주소·좌표) 조회 | `fetchDetailCommon` |
| `detailIntro2` | KorService2 / EngService2 | 카테고리별 소개 정보(운영시간 등) 조회 | `fetchDetailIntro` |
| `searchKeyword1` | TarRlteTarService1(관광지별 연관 관광지 정보 서비스) | 메인 루트 5곳을 anchor로 "연결성 높은 장소" 랭킹 신호 조회(순수 랭킹 보정용, 실시간 방문량 아님) | `src/lib/tour-api/relatedTourism.ts` |

- **국문/영문 이중 게이트웨이**: 같은 operation을 `KorService2`(국문)와 `EngService2`(영문)
  양쪽에 호출할 수 있는 구조. `locale=en` 요청 시 영문 게이트웨이를 우선 호출하고,
  결과가 없으면(주로 소규모 로컬 상점) 국문 게이트웨이로 폴백한다.
- **인증**: 공공데이터포털 발급 서비스키(디코딩 키)를 `serviceKey` 쿼리파라미터로 전달.
- **캐시**: 동일 `baseUrl+operation+params` 조합은 인메모리 캐시(`src/lib/cache.ts`)로 재호출 방지.
- **실패 처리**: 네트워크/HTTP 오류 시 예외를 던지지 않고 빈 배열 반환 → 호출부가 더미
  데이터 폴백 경로를 탄다.
- **`TarRlteTarService1`(연관 관광지)은 나머지 4개와 코드 체계가 다르다**: 좌표(mapX/mapY)가
  아니라 시군구코드 기반이라 별도 `TOUR_API_RELATED_BASE_URL`을 쓰고, 같은 `TOUR_API_KEY`를
  재사용하지만 data.go.kr에서 별도 활용신청이 필요하다. 월 1회 갱신되는 데이터라 응답을
  24시간 캐시한다. 실패/미승인이면 랭킹 신호가 0(중립)이 되어 거리/식사시간 기준으로만
  자연스럽게 폴백한다.

## 2. 한국관광공사 외 API

| API명 | 제공사 | 용도 | 사용 위치 |
|---|---|---|---|
| Tmap SDK (jsv2) | SK Open API (SK텔레콤) | 지도 렌더링, 경로 핀·마커·내 위치 표시 | `layout.tsx`(SDK 로드), `TmapMapView.tsx` |
| Tmap 자동차 길찾기 API (`/tmap/routes`) | SK Open API (SK텔레콤) | 장소 간 실제 이동거리·소요시간 계산(도로 기준). 실패 시 직선거리(Haversine) 추정으로 폴백 | `src/lib/directions/tmapProvider.ts` |
| TMAP Transit(대중교통 경로 안내, `/transit/routes`) | SK Open API (SK텔레콤) | 두 장소 사이의 상세 지하철/버스 경로(역·노선·버스번호·정거장 수). Tmap 자동차 길찾기와는 **별개 상품/쿼터**(무료 10회/일). 사용자가 "상세 대중교통 경로 보기"를 눌렀을 때만, 로그인 상태에서만, 짧은 서버 캐시(≤23시간) 미스일 때만 호출 | `src/lib/transit/tmapTransitClient.ts`, `src/app/api/transit/route.ts` |
| Clerk | Clerk | 회원가입·로그인·세션 인증. `/onboarding`, `/trip`, `/edit`, `/complete` 접근 시 미로그인이면 `/sign-in`으로 리다이렉트 | `src/proxy.ts`(미들웨어), `@clerk/nextjs` 전반 |
| Vercel Blob | Vercel | 미션 인증 사진 원본 파일 업로드·공개 저장 | `src/app/api/photo-upload/route.ts`, `MissionSheet.tsx` |
| Neon (Postgres, HTTP 드라이버) | Neon | 사용자·퀘스트 인증샷 기록 등 앱 데이터 저장(`@neondatabase/serverless` + drizzle-orm) | `src/db/index.ts` 및 하위 API 라우트 |
| Anthropic Messages API (Claude Vision) | Anthropic | 이동 구간 보너스 퀘스트 중 "T-money 카드 인증하기" 1건의 사진 판별(물리 카드 여부·T-money 브랜드 여부). 원본 SDK 없이 REST 호출(`fetch`)만 사용 | `src/lib/tmoney/classifyTmoneyCard.ts`, `src/app/api/quests/verify-tmoney/route.ts` |

- Tmap SDK는 클라이언트에 노출되는 `NEXT_PUBLIC_TMAP_APP_KEY`, 길찾기 API는 서버 전용
  `TMAP_APP_KEY`로 키가 분리되어 있다(둘 다 SK Open API 동일 제공사).
- TMAP Transit은 위 두 상품과 또 다른 별도 신청이 필요한 상품이라, 서버 전용
  `TMAP_TRANSIT_API_KEY`를 따로 쓴다(`TMAP_APP_KEY`를 재사용하지 않음). 기본
  비활성화(`TMAP_TRANSIT_ENABLED`가 `"true"`일 때만 켜짐)이며, 정규화된 응답만 짧은
  TTL로 캐시한다(TMAP 약관상 파생 데이터 24시간 이상 보관 금지 — 항상 23시간 미만으로
  강제). 과거 ODsay Lab API를 썼으나, Vercel Hobby 환경에 고정 아웃바운드 IP가 없어
  ODsay Server키 IP 화이트리스트 요건을 만족할 수 없어 TMAP Transit으로 교체했다
  (레거시 코드는 `src/lib/transit/odsayClient.ts`에 비활성 상태로 남아있음).
- Clerk·Vercel Blob·Neon은 각각 자체 REST/HTTP API를 통해 통신하지만, STARA 코드에서는
  공식 SDK(`@clerk/nextjs`, `@vercel/blob`, `@neondatabase/serverless`)로 감싸서 호출한다.
- Anthropic API 키(`ANTHROPIC_API_KEY`)는 서버 전용이며 `NEXT_PUBLIC_*`로 노출하지
  않는다. 이 퀘스트에 제출된 사진은 판별 목적으로만 API에 전송되고, STARA는 원본을
  저장하지 않는다(Vercel Blob·DB·Diary 어디에도 저장되지 않음 — 위치정보와 달리 GPS도
  전혀 사용하지 않는 사진/사물 인증 퀘스트다).
