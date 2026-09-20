// locale(ko/en)별로 TourAPI를 호출하는 상위 레이어.
// STARA는 최종적으로 외국인 관광객을 대상으로 하므로 영문 API를 준비해둔다 —
// 다만 이번 범위는 UI 전체 영문화가 아니라 provider 구조 자체이므로,
// 영문 데이터가 없거나 요청이 실패하면 항상 국문 데이터로 자연스럽게 폴백한다.

import {
  fetchLocationBasedList,
  fetchSearchKeyword,
  fetchDetailCommon,
  fetchDetailIntro,
} from "./client";
import { mapTourItemsToPlaces } from "./mapper";
import { TOUR_API_BASE_URL, TOUR_API_EN_BASE_URL, EN_CONTENT_TYPE_ID } from "./config";
import type { TourApiDetailIntroItem, Locale } from "./types";
import type { Place } from "@/types";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";

export type { Locale };

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
}

function baseUrlFor(locale: Locale): string {
  return locale === "en" ? TOUR_API_EN_BASE_URL : TOUR_API_BASE_URL;
}

/**
 * EngService2는 contentTypeId 체계가 KorService2와 달라(config.ts의 EN_CONTENT_TYPE_ID 참고)
 * 국문 코드를 그대로 넘기면 에러 없이 0건만 온다. 국문 폴백 도중엔 baseUrl이 실행 중에
 * KorService2로 바뀌므로, 바깥 locale이 아니라 "지금 실제로 치는 baseUrl" 기준으로 변환해야
 * 폴백 호출에서 다시 잘못 변환하는 걸 막는다.
 */
function contentTypeIdForBaseUrl<T extends string | undefined>(contentTypeId: T, baseUrl: string): T {
  if (!contentTypeId || baseUrl !== TOUR_API_EN_BASE_URL) return contentTypeId;
  return (EN_CONTENT_TYPE_ID[contentTypeId] ?? contentTypeId) as T;
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

/**
 * getNearby/searchTourismKeyword 전용 — mapTourItemsToPlaces에 "실제로 어느 언어를 받았는지"를
 * 정확히 넘기려고 폴백 발생 여부까지 함께 돌려준다. 요청한 locale을 그대로 넘기면, 폴백으로
 * 국문 데이터를 받고도 mapper에는 "en"이라고 알려주게 되어 nameEn/relationTextEn에 국문 원문이
 * 영문인 것처럼 남는다.
 */
async function withEnglishFallbackTracked<T>(
  locale: Locale,
  run: (baseUrl: string) => Promise<T[]>
): Promise<{ items: T[]; actualLocale: Locale }> {
  const items = await run(baseUrlFor(locale));
  if (locale === "en" && items.length === 0) {
    return { items: await run(TOUR_API_BASE_URL), actualLocale: "ko" };
  }
  return { items, actualLocale: locale };
}

export const tourismDataProvider: TourismDataProvider = {
  async getNearby(params, locale = "en") {
    const { items, actualLocale } = await withEnglishFallbackTracked(locale, (baseUrl) =>
      fetchLocationBasedList(
        {
          mapX: params.lng,
          mapY: params.lat,
          radius: params.radius,
          contentTypeId: contentTypeIdForBaseUrl(params.contentTypeId, baseUrl),
        },
        baseUrl
      )
    );
    return mapTourItemsToPlaces(items, actualLocale);
  },

  async getDetail(contentId, contentTypeId, locale = "en") {
    const common = await withEnglishFallback(locale, (baseUrl) =>
      fetchDetailCommon(contentId, baseUrl)
    );
    if (common.length === 0) return null;

    const intro = await withEnglishFallback(locale, (baseUrl) =>
      fetchDetailIntro(contentId, contentTypeIdForBaseUrl(contentTypeId, baseUrl), baseUrl)
    );

    // KTO 원문의 HTML 엔티티(&ldquo; 등)를 순수 텍스트로 풀어서 돌려준다(20절) — 여기서
    // 한 번만 디코딩하면 이 함수를 쓰는 모든 화면(PlaceDetailSheet 등)이 따로 안 해도 된다.
    const address = [common[0]?.addr1, common[0]?.addr2].filter(Boolean).join(" ") || null;
    return {
      overview: common[0]?.overview ? decodeHtmlEntities(common[0].overview) : null,
      address: address ? decodeHtmlEntities(address) : null,
      tel: common[0]?.tel ?? null,
      intro: intro[0] ?? null,
    };
  },
};

/** 키워드 검색. getNearby와 동일하게 locale별 엔드포인트 + 영문 빈 결과 시 국문 폴백. */
export function searchTourismKeyword(
  keyword: string,
  contentTypeId?: string,
  locale: Locale = "en"
) {
  return withEnglishFallbackTracked(locale, (baseUrl) =>
    fetchSearchKeyword({ keyword, contentTypeId: contentTypeIdForBaseUrl(contentTypeId, baseUrl) }, baseUrl)
  ).then(({ items, actualLocale }) => mapTourItemsToPlaces(items, actualLocale));
}
