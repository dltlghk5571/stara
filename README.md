# STARA — 스타 따라 STARA

K-pop 아티스트의 발자취와 K-콘텐츠 장소를 하나의 게임형 여행 코스로 구성하는
모바일 우선 웹 프로토타입 (서울 1개 지역 MVP).

## 실행 방법

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드
npm run start    # 빌드 결과 실행
npm run lint     # ESLint
npm run test     # vitest (routeOptimizer / scheduleCalculator 단위 테스트)
```

지도 API 키는 필요 없습니다 (OpenStreetMap 타일 + Leaflet).

## 핵심 파일 구조

```
src/
  app/                 # 화면 7개 (App Router)
    page.tsx             A. 홈
    main-route/           B. 서울 메인 루트
    edit/                 C. 코스 편집 (지도 + 릴스 카드)
    final/                D. 최종 루트 확인
    travel/               E. 여행 진행
    stamps/               F. 스탬프북
    complete/             G. 여행 완료
  components/
    map/                 지도 렌더링 (Leaflet 구현을 나머지 앱과 분리)
    reels/               릴스형 장소 카드, 필터, 상세 시트
    quest/                체크포인트/서브 퀘스트 체크리스트
    stamp/                스탬프 그리드
    route/                실시간 일정 요약 바
    layout/               공용 상단바
  data/                  artists / places / quests / routes 더미 데이터
  lib/                   distance, routeOptimizer, scheduleCalculator,
                         autoPlaceSelector, storage, categoryStyle, time
  store/                 zustand trip store (localStorage persist) + 파생 훅
  config/                이동시간·시간대 등 하드코딩 값 모음
  types/                 도메인 타입
```

## 루트 계산 방식

1. **거리**: `lib/distance.ts`의 Haversine 공식으로 두 좌표 간 직선거리(km) 계산.
2. **이동시간 추정**: 직선거리에 보정계수(`config.TRAVEL_CONFIG.detourFactor`)를
   곱한 뒤, 짧은 거리는 도보 속도, 먼 거리는 대중교통 속도 + 고정 오버헤드(환승/대기)로
   환산. 계수는 전부 `src/config/index.ts` 한 곳에서 수정 가능.
3. **삽입 위치 탐색**: `lib/routeOptimizer.ts`가 메인 루트 뼈대(A→B→C→D)를 유지한 채,
   새 장소 X를 각 구간 사이/양끝에 넣어보고
   `delta = dist(prev,X) + dist(X,next) - dist(prev,next)` 가 최소인 위치를 선택.
4. **일정 계산**: `lib/scheduleCalculator.ts`가 09:00부터 순서대로 도착/출발 시각을
   누적 계산. 오픈 전 도착 시 대기, 마감 후 도착 시 `isOpenTimeConflict` 플래그.
   21:00 초과 시 `isOverLimit` + 초과분(`overLimitMinutes`) 계산.
5. **자동 보완**: `lib/autoPlaceSelector.ts`가 메인 루트 + 사용자 선택 장소를 합쳐
   순서를 만든 뒤, 로컬 관광지 0곳이면 삽입 델타가 가장 작은 후보 1곳을, 음식점이
   2곳 미만이면 점심/저녁 시간대에 맞는 후보를 부족한 만큼 자동 삽입.
6. 장소를 추가/삭제할 때마다 `store/useTripPlan.ts`가 위 파이프라인을 다시 실행해
   최종 순서·일정·경고를 즉시 갱신 (파생값은 저장하지 않고 매번 재계산).

## 더미 데이터를 실제 데이터로 교체하는 방법

- `src/data/artists.ts`: `ARTISTS` 배열의 각 항목을 실제 아티스트 정보로 교체.
- `src/data/places.ts`: 파일 상단 주석에 필드별 규칙 설명. 좌표/설명을 실제 장소로
  교체하거나 항목을 추가/삭제. `isMainRoute` / `isLocalSpot` / `isFood` 조합으로
  메인 루트·로컬 관광지·로컬 맛집 자동보완 풀이 결정됨.
- `src/data/quests.ts`: `questIds`는 `q-${place.id}` 규칙으로 자동 생성되므로 장소만
  추가하면 퀘스트도 따라옴. 문구를 바꾸려면 `QUEST_TEXT_BY_CATEGORY`만 수정.
- 아티스트/장소 이미지는 `imageUrl` 필드에 실제 경로를 넣으면 카드 UI가 자동으로
  반영하도록 컴포넌트가 분리되어 있음 (현재는 카테고리 색상 placeholder).

## 향후 실제 API 연결 위치 (교체 가능하도록 계층 분리됨)

| 인터페이스 | 현재 (MVP) | 교체 위치 |
|---|---|---|
| TourismDataProvider | `src/data/*.ts` 로컬 더미 | 한국관광공사 OpenAPI 연동 시 이 파일들을 API 호출로 교체 |
| DirectionsProvider | `src/lib/distance.ts` Haversine + 상수 모델 | TMAP/Kakao Directions API로 `estimateTravelMinutes` 내부만 교체 |
| 지도 렌더링 | `src/components/map/LeafletMap.tsx` | 다른 지도 SDK로 교체 시 `MapView.tsx`가 노출하는 `MapPin`/`MapViewProps` 인터페이스만 유지하면 나머지 화면은 무수정 |
| QuestVerificationProvider | 사용자가 직접 체크 (`store/tripStore.ts`) | GPS/사진 인증 붙일 때 `toggleQuest`/`claimStamp` 내부 로직만 확장 |
| CollectionBookProvider | 미구현 (완료 화면에 안내 문구만 표시) | 향후 별도 모듈로 추가 |

## 테스트 및 빌드 결과

- `npm run test` — 9개 단위 테스트 통과 (haversine 거리, 최적 삽입 위치, 09:00 시작/오픈
  대기/21:00 초과 판정).
- `npm run lint` — 오류 없음.
- `npx tsc --noEmit` — 오류 없음.
- `npm run build` — 프로덕션 빌드 성공 (정적 페이지 8개 모두 생성).
- 프로덕션 빌드를 실제로 띄워 홈 → 메인 루트 → 편집 → 최종 확인 → 여행 시작 →
  퀘스트 체크 → 스탬프 획득 → 새로고침 → 모바일 뷰포트까지 헤드리스 브라우저로
  직접 조작해 콘솔 에러 없음과 상태 유지(localStorage)를 확인함.

## 알려진 제한사항

- 이동시간은 실제 도로/대중교통 API가 아닌 직선거리 기반 근사치입니다.
- 30곳 이상을 한 번에 추가하는 등 극단적인 스트레스 상황에서는 종료 예상시각이
  다음날로 넘어갈 수 있으며, 이 경우 "+1일" 표기는 하지 않고 초과 경고만 표시합니다
  (정상적인 사용 범위에서는 발생하지 않음).
- 로그인, GPS 인증, 사진 업로드, 컬렉션북, 실시간 위치 공유, 결제/예약, 서버 DB는
  기획대로 이번 MVP에서 구현하지 않았습니다.
