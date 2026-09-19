import { describe, expect, it, afterEach } from "vitest";
import { buildCacheKey, isCacheRowExpired, getTmapTransitCacheTtlMinutes } from "./itineraryCache";

const ORIGINAL_ENV = { ...process.env };

describe("buildCacheKey", () => {
  it("A→B와 B→A는 서로 다른 키다(방향성 유지)", () => {
    const a = { lat: 37.5, lng: 127.0 };
    const b = { lat: 37.51, lng: 127.01 };
    expect(buildCacheKey("tmap_transit", "ko", a, b)).not.toBe(buildCacheKey("tmap_transit", "ko", b, a));
  });

  it("로케일이 다르면 키가 달라진다", () => {
    const a = { lat: 37.5, lng: 127.0 };
    const b = { lat: 37.51, lng: 127.01 };
    expect(buildCacheKey("tmap_transit", "ko", a, b)).not.toBe(buildCacheKey("tmap_transit", "en", a, b));
  });

  it("provider가 다르면 키가 달라진다", () => {
    const a = { lat: 37.5, lng: 127.0 };
    const b = { lat: 37.51, lng: 127.01 };
    expect(buildCacheKey("tmap_transit", "ko", a, b)).not.toBe(buildCacheKey("odsay", "ko", a, b));
  });

  it("같은 좌표+로케일+provider면 항상 같은 키다(결정론적)", () => {
    const a = { lat: 37.5, lng: 127.0 };
    const b = { lat: 37.51, lng: 127.01 };
    expect(buildCacheKey("tmap_transit", "ko", a, b)).toBe(buildCacheKey("tmap_transit", "ko", a, b));
  });

  it("부동소수점 미세 흔들림은 같은 키로 합쳐진다(5자리 반올림)", () => {
    const a1 = { lat: 37.5, lng: 127.0 };
    const a2 = { lat: 37.5 + 1e-9, lng: 127.0 };
    const b = { lat: 37.51, lng: 127.01 };
    expect(buildCacheKey("tmap_transit", "ko", a1, b)).toBe(buildCacheKey("tmap_transit", "ko", a2, b));
  });

  it("서로 다른(멀리 떨어진) 장소는 뭉개지지 않는다", () => {
    const a = { lat: 37.5, lng: 127.0 };
    const bNear = { lat: 37.51, lng: 127.01 };
    const bFar = { lat: 37.6, lng: 127.1 };
    expect(buildCacheKey("tmap_transit", "ko", a, bNear)).not.toBe(buildCacheKey("tmap_transit", "ko", a, bFar));
  });
});

describe("isCacheRowExpired", () => {
  it("미래 만료시각이면 만료되지 않았다(fresh hit)", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const expiresAt = new Date("2026-01-01T01:00:00Z");
    expect(isCacheRowExpired(expiresAt, now)).toBe(false);
  });

  it("과거 만료시각이면 만료됐다(절대 반환하지 않아야 함)", () => {
    const now = new Date("2026-01-01T02:00:00Z");
    const expiresAt = new Date("2026-01-01T01:00:00Z");
    expect(isCacheRowExpired(expiresAt, now)).toBe(true);
  });

  it("정확히 만료 시각과 같으면 만료로 취급한다(경계값, 절대 더 오래 쓰지 않음)", () => {
    const t = new Date("2026-01-01T01:00:00Z");
    expect(isCacheRowExpired(t, t)).toBe(true);
  });
});

describe("getTmapTransitCacheTtlMinutes", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("설정이 없으면 기본값(360분 = 6시간)을 쓴다", () => {
    delete process.env.TMAP_TRANSIT_CACHE_TTL_MINUTES;
    expect(getTmapTransitCacheTtlMinutes()).toBe(360);
  });

  it("유효한 설정 값을 그대로 쓴다", () => {
    process.env.TMAP_TRANSIT_CACHE_TTL_MINUTES = "120";
    expect(getTmapTransitCacheTtlMinutes()).toBe(120);
  });

  it("잘못된 값(0/음수/숫자아님)이면 기본값으로 폴백한다", () => {
    process.env.TMAP_TRANSIT_CACHE_TTL_MINUTES = "0";
    expect(getTmapTransitCacheTtlMinutes()).toBe(360);
    process.env.TMAP_TRANSIT_CACHE_TTL_MINUTES = "-10";
    expect(getTmapTransitCacheTtlMinutes()).toBe(360);
    process.env.TMAP_TRANSIT_CACHE_TTL_MINUTES = "nope";
    expect(getTmapTransitCacheTtlMinutes()).toBe(360);
  });

  it("23시간(1380분) 초과 설정은 항상 클램프된다 — 24시간 미만 하드 보장", () => {
    process.env.TMAP_TRANSIT_CACHE_TTL_MINUTES = "1440"; // 24h
    expect(getTmapTransitCacheTtlMinutes()).toBe(1380);
    process.env.TMAP_TRANSIT_CACHE_TTL_MINUTES = "100000";
    expect(getTmapTransitCacheTtlMinutes()).toBe(1380);
    expect(getTmapTransitCacheTtlMinutes()).toBeLessThan(24 * 60);
  });

  it("정확히 1380분(23시간)은 클램프 없이 그대로 허용된다", () => {
    process.env.TMAP_TRANSIT_CACHE_TTL_MINUTES = "1380";
    expect(getTmapTransitCacheTtlMinutes()).toBe(1380);
  });
});
