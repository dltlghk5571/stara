# STARA 데이터 수집 스크립트 — README

## 프로젝트 배경

STARA는 지역별 K-콘텐츠(아티스트) 관광 코스를 제공하는 여행 플랫폼이다.
서비스의 핵심 데이터는 **"도시 – 아티스트 – 장소(좌표)"** 조합이며,
공식 API 없이 여러 소스(관광 사이트 스크랩, 팀원이 직접 확인한 블로그 등)를
모아서 하나의 스키마로 정제하는 방식으로 진행 중이다.

담당(정인지): 데이터 수집 및 전처리. 현재는 인천 데이터를 맡고 있고,
다른 도시는 팀원이 별도로 진행한다.

## 파이프라인 개요

원본 소스에서 서비스에 반영 가능한 상태까지 스크립트 두 개로 이어진다.
`build_dataset.py`로 원본 → 정제 → (선택)지오코딩 → 좌표 있는 최종 스키마까지
만들고, 그 결과를 `fill_hours.py`로 넘겨 영업시간(open_time/close_time)까지
보강한다.

```bash
python build_dataset.py --geocode --city=incheon --owner=정인지  # 원본 -> 좌표/카테고리까지 채움
python fill_hours.py --dry-run     # (선택) API 호출 없이 대상/쿼리만 미리보기
python fill_hours.py --limit 5     # 일부만 실제 호출해서 결과 확인
python fill_hours.py               # 나머지 전체 실행 (이미 채워진 항목은 자동 스킵)
```

`--geocode`를 쓰려면 `.env`에 `KAKAO_REST_API_KEY`가 있어야 한다
(`.env.example` 참고 — Map-It 프로젝트와 같은 Kakao 앱 키 재사용).
API 응답은 `preprocessed/.geocode_cache.json`에 캐시되어서, 재실행해도 이미
조회한 쿼리는 다시 호출하지 않는다.

### 처리 단계

1. **원본 로딩** — 소스별로 형태가 다 달라서 로더를 따로 둠
   - `Kpop_Tour_Spots_Combined.xlsx` (raw_data_곽채원) — 가장 깨끗한 구조화 소스
   - `stara_thisismykorea.json` (raw_data_곽채원) — 구조화, 일부 필드 밀림 오염 있어서 자동 감지
   - `stara_places.json` (raw_data_곽채원) — 기사 목차형 텍스트, 노이즈 필터링 필요
   - `raw_data_정인지/*.json` — 팀원이 블로그 등에서 직접 확인하고 정리한 소스.
     새 링크를 추가할 땐 이 폴더에 같은 스키마의 json 파일을 추가하면 자동 인식됨
   - `Kpop_Idol_Hometowns_filtered.xlsx` + `아이돌_출신지_*.csv` — 아이돌 출신지(고향)
2. **정규화** — 지역명을 17개 광역시/도 단위로 통일(구/시 단위는 소스마다 한글/영문이
   섞여있어서 항상 안정적으로 뽑히는 상위 단위로 맞춤), 카테고리 매핑, 장소명 정리
3. **중복 병합** — 같은 장소를 문자열 유사도로 병합하되, place 자체의 속성(이름/카테고리)만
   공유하고 relation_text/source_url은 아티스트별로 따로 유지 (서로 다른 아티스트가 같은
   장소를 각자 다른 이유로 방문한 경우가 실제로 있어서, 섞이면 안 됨)
4. **필터링** — `artist_allowlist.json`(구독자 수 기준으로 엄선된 그룹만 통과) +
   relation_text 속 인물과 artist_name이 실제로 같은 그룹인지 교차 검증
5. **지오코딩(`--geocode`)** — Kakao 키워드 장소검색으로 한글 상호명·좌표·카테고리 보강.
   영문 쿼리로 찾은 매칭은 오탐 위험이 있어서 자동으로 검수 대상 표시됨
6. **저장** — 전체 결과(`preprocessed/dataset.json`, 여러 도시 통합, 구 스키마)와
   인천 전용 결과(`preprocessed/cities.json` / `artists.json` / `places.json`, 신 스키마)를 따로 저장
7. **영업시간 보강(`fill_hours.py`)** — 좌표가 확정된 place에 대해 Google
   Places API (New)로 open_time/close_time을 채움. 무료 쿼터 관리를 위한
   캐싱/재실행 멱등성 때문에 build_dataset.py와는 별도 스크립트로 분리해뒀음
   (아래 "영업시간 보강" 절 참고)

`extract_places.py`는 별도 도구로 남아있다 (네이버 블로그 URL을 입력하면
정규식+형태소분석으로 장소/아티스트 후보를 뽑아냄). 지금은 링크 하나씩 사람이
직접 읽고 `raw_data_정인지/`에 정리해 넣는 방식으로 대체했지만, 블로그 수가
늘어나면 다시 쓸 수 있다.

### 영업시간 보강 — `fill_hours.py`

`build_dataset.py`가 만든 `places.json`은 카카오맵으로 검증된 좌표는 있지만
open_time/close_time은 비어 있다. 이 값은 Google Places API (New) Text
Search로 채운다. (TourAPI 연동은 백엔드에서 별도로 처리하므로 이 스크립트
범위 밖.)

- `.env`에 `GOOGLE_PLACES_API_KEY` 필요 (`.env.example` 참고 — Places API
  (New) 활성화 + 빌링 연결된 키여야 함)
- 원본 응답은 `./cache/{place_id}.json`에 캐싱 — 재실행해도 이미 조회한
  곳은 API를 다시 부르지 않음(무료 쿼터 월 1만 건 절약, 재실행 멱등성)
- 쿼리는 `{place_name_ko} {city_name_ko}` 조합 + 기존 좌표 기반
  `locationBias`(반경 400m)로 구성 — 장소 데이터에 `address` 필드가 없어서
  이렇게 구성함
- 매칭된 좌표가 기존 좌표에서 500m 넘게 떨어져 있으면 오매칭으로 보고
  채우지 않음
- 자동으로 못 채운 항목(매칭 실패/좌표 이탈/영업시간 정보 없음)은
  `preprocessed/review_needed.json`에 사유와 함께 기록 — 사람이 확인
- 요일별로 영업시간이 다르면 평일(월~금) 최빈값을 대표로 채우고, 원본
  요일별 정보는 `review_needed.json`의 `weekday_variation`에 같이 남김
- 공원/해변/낚시터 등 상시개방 장소는 Google에 영업시간이 없는 게
  정상이라 억지로 채우지 않고 `review_needed.json`의 `always_open`에 기록,
  값은 빈 문자열로 유지
- 실행 전에 `--dry-run`(호출 없이 대상만 확인)이나 `--limit N`(일부만 실제
  호출)으로 먼저 확인하고 전체 실행하는 걸 권장

## 최종 스키마 — `Data_Preprocessing_Template.ts`

`preprocessed/cities.json` / `artists.json` / `places.json` 3개 파일로 나뉜다.
**하나로 합치지 않는다** — city_id/artist_id를 장소마다 반복 입력하면 오타로
데이터가 갈라지기 때문에, 각 place는 ID로만 다른 파일을 참조한다.
정확한 타입 정의는 `Data_Preprocessing_Template.ts` 참고.

### 가장 중요한 규칙 — 출처 검증 게이트

**출처 없는 관계 서술은 존재할 수 없다.** `relation_text_ko/en`을 쓰려면
`source_url`이 먼저 있어야 한다. 확인 안 된 팬 루머는 수집 대상에서 아예 제외한다.
relation_text는 "예뻐서"가 아니라 "2024년 뮤직비디오 촬영지"처럼 사실 기반으로 쓴다.

### status 워크플로우

```text
draft (최초 입력, 출처 미확인 가능)
  → verified (인터뷰 기사/브이로그/공식 SNS 게시물처럼 확인 가능한 링크로 출처 확인 완료)
    → published (앱 반영 대상)
```

앱은 `published`만 필터링해서 쓴다 — `draft`/`verified`는 앱에 안 들어간다.
실제 URL이 아직 없는 항목은 `source_url: "PENDING"`으로 표시해서 나중에
`grep`으로 쉽게 찾을 수 있게 해뒀다.

## 팀 회의 결정사항 (2026-08-20)

### 카테고리 체계 변경 — ✅ 반영 완료

"장소와 아티스트의 관계"가 아니라 "장소 자체의 성격"으로 분류하기로 함
(예: 쇼핑몰에서 MV를 찍었어도 카테고리는 "포토"가 아니라 "쇼핑". MV 촬영지 /
멤버 연고지 / 소속사 공식 공간 / 팬 목격담 같은 "관계" 정보는 카테고리가 아니라
`relation_text`에 담는다). 이에 따라 대분류를 아래처럼 바꾸기로 확정:

- `food` — 식당 / 카페·디저트 / 베이커리
- `shopping` — 스토어(굿즈·MD 포함) / 시장·거리 / 편집숍·패션
- `culture` — 박물관·전시·갤러리 / 역사·전통 / 공연·라이브
- `activity` — 공원·자연 / 테마파크·체험 / 레저·스포츠
- `landmark_observatory` — 전망대·뷰포인트 / 상징 건축물·거리
- `kpop` — 오피셜한 케이팝 관련 장소 (소속사 사옥 등 — 예: 하이브 인사이트, 광야@서울)

세부 결정: 숙박은 별도 대분류로 안 둠(이번 MVP 스코프 아님 — 위 "장소
포함/제외 기준"에서 이미 전체 제외로 반영됨) · 소속사 사옥은 `culture`가
아니라 `kpop` 태그로 · 순수 포토존 장소는 별도 카테고리 없이
`landmark_observatory` 태그로 흡수.

**반영 내역** (2026-08-20): `Data_Preprocessing_Template.ts`의
`PlaceCategory`, `build_dataset.py`의 `CATEGORY_TO_TS` 매핑 테이블(+
`resolve_category()`로 이미 최종값이 들어오는 소스는 통과, 미매핑은
`activity`로 폴백), `places.json` 13건 전부 새 체계로 마이그레이션함.
`place_id`도 맥락(카테고리) 부분을 새 값으로 다시 지었다(예:
`bts-photo-sangsang-platform` → `bts-culture-sangsang-platform`).
`dwell_minutes`는 새 카테고리에 정해진 평균이 없는 경우 `null`로 되돌림
(`landmark_observatory`는 구 `photo` 평균 20-30분 그대로 이어받음).

마이그레이션 중 `enhypen-experience-ganghwa-seaside-resort`(강화씨사이드
**리조트**)가 숙소류인데도 안 걸러진 걸 발견해서 같이 제거함 — 이름에
"리조트"가 있는데 `build_dataset.py`가 예전엔 `숙박` 카테고리를 필터링 없이
`experience`로 매핑해버려서 새고 있었음. `build_schema()`에 숙소류
드롭 로직(`ACCOMMODATION_LABELS`)을 추가해서 앞으로는 자동으로 걸러진다.

### 크롤링 데이터 품질 이슈 (미해결)

- `stara_places.json`(seoultourism.org) — 기사 서론/FAQ 제목이 장소명으로
  잘못 긁힘(예: "Is Seoul Forest a BTS site?"). 아이돌 리스트 필터링 후에도
  3건 남아있음 — 제외할지 결정 필요
- `stara_thisismykorea.json`(french.visitkorea.or.kr) — place엔 설명문만,
  진짜 장소명은 어디에도 없고 description엔 "Address :" 라벨만 남음(자동
  복구 불가). 필터링 후에도 ATEEZ 관련 3건 남음 — 원본에서 수동 확인 후
  복구할지 제외할지 결정 필요. 같은 파일에 `â€™`, `Ã©` 같은 인코딩 깨짐도 다수 있음

### 아티스트명 표준화 버그 (build_dataset.py 수정 필요)

- 원본에 아티스트명이 이미 있으면 캐노니컬 매핑(방탄소년단=BTS 등)을
  건너뛰는 버그가 있어서 "BTS"/"방탄소년단"이 따로 남는 경우가 있음 → 원본
  유무 상관없이 항상 매핑 적용하도록 수정 필요
- 매칭이 대소문자 구분이라 `"(G)I-DLE"`이 `"i-dle"`과 매칭 안 됨 →
  대소문자 무시하도록 수정 필요
- 표준 표기 기준은 **영어 정식 명칭**으로 확정(한글명/줄임말/별칭은 여기서 파생)

### MVP 아이돌 목록

회의에서 확정한 29개 그룹 목록(BLACKPINK, BTS, Stray Kids, TWICE, Seventeen,
BIGBANG, ENHYPEN, TXT, BABYMONSTER, ITZY, EXO, i-dle, iKON, aespa, NewJeans,
TREASURE, LE SSERAFIM, Mamamoo, NCT, 2NE1, Red Velvet, ASTRO, CORTIS, ILLIT,
IVE, ATEEZ, NMIXX, WINNER, Girl's Generation)을 `artist_allowlist.json`과
대조해봤고 **이미 정확히 일치함** — 별도 수정 불필요. 이 목록에 없는
아이돌(회의에서 예시로 든 RIIZE, 손흥민, Kwon Jin-Ah & Sam Kim, BB Girl 등)은
기존 필터링 로직으로 이미 자동 제외되고 있음.

미해결: NCT DREAM/NCT 127처럼 목록엔 없지만 목록에 있는 상위 그룹(NCT)의
하위 유닛인 경우 상위 그룹으로 묶어서 살릴지 제외할지 결정 필요.

### city 분류 문제

- 서울·부산·인천 범위 밖 장소(해외/국내 다른 지역, 99건)는 제외로 확정
- address 자체가 없어서 city를 알 수 없는 67건 — 단순 city 문제가 아니라
  주소/GPS 정보가 없어 애초에 퀘스트 장소로 쓸 수 있는지의 문제. 제외할지
  주소 보강을 시도할지 결정 필요

## 이 파이프라인의 스코프

이번 수집이 바꾸는 건 `src/data/artists.ts` 전체(더미 아티스트)와
`src/data/places.ts`의 `artistPlaces` 블록이다. 다음 두 가지는 이 스키마/
파이프라인이 다루는 대상이 아니니 여기서 수집하지 않는다:

- **메인루트 5곳** (경복궁 등) — STARA 자체 큐레이션 대상이라 이 팀 작업 범위 밖
- **로컬 관광지/맛집** — TourAPI로 자동 보완되는 대상 (`is_local_spot` 필드가
  이 구분을 위한 것 — 이 스키마로 직접 수집한 성지는 전부 `false`)

## 장소 포함/제외 기준 (전 도시 공통)

서비스가 제공하는 코스는 최대 24시간 소요를 전제로 한다. 이 전제와 맞지 않거나
애초에 코스 대상 스코프 밖인 장소는 도시에 상관없이 `places.json`에서 뺀다.

- **숙소류 제외**: 호텔/리조트/펜션/풀빌라 등 숙박시설은 "방문 코스"라는 개념
  자체와 안 맞아서 제외한다. 좌표나 영업시간이 확인돼도 상관없이 뺀다 —
  카테고리 자체가 스코프 밖이라는 뜻이라서.
- **콘서트장 등 이벤트성 장소 제외**: `relation_text`가 "OO 콘서트가 열린
  경기장"처럼 특정 시즌/회차 이벤트를 근거로 하는 장소는 이 정적 데이터셋에
  넣지 않는다. 시즌마다 내용이 바뀌는 정보라 별도 DB로 관리할 예정(아직 미착수).
- 위 두 기준에 걸리는 장소는 필드만 비워두지 말고 **레코드 자체를 삭제**한다.
  (인천 데이터에서 파라다이스시티(호텔)/인천문학경기장(콘서트장)/
  인스파이어 엔터테인먼트 리조트(리조트)/자전거탄풍경(풀빌라)/
  파시 스튜디오(펜션)/강화씨사이드리조트(리조트) 6건을 이 기준으로 제거함 —
  강화씨사이드리조트를 빼면 전부 Google Places 영업시간 조회 중 "매칭은
  되는데 상시 영업시간 정보가 없음"으로 걸려서 원본을 다시 찾아보다가
  확인된 케이스들. 강화씨사이드리조트는 카테고리 마이그레이션 재검토
  과정에서 이름에 "리조트"가 있는데도 안 걸러진 걸 뒤늦게 발견함)
- 장소를 지우고 나서 그 아티스트가 더 이상 어떤 장소에도 안 걸리게 되면
  (예: 파라다이스시티만 걸려있던 `bts-v`) `artists.json`에서도 같이 뺄 것 —
  장소 하나 없는 아티스트가 남아있지 않게.

## 현재 진행 상황 (인천)

`preprocessed/places.json` 기준 — 도시 1개(incheon), 아티스트 7개
(그룹 3 + 멤버 개별 4), 장소 13개(`food` 6 · `activity` 5 · `culture` 1 ·
`landmark_observatory` 1). **전부 `status: draft`** — 실제로 확인 가능한
링크(인터뷰/브이로그/공식 SNS)로 검증된 건 아직 없어서 `verified`로 올린 게
하나도 없음. 그중 8개는 `source_url`이 실제 링크(`http`로 시작)가 아니라
"ENHYPEN 자체 콘텐츠 'EN o'clock' 67화 (링크 아님 - URL 미확인)"처럼
출처를 설명하는 텍스트뿐임 — 실제 링크를 찾으면 그 값만 바꾸면 됨.

`open_time`/`close_time`은 `fill_hours.py`(위 "영업시간 보강" 절 참고)로
9건 자동 채움. 나머지 4건은 공원/낚시터처럼 상시개방으로 추정되는 곳이라
의도적으로 빈 값 유지 — 자세한 내역은 `preprocessed/review_needed.json` 참고.

## 알려진 갭 / 다음 할 일

- [ ] `source_url`이 실제 링크가 아닌 8건, 진짜 URL로 교체
- [ ] `draft` → `verified` 승격 (출처 재확인 필요)
- [ ] `place_name_en` 중 로마자 표기 추정치로 넣은 것들 확인
      (Jeongwon Siktak, Hwangsan Chojisa Fishing Spot 등)
- [ ] `dwell_minutes` — culture/activity/kpop 카테고리는 평균 기준이 아직
      없어서 전부 null. 기준 정해지면 채우기
- [ ] 인천 외 도시는 팀원이 별도 진행 중 — 위 "장소 포함/제외 기준"을 동일하게
      적용할 것 (숙소류·콘서트장류는 처음부터 넣지 않는 게 제일 편함)
- [ ] `build_dataset.py` 아티스트명 캐노니컬 매핑 버그 2건 수정 (원본에 이름
      있으면 매핑 스킵 / 대소문자 구분 매칭)
- [ ] 크롤링 데이터 품질 이슈 3건(비장소 콘텐츠 오염, 장소명 유실, 인코딩
      깨짐) 처리 방침 결정 — 위 "크롤링 데이터 품질 이슈" 절 참고
- [ ] NCT DREAM/NCT 127 같은 하위 유닛 처리 방침 결정
- [ ] address 없어 city 모르는 67건 처리 방침 결정(제외 vs 주소 보강)

## 참고

- 좌표 오류 하나가 퀘스트 인증(GPS 채점) 전체를 깨뜨리는 구조라, 정확도가 최우선 순위임
- 지오코딩 시 카카오가 이름만 비슷한 엉뚱한 곳(아파트 단지, 주차장 등)에 매칭하는
  사례가 실제로 여러 번 확인됨 — 영문 쿼리로 찾은 매칭은 항상 사람이 한 번
  더 확인해야 함
