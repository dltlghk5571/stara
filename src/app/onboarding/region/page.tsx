"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REGIONS } from "@/data/regions";

/** 프로토타입의 8개 지역 블록 레이아웃(대략적인 지도 배치)을 그대로 재현. */
const REGION_LAYOUT: Record<string, string> = {
  seoul: "left-[24%] top-[4%] h-16 w-24 bg-[#ffd8cd]",
  gangwon: "left-[52%] top-0 h-20 w-28 bg-[#c9e9ff]",
  gyeonggi: "left-[20%] top-[26%] h-16 w-24 bg-[#ffe9a8]",
  gyeongsang: "left-[54%] top-[28%] h-24 w-24 bg-[#d3f3e4]",
  jeolla: "left-[10%] top-[48%] h-20 w-24 bg-[#e6d8ff]",
  chungcheong: "left-[48%] top-[54%] h-20 w-28 bg-[#ffd6ea]",
  incheon: "left-[2%] top-[22%] h-14 w-20 bg-[#ffc9c9]",
  busan: "left-[64%] top-[70%] h-12 w-16 rounded-full bg-[#c6e6ff]",
  jeju: "left-[18%] top-[80%] h-10 w-16 rounded-full bg-[#bdeeda]",
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
    <div className="font-jakarta text-stara-navy relative flex min-h-screen flex-col bg-stara-bg px-6 pb-8 pt-12">
      <h1 className="font-fraunces text-2xl font-bold">Choose a region</h1>
      <p className="mt-1 text-sm text-stone-500">
        지역을 선택하면 대표 아티스트와 콘텐츠를 볼 수 있어요.
      </p>

      <div className="relative mt-8 h-[420px] flex-1">
        {REGIONS.map((region) => {
          const layout = REGION_LAYOUT[region.id] ?? "";
          return (
            <button
              key={region.id}
              type="button"
              onClick={() => handleTap(region.id, region.available)}
              className={`absolute flex flex-col items-center justify-center rounded-[22px] border-2 border-white p-1.5 text-center text-[10.5px] font-bold shadow-[0_6px_14px_-8px_rgba(36,59,83,0.3)] transition active:scale-95 ${layout} ${
                region.available ? "" : "opacity-45"
              }`}
            >
              <span>{region.nameEn}</span>
              {!region.available && (
                <span className="font-space-mono mt-0.5 text-[7.5px] font-normal text-stone-500">
                  soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {notice && (
        <div className="font-space-mono pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-stara-navy px-4 py-2 text-[11px] text-white shadow-lg">
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
