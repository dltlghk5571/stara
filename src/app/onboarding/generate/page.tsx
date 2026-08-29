"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRegionById } from "@/data/regions";
import { useRouteOptions } from "@/lib/tour-api/useRouteOptions";
import { useTripStore } from "@/store/tripStore";
import { KButton, Pill } from "@/components/ui/kroute";
import { CREAM, LIME, YELLOW } from "@/lib/kroute-tokens";

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
    region?.centerLng ?? null,
    artistIds
  );
  const setMainRoute = useTripStore((s) => s.setMainRoute);

  if (!region) {
    return (
      <div style={{ minHeight: "100dvh", background: CREAM, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, gap: 14 }}>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 20, textAlign: "center" }}>
          지역을 먼저 선택해주세요
        </h2>
        <div style={{ width: "100%", maxWidth: 300 }}>
          <KButton onClick={() => router.push("/onboarding/region")}>지역 선택으로 이동</KButton>
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
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          background: "linear-gradient(135deg,#FFF0E6 0%,#E8FFD6 50%,#D6EEFF 100%)",
        }}
      >
        <div style={{ position: "relative", marginBottom: 28 }}>
          <div
            className="kr-aSpin"
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              border: "3px dashed #111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#fff",
                border: "2.5px solid #111111",
                boxShadow: "4px 4px 0 #111111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
              }}
            >
              ✈️
            </div>
          </div>
        </div>
        <Pill bg={YELLOW} style={{ fontSize: 13, padding: "6px 18px", marginBottom: 20 }}>
          NATURAL COURSE · OPTIMAL PATH
        </Pill>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 24, textAlign: "center", marginBottom: 4 }}>
          Generating Route
        </h2>
        <p style={{ fontFamily: "Caveat", fontSize: 18, color: "#666", textAlign: "center", fontStyle: "italic" }}>
          {region.nameEn} 루트를 만드는 중…
        </p>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div style={{ minHeight: "100dvh", background: CREAM, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, gap: 14 }}>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 20, textAlign: "center" }}>
          지금은 {region.nameEn} 루트 후보를 찾지 못했어요
        </h2>
        <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#666" }}>잠시 후 다시 시도해주세요.</p>
        <div style={{ width: "100%", maxWidth: 300 }}>
          <KButton outline onClick={() => router.push(`/onboarding/region/${region.id}`)}>
            다시 시도
          </KButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: CREAM, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "48px 24px 12px" }}>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 20 }}>Pick a route</h2>
        <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#666", marginTop: 4 }}>
          {region.nameEn} 루트 {options.length}가지를 준비했어요. 하나를 골라주세요.
        </p>
      </div>

      <div className="kr-scrollY" style={{ flex: 1, padding: "6px 24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
        {options.map((option, i) => (
          <div key={option.id}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <b style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 14 }}>{option.labelEn}</b>
              <span style={{ fontFamily: "Nunito", fontSize: 11, color: "#888", fontWeight: 700 }}>
                {option.stopCount} stops · {Math.round(option.totalMinutes / 60)}h
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {option.places.map((p) => (
                <div key={p.id} className="kr-pathNode" style={{ padding: "6px 0" }}>
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: LIME,
                      border: "2.5px solid #111111",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    📍
                  </span>
                  <b style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13 }}>{p.nameKo}</b>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <KButton bg="#FF6600" color="#fff" onClick={() => choose(i)}>
                Confirm this route
              </KButton>
            </div>
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
