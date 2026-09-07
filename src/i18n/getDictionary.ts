import type { Locale } from "./types";
import { interpolate } from "./interpolate";
import { en, type Dict } from "./dictionaries/en";
import { ko } from "./dictionaries/ko";

export type { Dict };

export function getDictionary(locale: Locale): Dict {
  return locale === "ko" ? ko : en;
}

export function translate(
  dict: Dict,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const value = key
    .split(".")
    .reduce<unknown>((node, segment) => {
      if (node && typeof node === "object" && segment in node) {
        return (node as Record<string, unknown>)[segment];
      }
      return undefined;
    }, dict);

  if (typeof value !== "string") {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] missing key: ${key}`);
    }
    return key;
  }
  return interpolate(value, vars);
}
