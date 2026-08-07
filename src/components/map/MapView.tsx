"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "./types";
import { MapErrorBoundary } from "./MapErrorBoundary";

// Leaflet은 window에 의존하므로 반드시 클라이언트에서만 로드한다.
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400 dark:bg-slate-800">
      지도를 불러오는 중...
    </div>
  ),
});

/** 앱 전역에서 사용하는 지도 진입점. 지도 SDK를 교체하려면 이 파일 내부만 바꾸면 된다. */
export default function MapView(props: MapViewProps) {
  return (
    <MapErrorBoundary>
      <LeafletMap {...props} />
    </MapErrorBoundary>
  );
}
