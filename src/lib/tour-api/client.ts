// 한국관광공사 TourAPI 서버 전용 클라이언트.
// 반드시 Route Handler(서버)에서만 import 할 것 — API 키를 브라우저에 절대 노출하지 않는다.
// TOUR_API_KEY는 공공데이터포털에서 발급받은 "디코딩(Decoding)" 서비스키를 그대로 넣는다
// (URLSearchParams가 인코딩을 처리하므로 인코딩 키를 넣으면 이중 인코딩되어 인증에 실패한다).

import { TOUR_API_BASE_URL, TOUR_API_TIMEOUT_MS } from "./config";
import { cacheGet, cacheSet } from "@/lib/cache";
import type {
  TourApiDetailIntroItem,
  TourApiImageItem,
  TourApiRawItem,
  TourApiResponse,
} from "./types";

const MOBILE_OS = "ETC";
const MOBILE_APP = "STARA";

function buildUrl(
  baseUrl: string,
  operation: string,
  params: Record<string, string | number | undefined>
): string {
  const url = new URL(`${baseUrl}/${operation}`);
  url.searchParams.set("serviceKey", process.env.TOUR_API_KEY ?? "");
  url.searchParams.set("MobileOS", MOBILE_OS);
  url.searchParams.set("MobileApp", MOBILE_APP);
  url.searchParams.set("_type", "json");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function normalizeItems<T>(json: TourApiResponse<T>): T[] {
  const items = json.response?.body?.items;
  if (!items) return [];
  const item = items.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

/** TourAPI 실패는 절대 throw하지 않고 빈 배열로 흡수한다 — 호출부는 그대로 dummy fallback 경로를 탄다. */
async function callTourApi<T>(
  operation: string,
  params: Record<string, string | number | undefined>,
  baseUrl: string = TOUR_API_BASE_URL
): Promise<T[]> {
  if (!process.env.TOUR_API_KEY) {
    console.warn(`[tour-api] TOUR_API_KEY not set — skipping ${operation}`);
    return [];
  }

  const cacheKey = `${baseUrl}:${operation}:${JSON.stringify(params)}`;
  const cached = cacheGet<T[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(buildUrl(baseUrl, operation, params), {
      signal: AbortSignal.timeout(TOUR_API_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[tour-api] ${operation} HTTP ${res.status}`);
      return [];
    }
    const json = (await res.json()) as TourApiResponse<T>;
    const result = normalizeItems(json);
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    console.error(
      `[tour-api] ${operation} failed:`,
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

export function fetchLocationBasedList(
  params: {
    mapX: number;
    mapY: number;
    radius: number;
    contentTypeId?: string;
    numOfRows?: number;
  },
  baseUrl?: string
): Promise<TourApiRawItem[]> {
  return callTourApi<TourApiRawItem>(
    "locationBasedList2",
    {
      mapX: params.mapX,
      mapY: params.mapY,
      radius: params.radius,
      contentTypeId: params.contentTypeId,
      arrange: "E", // 거리순 정렬
      numOfRows: params.numOfRows ?? 20,
      pageNo: 1,
    },
    baseUrl
  );
}

export function fetchSearchKeyword(
  params: { keyword: string; contentTypeId?: string; numOfRows?: number },
  baseUrl?: string
): Promise<TourApiRawItem[]> {
  return callTourApi<TourApiRawItem>(
    "searchKeyword2",
    {
      keyword: params.keyword,
      contentTypeId: params.contentTypeId,
      numOfRows: params.numOfRows ?? 20,
      pageNo: 1,
    },
    baseUrl
  );
}

export function fetchDetailCommon(
  contentId: string,
  baseUrl?: string
): Promise<TourApiRawItem[]> {
  // 실제 키로 확인한 결과 defaultYN/addrinfoYN/overviewYN/mapinfoYN은 이 게이트웨이(KorService2)
  // 버전에서 INVALID_REQUEST_PARAMETER_ERROR를 유발한다 — contentId만 넘겨도 overview/addr/mapx,y가
  // 전부 포함된 전체 응답이 온다.
  return callTourApi<TourApiRawItem>(
    "detailCommon2",
    { contentId },
    baseUrl
  );
}

export function fetchDetailIntro(
  contentId: string,
  contentTypeId: string,
  baseUrl?: string
): Promise<TourApiDetailIntroItem[]> {
  return callTourApi<TourApiDetailIntroItem>(
    "detailIntro2",
    { contentId, contentTypeId },
    baseUrl
  );
}

export function fetchDetailImages(
  contentId: string,
  baseUrl?: string
): Promise<TourApiImageItem[]> {
  return callTourApi<TourApiImageItem>("detailImage2", { contentId, imageYN: "Y" }, baseUrl);
}
