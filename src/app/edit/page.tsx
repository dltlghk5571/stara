"use client";

import { useState } from "react";
import Link from "next/link";
import { ARTISTS } from "@/data/artists";
import { ARTIST_PLACES } from "@/data/places";
import { USER_FACING_CATEGORIES, type PlaceCategory } from "@/types";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";
import { useTripStore } from "@/store/tripStore";
import { useTripPlan } from "@/store/useTripPlan";
import TopBar from "@/components/layout/TopBar";
import MapView from "@/components/map/MapView";
import FilterBar from "@/components/reels/FilterBar";
import ReelsPanel from "@/components/reels/ReelsPanel";
import ScheduleFooter from "@/components/route/ScheduleFooter";

export default function EditPage() {
  const [selectedCategories, setSelectedCategories] =
    useState<PlaceCategory[]>(USER_FACING_CATEGORIES);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);

  const addPlace = useTripStore((s) => s.addPlace);
  const removePlace = useTripStore((s) => s.removePlace);
  const tripStartTime = useTripStore((s) => s.tripStartTime);
  const setTripStartTime = useTripStore((s) => s.setTripStartTime);
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

  const candidatePlaces = ARTIST_PLACES.filter(
    (p) =>
      selectedCategories.includes(p.category) &&
      (selectedArtistIds.length === 0 ||
        p.artistIds.some((id) => selectedArtistIds.includes(id)))
  );

  return (
    <div className="flex h-screen flex-col">
      <TopBar title="코스 편집" backHref="/main-route" />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="h-48 w-full shrink-0">
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
          />
        </div>

        <FilterBar
          artists={ARTISTS}
          selectedArtistIds={selectedArtistIds}
          onToggleArtist={toggleArtist}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
        />
        <ReelsPanel
          places={candidatePlaces}
          baseOrder={orderedPlaces}
          selectedPlaceIds={selectedPlaceIds}
          onToggle={togglePlace}
        />
      </div>

      <ScheduleFooter
        schedule={schedule}
        removalSuggestion={removalSuggestion}
        startTime={tripStartTime}
        onStartTimeChange={setTripStartTime}
      />
      <Link
        href="/final"
        className="m-3 flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-600 text-sm font-bold text-white hover:bg-fuchsia-700"
      >
        최종 루트 확인하기
      </Link>
    </div>
  );
}
