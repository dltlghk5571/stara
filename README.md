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

한국관광공사 TourAPI / TMAP 연동을 쓰려면 `.env.example`을 `.env.local`로 복사해
`TOUR_API_KEY`(공공데이터포털 디코딩 키)를 채워 넣으세요. 키가 없어도 앱은 정상
동작하며(더미 데이터로 자동 폴백), 이 값들은 서버 Route Handler에서만 사용되고
브라우저에는 절대 노출되지 않습니다(`NEXT_PUBLIC_` 접두사 없음).

### Vercel 환경변수

Vercel 프로젝트 설정 → Environment Variables 에 아래 값을 등록하세요.

| 변수명 | 필수 | 설명 |
|---|---|---|
| `TOUR_API_KEY` | 선택(없으면 dummy 폴백) | 공공데이터포털 TourAPI 디코딩 서비스키. 국문/영문/연관관광지 서비스는 data.go.kr에서 상품별로 별도 활용신청 필요(같은 키 재사용) |
| `TMAP_APP_KEY` | 선택(없으면 Haversine 폴백) | TMAP(SK Open API) appKey |
| `TMAP_TRANSIT_API_KEY` | 선택(없으면 TMAP/Haversine 추정치로 폴백) | TMAP Transit(대중교통 경로 안내) API 키. **TMAP_APP_KEY와 다른 상품** — SK Open API 포털에서 별도 신청 필요 |
| `TMAP_TRANSIT_ENABLED` | 선택 | `"true"`일 때만 활성화(킬 스위치, ODsay와 반대 극성 — 기본값 비활성화) |
| `TMAP_TRANSIT_DAILY_BUDGET` | 선택 | STARA 자체 일일 TMAP Transit 호출 예산. 기본값 8(무료 10회/일보다 낮게) |
| `TMAP_TRANSIT_CACHE_TTL_MINUTES` | 선택 | 상세 경로 캐시 TTL(분). 기본값 360(6시간), 1380분(23시간) 초과는 자동 클램프 |
| `ODSAY_API_KEY` | 선택(레거시, 비활성) | ODsay Lab 대중교통 경로 안내 API 키. 더 이상 사용하지 않음 — 항상 `ODSAY_ENABLED=false` 유지 |
| `ODSAY_DAILY_BUDGET` | 선택(레거시) | 기본값 20 |
| `ODSAY_ENABLED` | 선택(레거시) | Production은 항상 `false`. 코드는 남아있지만 호출 경로는 비활성 |
| `TOUR_API_BASE_URL` | 선택 | 기본값 `apis.data.go.kr/B551011/KorService2` |
| `TOUR_API_EN_BASE_URL` | 선택 | 기본값 `apis.data.go.kr/B551011/EngService2` |
| `TOUR_API_RELATED_BASE_URL` | 선택 | 기본값 `apis.data.go.kr/B551011/TarRlteTarService1` |
| `TMAP_API_BASE_URL` | 선택 | 기본값 `apis.openapi.sk.com/tmap` |
| `TMAP_TRANSIT_API_BASE_URL` | 선택 | 기본값 `apis.openapi.sk.com/transit/routes` |
| `ODSAY_API_BASE_URL` | 선택(레거시) | 기본값 `api.odsay.com/v1/api/searchPubTransPathT` |
| `TOUR_SEARCH_RADIUS_METERS` | 선택 | 기본값 2000(m) |
| `ANTHROPIC_API_KEY` | 선택(없으면 T-money 인증 퀘스트만 500 에러, 나머지 기능엔 영향 없음) | T-money 카드 인증 세그먼트 퀘스트의 사진 판별(Claude Vision)에 사용. 서버 전용, `NEXT_PUBLIC_`로 노출 안 함 |
| `ANTHROPIC_MODEL` | 선택 | 기본값 `claude-sonnet-5` |

`DATABASE_URL`(Neon Postgres 연결 문자열)도 Vercel에 등록되어 있어야 합니다.

### T-money 카드 인증 퀘스트

이동 구간(핀과 핀 사이)에 배치되는 보너스 서브 퀘스트 중 하나("T-money 카드
인증하기")는 실제 물리 카드 사진을 AI(Claude Vision)로 판별해 통과시키는
사진/사물 인증 퀘스트다. 여행당 정확히 1개, 결정론적 "중간" 구간에만 배정된다
(`src/lib/scheduleCalculator.ts`의 `pickTmoneySegmentIndex`).

- **GPS 미사용**: 이 퀘스트는 `navigator.geolocation`을 전혀 호출하지 않는다. 장소
  좌표나 `GPS_MISSION_RADIUS_METERS`와 무관한, 순수 사진 분류 퀘스트다.
- **사진 미저장**: 제출한 사진은 판별 목적으로만 서버 → Anthropic API로 전송되고
  즉시 폐기된다. Vercel Blob 업로드도, `quest_photos` DB 기록도, 다이어리 저장도
  하지 않는다 — 저장되는 건 퀘스트 완료 여부(`completedQuestIds`)뿐이다.
- **판별 로직**: `src/lib/tmoney/classifyTmoneyCard.ts` (서버 전용) + API 라우트
  `src/app/api/quests/verify-tmoney/route.ts`(Clerk 인증 필요). T-money 브랜드만
  통과시키며, 캐시비/레일플러스/이즐 등 다른 교통카드나 일반 카드, 화면에 띄운
  이미지는 실패 처리한다. 신뢰도가 낮으면(`confidence: "low"`) 통과시키지 않고
  재촬영을 유도한다.

### 대중교통 이동 안내 (TMAP Transit)

두 장소 사이를 "도보/대중교통 + 예상 시간"으로만 뭉뚱그리던 것을, 실제 지하철/버스
경로 안내(어느 역/정류장, 몇 호선, 몇 번 버스, 몇 정거장)로 확장한 기능이다. 트립
화면의 route 탭에서 다음 체크포인트로 이동하기 전, 세그먼트 퀘스트(있다면) 위에
`MovementGuide`(`src/components/trip/MovementGuide.tsx`)로 렌더링된다.

**제공사는 ODsay에서 TMAP Transit으로 교체됐다.** ODsay는 인증키를 Server(고정 IP)
또는 URI(도메인) 플랫폼으로 등록해야 하는데, Vercel Hobby 환경은 고정 아웃바운드
IP가 없어서(Static IP 구매·프록시 도입 모두 보류) 구조적으로 ODsay Server키
화이트리스트 요건을 안전하게 만족시킬 방법이 없었다. `odsayClient.ts`와 관련 로직은
운영에서 TMAP Transit이 검증될 때까지 코드에 남아있지만(`ODSAY_ENABLED=false`)
`route.ts`는 더 이상 호출하지 않는다.

**TMAP Transit 무료 플랜은 10회/일 쿼터다** (기존에 STARA가 이미 쓰던 TMAP 자동차
길찾기 `TMAP_APP_KEY`와는 **완전히 다른 상품/쿼터** — 같은 키를 재사용하지 않고
`TMAP_TRANSIT_API_KEY`를 별도로 발급받아 쓴다). 그래서 화면이 열렸다고, 구간이
여러 개라고, 컴포넌트가 마운트됐다고 자동으로 호출되지 않는다 — 로그인한 사용자가
"상세 대중교통 경로 보기"를 직접 눌렀을 때만, 그것도 캐시가 없고 STARA 자체 예산
안일 때만 호출된다.

- **기본 로드는 TMAP Transit을 전혀 모른다**: `MovementGuide`가 마운트되면
  `useTransitEstimate`(`src/store/useTransitEstimate.ts`)가 `/api/transit`을
  `detail:false`로 호출해 도보 안내 또는 기존 TMAP 이동시간/Haversine
  추정치("대중교통 · 약 N분")만 즉시 보여준다. 이 경로는 TMAP Transit을 절대
  건드리지 않고, 로그인 여부도 따지지 않는다.
- **상세 경로는 로그인한 사용자의 명시적 액션에서만**: "상세 대중교통 경로 보기"
  버튼을 눌러야 `detail:true` 요청이 나간다. 이 요청은 Clerk 세션이 없으면 401로
  거부된다 — 요청 바디의 `isTester`/`isAdmin` 같은 자기신고 값은 절대 신뢰하지
  않는다(무명 인터넷 트래픽이 8/일 예산을 소모하지 못하게 막는 게 목적). 버튼을
  다시 눌러도(성공한 뒤 접었다 펼치기) 재요청하지 않는다 — 이미 받아온 결과를
  화면에서만 다시 보여준다. 실패/쿼터소진 상태에서의 재시도만 새 요청을 만든다.
- **짧은 도보 구간은 `detail:true`여도 TMAP Transit을 호출하지 않는다**: 기존 도보
  임계값(`TRAVEL_CONFIG.walkThresholdKm`) 이내면 `/api/transit`이 항상 곧바로 단순
  WALK 안내를 반환한다 — 이 판정이 인증 체크·TMAP Transit 호출 여부보다 먼저다.
- **캐시 우선, 그다음 쿼터**: `src/lib/transit/itineraryCache.ts`가 같은 구간
  (출발/도착 좌표 5자리 반올림 + 로케일, A→B와 B→A는 다른 키)을 짧은 TTL로 캐시한다
  (`transit_itinerary_cache` 테이블, 정규화된 STARA `TransitItinerary`만 저장 —
  원본 TMAP payload 전체는 저장 안 함, 사용자 신원도 없음). 캐시 히트면 쿼터를 전혀
  건드리지 않고 즉시 반환한다. **TMAP 약관상 API 파생 데이터를 24시간 이상
  보관/재사용할 수 없어서**, TTL은 `TMAP_TRANSIT_CACHE_TTL_MINUTES`(기본
  360분=6시간)로 설정하되 코드가 항상 1380분(23시간)으로 클램프한다 — 그보다 큰
  값을 넣어도 절대 24시간을 넘기지 못한다. 만료된 행은 절대 반환하지 않는다.
- **일일 예산을 원자적으로 집행한다**: `src/lib/transit/quota.ts`의
  `reserveTmapTransitCallSlot()`이 Postgres UPSERT 한 번
  (`INSERT ... ON CONFLICT DO UPDATE ... WHERE count < budget ... RETURNING`)으로
  "오늘 카운트를 읽고 +1"을 원자적으로 처리한다(ODsay 때와 같은 메커니즘을
  `api_daily_usage` 테이블에서 provider 키(`"tmap_transit"`)만 바꿔 재사용) — 동시
  요청이 몰려도 예산을 넘지 않는다. 캐시 조회는 이 예약보다 **먼저** 일어난다(캐시
  히트는 쿼터를 쓰지 않는다). 예약에 성공한 뒤에만 실제로 TMAP Transit을 호출하고,
  나중에 실패해도 이미 쓴 슬롯은 되돌리지 않는다(업스트림 쪽 쿼터는 실패해도
  소진됐을 수 있어서). `TMAP_TRANSIT_DAILY_BUDGET`(기본 8, 무료 10회/일보다 낮게)과
  `TMAP_TRANSIT_ENABLED`("true"일 때만 켜짐, 그 외엔 항상 꺼짐 — ODsay와 반대
  극성)로 조절한다. `npm run transit:usage`로 오늘 사용량을 확인할 수 있다.
- **역할 분리**: STARA의 루트 최적화(어떤 장소를 어떤 순서로 방문할지)와 TMAP
  Transit(그 두 장소 사이를 어떻게 이동할지)은 완전히 분리돼 있다. 절대 방문 순서를
  바꾸지 않는다 — `places[i] → places[i+1]` 구간 하나에 대해서만, 그것도 현재
  활성 구간 하나에만 붙는다(미래 구간을 미리 불러오지 않는다).
  `src/lib/scheduleCalculator.ts`는 여전히 TMAP Transit을 전혀 모른다.
- **실시간 도착정보가 아니다**: 정적 경로 데이터 기준 안내라 "약 34분"처럼만
  표현하고, "3분 후 도착" 같은 실시간 문구는 쓰지 않는다. 실시간 버스/지하철 도착
  정보는 이번 범위에 없다.
- **폴백 계층**: TMAP Transit이 꺼져있거나(`TMAP_TRANSIT_ENABLED`가 `"true"`가
  아님), 오늘치 예산이 소진됐거나(`quota_unavailable`), 호출은 했지만
  실패/경로없음이면(`failed`) — 세 경우 모두 기존 TMAP 실제 이동시간 → 그마저
  없으면 Haversine 추정치로 폴백한다. 어떤 경우에도 역/노선/버스 번호를 지어내지
  않는다 — "대중교통 · 약 N분" 추정치와 외부 지도 링크("지도에서 길찾기")는 항상
  그대로 남는다.
- **정규화된 도메인 타입**: TMAP 원본 JSON을 UI에 직접 노출하지 않는다.
  `src/lib/transit/tmapTransitClient.ts`(`parseTmapTransitResponse`, 서버 전용,
  순수 함수)가 `count:1`로 요청한 유일한 itinerary를 `TransitItinerary`
  (`src/lib/transit/types.ts`, `provider: "tmap_transit"`)로 변환한다 — WALK/BUS/
  SUBWAY만 지원하고, 그 외 모드(EXPRESSBUS/TRAIN/AIRPLANE/FERRY 등)나 노선명/버스
  번호/역 이름 같은 식별 필드가 하나라도 빠진 구간이 있으면 경로 전체를 버리고
  추정치 폴백으로 넘어간다(부분적으로 틀린 정보를 보여주지 않기 위함). 지하철
  방향(행선지) 필드가 응답에 없으면 지어내지 않고 생략한다.
- **어트리뷰션**: TMAP Transit 상세 경로가 실제로 화면에 표시될 때만 작은 출처
  표기("Transit information: TMAP", ko: "대중교통 정보: TMAP")를 보여준다 — TMAP
  Transit을 쓰지 않은 estimate/walk 화면에는 표시하지 않는다. (TMAP/SK Open API의
  공개 문서에서 이 표기를 명시적으로 요구하는 조항은 찾지 못했다 — 법적 의무로
  단정하지 않고, 출처를 명확히 밝히는 좋은 관행으로 자발적으로 넣었다.)
- **테스터 계정도 동일 규칙**: 테스터라고 자동으로 TMAP Transit을 더 많이/자동으로
  호출하지 않는다. 기본 로드는 estimate만, 상세 경로는 로그인 + 명시적 클릭에서만 —
  일반 유저와 완전히 같은 흐름이다. GPS/T-money 테스터 우회와는 무관.
- **영문 지원**: STARA가 `en`이면 TMAP Transit에도 영문 응답을(`lang: 1`), `ko`면
  국문 응답을(`lang: 0`) 요청한다 — 역/노선 이름을 따로 기계번역하지 않는다. 캐시
  키에도 로케일이 포함돼 있어 언어별로 따로 캐시된다.

`TMAP_TRANSIT_API_KEY`가 로컬/Preview/Production에 있고 `TMAP_TRANSIT_ENABLED=true`면
"상세 대중교통 경로 보기"를 직접 눌러 확인할 수 있다 — 무료 쿼터가 하루 10회뿐이니
회귀 테스트만을 위해 여러 번 누르지 말 것(같은 구간은 캐시로 0회 소모 확인 가능). 키가
없거나 꺼져 있거나 쿼터가 소진돼도 앱은 정상 동작한다(추정치 폴백 + 지도 링크).

**경쟁/데모 환경 참고사항**: TMAP Transit 무료 플랜의 10회/일 한도는 API 플랜의
제약이지, STARA 아키텍처의 결함이 아니다 — 유료 플랜으로 전환해도 프런트엔드 UX를
바꿀 필요 없이 `TMAP_TRANSIT_DAILY_BUDGET` 환경변수 값만 올리면 된다. 사용자 관점
에서는 기본 이동 추정치가 항상 즉시 표시되고, 상세 경로는 "추가 보너스" 정보이며,
쿼터가 소진돼도 트립 진행이 막히지 않는다.

### 테스트(tester) 계정 — 검증 우회 모드

개발/데모용으로, GPS 체크포인트 미션과 T-money 카드 인증을 실제로 수행하지 않고도
퀘스트를 완료할 수 있는 "테스터" 계정을 만들 수 있다. **일반 유저의 동작은 절대
바뀌지 않는다** — 아래 설정을 한 Clerk 계정에만 적용된다.

**설정 방법(Clerk Dashboard)**

1. Clerk Dashboard → Users → 테스트용으로 쓸 유저를 만들거나 선택
2. 해당 유저의 Metadata 탭 → **Public metadata**에 아래 JSON을 저장:
   ```json
   { "role": "tester" }
   ```
3. 별도 세션 토큰 커스터마이즈는 필요 없다 — 서버 라우트(`getServerVerificationCapabilities`)가
   `currentUser()`로 Public metadata를 직접 조회하므로 Dashboard의 세션 토큰 설정을
   건드리지 않아도 바로 동작한다. (이미 세션 토큰 claim을 커스텀하고 있다면
   `src/lib/auth/getServerVerificationCapabilities.ts`를 그 claim을 읽도록 바꿔도 된다 —
   API 호출 없이 더 빠르게 판정할 수 있다.)

테스트 계정의 로그인 정보(이메일/비밀번호)는 이 저장소에 커밋하지 말 것 — 별도
채널(팀 비밀번호 관리 도구 등)로 공유한다.

**우회되는 것**

| 영역 | 일반 유저 | 테스터 |
|---|---|---|
| 장소 체크포인트 GPS | `navigator.geolocation` 호출, 반경 200m 검증 | GPS 요청 자체를 안 함 — `"테스트 계정 · GPS 인증 생략"` 배지만 표시. 사진 첨부 등 나머지 미션 흐름은 동일 |
| T-money 카드 인증 | 사진 촬영 → 리사이즈 → `/api/quests/verify-tmoney` → Claude Vision 판별 | 사진 없이 "테스트 인증 완료" 버튼만 누르면 완료. Anthropic 호출 없음 |

퀘스트 완료 처리는 두 경우 모두 같은 `completeQuest()`(멱등)를 거치고, 서버
(`/api/quests/verify-tmoney`)가 요청 시점에 Clerk 세션에서 다시 tester 여부를 확인한
뒤에만 우회를 승인한다 — 일반 유저가 요청 바디에 `testBypass: true`를 직접 보내도
통과하지 않는다. capability 판정 로직은
`src/lib/auth/verificationCapabilities.ts` 한 곳에 모여 있다
(`useVerificationCapabilities`가 클라이언트용, `getServerVerificationCapabilities`가
서버용).

**같은 브라우저에서 계정을 바꿀 때**: 여행 진행 상태(`completedQuestIds` 등)는
브라우저 로컬(zustand persist)에 저장되므로, `tripStore`가
`ownerUserId`로 소유자를 구분한다(`TripOwnershipGuard`가 전역에서 Clerk userId 변화를
감지해 자동으로 바인딩). 같은 유저가 로그아웃 후 다시 로그인하면 로컬 여행이
그대로 남고, 테스터 → 일반 계정처럼 **다른** 유저로 전환되면 이전 진행 상황이 전부
초기화된다 — 테스터의 완료 기록이 일반 계정에 보이는 일은 없다.

### 배지(badge) 시스템

기존 "장소마다 하나씩 찍히는 스탬프"는 폐지됐다. 지금은 계정 전체 누적 방문 기록을
기준으로 조건(카테고리별 N곳 방문)을 달성하면 배지를 주는 방식이다 — 6개 카테고리
(푸드/쇼핑/컬처/액티비티/랜드마크/K-POP) × Lv.1/Lv.2 = 12개, 카탈로그는
`src/data/badges.ts`에 있다.

- **장소 미션 완료 시**: 더 이상 즉시 "스탬프"를 주지 않는다 — 체크 표시만 뜨고
  (`MissionSheet.tsx`), 루트 진행 게이팅(다음 체크포인트 잠금 해제)은 `tripStore`의
  `completedQuestIds`만으로 판단한다(`stamp-*` id 네임스페이스는 완전히 제거됨).
- **배지 집계는 서버에서, 계정 단위로, 여러 여행에 걸쳐 누적된다.** 새 테이블을 따로
  만들지 않고, 이미 있는 `quest_photos`에 완료 시점 스냅샷 컬럼 두 개
  (`category`, `is_artist_place`)를 추가해서 씀 — `MissionSheet`가 제출할 때
  `place.category`/`place.artistIds.length > 0`을 그대로 보낸다. `/trip` 서버
  컴포넌트가 유저의 `quest_photos`를 placeId 기준으로 중복 제거한 뒤
  `computeBadgeProgress`(`src/lib/badges.ts`, 순수 함수)로 12개 배지 진행도를 계산해
  `TripShellClient`에 내려준다.
- **카테고리 매핑**: STARA의 `PlaceCategory`엔 별도 "랜드마크" 카테고리가 없어서
  `photo`+`local_tourism`을 landmark 배지로, `food`+`local_restaurant`을 food 배지로
  묶었다(`badgeCategoryForPlaceCategory`). K-POP 배지는 카테고리가 아니라
  `artistIds.length > 0` 여부로 따로 집계 — 다른 카테고리 배지와 중복 집계될 수 있다
  (아티스트가 연결된 음식점 방문은 food 배지와 kpop 배지 둘 다에 카운트됨).
- **도입 이전 사진**: `category`/`is_artist_place`가 null이라 배지 집계에서 자연히
  제외된다(`place_name` 컬럼 도입 때와 같은 패턴).

### DB 스키마 변경 적용 (새 환경/Vercel)

이 저장소는 `drizzle-kit generate`/`migrate`(마이그레이션 히스토리 트래킹)를 쓰지 않고,
`src/db/schema.ts`를 기준으로 **`drizzle-kit push`가 실제 DB와 diff해서 반영**하는 방식만 써왔다.
새 환경(또는 새로 DB를 만든 경우)에 최신 스키마를 적용하려면:

```bash
DATABASE_URL=... npx drizzle-kit push
```

이미 최신 스키마가 반영된 DB(예: 운영 Neon DB)에는 다시 실행할 필요가 없다 — `push`는 변경분이 없으면 아무것도 하지 않는다.
`psql` 등으로 직접 SQL을 적용해야 하는 경우를 위해 `drizzle/`에 각 스키마 변경을 기록한 SQL도 함께 남겨둔다(모두 `ADD COLUMN IF NOT EXISTS` 형태라 여러 번 실행해도 안전).

## 핵심 파일 구조

```
src/
  app/                 # 화면 7개 (App Router)
    page.tsx             A. 홈
    main-route/           B. 서울 메인 루트
    edit/                 C. 코스 편집 (지도 + 릴스 카드)
    final/                D. 최종 루트 확인
    travel/               E. 여행 진행
    stamps/               F. 배지북
    complete/             G. 여행 완료
  components/
    map/                 지도 렌더링 (Leaflet 구현을 나머지 앱과 분리)
    reels/               릴스형 장소 카드, 필터, 상세 시트
    quest/                체크포인트/서브 퀘스트 체크리스트
    badge/                배지 그리드
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
| TourismDataProvider | `src/lib/tour-api/` (KorService2 연동, `/api/tourism/*`) — 실패 시 `src/data/*.ts` 더미로 자동 폴백. `?locale=en`이면 EngService2 우선 시도 후 국문으로 폴백 | 아티스트 장소는 계속 STARA 자체 데이터가 관리하고, TourAPI는 로컬 관광지/음식점 자동보완 후보 풀만 확장 공급 |
| DirectionsProvider | `src/lib/distance.ts` Haversine(기본) — TMAP 연동 시 구간별 실제 duration/geometry로 override | `src/lib/directions/` 참고, 실패 시 구간 단위로 Haversine 폴백 |
| 대중교통 이동 안내 | `src/lib/transit/tmapTransitClient.ts`(TMAP Transit) — `/api/transit`이 짧은 구간은 도보로 즉시 처리, 그 외는 로그인한 사용자가 "상세 경로 보기"를 눌렀을 때만(`detail:true`) 캐시→쿼터 예약 순으로 확인 후 호출. ODsay(`odsayClient.ts`)는 레거시 비활성 코드로 남아있음 | 비활성화/쿼터소진/실패 시 TMAP → Haversine 추정치로 폴백(`TransitGuideResponse`의 `kind: "estimate"` + `reason`), 역/버스 정보는 지어내지 않고 원본 upstream payload는 저장하지 않음(정규화된 itinerary만 24시간 미만 TTL로 캐시) |
| 지도 렌더링 | `src/components/map/LeafletMap.tsx` | 다른 지도 SDK로 교체 시 `MapView.tsx`가 노출하는 `MapPin`/`MapViewProps` 인터페이스만 유지하면 나머지 화면은 무수정 |
| 관광지 랭킹 signal | `src/lib/tour-api/relatedTourism.ts` (`TarRlteTarService1`, 실제 연동됨) — 메인 루트 5곳을 anchor로 연관 관광지 랭킹을 가져와 `scoreCandidate`에 반영 | 실패/미승인 시 `relatedTourismScore`가 0(중립)이 되어 거리/식사시간 기준으로만 자연스럽게 폴백 |
| QuestVerificationProvider | 수동 체크(`toggleQuest`)와 서버 검증 완료(`completeQuest`, 멱등) 두 경로 — GPS(체크포인트 미션)와 AI 사진 인증(T-money 퀘스트)은 이미 연결돼 있다(`store/tripStore.ts`) | 새 검증 방식을 추가할 땐 `Quest.verification`에 케이스만 늘리면 됨 |
| CollectionBookProvider | 미구현 (완료 화면에 안내 문구만 표시) | 향후 별도 모듈로 추가 |

## 테스트 및 빌드 결과

- `npm run test` — 33개 단위 테스트 통과 (haversine 거리, 최적 삽입 위치, 09:00 시작/오픈
  대기/21:00 초과 판정, autoPlaceSelector의 TourAPI 후보/폴백 분기, TMAP 응답 파싱,
  scheduleCalculator의 실제 이동시간 override, 영문 TourAPI locale 폴백, 랭킹 signal 공식,
  연관 관광지 순위 정규화/폴백).
- `npm run lint` — 오류 없음.
- `npx tsc --noEmit` — 오류 없음.
- `npm run build` — 프로덕션 빌드 성공 (정적 페이지 8개 모두 생성).
- 프로덕션 빌드를 실제로 띄워 홈 → 메인 루트 → 편집 → 최종 확인 → 여행 시작 →
  퀘스트 체크 → 스탬프 획득 → 새로고침 → 모바일 뷰포트까지 헤드리스 브라우저로
  직접 조작해 콘솔 에러 없음과 상태 유지(localStorage)를 확인함.

## 알려진 제한사항

- `TMAP_APP_KEY`가 없으면 이동시간/경로는 실제 도로/대중교통 API가 아닌 직선거리 기반
  근사치입니다(키가 있으면 구간별로 실제 TMAP 값이 적용됩니다).
- `TMAP_TRANSIT_API_KEY`가 없거나, `TMAP_TRANSIT_ENABLED`가 `"true"`가 아니거나,
  오늘치 예산(`TMAP_TRANSIT_DAILY_BUDGET`, 기본 8)이 소진됐으면 대중교통 이동 안내는
  역/노선/버스 정보 없이 "대중교통 · 약 N분" 추정치만 표시합니다. 키가 있어도
  자동 호출되지 않습니다 — 로그인한 사용자가 "상세 대중교통 경로 보기"를 직접
  눌렀을 때만(무료 플랜 10회/일 쿼터 보호, STARA는 그보다 낮은 8회로 운영), 정적
  경로 데이터 기준이라 실시간 버스/지하철 도착 정보는 제공하지 않습니다("약 N분"만
  — "3분 후 도착" 같은 실시간 문구는 없음). ODsay는 더 이상 사용하지 않으며
  (`ODSAY_ENABLED=false` 고정), Vercel Hobby 환경에 고정 아웃바운드 IP가 없어 ODsay
  Server키 화이트리스트 요건을 만족시킬 수 없었던 것이 교체 이유입니다.
- "관광지별 연관 관광지" 서비스는 시군구코드 기반이라, 현재는 주소가 고정된 STARA 메인 루트
  5곳만 anchor로 사용합니다(구/코드를 미리 매핑해둠). 사용자가 선택한 장소나 KTO 후보까지
  anchor로 넓히려면 `resolveSignguCdFromAddress`(주소→구 자동 추출, 이미 구현됨)를
  anchor 목록 생성 부분에 추가로 연결하면 됩니다.
- 30곳 이상을 한 번에 추가하는 등 극단적인 스트레스 상황에서는 종료 예상시각이
  다음날로 넘어갈 수 있으며, 이 경우 "+1일" 표기는 하지 않고 초과 경고만 표시합니다
  (정상적인 사용 범위에서는 발생하지 않음).
- 로그인, GPS 인증, 사진 업로드, 컬렉션북, 실시간 위치 공유, 결제/예약, 서버 DB는
  기획대로 이번 MVP에서 구현하지 않았습니다.
