// STARA 자체 API 호출 횟수 카운터(일별) — provider별로 api_daily_usage 테이블을 공유한다.
// 원래 ODsay Basic 플랜(30회/일)을 보호하려고 만들었고(지금은 비활성 — ODSAY_ENABLED=false,
// odsayClient.ts 참고), 지금은 TMAP Transit(무료 10회/일) 예산도 같은 원자적 upsert
// 메커니즘을 provider 키만 바꿔서 재사용한다. 응답 데이터(경로/역/버스)는 여기 담지 않는다,
// "오늘 몇 번 호출했는가"라는 카운터만 남긴다(src/db/schema.ts의 apiDailyUsage 참고).

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { apiDailyUsage } from "@/db/schema";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * provider의 오늘치 호출 슬롯 하나를 원자적으로 예약한다. 단일 UPSERT(INSERT ... ON
 * CONFLICT DO UPDATE ... WHERE count < budget ... RETURNING) 왕복 한 번으로 처리되므로,
 * 동시에 여러 서버리스 요청이 들어와도 Postgres가 행 단위로 직렬화해 예산을 초과하지
 * 않는다 — "읽고 나서 메모리에서 +1" 같은 비원자적 패턴을 쓰지 않는다.
 *
 * 예약에 성공하면(true) 그 다음에 실제 업스트림 호출을 시도해야 한다. 호출이 나중에
 * 실패하더라도 이미 소비한 슬롯은 되돌리지 않는다 — upstream이 실패해도 provider 쪽
 * 쿼터는 이미 소진됐을 수 있기 때문이다.
 */
async function reserveProviderCallSlot(provider: string, budget: number): Promise<boolean> {
  const date = todayUtc();
  const id = `${provider}:${date}`;
  const db = getDb();

  const result = await db
    .insert(apiDailyUsage)
    .values({ id, provider, date, count: 1 })
    .onConflictDoUpdate({
      target: apiDailyUsage.id,
      set: { count: sql`${apiDailyUsage.count} + 1`, updatedAt: sql`now()` },
      where: sql`${apiDailyUsage.count} < ${budget}`,
    })
    .returning({ count: apiDailyUsage.count });

  return result.length > 0;
}

/** provider의 오늘 사용량 조회 전용(쓰기 없음). */
async function getProviderUsageToday(
  provider: string,
  budget: number
): Promise<{ used: number; budget: number }> {
  const db = getDb();
  const date = todayUtc();
  const id = `${provider}:${date}`;
  const rows = await db
    .select({ count: apiDailyUsage.count })
    .from(apiDailyUsage)
    .where(eq(apiDailyUsage.id, id));
  return { used: rows[0]?.count ?? 0, budget };
}

// ─────────────────────────────────────────────────────────
// ODsay — 비활성(레거시). route.ts는 더 이상 이 함수들을 호출하지 않는다(TMAP Transit로
// 교체됨, 아래 참고). odsayClient.ts와 마찬가지로 실제로 운영 검증된 뒤 삭제 예정이라
// 지금은 그대로 남겨둔다.
// ─────────────────────────────────────────────────────────
const ODSAY_PROVIDER = "odsay";
const DEFAULT_ODSAY_DAILY_BUDGET = 20; // ODsay Basic(30/일)보다 보수적으로 낮게 잡은 기본값

/** ODSAY_DAILY_BUDGET이 없거나 잘못된 값이면 보수적인 기본값(20)을 쓴다. */
export function getOdsayDailyBudget(): number {
  const raw = Number(process.env.ODSAY_DAILY_BUDGET);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_ODSAY_DAILY_BUDGET;
}

/** ODSAY_ENABLED=false로 명시하지 않는 한 기본은 활성화. 값이 없거나 다른 값이면 활성화로 취급. */
export function isOdsayEnabled(): boolean {
  return process.env.ODSAY_ENABLED !== "false";
}

export async function reserveOdsayCallSlot(): Promise<boolean> {
  return reserveProviderCallSlot(ODSAY_PROVIDER, getOdsayDailyBudget());
}

export async function getOdsayUsageToday(): Promise<{ used: number; budget: number }> {
  return getProviderUsageToday(ODSAY_PROVIDER, getOdsayDailyBudget());
}

// ─────────────────────────────────────────────────────────
// TMAP Transit — 현재 활성 상세 대중교통 제공사.
// ─────────────────────────────────────────────────────────
const TMAP_TRANSIT_PROVIDER = "tmap_transit";
const DEFAULT_TMAP_TRANSIT_DAILY_BUDGET = 8; // TMAP Transit 무료 10회/일보다 낮게(운영 여유분 2회)

/** TMAP_TRANSIT_DAILY_BUDGET이 없거나 잘못된 값이면 보수적인 기본값(8)을 쓴다. */
export function getTmapTransitDailyBudget(): number {
  const raw = Number(process.env.TMAP_TRANSIT_DAILY_BUDGET);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_TMAP_TRANSIT_DAILY_BUDGET;
}

/**
 * ODsay와 반대 극성: 기본은 비활성화다. 검증된 키/쿼터 없이 실수로 활성화되는 사고를
 * 막기 위해 명시적으로 "true"일 때만 켠다(ODSAY_ENABLED의 "명시적 false로만 끔"과
 * 의도적으로 다르다 — TMAP Transit은 새 제공사라 안전한 기본값은 꺼짐이다).
 */
export function isTmapTransitEnabled(): boolean {
  return process.env.TMAP_TRANSIT_ENABLED === "true";
}

export async function reserveTmapTransitCallSlot(): Promise<boolean> {
  return reserveProviderCallSlot(TMAP_TRANSIT_PROVIDER, getTmapTransitDailyBudget());
}

export async function getTmapTransitUsageToday(): Promise<{ used: number; budget: number }> {
  return getProviderUsageToday(TMAP_TRANSIT_PROVIDER, getTmapTransitDailyBudget());
}
