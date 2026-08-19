# STARA 데이터 수집 스크립트 — README

## 프로젝트 배경

STARA는 지역별 K-콘텐츠(아티스트) 관광 코스를 제공하는 여행 플랫폼이다.
서비스의 핵심 데이터는 **"도시 – 아티스트 – 장소(좌표)"** 조합이며,
공식 API 없이 여러 소스(관광 사이트 스크랩, 팀원이 직접 확인한 블로그 등)를
모아서 하나의 스키마로 정제하는 방식으로 진행 중이다.

담당(정인지): 데이터 수집 및 전처리. 현재는 인천 데이터를 맡고 있고,
다른 도시는 팀원이 별도로 진행한다.

## 파이프라인 개요

`build_dataset.py` 하나로 원본 → 정제 → (선택)지오코딩 → 최종 스키마까지 처리한다.

```bash
python build_dataset.py            # 지오코딩 없이 실행 (빠름, 반복 작업용)
python build_dataset.py --geocode  # Kakao Local API로 좌표/한글 상호명/카테고리까지 채움
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

`extract_places.py`는 별도 도구로 남아있다 (네이버 블로그 URL을 입력하면
정규식+형태소분석으로 장소/아티스트 후보를 뽑아냄). 지금은 링크 하나씩 사람이
직접 읽고 `raw_data_정인지/`에 정리해 넣는 방식으로 대체했지만, 블로그 수가
늘어나면 다시 쓸 수 있다.

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

## 현재 진행 상황 (인천)

`preprocessed/places.json` 기준 — 도시 1개(incheon), 아티스트 8개
(그룹 3 + 멤버 개별 5), 장소 19개. **전부 `status: draft`** — 실제로
확인 가능한 링크(인터뷰/브이로그/공식 SNS)로 검증된 건 아직 없어서
`verified`로 올린 게 하나도 없음. 그중 12개는 `source_url`이 아직
`"PENDING"`(원본 출처가 "User-provided list" 같은 텍스트뿐이거나 아예
없었던 것들) — 실제 링크를 찾으면 그 값만 바꾸면 됨.

## 알려진 갭 / 다음 할 일

- [ ] `source_url: "PENDING"` 12건 실제 링크로 교체
- [ ] `draft` → `verified` 승격 (출처 재확인 필요)
- [ ] `place_name_en` 중 로마자 표기 추정치로 넣은 것들 확인
      (Jajeongeotan Punggyeong, Jeongwon Siktak, Hwangsan Chojisa Fishing Spot,
      Ganghwa Seaside Resort 등)
- [ ] `dwell_minutes` — culture/experience 카테고리는 평균 기준이 아직 없어서
      전부 null. 기준 정해지면 채우기
- [ ] `open_time`/`close_time` — 운영시간은 수집 범위 밖이었어서 전부 null,
      별도 조사 필요
- [ ] 인천 외 도시는 팀원이 별도 진행 중

## 참고

- 좌표 오류 하나가 퀘스트 인증(GPS 채점) 전체를 깨뜨리는 구조라, 정확도가 최우선 순위임
- 지오코딩 시 카카오가 이름만 비슷한 엉뚱한 곳(아파트 단지, 주차장 등)에 매칭하는
  사례가 실제로 여러 번 확인됨 — 영문 쿼리로 찾은 매칭은 항상 사람이 한 번
  더 확인해야 함
