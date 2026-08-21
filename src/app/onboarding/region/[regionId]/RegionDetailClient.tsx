"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Region } from "@/data/regions";
import type { Place } from "@/types";

interface RepresentativeArtist {
  nameEn: string;
  initials: string;
  spotCount: number;
}

interface Props {
  region: Region;
  representativeArtist: RepresentativeArtist | null;
  artistsParam: string;
}

export default function RegionDetailClient({ region, representativeArtist, artistsParam }: Props) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [highlights, setHighlights] = useState<Place[] | null>(null);

  // 대표 아티스트 데이터가 없는 지역(인천/부산)은 TourAPI 인기 스팟으로 대체.
  useEffect(() => {
    if (representativeArtist) return;
    let cancelled = false;
    fetch(`/api/tourism/nearby?lat=${region.centerLat}&lng=${region.centerLng}&radius=8000&contentTypeId=12`)
      .then((res) => (res.ok ? res.json() : { places: [] }))
      .then((json: { places?: Place[] }) => {
        if (!cancelled) setHighlights((json.places ?? []).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setHighlights([]);
      });
    return () => {
      cancelled = true;
    };
  }, [region.centerLat, region.centerLng, representativeArtist]);

  function handleConfirm() {
    const artistsQuery = artistsParam ? `&artists=${artistsParam}` : "";
    router.push(`/onboarding/generate?region=${region.id}${artistsQuery}`);
  }

  return (
    <div id="tv-province" className="tl-view">
      <div className="province-hero">
        <div className="province-back" onClick={() => router.push("/onboarding/region")}>
          ←
        </div>
        <div className="province-kicker">
          {representativeArtist ? "Representative Artist" : "Now Curating"}
        </div>
        <div className="province-title">{region.nameEn}</div>
      </div>

      <div className="province-body">
        {representativeArtist ? (
          <div className="rep-artist-card">
            <div className="artist-avatar" style={{ background: "var(--coral)" }}>
              {representativeArtist.initials}
            </div>
            <div className="rep-artist-meta">
              <b>{representativeArtist.nameEn}</b>
              <span>{representativeArtist.spotCount} filming locations in this region</span>
            </div>
          </div>
        ) : (
          <div className="rep-artist-card">
            <div className="artist-avatar" style={{ background: "var(--gray)" }}>
              🔍
            </div>
            <div className="rep-artist-meta">
              <b>Now Curating</b>
              <span>{highlights === null ? "불러오는 중…" : "TourAPI 인기 스팟으로 미리보기"}</span>
            </div>
          </div>
        )}

        <div className="province-desc">{region.descriptionKo}</div>

        <div className="province-tags">
          {representativeArtist && (
            <div className="province-tag">🎬 {representativeArtist.spotCount} spots</div>
          )}
          {!representativeArtist &&
            highlights?.map((p) => (
              <div key={p.id} className="province-tag">
                📍 {p.nameKo}
              </div>
            ))}
        </div>

        <button className="btn btn-coral" onClick={() => setSheetOpen(true)}>
          Select this region
        </button>
      </div>

      <div className={`sheet-overlay${sheetOpen ? " open" : ""}`} onClick={() => setSheetOpen(false)}>
        <div className="sheet sheet-center" onClick={(e) => e.stopPropagation()}>
          <div className="handle"></div>
          <div className="sheet-q">
            Select <span>{region.nameEn}</span>?
          </div>
          <div className="sheet-sub">선택한 지역을 기준으로 루트를 만들어드려요.</div>
          <div className="sheet-actions">
            <button className="btn btn-outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-coral" onClick={handleConfirm}>
              Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
