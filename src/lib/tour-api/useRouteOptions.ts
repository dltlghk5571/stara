import { useEffect, useState } from "react";
import type { Place } from "@/types";
import { buildSchedule } from "@/lib/scheduleCalculator";
import { TOUR_SEARCH_RADIUS_METERS } from "@/config";

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
 * 지역 중심 좌표 주변에서 TourAPI 카테고리(관광지/문화시설/음식점)별로 3가지
 * 루트안을 만든다. 아티스트 선택과는 완전히 독립적 — 지역만 있으면 된다.
 */
export function useRouteOptions(
  regionId: string | null,
  centerLat: number | null,
  centerLng: number | null
): State {
  const [loaded, setLoaded] = useState<{ key: string; options: RouteOption[] } | null>(null);
  const key = regionId && centerLat != null && centerLng != null ? regionId : null;

  useEffect(() => {
    if (!key || centerLat == null || centerLng == null) return;

    let cancelled = false;
    Promise.all(
      THEMES.map((theme) => fetchThemePlaces(centerLat, centerLng, theme.contentTypeId))
    ).then((results) => {
      if (cancelled) return;
      const options = THEMES.map((theme, i) => toOption(theme, results[i]))
        // 후보가 아예 없는 테마는(장소 미수집 지역 등) 옵션에서 제외한다.
        .filter((option) => option.places.length > 0);
      setLoaded({ key, options });
    });

    return () => {
      cancelled = true;
    };
  }, [key, centerLat, centerLng]);

  if (!key) return { options: [], loading: false };
  if (!loaded || loaded.key !== key) return { options: [], loading: true };
  return { options: loaded.options, loading: false };
}
