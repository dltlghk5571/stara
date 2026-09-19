// 오늘 ODsay 호출 사용량을 콘솔에 보여주는 진단 스크립트. 쓰기는 하지 않는다(조회 전용).
// 실행: npm run transit:usage
import { getOdsayUsageToday, getOdsayDailyBudget, isOdsayEnabled } from "../src/lib/transit/quota";

async function main() {
  const { used, budget } = await getOdsayUsageToday();
  const remaining = Math.max(0, budget - used);

  console.log(`ODsay usage today: ${used} / ${budget} STARA budget`);
  console.log(`Remaining: ${remaining}`);
  console.log(`ODSAY_ENABLED: ${isOdsayEnabled()}`);
  if (getOdsayDailyBudget() >= 30) {
    console.warn("경고: ODSAY_DAILY_BUDGET이 30 이상입니다 — Basic 플랜(30/일) 한도에 여유가 없습니다.");
  }
}

main().catch((err) => {
  console.error("[transit:usage] failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
