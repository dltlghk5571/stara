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

- 2026-08-24부로 서울·부산·인천 MVP 3개 도시 전부 정인지 담당(원래
  서울/부산은 곽채원 담당 예정이었으나 계획 변경 - 자세한 내용은
  `data-pipeline/README.md` "현재 진행 상황" 절 참고).
- 도시별 산출물에는 담당자 이름을 붙인다. 파일명 규칙은 2026-08-25에
  "종류가 맨 앞, 도시/작성자는 뒤, 구분자는 언더바"로 확정:
  ```
  python build_dataset.py --city=incheon --owner=정인지
  -> preprocessed/generated_cities_incheon_정인지.json / generated_artists_... / generated_places_...
  ```
  `--owner=`를 생략하면 파일명에 이름이 안 붙으니, 도시 분담 작업 시엔 항상 넣을 것.
- 검수 중인 도시별 후보(`preprocessed/generated_*.json`)와 검수+영업시간
  보강까지 끝나 병합된 정본(`preprocessed/final/cities.json` 등)은
  2026-08-25부터 폴더로 분리돼 있다 - 아래 "출력 → 앱 연결 지점" 참고.
- `preprocessed/preview/`(2026-08-26~) - MVP 3개 도시의 `generated_places_*`
  중 review 플래그 없는 행만 모은 중간 스냅샷. final/처럼 사람이 손으로
  병합한 정본은 아님 - 자세한 내용은 `data-pipeline/README.md`
  "preview 스냅샷" 절 참고.
- `preprocessed/needs_review_MVP.csv`(2026-08-27~) - 서울/부산/인천 검수
  대기 행을 전부 합쳐서, 담당자가 아닌 다른 팀원에게 검수를 맡길 때 쓰는
  핸드오프 파일. 장소 설명·출처 링크·빈 "검수결과"/"코멘트" 열을 같이
  담아서 코드/스킬 문서를 안 봐도 바로 확인 가능하게 만든 것 - 도시별
  `generated_places_needs_review_{city}_정인지.csv`와 내용은 같고 형태만
  다르다(원본이 정본). 되돌려받으면 "검수결과=불일치"인 것만 골라서
  도시별 원본에 반영할 것.

## 출력 → 앱 연결 지점

`Data_Preprocessing_Template.ts`에 정의된 스키마대로 만들어진
`preprocessed/final/cities.json`, `artists.json`, `places.json`(검수+영업시간
보강까지 끝나서 병합된 도시만 여기 들어감)은 최종적으로
- `src/data/artists.ts` 전체(현재 더미 10명)
- `src/data/places.ts`의 `artistPlaces` 블록(30개)

을 교체하는 게 목적이다. 이 JSON → TS 변환 스크립트는 아직 없음 — 별도 작업 필요.

## 민감/개인 파일

`.env`, `raw_data_정인지/`, `raw_data_곽채원/`, 개인 작업일지, 원본 raw
데이터는 `.gitignore`로 이미 제외되어 있다. 새 파일을 raw_data 쪽에 추가할 때
패턴이 안 맞으면 gitignore 규칙도 같이 업데이트할 것.
