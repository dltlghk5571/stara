import { useEffect, useState } from "react";
import type { Place } from "@/types";
import { TOUR_SEARCH_RADIUS_METERS } from "@/config";

export interface TourismCandidates {
  localTourism: Place[];
  restaurants: Place[];
  loading: boolean;
}

const EMPTY: TourismCandidates = { localTourism: [], restaurants: [], loading: false };

// 세션(탭) 동안 같은 anchor(위치)로는 다시 요청하지 않도록 모듈 스코프에 캐시한다.
// /edit과 /final이 같은 selectedPlaceIds에 대해 항상 같은 후보를 쓰게 되어
// 두 화면의 최종 방문 순서가 어긋나지 않는다.
const sessionCache = new Map<
  string,
  Promise<{ localTourism: Place[]; restaurants: Place[] }>
>();

function centroidOf(places: Place[]): { lat: number; lng: number } | null {
  if (places.length === 0) return null;
  const sum = places.reduce(
    (acc, p) => ({ lat: acc.lat + p.latitude, lng: acc.lng + p.longitude }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / places.length, lng: sum.lng / places.length };
}

async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  contentTypeId: string
): Promise<Place[]> {
  try {
    const res = await fetch(
      `/api/tourism/nearby?lat=${lat}&lng=${lng}&radius=${TOUR_SEARCH_RADIUS_METERS}&contentTypeId=${contentTypeId}`
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { places?: Place[] };
    return json.places ?? [];
  } catch {
    return [];
  }
}

function fetchCandidates(lat: number, lng: number) {
  return Promise.all([
    fetchNearbyPlaces(lat, lng, "12"), // 관광지
    fetchNearbyPlaces(lat, lng, "14"), // 문화시설
    fetchNearbyPlaces(lat, lng, "39"), // 음식점
  ]).then(([spots, culture, restaurants]) => ({
    localTourism: [...spots, ...culture],
    restaurants,
  }));
}

/**
 * anchorPlaces(현재 코스의 STARA 장소들) 주변 TourAPI 후보를 가져온다.
 * 키 없음/실패/무응답이면 빈 배열을 유지 — autoPlaceSelector가 자동으로 dummy 풀로 폴백한다.
 */
interface Loaded {
  key: string;
  localTourism: Place[];
  restaurants: Place[];
}

export function useTourismCandidates(anchorPlaces: Place[]): TourismCandidates {
  const centroid = centroidOf(anchorPlaces);
  const anchorKey = centroid
    ? `${centroid.lat.toFixed(3)},${centroid.lng.toFixed(3)}`
    : null;

  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!centroid || !anchorKey) return;

    let cancelled = false;
    let request = sessionCache.get(anchorKey);
    if (!request) {
      request = fetchCandidates(centroid.lat, centroid.lng);
      sessionCache.set(anchorKey, request);
    }

    request.then((candidates) => {
      if (!cancelled) setLoaded({ key: anchorKey, ...candidates });
    });

    return () => {
      cancelled = true;
    };
    // anchorKey만으로 재요청 여부를 판단한다(centroid 객체는 매 렌더 새로 생성됨).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorKey]);

  if (!anchorKey) return EMPTY;
  if (!loaded || loaded.key !== anchorKey) {
    return { localTourism: [], restaurants: [], loading: true };
  }
  return { localTourism: loaded.localTourism, restaurants: loaded.restaurants, loading: false };
}
