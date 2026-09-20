"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { getRegionById } from "@/data/regions";
import { getArtistById } from "@/data/artists";
import {
  placeName,
  placeRelation,
  artistName,
  regionName,
  routeOptionLabel,
  routeOptionDescription,
  useLocale,
  useT,
  type Locale,
} from "@/i18n";
import { useRouteOptions } from "@/lib/tour-api/useRouteOptions";
import { useTripStore } from "@/store/tripStore";
import { KButton, Pill } from "@/components/ui/kroute";
import { CREAM, LIME, YELLOW } from "@/lib/kroute-tokens";
import type { Place } from "@/types";

function GenerateInner() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
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
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);

  if (!region) {
    return (
      <div style={{ minHeight: "100dvh", background: CREAM, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, gap: 14 }}>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 20, textAlign: "center" }}>
          {t("onboarding.generate.needRegionTitle")}
        </h2>
        <div style={{ width: "100%", maxWidth: 300 }}>
          <KButton onClick={() => router.push("/onboarding/region")}>
            {t("onboarding.generate.needRegionCta")}
          </KButton>
        </div>
      </div>
    );
  }

  const regionLabel = regionName(region, locale);

  function choose(optionIndex: number) {
    if (!region) return;
    const option = options[optionIndex];
    if (!option) return;
    const optionLabel = routeOptionLabel(option, locale);
    setMainRoute(option.places, region.id, artistIds, `${regionLabel} · ${optionLabel}`);
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
          {t("onboarding.generate.loadingBadge")}
        </Pill>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 24, textAlign: "center", marginBottom: 4 }}>
          {t("onboarding.generate.loadingTitle")}
        </h2>
        <p style={{ fontFamily: "Caveat", fontSize: 18, color: "#666", textAlign: "center", fontStyle: "italic" }}>
          {t("onboarding.generate.building", { region: regionLabel })}
        </p>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div style={{ minHeight: "100dvh", background: CREAM, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, gap: 14 }}>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 20, textAlign: "center" }}>
          {t("onboarding.generate.noneTitle", { region: regionLabel })}
        </h2>
        <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#666" }}>
          {t("onboarding.generate.noneBody")}
        </p>
        <div style={{ width: "100%", maxWidth: 300 }}>
          <KButton outline onClick={() => router.push(`/onboarding/region/${region.id}`)}>
            {t("common.retry")}
          </KButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100dvh", background: CREAM, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "48px 24px 12px" }}>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 20 }}>
          {t("onboarding.generate.pickTitle")}
        </h2>
        <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#666", marginTop: 4 }}>
          {t("onboarding.generate.ready", { region: regionLabel, count: options.length })}
        </p>
      </div>

      <div className="kr-scrollY" style={{ flex: 1, minHeight: 0, padding: "6px 24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
        {options.map((option, i) => (
          <div key={option.id}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <b style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 14 }}>
                {routeOptionLabel(option, locale)}
              </b>
              <span style={{ fontFamily: "Nunito", fontSize: 11, color: "#666", fontWeight: 700 }}>
                {t("onboarding.generate.routeStat", {
                  stops: option.stopCount,
                  hours: Math.round(option.totalMinutes / 60),
                })}
              </span>
            </div>
            <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#888", marginTop: -4, marginBottom: 8 }}>
              {routeOptionDescription(option, locale)}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {option.places.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="kr-pathNode kr-reset"
                  onClick={() => setDetailPlace(p)}
                  style={{ padding: "6px 0", width: "100%", textAlign: "left", cursor: "pointer" }}
                >
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
                  <b style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13 }}>{placeName(p, locale)}</b>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <KButton bg="#FF6600" color="#fff" onClick={() => choose(i)}>
                {t("onboarding.generate.confirmRoute")}
              </KButton>
            </div>
          </div>
        ))}
      </div>

      {detailPlace && (
        <RouteStopDetailSheet place={detailPlace} locale={locale} onClose={() => setDetailPlace(null)} />
      )}
    </div>
  );
}

/** 루트 후보 화면은 이미 꽉 차 있어서, 관계 텍스트를 화면에 상시 노출하는 대신 핀을 탭했을
 *  때만 가벼운 바텀시트로 보여준다 — PlaceDetailSheet(reels)와 달리 TourAPI/퀘스트 정보는
 *  불러오지 않는다, 여기선 "왜 이 장소가 내 아티스트와 관련 있는지"만 빠르게 확인하면 된다. */
function RouteStopDetailSheet({
  place,
  locale,
  onClose,
}: {
  place: Place;
  locale: Locale;
  onClose: () => void;
}) {
  const t = useT();
  const artists = place.artistIds.map((id) => getArtistById(id)).filter(Boolean);
  const artistLabel =
    artists
      .map((a) => (a ? artistName(a, locale) : null))
      .filter(Boolean)
      .join(", ") || t("reels.staraPick");

  return (
    <div className="place-sheet" onClick={onClose}>
      <div className="place-sheet-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: "var(--navy)" }}>
            {placeName(place, locale)}
          </h2>
          <button
            type="button"
            className="kr-reset"
            onClick={onClose}
            aria-label={t("reels.close")}
            style={{ width: 40, height: 40, borderRadius: "50%", color: "var(--gray)", flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ borderRadius: 14, background: "rgba(255,143,122,.1)", padding: 12, fontSize: 13, color: "var(--navy)" }}>
          <p style={{ fontWeight: 700 }}>{t("reels.relationWith", { artists: artistLabel })}</p>
          <p style={{ marginTop: 4, lineHeight: 1.5 }}>{placeRelation(place, locale)}</p>
        </div>
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
