import type { Locale } from "./types";

export const LOCALE_COOKIE = "stara_locale";

export function parseLocale(value: string | undefined | null): Locale {
  return value === "ko" ? "ko" : "en";
}

/** Client-only. Reads the locale cookie; falls back to "en". */
export function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)stara_locale=(en|ko)(?:;|$)/);
  return parseLocale(match?.[1]);
}

/** Client-only. Persists the locale choice for a year. */
export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
