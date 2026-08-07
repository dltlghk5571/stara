/** "HH:mm" <-> 자정 기준 분 단위 변환 유틸 */

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
