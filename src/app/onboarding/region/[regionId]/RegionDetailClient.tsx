"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Region } from "@/data/regions";
import type { Place } from "@/types";
import { BackButton, KButton, KCard, Pill } from "@/components/ui/kroute";
import { placeName, regionDesc, useLocale, useT } from "@/i18n";
import { BLACK, BORDER, CREAM, LBLUE, LIME, PALGREEN, WHITE } from "@/lib/kroute-tokens";

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
  const t = useT();
  const { locale } = useLocale();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [highlights, setHighlights] = useState<Place[] | null>(null);

  // 대표 아티스트 데이터가 없는 지역(인천/부산)은 TourAPI 인기 스팟으로 대체.
  useEffect(() => {
    if (representativeArtist) return;
    let cancelled = false;
    fetch(`/api/tourism/nearby?lat=${region.centerLat}&lng=${region.centerLng}&radius=8000&contentTypeId=12&locale=${locale}`)
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
  }, [region.centerLat, region.centerLng, representativeArtist, locale]);

  function handleConfirm() {
    const artistsQuery = artistsParam ? `&artists=${artistsParam}` : "";
    router.push(`/onboarding/generate?region=${region.id}${artistsQuery}`);
  }

  return (
    <div style={{ height: "100dvh", background: CREAM, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 210, position: "relative", flexShrink: 0, overflow: "hidden", background: "linear-gradient(135deg,#FF3399,#FF6DBE)" }}>
        <div style={{ position: "absolute", top: 16, left: 16 }}>
          <BackButton onClick={() => router.push("/onboarding/region")} />
        </div>
        <div style={{ position: "absolute", bottom: 14, left: 16 }}>
          <span style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 11, letterSpacing: 1, color: "#FFE9F5", display: "block", marginBottom: 4 }}>
            {representativeArtist
              ? t("onboarding.regionDetail.repArtistLabel")
              : t("onboarding.regionDetail.curatingLabel")}
          </span>
          <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 26, color: WHITE, textShadow: "2px 2px 0 rgba(0,0,0,.2)" }}>
            {locale === "ko" ? region.nameKo : region.nameEn}
          </h2>
        </div>
      </div>

      <div className="kr-scrollY" style={{ flex: 1, minHeight: 0, padding: "16px 24px" }}>
        <KCard
          style={{ padding: 14, background: representativeArtist ? LBLUE : "#F0F0F0", marginBottom: 14, display: "flex", gap: 10, alignItems: "center" }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: WHITE,
              border: BORDER,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Outfit",
              fontWeight: 900,
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            {representativeArtist ? representativeArtist.initials : "🔍"}
          </div>
          <div>
            <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 13 }}>
              {representativeArtist
                ? representativeArtist.nameEn
                : t("onboarding.regionDetail.nowCurating")}
            </p>
            <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#555" }}>
              {representativeArtist
                ? `${representativeArtist.spotCount} filming locations`
                : highlights === null
                  ? t("onboarding.regionDetail.previewLoading")
                  : t("onboarding.regionDetail.previewCta")}
            </p>
          </div>
        </KCard>

        <p style={{ fontFamily: "Nunito", fontSize: 14, color: "#666", marginBottom: 14, lineHeight: 1.6 }}>
          {regionDesc(region, locale)}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {representativeArtist && <Pill bg={PALGREEN}>🎬 {representativeArtist.spotCount} spots</Pill>}
          {!representativeArtist &&
            highlights?.map((p) => (
              <Pill key={p.id} bg={WHITE}>
                📍 {placeName(p, locale)}
              </Pill>
            ))}
        </div>

        <KButton onClick={() => setSheetOpen(true)}>{t("onboarding.regionDetail.selectCta")}</KButton>
      </div>

      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <KCard
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 360, padding: 28, textAlign: "center" }}
          >
            <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>🗺️</span>
            <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 22, marginBottom: 8 }}>
              {t("onboarding.regionDetail.selectRegion", {
                region: locale === "ko" ? region.nameKo : region.nameEn,
              })}
            </h2>
            <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#666", marginBottom: 24 }}>
              {t("onboarding.regionDetail.generateHint")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <KButton bg={LIME} color={BLACK} onClick={handleConfirm}>
                Complete
              </KButton>
              <KButton outline onClick={() => setSheetOpen(false)}>
                Cancel
              </KButton>
            </div>
          </KCard>
        </div>
      )}
    </div>
  );
}
