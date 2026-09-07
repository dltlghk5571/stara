import type { Locale } from "./types";
import type { Artist, PlaceCategory, Place, Quest, StaraRoute } from "@/types";
import type { Region } from "@/data/regions";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";

const pick = (ko: string, en: string | undefined, locale: Locale): string => {
  if (locale === "ko") return ko;
  return en && en.trim() ? en : ko;
};

export const placeName = (p: Pick<Place, "nameKo" | "nameEn">, l: Locale) =>
  pick(p.nameKo, p.nameEn, l);

export const placeRelation = (
  p: Pick<Place, "relationTextKo" | "relationTextEn">,
  l: Locale,
) => pick(p.relationTextKo, p.relationTextEn, l);

export const questTitle = (q: Pick<Quest, "titleKo" | "titleEn">, l: Locale) =>
  pick(q.titleKo, q.titleEn, l);

export const questDesc = (
  q: Pick<Quest, "descriptionKo" | "descriptionEn">,
  l: Locale,
) => pick(q.descriptionKo, q.descriptionEn, l);

export const regionDesc = (
  r: Pick<Region, "descriptionKo" | "descriptionEn">,
  l: Locale,
) => pick(r.descriptionKo, r.descriptionEn, l);

export const routeName = (r: Pick<StaraRoute, "nameKo" | "nameEn">, l: Locale) =>
  pick(r.nameKo, r.nameEn, l);

export const artistName = (a: Pick<Artist, "name" | "nameEn">, l: Locale) =>
  pick(a.name, a.nameEn, l);

export const categoryLabel = (c: PlaceCategory, l: Locale) => {
  const style = CATEGORY_STYLE[c];
  return l === "ko" ? style.labelKo : style.labelEn;
};
