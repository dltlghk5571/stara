-- transit_itinerary_cache: 대중교통 상세 경로(TransitItinerary)의 짧은 수명 캐시.
-- 정규화된 STARA TransitItinerary만 저장(원본 업스트림 payload 전체는 저장 안 함).
-- expiresAt이 지난 행은 절대 반환하지 않는다 — TMAP 약관상 파생 데이터를 24시간 이상
-- 보관/재사용할 수 없어서, 애플리케이션 레벨에서 TTL을 항상 24시간보다 짧게 강제한다
-- (src/lib/transit/itineraryCache.ts 참고). 사용자 신원은 담지 않는다.
-- 이 저장소는 drizzle-kit migrate를 쓰지 않고 drizzle-kit push로 스키마를 반영한다
-- (drizzle/ 마이그레이션 히스토리가 트래킹된 적 없음). 이 파일은 push를 대체하지 않고,
-- 이미 push로 반영된 변경을 다른 방식(직접 psql/SQL 클라이언트)으로도 재현할 수 있도록
-- 남겨두는 기록용 산출물이다. 여러 번 실행해도 안전(idempotent)하다.
CREATE TABLE IF NOT EXISTS transit_itinerary_cache (
  id text PRIMARY KEY,
  provider text NOT NULL,
  locale text NOT NULL,
  origin_lat double precision NOT NULL,
  origin_lng double precision NOT NULL,
  destination_lat double precision NOT NULL,
  destination_lng double precision NOT NULL,
  itinerary_json jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp NOT NULL
);
