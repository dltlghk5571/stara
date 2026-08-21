"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REGIONS } from "@/data/regions";

/** 프로토타입의 8개 지역(r1~r8) 배치를 그대로 따른다. 인천은 프로토타입에 없던 지역이라
 * 서울 인근에 같은 .kr-region 스타일로 하나 더 붙였다(실제 데이터 수집 대상이라 빼지 않음). */
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

const INCHEON_STYLE: React.CSSProperties = {
  background: "#ffc9c9",
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
    <div id="tv-map" className="tl-view">
      <div className="flow-h1">Choose a region</div>
      <div className="flow-sub">지역을 선택하면 대표 아티스트와 콘텐츠를 볼 수 있어요.</div>
      <div className="kr-map">
        {REGIONS.map((region) => {
          const layoutClass = REGION_LAYOUT[region.id];
          return (
            <div
              key={region.id}
              className={`kr-region${layoutClass ? ` ${layoutClass}` : ""}`}
              style={layoutClass ? undefined : INCHEON_STYLE}
              onClick={() => handleTap(region.id, region.available)}
            >
              {region.nameEn}
              {!region.available && (
                <span style={{ display: "block", fontSize: "8px", opacity: 0.6 }}>soon</span>
              )}
            </div>
          );
        })}
      </div>

      {notice && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--navy)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "100px",
            fontFamily: "'Space Mono', monospace",
            fontSize: "11px",
            pointerEvents: "none",
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
