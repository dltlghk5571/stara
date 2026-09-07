"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REGIONS } from "@/data/regions";
import { useLocale, useT } from "@/i18n";
import { BLACK, CREAM, CYAN, LIME, WHITE, YELLOW } from "@/lib/kroute-tokens";

const REGION_PILL_BG: Record<string, string> = {
  seoul: "#FF3399",
  incheon: "#FFC9C9",
  gyeonggi: YELLOW,
  gangwon: "#D6EEFF",
  gyeongsang: "#E8FFD6",
  jeolla: "#E6D8FF",
  chungcheong: "#FFD6EA",
  busan: CYAN,
  jeju: LIME,
};

/* 지도 박스를 남한 경위도 bbox로 보고 각 지역 중심좌표(regions.ts)를 그대로 투영한다.
 * 실루엣 path도 같은 투영으로 찍은 좌표라 라벨이 항상 육지 위에 앉는다.
 * viewBox 높이 118 = 본토(0~100) 아래에 제주 섬 공간. */
const VIEW_H = 118;
const LNG0 = 125.8, LNG_SPAN = 4.1;
const LAT1 = 38.6, LAT_SPAN = 4.4;
const projX = (lng: number) => ((lng - LNG0) / LNG_SPAN) * 100;
const projY = (lat: number) => ((LAT1 - lat) / LAT_SPAN) * 100;

/** 제주는 본토 bbox 밖이라 지도 아래 섬 위치로 고정, 수도권 3개는 겹쳐서 살짝 벌린다. */
const REGION_POS: Record<string, { x: number; y: number }> = {
  jeju: { x: 18, y: 108 },
  incheon: { x: 22, y: 31 },
  seoul: { x: 35, y: 21 },
  gyeonggi: { x: 50, y: 29 },
  busan: { x: 76, y: 78 },
};
const regionPos = (r: (typeof REGIONS)[number]) =>
  REGION_POS[r.id] ?? { x: projX(r.centerLng), y: projY(r.centerLat) };

/** 같은 투영으로 찍은 남한 해안선 러프 폴리곤(북서 강화 → 시계방향). */
const KOREA_PATH =
  "M13.4 17 L23.2 5.7 L51.2 5.7 L63.4 1.1 L79.3 19.3 L89 37.5 L91.5 58 L86.6 70.5 " +
  "L81.7 79.5 L68.3 85.2 L51.2 87.5 L42.7 88.6 L36.6 93.2 L17.1 97.7 L13.4 86.4 " +
  "L18.3 67 L15.9 51.1 L7.3 42 L18.3 36.4 L14.6 26.1 Z";

function RegionMapInner() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const artists = searchParams.get("artists") ?? "";
  const [notice, setNotice] = useState<string | null>(null);
  const noticeRegion = notice ? REGIONS.find((r) => r.id === notice) : undefined;

  function handleTap(regionId: string, available: boolean) {
    if (!available) {
      setNotice(regionId);
      window.setTimeout(() => setNotice(null), 1800);
      return;
    }
    const query = artists ? `?artists=${artists}` : "";
    router.push(`/onboarding/region/${regionId}${query}`);
  }

  return (
    <div style={{ height: "100dvh", background: CREAM, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "48px 24px 12px" }}>
        <span style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 12, letterSpacing: 1, color: "#666" }}>
          {t("onboarding.region.kicker")}
        </span>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 24, marginTop: 4 }}>
          {t("onboarding.region.title")}
        </h2>
        <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#666", marginTop: 4, lineHeight: 1.5 }}>
          {t("onboarding.region.subtitle")}
        </p>
      </div>

      <div style={{ flex: 1 }} className="kr-regionMap">
        {/* 남한 실루엣 — 라벨과 같은 투영으로 찍어서 라벨이 항상 육지 위에 앉는다 */}
        <svg className="kr-regionMapShape" viewBox={`0 0 100 ${VIEW_H}`} preserveAspectRatio="none" aria-hidden>
          <path d={KOREA_PATH} />
          <ellipse cx="15" cy="108" rx="10" ry="5.5" />
        </svg>
        {REGIONS.map((region) => {
          const bg = REGION_PILL_BG[region.id] || WHITE;
          const { x, y } = regionPos(region);
          return (
            <div
              key={region.id}
              className="kr-regionSlot"
              style={{
                left: `${x}%`,
                top: `${(y / VIEW_H) * 100}%`,
                background: bg,
                color: bg === "#FF3399" ? WHITE : BLACK,
                opacity: region.available ? 1 : 0.72,
              }}
              onClick={() => handleTap(region.id, region.available)}
            >
              {locale === "ko" ? region.nameKo : region.nameEn}
              {!region.available && (
                <span style={{ display: "block", fontSize: 7, opacity: 0.7, fontWeight: 700 }}>{t("common.soon")}</span>
              )}
            </div>
          );
        })}
      </div>

      {noticeRegion && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            background: BLACK,
            color: WHITE,
            padding: "8px 18px",
            borderRadius: 100,
            fontFamily: "Outfit",
            fontWeight: 700,
            fontSize: 12,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {t("onboarding.region.comingSoon", {
            region: locale === "ko" ? noticeRegion.nameKo : noticeRegion.nameEn,
          })}
        </div>
      )}
    </div>
  );
}

export default function OnboardingRegionPage() {
  return (
    <Suspense fallback={null}>
      <RegionMapInner />
    </Suspense>
  );
}
