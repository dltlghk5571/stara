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
      <div id="tv-confirm" className="tl-view">
        <div className="flow-h1">지역을 먼저 선택해주세요</div>
        <div style={{ marginTop: "14px", width: "100%" }}>
          <button className="btn btn-coral" onClick={() => router.push("/onboarding/region")}>
            지역 선택으로 이동
          </button>
        </div>
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

  if (loading) {
    return (
      <div id="tv-generating" className="tl-view">
        <div className="spinner"></div>
        <div className="flow-h1" style={{ fontSize: "17px" }}>
          Creating your route…
        </div>
        <div className="generating-sub">MATCHING SCENES · MAPPING STOPS</div>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div id="tv-confirm" className="tl-view">
        <div className="flow-h1">
          지금은 {region.nameEn} 루트 후보를 찾지 못했어요
        </div>
        <div className="flow-sub">잠시 후 다시 시도해주세요.</div>
        <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "14px" }}>
          <button className="btn btn-outline" onClick={() => router.push(`/onboarding/region/${region.id}`)}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="tv-preview" className="tl-view">
      <div className="preview-head">
        <div className="flow-h1" style={{ fontSize: "20px" }}>
          Pick a route
        </div>
        <div className="flow-sub">
          {region.nameEn} 루트 {options.length}가지를 준비했어요. 하나를 골라주세요.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 22px 20px", display: "flex", flexDirection: "column", gap: "18px" }}>
        {options.map((option, i) => (
          <div key={option.id}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <b className="flow-h1" style={{ fontSize: "15px" }}>
                {option.labelEn}
              </b>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "var(--gray)" }}>
                {option.stopCount} stops · {Math.round(option.totalMinutes / 60)}h
              </span>
            </div>
            <div className="preview-path" style={{ overflowY: "visible", padding: "0" }}>
              {option.places.map((p) => (
                <div key={p.id} className="path-node">
                  <div className="path-dot">📍</div>
                  <div className="path-label">
                    <b>{p.nameKo}</b>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-coral" style={{ marginTop: "10px" }} onClick={() => choose(i)}>
              Confirm this route
            </button>
          </div>
        ))}
      </div>
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
