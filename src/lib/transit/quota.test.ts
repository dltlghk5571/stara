import { describe, expect, it, afterEach } from "vitest";
import {
  getOdsayDailyBudget,
  isOdsayEnabled,
  getTmapTransitDailyBudget,
  isTmapTransitEnabled,
} from "./quota";
import * as schema from "@/db/schema";
import { getTableColumns } from "drizzle-orm";

const ORIGINAL_ENV = { ...process.env };

describe("getOdsayDailyBudget", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("ODSAY_DAILY_BUDGET이 없으면 보수적인 기본값(20)을 쓴다 — 30/일 쿼터보다 낮다", () => {
    delete process.env.ODSAY_DAILY_BUDGET;
    expect(getOdsayDailyBudget()).toBe(20);
    expect(getOdsayDailyBudget()).toBeLessThan(30);
  });

  it("ODSAY_DAILY_BUDGET이 설정돼 있으면 그 값을 쓴다", () => {
    process.env.ODSAY_DAILY_BUDGET = "25";
    expect(getOdsayDailyBudget()).toBe(25);
  });

  it("잘못된 값(0/음수/숫자 아님)이면 기본값으로 폴백한다", () => {
    process.env.ODSAY_DAILY_BUDGET = "0";
    expect(getOdsayDailyBudget()).toBe(20);
    process.env.ODSAY_DAILY_BUDGET = "-5";
    expect(getOdsayDailyBudget()).toBe(20);
    process.env.ODSAY_DAILY_BUDGET = "not-a-number";
    expect(getOdsayDailyBudget()).toBe(20);
  });
});

describe("isOdsayEnabled", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("ODSAY_ENABLED가 없으면 기본은 활성화다(레거시 극성 — 지금은 route.ts가 호출 안 함)", () => {
    delete process.env.ODSAY_ENABLED;
    expect(isOdsayEnabled()).toBe(true);
  });

  it('ODSAY_ENABLED="false"일 때만 비활성화된다', () => {
    process.env.ODSAY_ENABLED = "false";
    expect(isOdsayEnabled()).toBe(false);
  });

  it("그 외 값(true/빈 문자열/오타)은 활성화로 취급한다", () => {
    process.env.ODSAY_ENABLED = "true";
    expect(isOdsayEnabled()).toBe(true);
    process.env.ODSAY_ENABLED = "";
    expect(isOdsayEnabled()).toBe(true);
  });
});

describe("getTmapTransitDailyBudget", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("TMAP_TRANSIT_DAILY_BUDGET이 없으면 보수적인 기본값(8)을 쓴다 — 무료 10회/일보다 낮다", () => {
    delete process.env.TMAP_TRANSIT_DAILY_BUDGET;
    expect(getTmapTransitDailyBudget()).toBe(8);
    expect(getTmapTransitDailyBudget()).toBeLessThan(10);
  });

  it("TMAP_TRANSIT_DAILY_BUDGET이 설정돼 있으면 그 값을 쓴다", () => {
    process.env.TMAP_TRANSIT_DAILY_BUDGET = "8";
    expect(getTmapTransitDailyBudget()).toBe(8);
  });

  it("잘못된 값(0/음수/숫자 아님)이면 기본값으로 폴백한다", () => {
    process.env.TMAP_TRANSIT_DAILY_BUDGET = "0";
    expect(getTmapTransitDailyBudget()).toBe(8);
    process.env.TMAP_TRANSIT_DAILY_BUDGET = "-1";
    expect(getTmapTransitDailyBudget()).toBe(8);
    process.env.TMAP_TRANSIT_DAILY_BUDGET = "abc";
    expect(getTmapTransitDailyBudget()).toBe(8);
  });
});

describe("isTmapTransitEnabled", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('기본(미설정)은 비활성화다 — ODsay와 반대 극성, 검증 전 실수로 켜지는 사고를 막는다', () => {
    delete process.env.TMAP_TRANSIT_ENABLED;
    expect(isTmapTransitEnabled()).toBe(false);
  });

  it('TMAP_TRANSIT_ENABLED="true"일 때만 활성화된다', () => {
    process.env.TMAP_TRANSIT_ENABLED = "true";
    expect(isTmapTransitEnabled()).toBe(true);
  });

  it("그 외 값(false/빈 문자열/오타/True)은 비활성화로 취급한다", () => {
    process.env.TMAP_TRANSIT_ENABLED = "false";
    expect(isTmapTransitEnabled()).toBe(false);
    process.env.TMAP_TRANSIT_ENABLED = "";
    expect(isTmapTransitEnabled()).toBe(false);
    process.env.TMAP_TRANSIT_ENABLED = "True";
    expect(isTmapTransitEnabled()).toBe(false);
  });
});

describe("api_daily_usage 스키마 — 응답 데이터를 담지 않는다(provider 공용)", () => {
  it("사용량 카운터 메타데이터 컬럼만 있다(경로/역/버스 등 응답 필드 없음)", () => {
    const columns = Object.keys(getTableColumns(schema.apiDailyUsage)).sort();
    expect(columns).toEqual(["count", "date", "id", "provider", "updatedAt"].sort());
  });
});

describe("transit_itinerary_cache 스키마 — 정규화된 itinerary만, 사용자 신원 없음", () => {
  it("좌표/provider/locale/만료시각 + 정규화된 itinerary 컬럼만 있다(원본 upstream payload용 필드 없음)", () => {
    const columns = Object.keys(getTableColumns(schema.transitItineraryCache)).sort();
    expect(columns).toEqual(
      [
        "id",
        "provider",
        "locale",
        "originLat",
        "originLng",
        "destinationLat",
        "destinationLng",
        "itineraryJson",
        "createdAt",
        "expiresAt",
      ].sort()
    );
  });

  it("사용자 식별 컬럼(userId 등)이 없다 — 경로 데이터일 뿐 개인정보가 아니다", () => {
    const columns = Object.keys(getTableColumns(schema.transitItineraryCache));
    expect(columns.some((c) => /user/i.test(c))).toBe(false);
  });
});
