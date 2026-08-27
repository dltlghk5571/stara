"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REGIONS } from "@/data/regions";
import { BLACK, CREAM, CYAN, LIME, WHITE, YELLOW } from "@/lib/kroute-tokens";

/** 프로토타입의 8개 지역(r1~r8) 배치를 그대로 따른다. 인천은 프로토타입에 없던 지역이라
 * 서울 인근에 같은 .kr-regionSlot 스타일로 하나 더 붙였다(실제 데이터 수집 대상이라 빼지 않음). */
const REGION_LAYOUT: Record<string, string> = {
  seoul: "r1",
  gangwon: "r2",
  gyeonggi: "r3",
  gyeongsang: "r4",
  jeolla: "r5",
  chungcheong: "r6",
  busan: "r7",
  jeju: "r8",
};

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

const INCHEON_STYLE: React.CSSProperties = {
  width: 66,
  height: 46,
  left: "4%",
  top: "12%",
};

function RegionMapInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const artists = searchParams.get("artists") ?? "";
  const [notice, setNotice] = useState<string | null>(null);

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
    <div style={{ minHeight: "100dvh", background: CREAM, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "48px 24px 12px" }}>
        <span style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 12, letterSpacing: 1, color: "#888" }}>
          CHOOSE REGION
        </span>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 24, marginTop: 4 }}>
          Where are we headed? 🗺️
        </h2>
        <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#666", marginTop: 4, lineHeight: 1.5 }}>
          지역을 선택하면 대표 아티스트와 콘텐츠를 볼 수 있어요.
        </p>
      </div>

      <div style={{ flex: 1, margin: "0 20px 20px" }} className="kr-regionMap">
        {REGIONS.map((region) => {
          const layoutClass = REGION_LAYOUT[region.id];
          const bg = REGION_PILL_BG[region.id] || WHITE;
          return (
            <div
              key={region.id}
              className={`kr-regionSlot${layoutClass ? ` ${layoutClass}` : ""}`}
              style={{
                background: bg,
                color: bg === "#FF3399" ? WHITE : BLACK,
                opacity: region.available ? 1 : 0.75,
                ...(layoutClass ? {} : INCHEON_STYLE),
              }}
              onClick={() => handleTap(region.id, region.available)}
            >
              {region.nameEn}
              {!region.available && (
                <span style={{ display: "block", fontSize: 8, opacity: 0.7, fontWeight: 700 }}>SOON</span>
              )}
            </div>
          );
        })}
      </div>

      {notice && (
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
          {REGIONS.find((r) => r.id === notice)?.nameEn} · coming soon
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
