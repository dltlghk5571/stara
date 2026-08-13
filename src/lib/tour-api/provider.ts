// locale(ko/en)별로 TourAPI를 호출하는 상위 레이어.
// STARA는 최종적으로 외국인 관광객을 대상으로 하므로 영문 API를 준비해둔다 —
// 다만 이번 범위는 UI 전체 영문화가 아니라 provider 구조 자체이므로,
// 영문 데이터가 없거나 요청이 실패하면 항상 국문 데이터로 자연스럽게 폴백한다.

import {
  fetchLocationBasedList,
  fetchSearchKeyword,
  fetchDetailCommon,
  fetchDetailIntro,
  fetchDetailImages,
} from "./client";
import { mapTourItemsToPlaces } from "./mapper";
import { TOUR_API_BASE_URL, TOUR_API_EN_BASE_URL } from "./config";
import type { TourApiDetailIntroItem } from "./types";
import type { Place } from "@/types";

export type Locale = "ko" | "en";

export interface TourismDetail {
  overview: string | null;
  address: string | null;
  tel: string | null;
  intro: TourApiDetailIntroItem | null;
}

export interface TourismDataProvider {
  getNearby(
    params: { lat: number; lng: number; radius: number; contentTypeId?: string },
    locale?: Locale
  ): Promise<Place[]>;
  getDetail(
    contentId: string,
    contentTypeId: string,
    locale?: Locale
  ): Promise<TourismDetail | null>;
  getImages(contentId: string, locale?: Locale): Promise<string[]>;
}

function baseUrlFor(locale: Locale): string {
  return locale === "en" ? TOUR_API_EN_BASE_URL : TOUR_API_BASE_URL;
}

/** locale이 "en"인데 결과가 빈 배열이면 국문으로 한 번 더 시도한다. 세 메서드 모두 배열을 반환하므로 T[]로 고정. */
async function withEnglishFallback<T>(
  locale: Locale,
  run: (baseUrl: string) => Promise<T[]>
): Promise<T[]> {
  const result = await run(baseUrlFor(locale));
  if (locale === "en" && result.length === 0) {
    return run(TOUR_API_BASE_URL);
  }
  return result;
}

export const tourismDataProvider: TourismDataProvider = {
  async getNearby(params, locale = "ko") {
    const items = await withEnglishFallback(locale, (baseUrl) =>
      fetchLocationBasedList(
        {
          mapX: params.lng,
          mapY: params.lat,
          radius: params.radius,
          contentTypeId: params.contentTypeId,
        },
        baseUrl
      )
    );
    return mapTourItemsToPlaces(items);
  },

  async getDetail(contentId, contentTypeId, locale = "ko") {
    const common = await withEnglishFallback(locale, (baseUrl) =>
      fetchDetailCommon(contentId, baseUrl)
    );
    if (common.length === 0) return null;

    const intro = await withEnglishFallback(locale, (baseUrl) =>
      fetchDetailIntro(contentId, contentTypeId, baseUrl)
    );

    return {
      overview: common[0]?.overview ?? null,
      address: [common[0]?.addr1, common[0]?.addr2].filter(Boolean).join(" ") || null,
      tel: common[0]?.tel ?? null,
      intro: intro[0] ?? null,
    };
  },

  async getImages(contentId, locale = "ko") {
    const images = await withEnglishFallback(locale, (baseUrl) =>
      fetchDetailImages(contentId, baseUrl)
    );
    return images.map((i) => i.originimgurl).filter(Boolean);
  },
};

/** 키워드 검색은 국문 전용(현재 UI가 국문 키워드만 다룸) — locale 확장은 필요해지면 위와 동일한 패턴으로 추가. */
export function searchTourismKeyword(keyword: string, contentTypeId?: string) {
  return fetchSearchKeyword({ keyword, contentTypeId }).then(mapTourItemsToPlaces);
}
