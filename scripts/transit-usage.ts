// 오늘 대중교통 상세 경로 API 사용량을 콘솔에 보여주는 진단 스크립트. 쓰기는 하지
// 않는다(조회 전용). API 키는 절대 출력하지 않는다.
// 실행: npm run transit:usage
import {
  getTmapTransitUsageToday,
  getTmapTransitDailyBudget,
  isTmapTransitEnabled,
  getOdsayUsageToday,
  isOdsayEnabled,
} from "../src/lib/transit/quota";

async function main() {
  const { used, budget } = await getTmapTransitUsageToday();
  const remaining = Math.max(0, budget - used);

  console.log(`TMAP Transit today: ${used} / ${budget} STARA budget`);
  console.log(`Remaining: ${remaining}`);
  console.log(`TMAP_TRANSIT_ENABLED: ${isTmapTransitEnabled()}`);
  console.log(
    `(참고: TMAP Transit 무료 플랜 실제 한도는 10회/일 — STARA는 그보다 낮게 ${getTmapTransitDailyBudget()}회로 예산을 잡아 운영 여유를 둔다.)`
  );
  if (getTmapTransitDailyBudget() >= 10) {
    console.warn("경고: TMAP_TRANSIT_DAILY_BUDGET이 10 이상입니다 — 무료 플랜(10/일) 한도에 여유가 없습니다.");
  }

  const odsay = await getOdsayUsageToday();
  console.log(`\n(레거시, 비활성) ODsay today: ${odsay.used} / ${odsay.budget} — ODSAY_ENABLED: ${isOdsayEnabled()}`);
}

main().catch((err) => {
  console.error("[transit:usage] failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
