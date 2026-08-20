"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRegionById } from "@/data/regions";
import { useRouteOptions } from "@/lib/tour-api/useRouteOptions";
import { useTripStore } from "@/store/tripStore";

function GenerateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const regionId = searchParams.get("region");
  const artistsParam = searchParams.get("artists") ?? "";
  const artistIds = artistsParam ? artistsParam.split(",") : [];

  const region = regionId ? getRegionById(regionId) : undefined;
  const { options, loading } = useRouteOptions(
    region?.id ?? null,
    region?.centerLat ?? null,
    region?.centerLng ?? null
  );
  const setMainRoute = useTripStore((s) => s.setMainRoute);

  if (!region) {
    return (
      <div className="font-jakarta flex min-h-screen flex-col items-center justify-center gap-3 bg-stara-bg px-6 text-center">
        <p className="text-sm text-stone-500">지역을 먼저 선택해주세요.</p>
        <button
          type="button"
          onClick={() => router.push("/onboarding/region")}
          className="font-bold text-stara-coral underline"
        >
          지역 선택으로 이동
        </button>
      </div>
    );
  }

  function choose(optionIndex: number) {
    if (!region) return;
    const option = options[optionIndex];
    if (!option) return;
    setMainRoute(option.places, region.id, artistIds, `${region.nameKo} · ${option.labelKo}`);
    router.push("/trip");
  }

  return (
    <div className="font-jakarta text-stara-navy flex min-h-screen flex-col bg-stara-bg px-6 pb-8 pt-12">
      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-stone-200 border-t-stara-coral" />
          <p className="font-fraunces text-[17px] font-bold">Creating your route…</p>
          <p className="font-space-mono text-[10px] tracking-wide text-stone-500">
            MATCHING SCENES · MAPPING STOPS
          </p>
        </div>
      )}

      {!loading && options.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-stone-500">
            지금은 {region.nameEn} 루트 후보를 찾지 못했어요. 잠시 후 다시 시도해주세요.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/onboarding/region/${region.id}`)}
            className="font-bold text-stara-coral underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {!loading && options.length > 0 && (
        <>
          <h1 className="font-fraunces text-2xl font-bold">Pick a route</h1>
          <p className="mt-1 text-sm text-stone-500">
            {region.nameEn} 루트 {options.length}가지를 준비했어요. 하나를 골라주세요.
          </p>

          <div className="mt-6 flex flex-1 flex-col gap-4 overflow-y-auto pb-2">
            {options.map((option, i) => (
              <button
                key={option.id}
                type="button"
                onClick={() => choose(i)}
                className="rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-[0_8px_18px_-12px_rgba(36,59,83,0.3)] transition active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <b className="font-fraunces text-[15px]">{option.labelEn}</b>
                  <span className="font-space-mono text-[10px] text-stone-500">
                    {option.stopCount} stops · {Math.round(option.totalMinutes / 60)}h
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {option.places.map((p) => (
                    <span
                      key={p.id}
                      className="rounded-full bg-stara-mint/40 px-2.5 py-1 text-[10.5px] font-semibold"
                    >
                      {p.nameKo}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OnboardingGeneratePage() {
  return (
    <Suspense fallback={null}>
      <GenerateInner />
    </Suspense>
  );
}
