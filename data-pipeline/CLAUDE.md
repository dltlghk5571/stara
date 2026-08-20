# data-pipeline (STARA)

K-pop 성지 데이터 수집/정제 파이프라인. `dltlghk5571/stara` 모노레포의
`data-pipeline/` 하위 폴더로 합류하는 중이며(PR #1, 이시화 리뷰 대기),
이 폴더는 병합 후 그 서브폴더가 된다.

## 협업 방식 (2026-08-20부터)

- 지금까지는 팀원 각자 로컬에서 작업했지만, 이제부터는 `dltlghk5571/stara`
  (owner: 이시화, 백엔드) 하나로 합친다. main 직접 push 대신
  **feature 브랜치 + PR**로 작업한다.
- 이 폴더(원래 별도 저장소였음)는 `git subtree`로 히스토리를 보존한 채
  `data-pipeline/`에 병합됐다. 옛 저장소(`recogin/STARA`)는 과도기 동안만
  병행 사용하고, PR #1이 머지되면 `dltlghk5571/stara` 하나로 정리한다.

## 데이터 담당자 분담

- 정인지, 곽채원 두 명이 도시를 나눠서 수집/정제한다.
- 도시별 산출물에는 담당자 이름을 붙인다:
  ```
  python build_dataset.py --city=incheon --owner=정인지
  -> preprocessed/incheon.정인지.generated.cities.json / artists.json / places.json
  ```
  `--owner=`를 생략하면 파일명에 이름이 안 붙으니, 도시 분담 작업 시엔 항상 넣을 것.

## 출력 → 앱 연결 지점

`Data_Preprocessing_Template.ts`에 정의된 스키마대로 만들어진
`preprocessed/cities.json`, `artists.json`, `places.json`은 최종적으로
- `src/data/artists.ts` 전체(현재 더미 10명)
- `src/data/places.ts`의 `artistPlaces` 블록(30개)

을 교체하는 게 목적이다. 이 JSON → TS 변환 스크립트는 아직 없음 — 별도 작업 필요.

## 민감/개인 파일

`.env`, `raw_data_정인지/`, `raw_data_곽채원/`, 개인 작업일지, 원본 raw
데이터는 `.gitignore`로 이미 제외되어 있다. 새 파일을 raw_data 쪽에 추가할 때
패턴이 안 맞으면 gitignore 규칙도 같이 업데이트할 것.
