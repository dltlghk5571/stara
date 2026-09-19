-- api_daily_usage: STARA 자체 API 호출 횟수 카운터(일별). ODsay Basic 플랜 30회/일 쿼터
-- 보호용 예산 집행 테이블 — ODsay 응답(경로/역/버스 데이터)은 저장하지 않는다, 오직
-- "오늘 몇 번 호출했는가"라는 STARA 자체 사용량 메타데이터만 담는다.
-- 이 저장소는 drizzle-kit migrate를 쓰지 않고 drizzle-kit push로 스키마를 반영한다
-- (drizzle/ 마이그레이션 히스토리가 트래킹된 적 없음). 이 파일은 push를 대체하지 않고,
-- 이미 push로 반영된 변경을 다른 방식(직접 psql/SQL 클라이언트)으로도 재현할 수 있도록
-- 남겨두는 기록용 산출물이다. 여러 번 실행해도 안전(idempotent)하다.
CREATE TABLE IF NOT EXISTS api_daily_usage (
  id text PRIMARY KEY,
  provider text NOT NULL,
  date text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamp NOT NULL DEFAULT now()
);
