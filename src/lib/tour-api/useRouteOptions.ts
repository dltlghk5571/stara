import { useEffect, useState } from "react";
import type { Place } from "@/types";
import { buildSchedule } from "@/lib/scheduleCalculator";
import { TOUR_SEARCH_RADIUS_METERS } from "@/config";
import { ARTIST_PLACES } from "@/data/places";

export interface RouteOption {
  id: string;
  labelKo: string;
  labelEn: string;
  places: Place[];
  stopCount: number;
  totalMinutes: number;
}

const MAX_STOPS_PER_OPTION = 5;
/** 지역 전체를 커버해야 하므로 자동보완용 반경보다 넓게 잡는다. */
const REGION_RADIUS_METERS = TOUR_SEARCH_RADIUS_METERS * 5;

const THEMES: { id: string; labelKo: string; labelEn: string; contentTypeId: string }[] = [
  { id: "photo", labelKo: "포토 & 감성", labelEn: "Photo & Vibes", contentTypeId: "12" },
  { id: "culture", labelKo: "문화 체험", labelEn: "Culture & Experience", contentTypeId: "14" },
  { id: "food", labelKo: "맛집 코스", labelEn: "Foodie Route", contentTypeId: "39" },
];

async function fetchThemePlaces(
  lat: number,
  lng: number,
  contentTypeId: string
): Promise<Place[]> {
  try {
    const res = await fetch(
      `/api/tourism/nearby?lat=${lat}&lng=${lng}&radius=${REGION_RADIUS_METERS}&contentTypeId=${contentTypeId}`
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

function toOption(
  theme: (typeof THEMES)[number],
  places: Place[]
): RouteOption {
  const stops = places.slice(0, MAX_STOPS_PER_OPTION);
  const schedule = buildSchedule(stops);
  return {
    id: theme.id,
    labelKo: theme.labelKo,
    labelEn: theme.labelEn,
    places: stops,
    stopCount: stops.length,
    totalMinutes: schedule.totalTravelMinutes + schedule.totalDwellMinutes,
  };
}

interface State {
  options: RouteOption[];
  loading: boolean;
}

/**
 * 지역 중심 좌표 주변에서 테마(포토/문화/맛집)별로 3가지 루트안을 만든다.
 * 서울(city_id="seoul"과 매핑되는 regionId="seoul")이고 아티스트가 선택된 경우,
 * 각 테마 카테고리와 일치하는 실제 아티스트 장소를 앵커로 우선 배치하고 남는
 * 슬롯은 기존과 동일하게 TourAPI 지역 명소로 채운다("K팝을 활용한 지역 관광
 * 활성화"라는 제품 목표상 지자체 제공 장소가 항상 함께 노출되어야 함 — K절 참고).
 */
export function useRouteOptions(
  regionId: string | null,
  centerLat: number | null,
  centerLng: number | null,
  selectedArtistIds: string[] = []
): State {
  const [loaded, setLoaded] = useState<{ key: string; options: RouteOption[] } | null>(null);
  const artistKey = [...selectedArtistIds].sort().join(",");
  const key = regionId && centerLat != null && centerLng != null ? `${regionId}|${artistKey}` : null;

  useEffect(() => {
    if (!key || centerLat == null || centerLng == null) return;

    // 실제 아티스트 장소 데이터는 서울만 존재(city_id="seoul" 필터로 만들어짐).
    const artistAnchors =
      regionId === "seoul" && selectedArtistIds.length > 0
        ? ARTIST_PLACES.filter((p) => selectedArtistIds.some((id) => p.artistIds.includes(id)))
        : [];

    let cancelled = false;
    Promise.all(
      THEMES.map((theme) => fetchThemePlaces(centerLat, centerLng, theme.contentTypeId))
    ).then((results) => {
      if (cancelled) return;
      const options = THEMES.map((theme, i) => {
        const themeAnchors = artistAnchors.filter((p) => p.category === theme.id);
        return toOption(theme, dedupeById([...themeAnchors, ...results[i]]));
      })
        // 후보가 아예 없는 테마는(장소 미수집 지역 등) 옵션에서 제외한다.
        .filter((option) => option.places.length > 0);
      setLoaded({ key, options });
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
