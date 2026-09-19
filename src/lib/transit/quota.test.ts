import { describe, expect, it, afterEach } from "vitest";
import { getOdsayDailyBudget, isOdsayEnabled } from "./quota";
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

  it("ODSAY_ENABLED가 없으면 기본은 활성화다", () => {
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

describe("api_daily_usage 스키마 — ODsay 응답 데이터를 담지 않는다", () => {
  it("사용량 카운터 메타데이터 컬럼만 있다(경로/역/버스 등 ODsay 응답 필드 없음)", () => {
    const columns = Object.keys(getTableColumns(schema.apiDailyUsage)).sort();
    expect(columns).toEqual(["count", "date", "id", "provider", "updatedAt"].sort());
  });

  it("스키마에 별도의 transit/route/itinerary 캐시 테이블이 존재하지 않는다", () => {
    const tableNames = Object.keys(schema);
    expect(tableNames).toEqual(["users", "questPhotos", "apiDailyUsage"]);
  });
});
