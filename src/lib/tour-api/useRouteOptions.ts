import { useEffect, useState } from "react";
import type { Place } from "@/types";
import { buildSchedule } from "@/lib/scheduleCalculator";
import { TOUR_SEARCH_RADIUS_METERS } from "@/config";
import { ARTIST_PLACES } from "@/data/places";
import { placesForArtists } from "@/lib/artistPlaceSelector";
import { ROUTE_THEMES, themeScore, type RouteTheme } from "@/lib/tour-api/routeThemes";
import { useLocale } from "@/i18n";
import type { Locale } from "@/lib/tour-api/types";

export interface RouteOption {
  id: string;
  labelKo: string;
  labelEn: string;
  descriptionKo: string;
  descriptionEn: string;
  places: Place[];
  stopCount: number;
  totalMinutes: number;
}

const MAX_STOPS_PER_OPTION = 5;
/** 지역 전체를 커버해야 하므로 자동보완용 반경보다 넓게 잡는다. */
const REGION_RADIUS_METERS = TOUR_SEARCH_RADIUS_METERS * 5;

async function fetchThemePlaces(
  lat: number,
  lng: number,
  contentTypeId: string,
  locale: Locale
): Promise<Place[]> {
  try {
    const res = await fetch(
      `/api/tourism/nearby?lat=${lat}&lng=${lng}&radius=${REGION_RADIUS_METERS}&contentTypeId=${contentTypeId}&locale=${locale}`
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { places?: Place[] };
    return json.places ?? [];
  } catch {
    return [];
  }
}

/** id 기준 중복 제거, 앞쪽(우선순위 높은) 항목을 유지한다. */
function dedupeById(places: Place[]): Place[] {
  const seen = new Set<string>();
  return places.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

/** 같은 아티스트 장소로 슬롯이 몰리지 않도록, 서로 다른 아티스트를 먼저 한 곳씩 섞어 배치한다. */
function diversifyByArtist(places: Place[], selectedArtistIds: string[]): Place[] {
  const groups = new Map<string, Place[]>();
  for (const p of places) {
    const artistKey = p.artistIds.find((id) => selectedArtistIds.includes(id)) ?? "";
    const group = groups.get(artistKey) ?? [];
    group.push(p);
    groups.set(artistKey, group);
  }
  const queues = [...groups.values()];
  const result: Place[] = [];
  for (let i = 0; result.length < places.length; i++) {
    const queue = queues[i % queues.length];
    if (queue.length > 0) result.push(queue.shift()!);
  }
  return result;
}

function toOption(theme: RouteTheme, places: Place[]): RouteOption {
  const stops = places.slice(0, MAX_STOPS_PER_OPTION);
  const schedule = buildSchedule(stops);
  return {
    id: theme.id,
    labelKo: theme.labelKo,
    labelEn: theme.labelEn,
    descriptionKo: theme.descriptionKo,
    descriptionEn: theme.descriptionEn,
    places: stops,
    stopCount: stops.length,
    totalMinutes: schedule.totalTravelMinutes + schedule.totalDwellMinutes,
  };
}

/**
 * 아티스트 앵커 + 테마별 TourAPI 후보로 3개 루트안을 조립하는 순수 함수(테스트용으로 분리).
 * 카테고리를 딱 잘라 필터링하지 않고 themeScore()로 전체 아티스트 앵커의 순위를 매긴다 —
 * affinity가 0인 카테고리는 없으므로(routeThemes.ts) artistAnchors가 하나라도 있으면 그
 * 루트안엔 항상 최소 1곳이 포함된다("최소 1곳 포함" 보장이 별도 분기 없이 스코어 공식 자체에서
 * 나온다). 여러 아티스트가 선택됐다면 diversifyByArtist로 슬롯 안에서 최대한 섞는다.
 */
export function buildRouteOptions(
  artistAnchors: Place[],
  selectedArtistIds: string[],
  tourApiResultsByTheme: Place[][]
): RouteOption[] {
  // 이미 앞선 루트안의 앵커로 확정된 장소는 themeScore에서 페널티를 받아 다음 루트안에서
  // 후순위로 밀린다 — 세 루트안이 서로 겹치지 않도록 하는 결정적 메커니즘(9절).
  const usedAnchorIds = new Set<string>();
  return ROUTE_THEMES.map((theme, i) => {
    const ranked = artistAnchors
      .map((p) => ({ place: p, score: themeScore(p, theme, selectedArtistIds, usedAnchorIds) }))
      .sort((a, b) => b.score - a.score)
      .map((s) => s.place);
    const orderedAnchors = diversifyByArtist(ranked, selectedArtistIds);
    // 실제로 이 루트안에 들어갈(슬롯 안에 드는) 앵커만 "사용됨"으로 표시한다 — 순위표 전체를
    // 표시하면 표본이 큰 아티스트(예: enhypen 53곳)를 고르자마자 두 번째 루트안부터 그
    // 아티스트의 모든 장소가 페널티를 먹어 사실상 배제돼버린다.
    orderedAnchors.slice(0, MAX_STOPS_PER_OPTION).forEach((p) => usedAnchorIds.add(p.id));
    return toOption(theme, dedupeById([...orderedAnchors, ...tourApiResultsByTheme[i]]));
  })
    // 후보가 아예 없는 테마는(장소 미수집 지역 등) 옵션에서 제외한다.
    .filter((option) => option.places.length > 0);
}

interface State {
  options: RouteOption[];
  loading: boolean;
}

/**
 * 지역 중심 좌표 주변에서 테마(팬 하이라이트/K-컬처 익스플로러/쇼핑&맛집, routeThemes.ts)별로
 * 3가지 루트안을 만든다. 서울(city_id="seoul"과 매핑되는 regionId="seoul")이고 아티스트가
 * 선택된 경우, 실제 아티스트 장소를 themeScore로 순위 매겨 앵커로 우선 배치하고 남는
 * 슬롯은 기존과 동일하게 TourAPI 지역 명소로 채운다("K팝을 활용한 지역 관광
 * 활성화"라는 제품 목표상 지자체 제공 장소가 항상 함께 노출되어야 함 — K절 참고).
 */
export function useRouteOptions(
  regionId: string | null,
  centerLat: number | null,
  centerLng: number | null,
  selectedArtistIds: string[] = []
): State {
  const { locale } = useLocale();
  const [loaded, setLoaded] = useState<{ key: string; options: RouteOption[] } | null>(null);
  const artistKey = [...selectedArtistIds].sort().join(",");
  const key =
    regionId && centerLat != null && centerLng != null
      ? `${locale}|${regionId}|${artistKey}`
      : null;

  useEffect(() => {
    if (!key || centerLat == null || centerLng == null) return;

    // 실제 아티스트 장소 데이터는 서울만 존재(city_id="seoul" 필터로 만들어짐).
    const artistAnchors = regionId === "seoul" ? placesForArtists(ARTIST_PLACES, selectedArtistIds) : [];

    let cancelled = false;
    Promise.all(
      ROUTE_THEMES.map((theme) => fetchThemePlaces(centerLat, centerLng, theme.contentTypeId, locale))
    ).then((results) => {
      if (cancelled) return;
      setLoaded({ key, options: buildRouteOptions(artistAnchors, selectedArtistIds, results) });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- artistKey already encodes selectedArtistIds identity
  }, [key, centerLat, centerLng, regionId, artistKey]);

  if (!key) return { options: [], loading: false };
  if (!loaded || loaded.key !== key) return { options: [], loading: true };
  return { options: loaded.options, loading: false };
}
