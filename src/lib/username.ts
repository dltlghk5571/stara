const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// 시스템/브랜드/관리 용도로 오해될 수 있는 경로와 겹치는 예약어.
// 완전한 욕설 필터는 아님 — 가장 흔한 남용 케이스(사칭, 시스템 경로 충돌)만 막는다.
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "staff",
  "support",
  "help",
  "api",
  "www",
  "stara",
  "official",
  "system",
  "null",
  "undefined",
  "me",
  "test",
  "sign-in",
  "sign-up",
  "collection",
]);

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function validateUsername(input: string): { ok: true } | { ok: false; error: string } {
  const username = normalizeUsername(input);
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: "username must be 3-20 chars: a-z, 0-9, _" };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, error: "username is reserved" };
  }
  return { ok: true };
}
