"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ARTISTS } from "@/data/artists";
import { ARTIST_PLACES, getPlaceById } from "@/data/places";
import { USER_FACING_CATEGORIES, type PlaceCategory } from "@/types";
import type { Place } from "@/types";
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
  const router = useRouter();
  const storeSelectedRegionId = useTripStore((s) => s.selectedRegionId);
  const storeSelectedArtistIds = useTripStore((s) => s.selectedArtistIds);
  const [selectedCategories, setSelectedCategories] =
    useState<PlaceCategory[]>(USER_FACING_CATEGORIES);
  // 온보딩에서 고른 아티스트로 기본 필터를 맞춘다(이전엔 항상 빈 배열로 시작해 트립과 무관했음).
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>(storeSelectedArtistIds);
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

  // ARTIST_PLACES는 현재 서울 실데이터만 존재 — 다른 지역 트립에서는 서울 장소가
  // 섞여 나오지 않도록 지역이 서울이 아니면 추천 풀을 비운다(검색/지도탭 추가는 영향 없음).
  const candidatePlaces =
    storeSelectedRegionId !== null && storeSelectedRegionId !== "seoul"
      ? []
      : ARTIST_PLACES.filter(
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
    <div id="tv-manual" className="tl-view" style={{ minHeight: "100vh" }}>
      <TopBar title="코스 편집" backHref="/trip" rightSlot={<AuthNav />} />

      <div className="ph-header" style={{ paddingBottom: 0 }}>
        <div>
          <div className="flow-h1" style={{ fontSize: "18px" }}>
            Build Your Own Route
          </div>
          <div className="flow-sub">지도를 탭하거나 검색해서 스탑을 추가하세요</div>
        </div>
      </div>

      <div className="search-row">
        <span>🔍</span>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search a location…"
        />
      </div>

      {searchResults !== null && (
        <div style={{ margin: "0 20px 12px", background: "#fff", border: "1px solid #f2ede0", borderRadius: "14px", padding: "6px", maxHeight: "160px", overflowY: "auto" }}>
          {searching && <p style={{ padding: "8px", fontSize: "12px", color: "var(--gray)" }}>검색 중…</p>}
          {!searching && searchResults.length === 0 && (
            <p style={{ padding: "8px", fontSize: "12px", color: "var(--gray)" }}>검색 결과가 없어요.</p>
          )}
          {searchResults.map((place) => (
            <div
              key={place.id}
              onClick={() => {
                setPendingPlace(place);
                setSearchResults(null);
                setSearchQuery("");
              }}
              style={{ padding: "8px 10px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}
            >
              {place.nameKo}
              {place.address && (
                <span style={{ display: "block", fontSize: "10.5px", fontWeight: 400, color: "var(--gray)" }}>
                  {place.address}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="kr-editSplit">
        <div className="manual-map">
          <MapView
            pins={orderedPlaces.map((p, i) => ({
              id: p.id,
              lat: p.latitude,
              lng: p.longitude,
              order: i + 1,
              color: "#243b53",
              title: p.nameKo,
            }))}
            showPath
            onMapClick={handleMapClick}
          />
          {mapNotice && (
            <div
              style={{
                position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)",
                background: "var(--navy)", color: "#fff", padding: "6px 12px", borderRadius: "100px",
                fontFamily: "'Space Mono', monospace", fontSize: "10px", pointerEvents: "none", zIndex: 5,
              }}
            >
              {mapNotice}
            </div>
          )}
        </div>

        <div className="kr-editReelsCol">
          <div className="locations-title">Selected Stops ({userAddedStops.length})</div>
          <div className="locations-scroll">
            {userAddedStops.map((place) => (
              <div key={place.id} className="loc-card">
                <div className="remove" onClick={() => removeStop(place.id)}>
                  ✕
                </div>
                <div className="thumb">📍</div>
                <div className="name">{place.nameKo}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "16px 20px 0" }}>
            <div className="locations-title" style={{ padding: 0 }}>추천 장소 둘러보기</div>
          </div>
          <FilterBar
            artists={ARTISTS}
            selectedArtistIds={selectedArtistIds}
            onToggleArtist={toggleArtist}
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
          />
          <div style={{ minHeight: "420px", flex: 1, display: "flex" }}>
            <ReelsPanel
              places={candidatePlaces}
              baseOrder={orderedPlaces}
              selectedPlaceIds={selectedPlaceIds}
              onToggle={togglePlace}
            />
          </div>
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
      <div className="manual-footer" style={{ marginTop: 0 }}>
        <button className="btn btn-coral" onClick={() => router.push("/trip?tab=route")}>
          루트로 돌아가기
        </button>
      </div>

      <div className={`confirm-add-overlay${pendingPlace ? " open" : ""}`} onClick={() => setPendingPlace(null)}>
        <div className="confirm-add-card" onClick={(e) => e.stopPropagation()}>
          <div className="q">{pendingPlace?.nameKo}을(를) 추가할까요?</div>
          <div className="sub">이 장소를 루트에 스탑으로 추가해요.</div>
          <div className="confirm-add-actions">
            <button className="btn btn-outline" onClick={() => setPendingPlace(null)}>
              Cancel
            </button>
            <button className="btn btn-coral" onClick={confirmAdd}>
              Yes, add it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
