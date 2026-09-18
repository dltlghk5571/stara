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
| `detailImage2` | KorService2 / EngService2 | 장소 이미지 목록 조회 | `fetchDetailImages` |

- **국문/영문 이중 게이트웨이**: 같은 operation을 `KorService2`(국문)와 `EngService2`(영문)
  양쪽에 호출할 수 있는 구조. `locale=en` 요청 시 영문 게이트웨이를 우선 호출하고,
  결과가 없으면(주로 소규모 로컬 상점) 국문 게이트웨이로 폴백한다.
- **인증**: 공공데이터포털 발급 서비스키(디코딩 키)를 `serviceKey` 쿼리파라미터로 전달.
- **캐시**: 동일 `baseUrl+operation+params` 조합은 인메모리 캐시(`src/lib/cache.ts`)로 재호출 방지.
- **실패 처리**: 네트워크/HTTP 오류 시 예외를 던지지 않고 빈 배열 반환 → 호출부가 더미
  데이터 폴백 경로를 탄다.

## 2. 한국관광공사 외 API

| API명 | 제공사 | 용도 | 사용 위치 |
|---|---|---|---|
| Tmap SDK (jsv2) | SK Open API (SK텔레콤) | 지도 렌더링, 경로 핀·마커·내 위치 표시 | `layout.tsx`(SDK 로드), `TmapMapView.tsx` |
| Tmap 자동차 길찾기 API (`/tmap/routes`) | SK Open API (SK텔레콤) | 장소 간 실제 이동거리·소요시간 계산(도로 기준). 실패 시 직선거리(Haversine) 추정으로 폴백 | `src/lib/directions/tmapProvider.ts` |
| Clerk | Clerk | 회원가입·로그인·세션 인증. `/onboarding`, `/trip`, `/edit`, `/complete` 접근 시 미로그인이면 `/sign-in`으로 리다이렉트 | `src/proxy.ts`(미들웨어), `@clerk/nextjs` 전반 |
| Vercel Blob | Vercel | 미션 인증 사진 원본 파일 업로드·공개 저장 | `src/app/api/photo-upload/route.ts`, `MissionSheet.tsx` |
| Neon (Postgres, HTTP 드라이버) | Neon | 사용자·퀘스트 인증샷 기록 등 앱 데이터 저장(`@neondatabase/serverless` + drizzle-orm) | `src/db/index.ts` 및 하위 API 라우트 |
| Anthropic Messages API (Claude Vision) | Anthropic | 이동 구간 보너스 퀘스트 중 "T-money 카드 인증하기" 1건의 사진 판별(물리 카드 여부·T-money 브랜드 여부). 원본 SDK 없이 REST 호출(`fetch`)만 사용 | `src/lib/tmoney/classifyTmoneyCard.ts`, `src/app/api/quests/verify-tmoney/route.ts` |

- Tmap SDK는 클라이언트에 노출되는 `NEXT_PUBLIC_TMAP_APP_KEY`, 길찾기 API는 서버 전용
  `TMAP_APP_KEY`로 키가 분리되어 있다(둘 다 SK Open API 동일 제공사).
- Clerk·Vercel Blob·Neon은 각각 자체 REST/HTTP API를 통해 통신하지만, STARA 코드에서는
  공식 SDK(`@clerk/nextjs`, `@vercel/blob`, `@neondatabase/serverless`)로 감싸서 호출한다.
- Anthropic API 키(`ANTHROPIC_API_KEY`)는 서버 전용이며 `NEXT_PUBLIC_*`로 노출하지
  않는다. 이 퀘스트에 제출된 사진은 판별 목적으로만 API에 전송되고, STARA는 원본을
  저장하지 않는다(Vercel Blob·DB·Diary 어디에도 저장되지 않음 — 위치정보와 달리 GPS도
  전혀 사용하지 않는 사진/사물 인증 퀘스트다).
