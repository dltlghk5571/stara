/** "HH:mm" <-> 자정 기준 분 단위 변환 유틸 */

import type { Locale } from "@/lib/tour-api/types";

/** "HH:mm"(24h)을 로케일에 맞는 12시간제 문자열로. ko: "오전 9:00", en: "9:00 AM" (Intl 표준 포맷 그대로 사용) */
export function formatTime(hhmm: string, locale: Locale): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function isWithinWindow(
  minutes: number,
  window: { start: string; end: string }
): boolean {
  return minutes >= toMinutes(window.start) && minutes <= toMinutes(window.end);
}
