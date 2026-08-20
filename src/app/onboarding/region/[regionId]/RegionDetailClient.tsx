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

  // TourAPI 인기 스팟은 대표 아티스트 데이터 유무와 무관하게 모든 지역에서 보여준다
  // (서울도 대표 아티스트 카드 + TourAPI 스팟을 함께 노출).
  useEffect(() => {
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
  }, [region.centerLat, region.centerLng]);

  function handleConfirm() {
    const artistsQuery = artistsParam ? `&artists=${artistsParam}` : "";
    router.push(`/onboarding/generate?region=${region.id}${artistsQuery}`);
  }

  return (
    <div className="font-jakarta text-stara-navy flex min-h-screen flex-col bg-stara-bg pb-8">
      <div className="relative flex h-64 flex-col justify-end bg-gradient-to-br from-stara-coral via-[#ff7a63] to-stara-navy px-6 py-5">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="absolute left-5 top-11 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white"
        >
          ←
        </button>
        <p className="font-space-mono text-[10px] uppercase tracking-[0.2em] text-orange-100">
          {representativeArtist ? "Representative Artist" : "Now Curating"}
        </p>
        <h1 className="font-fraunces mt-1 text-[28px] font-extrabold text-white">
          {region.nameEn}
        </h1>
      </div>

      <div className="flex-1 px-6 py-5">
        {representativeArtist && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_8px_18px_-12px_rgba(36,59,83,0.3)]">
            <span className="font-fraunces flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-stara-coral text-[15px] font-bold text-white">
              {representativeArtist.initials}
            </span>
            <div>
              <b className="block text-sm">{representativeArtist.nameEn}</b>
              <span className="font-space-mono text-[9.5px] text-stone-500">
                {representativeArtist.spotCount} filming locations in this region
              </span>
            </div>
          </div>
        )}

        <div className="mb-4 rounded-2xl border border-dashed border-stone-300 bg-white/60 p-4 text-sm">
          <p className="font-semibold">
            {representativeArtist
              ? "TourAPI 인기 스팟도 함께 확인해보세요."
              : "이 지역 촬영지 데이터를 계속 모으고 있어요."}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {representativeArtist
              ? "관광공사 데이터 기준 이 지역 인기 스팟이에요."
              : "지금은 TourAPI 인기 스팟으로 미리보기를 보여드릴게요."}
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {highlights === null && (
              <span className="text-xs text-stone-400">불러오는 중…</span>
            )}
            {highlights?.length === 0 && (
              <span className="text-xs text-stone-400">표시할 스팟이 아직 없어요.</span>
            )}
            {highlights?.map((p) => (
              <span
                key={p.id}
                className="shrink-0 rounded-full bg-stara-mint/40 px-3 py-1.5 text-[11px] font-semibold"
              >
                {p.nameKo}
              </span>
            ))}
          </div>
        </div>

        <p className="mb-5 text-[12.5px] leading-relaxed text-stone-500">
          {region.descriptionKo}
        </p>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-stara-coral text-sm font-bold text-white shadow-lg shadow-orange-200 dark:shadow-none"
        >
          Select this region
        </button>
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-stone-200" />
            <p className="font-fraunces text-lg font-bold">
              Select {region.nameEn}?
            </p>
            <p className="mt-1 text-xs text-stone-500">
              선택한 지역을 기준으로 루트를 만들어드려요.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-stone-200 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-stara-coral text-sm font-bold text-white"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
