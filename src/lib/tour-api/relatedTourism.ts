// 한국관광공사_관광지별 연관 관광지 정보 서비스 (TarRlteTarService1). 서버 전용.
// "이 관광지와 연결성 높은 장소" 키워드검색(searchKeyword1)으로 랭킹 신호를 가져온다.
// 절대 "실시간 방문량/실시간 관광객 이동"으로 표현하지 않는다 — scoreCandidate의
// relatedTourismScore로만 쓰이는 순수 랭킹 보정 신호다.
//
// 이 서비스는 위치(mapX/mapY)가 아니라 시군구코드 기반이라 KorService2와 코드 체계가 다르다
// (예: 경복궁의 KorService2 areacode="1"/sigungucode="23" vs 여기선 areaCd="11"/signguCd="11110").

import { cacheGet, cacheSet } from "@/lib/cache";

const RELATED_TOURISM_BASE_URL =
  process.env.TOUR_API_RELATED_BASE_URL ?? "https://apis.data.go.kr/B551011/TarRlteTarService1";
const TIMEOUT_MS = 5000;
const MOBILE_OS = "ETC";
const MOBILE_APP = "STARA";
const SEOUL_AREA_CD = "11";
// 월 1회(매월 8일) 갱신되는 데이터라 API 응답을 하루 동안 캐시해도 무방하다.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** 서울 25개 자치구 시군구코드 (한국관광공사 제공 코드표 v1.0 기준) */
const SEOUL_SIGUNGU_CD: Record<string, string> = {
  종로구: "11110", 중구: "11140", 용산구: "11170", 성동구: "11200", 광진구: "11215",
  동대문구: "11230", 중랑구: "11260", 성북구: "11290", 강북구: "11305", 도봉구: "11320",
  노원구: "11350", 은평구: "11380", 서대문구: "11410", 마포구: "11440", 양천구: "11470",
  강서구: "11500", 구로구: "11530", 금천구: "11545", 영등포구: "11560", 동작구: "11590",
  관악구: "11620", 서초구: "11650", 강남구: "11680", 송파구: "11710", 강동구: "11740",
};

/** 주소 문자열(예: "서울특별시 종로구 ...")에서 구를 추출해 시군구코드로 변환. KTO 후보(address 있음)용. */
export function resolveSignguCdFromAddress(address?: string): string | undefined {
  if (!address) return undefined;
  // \b는 한글에서 단어 경계로 동작하지 않으므로(가-힣과 공백 모두 \w가 아님) 쓰지 않는다.
  const match = address.match(/([가-힣]+구)(?:\s|$)/);
  return match ? SEOUL_SIGUNGU_CD[match[1]] : undefined;
}

/** STARA 메인 루트(고정 5곳)는 주소 필드가 없어 직접 매핑해둔다. */
export const MAIN_ROUTE_SIGNGU_CD: Record<string, string> = {
  "main-gyeongbokgung": SEOUL_SIGUNGU_CD["종로구"],
  "main-ikseondong": SEOUL_SIGUNGU_CD["종로구"],
  "main-myeongdong": SEOUL_SIGUNGU_CD["중구"],
  "main-hongdae": SEOUL_SIGUNGU_CD["마포구"],
  "main-banpo": SEOUL_SIGUNGU_CD["서초구"],
};

interface RelatedTourismItem {
  rlteTatsNm: string;
  rlteRank: string;
}

function toYYYYMM(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function callRelatedTourism(
  keyword: string,
  signguCd: string,
  baseYm: string
): Promise<RelatedTourismItem[]> {
  if (!process.env.TOUR_API_KEY) return [];

  const cacheKey = `related:${keyword}:${signguCd}:${baseYm}`;
  const cached = cacheGet<RelatedTourismItem[]>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${RELATED_TOURISM_BASE_URL}/searchKeyword1`);
  url.searchParams.set("serviceKey", process.env.TOUR_API_KEY);
  url.searchParams.set("MobileOS", MOBILE_OS);
  url.searchParams.set("MobileApp", MOBILE_APP);
  url.searchParams.set("_type", "json");
  url.searchParams.set("numOfRows", "50");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("baseYm", baseYm);
  url.searchParams.set("areaCd", SEOUL_AREA_CD);
  url.searchParams.set("signguCd", signguCd);
  url.searchParams.set("keyword", keyword);

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[related-tourism] searchKeyword1 HTTP ${res.status}`);
      return [];
    }
    const json = await res.json();
    const items = json?.response?.body?.items;
    const list: RelatedTourismItem[] =
      items && items !== "" ? (Array.isArray(items.item) ? items.item : [items.item]) : [];
    cacheSet(cacheKey, list, CACHE_TTL_MS);
    return list;
  } catch (err) {
    console.error(
      "[related-tourism] searchKeyword1 failed:",
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

/** 이번 달 데이터가 아직 없으면(매월 8일 갱신) 지난 달로 한 번만 폴백한다. */
async function fetchRelatedTourismByKeyword(
  keyword: string,
  signguCd: string
): Promise<RelatedTourismItem[]> {
  const now = new Date();
  const items = await callRelatedTourism(keyword, signguCd, toYYYYMM(now));
  if (items.length > 0) return items;

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return callRelatedTourism(keyword, signguCd, toYYYYMM(prevMonth));
}

export interface RelatedTourismAnchor {
  name: string;
  signguCd: string;
}

/**
 * anchor 장소들(보통 메인 루트 고정 5곳)의 연관 관광지 랭킹을 모아
 * "장소명 -> 0~1 연관도 점수(여러 anchor 중 가장 좋은 순위 기준)" 맵으로 합친다.
 */
export async function getRelatedTourismScores(
  anchors: RelatedTourismAnchor[]
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  await Promise.all(
    anchors.map(async (anchor) => {
      const items = await fetchRelatedTourismByKeyword(anchor.name, anchor.signguCd);
      for (const item of items) {
        const rank = Number(item.rlteRank);
        if (!Number.isFinite(rank) || rank < 1) continue;
        const score = Math.max(0, 1 - (rank - 1) / 49); // 1위=1.0, 50위≈0
        const existing = scores.get(item.rlteTatsNm);
        if (existing === undefined || score > existing) {
          scores.set(item.rlteTatsNm, score);
        }
      }
    })
  );

  return scores;
}
