"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { ARTISTS } from "@/data/artists";
import { ARTIST_PLACES, getPlaceById } from "@/data/places";
import { USER_FACING_CATEGORIES, type PlaceCategory } from "@/types";
import type { Place } from "@/types";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";
import { haversineKm } from "@/lib/distance";
import { useTripStore } from "@/store/tripStore";
import { useTripPlan } from "@/store/useTripPlan";
import TopBar from "@/components/layout/TopBar";
import AuthNav from "@/components/layout/AuthNav";
import MapView from "@/components/map/MapView";
import FilterBar from "@/components/reels/FilterBar";
import ReelsPanel from "@/components/reels/ReelsPanel";
import ScheduleFooter from "@/components/route/ScheduleFooter";

/** 탭한 좌표 주변에서 가장 가까운 실제 TourAPI 장소를 찾는다. 좁은 반경에서 없으면 한 번 넓혀본다. */
async function findNearestPlace(lat: number, lng: number): Promise<Place | null> {
  for (const radius of [300, 1200]) {
    try {
      const res = await fetch(`/api/tourism/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!res.ok) continue;
      const json = (await res.json()) as { places?: Place[] };
      const places = json.places ?? [];
      if (places.length === 0) continue;
      const tapped = { latitude: lat, longitude: lng };
      return [...places].sort((a, b) => haversineKm(tapped, a) - haversineKm(tapped, b))[0];
    } catch {
      continue;
    }
  }
  return null;
}

export default function EditPage() {
  const [selectedCategories, setSelectedCategories] =
    useState<PlaceCategory[]>(USER_FACING_CATEGORIES);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<Place | null>(null);
  const [mapNotice, setMapNotice] = useState<string | null>(null);

  const addPlace = useTripStore((s) => s.addPlace);
  const removePlace = useTripStore((s) => s.removePlace);
  const addCustomPlace = useTripStore((s) => s.addCustomPlace);
  const removeCustomPlace = useTripStore((s) => s.removeCustomPlace);
  const customPlaces = useTripStore((s) => s.customPlaces);
  const tripStartTime = useTripStore((s) => s.tripStartTime);
  const setTripStartTime = useTripStore((s) => s.setTripStartTime);
  const tripEndTime = useTripStore((s) => s.tripEndTime);
  const setTripEndTime = useTripStore((s) => s.setTripEndTime);
  const { orderedPlaces, selectedPlaceIds, schedule, removalSuggestion } = useTripPlan();

  function toggleCategory(c: PlaceCategory) {
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }
  function toggleArtist(id: string) {
    setSelectedArtistIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  function togglePlace(placeId: string) {
    if (selectedPlaceIds.includes(placeId)) removePlace(placeId);
    else addPlace(placeId);
  }

  async function handleMapClick(lat: number, lng: number) {
    setMapNotice("근처 장소를 찾는 중…");
    const candidate = await findNearestPlace(lat, lng);
    if (!candidate) {
      setMapNotice("근처에서 실제 장소를 찾지 못했어요.");
      window.setTimeout(() => setMapNotice(null), 2000);
      return;
    }
    setMapNotice(null);
    setPendingPlace(candidate);
  }

  async function handleSearch() {
    const keyword = searchQuery.trim();
    if (!keyword) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/tourism/search?keyword=${encodeURIComponent(keyword)}`);
      const json = (await res.json()) as { places?: Place[] };
      setSearchResults(json.places ?? []);
    } finally {
      setSearching(false);
    }
  }

  function confirmAdd() {
    if (pendingPlace) addCustomPlace(pendingPlace);
    setPendingPlace(null);
  }

  function removeStop(placeId: string) {
    if (selectedPlaceIds.includes(placeId)) removePlace(placeId);
    else removeCustomPlace(placeId);
  }

  const candidatePlaces = ARTIST_PLACES.filter(
    (p) =>
      selectedCategories.includes(p.category) &&
      (selectedArtistIds.length === 0 ||
        p.artistIds.some((id) => selectedArtistIds.includes(id)))
  );

  const userAddedStops = [
    ...selectedPlaceIds.map(getPlaceById).filter((p): p is Place => !!p),
    ...customPlaces,
  ];

  return (
    <div className="font-jakarta flex h-screen flex-col bg-stara-bg">
      <TopBar title="코스 편집" backHref="/trip" rightSlot={<AuthNav />} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="shrink-0 px-4 pt-3">
          <p className="font-fraunces text-base font-bold text-stara-navy">Build Your Own Route</p>
          <p className="text-xs text-stone-500">지도를 탭하거나 검색해서 스탑을 추가하세요.</p>
        </div>

        <div className="relative mx-4 mt-3 flex shrink-0 items-center gap-2 rounded-2xl border-2 border-stone-200 bg-white px-3 py-2.5">
          <Search size={16} className="shrink-0 text-stone-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="장소 검색…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
              aria-label="검색어 지우기"
              className="text-stone-400"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {searchResults !== null && (
          <div className="mx-4 mt-2 flex max-h-40 shrink-0 flex-col gap-1.5 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-2">
            {searching && <p className="p-2 text-xs text-stone-400">검색 중…</p>}
            {!searching && searchResults.length === 0 && (
              <p className="p-2 text-xs text-stone-400">검색 결과가 없어요.</p>
            )}
            {searchResults.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => {
                  setPendingPlace(place);
                  setSearchResults(null);
                  setSearchQuery("");
                }}
                className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-stara-navy hover:bg-stara-mint/20"
              >
                {place.nameKo}
                {place.address && (
                  <span className="block text-xs font-normal text-stone-400">{place.address}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="relative mx-4 mt-3 h-48 shrink-0 overflow-hidden rounded-2xl border border-stone-200">
          <MapView
            pins={orderedPlaces.map((p, i) => ({
              id: p.id,
              lat: p.latitude,
              lng: p.longitude,
              order: i + 1,
              color: CATEGORY_STYLE[p.category].color,
              title: p.nameKo,
            }))}
            showPath
            onMapClick={handleMapClick}
          />
          {mapNotice && (
            <div className="font-space-mono pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-stara-navy px-3 py-1.5 text-[10px] text-white shadow-lg">
              {mapNotice}
            </div>
          )}
        </div>

        {userAddedStops.length > 0 && (
          <div className="mt-3 shrink-0">
            <p className="px-4 text-xs font-bold text-stone-500">
              선택된 스탑 ({userAddedStops.length})
            </p>
            <div className="mt-2 flex gap-2.5 overflow-x-auto px-4 pb-1">
              {userAddedStops.map((place) => (
                <div
                  key={place.id}
                  className="relative w-28 shrink-0 rounded-2xl border border-stone-200 bg-white p-2.5"
                >
                  <button
                    type="button"
                    onClick={() => removeStop(place.id)}
                    aria-label="스탑 제거"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-stara-bg bg-stara-navy text-white"
                  >
                    <X size={11} />
                  </button>
                  <div
                    className="flex h-12 w-full items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${CATEGORY_STYLE[place.category].color}30` }}
                  >
                    📍
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] font-bold leading-tight text-stara-navy">
                    {place.nameKo}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="shrink-0 px-4 pb-1 pt-3 text-xs font-bold text-stone-500">추천 장소 둘러보기</p>
        <FilterBar
          artists={ARTISTS}
          selectedArtistIds={selectedArtistIds}
          onToggleArtist={toggleArtist}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
        />
        <div className="min-h-0 flex-1">
          <ReelsPanel
            places={candidatePlaces}
            baseOrder={orderedPlaces}
            selectedPlaceIds={selectedPlaceIds}
            onToggle={togglePlace}
          />
        </div>
      </div>

      <ScheduleFooter
        schedule={schedule}
        removalSuggestion={removalSuggestion}
        onRemoveSuggestion={
          removalSuggestion ? () => removeStop(removalSuggestion.place.id) : undefined
        }
        startTime={tripStartTime}
        onStartTimeChange={setTripStartTime}
        endTime={tripEndTime}
        onEndTimeChange={setTripEndTime}
      />
      <Link
        href="/trip?tab=route"
        className="font-jakarta m-3 flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-stara-coral text-sm font-bold text-white shadow-lg shadow-orange-200 dark:shadow-none"
      >
        루트로 돌아가기
      </Link>

      {pendingPlace && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6"
          onClick={() => setPendingPlace(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-stara-navy">
              {pendingPlace.nameKo}을(를) 추가할까요?
            </p>
            <p className="mt-1 text-xs text-stone-500">이 장소를 루트에 스탑으로 추가해요.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingPlace(null)}
                className="flex min-h-10 flex-1 items-center justify-center rounded-xl border border-stone-200 text-sm font-bold"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmAdd}
                className="flex min-h-10 flex-1 items-center justify-center rounded-xl bg-stara-coral text-sm font-bold text-white"
              >
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
