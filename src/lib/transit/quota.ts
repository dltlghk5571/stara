// ODsay Basic 플랜은 30회/일 쿼터다. 이 파일은 STARA 자체 예산(그 아래로 여유를 둔 값)을
// 원자적으로 집행한다 — ODsay 응답(경로/역/버스 데이터)은 저장하지 않는다, "오늘 몇 번
// 호출했는가"라는 카운터만 api_daily_usage 테이블에 남긴다(src/db/schema.ts 참고).

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { apiDailyUsage } from "@/db/schema";

const DEFAULT_DAILY_BUDGET = 20; // ODsay Basic(30/일)보다 보수적으로 낮게 잡은 기본값
const PROVIDER = "odsay";

/** ODSAY_DAILY_BUDGET이 없거나 잘못된 값이면 보수적인 기본값(20)을 쓴다. */
export function getOdsayDailyBudget(): number {
  const raw = Number(process.env.ODSAY_DAILY_BUDGET);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_DAILY_BUDGET;
}

/** ODSAY_ENABLED=false로 명시하지 않는 한 기본은 활성화. 값이 없거나 다른 값이면 활성화로 취급. */
export function isOdsayEnabled(): boolean {
  return process.env.ODSAY_ENABLED !== "false";
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * 오늘치 ODsay 호출 슬롯 하나를 원자적으로 예약한다. 단일 UPSERT(INSERT ... ON CONFLICT
 * DO UPDATE ... WHERE count < budget ... RETURNING) 왕복 한 번으로 처리되므로, 동시에
 * 여러 서버리스 요청이 들어와도 Postgres가 행 단위로 직렬화해 예산을 초과하지 않는다 —
 * "읽고 나서 메모리에서 +1" 같은 비원자적 패턴을 쓰지 않는다.
 *
 * 예약에 성공하면(true) 그 다음에 실제 ODsay 호출을 시도해야 한다. ODsay 호출이 나중에
 * 실패하더라도 이미 소비한 슬롯은 되돌리지 않는다 — upstream이 실패해도 ODsay 쪽 쿼터는
 * 이미 소진됐을 수 있기 때문이다.
 */
export async function reserveOdsayCallSlot(): Promise<boolean> {
  const budget = getOdsayDailyBudget();
  const date = todayUtc();
  const id = `${PROVIDER}:${date}`;
  const db = getDb();

  const result = await db
    .insert(apiDailyUsage)
    .values({ id, provider: PROVIDER, date, count: 1 })
    .onConflictDoUpdate({
      target: apiDailyUsage.id,
      set: { count: sql`${apiDailyUsage.count} + 1`, updatedAt: sql`now()` },
      where: sql`${apiDailyUsage.count} < ${budget}`,
    })
    .returning({ count: apiDailyUsage.count });

  return result.length > 0;
}

/** 오늘 사용량 조회 전용(쓰기 없음) — scripts/transit-usage.ts가 쓴다. */
export async function getOdsayUsageToday(): Promise<{ used: number; budget: number }> {
  const db = getDb();
  const date = todayUtc();
  const id = `${PROVIDER}:${date}`;
  const rows = await db
    .select({ count: apiDailyUsage.count })
    .from(apiDailyUsage)
    .where(eq(apiDailyUsage.id, id));
  return { used: rows[0]?.count ?? 0, budget: getOdsayDailyBudget() };
}
