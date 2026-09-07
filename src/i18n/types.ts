import type { Locale } from "@/lib/tour-api/types";

export type { Locale };

/** Dotted-path translator bound to a locale's dictionary. */
export type TFunction = (
  key: string,
  vars?: Record<string, string | number>,
) => string;
