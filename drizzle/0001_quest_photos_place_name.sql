-- quest_photos.place_name (nullable) — 촬영 시점 장소명 스냅샷.
-- 이 저장소는 drizzle-kit migrate를 쓰지 않고 drizzle-kit push로 스키마를 반영한다
-- (drizzle/ 마이그레이션 히스토리가 트래킹된 적 없음). 이 파일은 push를 대체하지 않고,
-- 이미 push로 반영된 변경을 다른 방식(직접 psql/SQL 클라이언트)으로도 재현할 수 있도록
-- 남겨두는 기록용 산출물이다. 여러 번 실행해도 안전(idempotent)하다.
ALTER TABLE quest_photos
ADD COLUMN IF NOT EXISTS place_name text;
