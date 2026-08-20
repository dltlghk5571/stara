"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import type { MapPin, MapViewProps } from "./types";

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

// TMap SDK는 내부적으로 document.write()를 쓰는 구식 스크립트라 동적 <script> 주입으로는
// 초기화가 깨진다(파서가 아닌 스크립트에서의 document.write는 브라우저가 무시함).
// 그래서 스크립트 자체는 layout.tsx에서 next/script(beforeInteractive)로 이미 로드해두고,
// 여기선 window.Tmapv2가 뜰 때까지 폴링만 한다.
function waitForTmap(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Tmapv2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.Tmapv2) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > 10000) {
        clearInterval(interval);
        reject(new Error("TMap SDK 로드 실패"));
      }
    }, 100);
  });
}

/** status가 있으면(Route 탭) 상태별 스타일을 우선하고, 없으면 기존처럼 color를 그대로 쓴다. */
function pinIconUrl(pin: MapPin): string {
  const label = pin.order ?? "";
  if (pin.status === "locked") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <path d="M15 1 C7 1 1 7 1 15 C1 24 15 29 15 29 C15 29 29 24 29 15 C29 7 23 1 15 1 Z" fill="none" stroke="#b9b19a" stroke-width="2" stroke-dasharray="3 3"/>
      <text x="15" y="19" font-size="12" font-weight="700" font-family="sans-serif" fill="#b9b19a" text-anchor="middle">${label}</text>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  const fill = pin.status === "next" ? "#ff8f7a" : pin.status === "done" ? "#8ee7c8" : pin.color;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <path d="M15 1 C7 1 1 7 1 15 C1 24 15 29 15 29 C15 29 29 24 29 15 C29 7 23 1 15 1 Z" fill="${fill}" stroke="white" stroke-width="2"/>
    <text x="15" y="19" font-size="12" font-weight="700" font-family="sans-serif" fill="white" text-anchor="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const MY_LOCATION_ICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="8" fill="#2563eb" stroke="white" stroke-width="2"/>
  </svg>`
)}`;

export default function TmapMapView({ pins, showPath, routeGeometry, onPinClick, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<NonNullable<Window["Tmapv2"]>["Map"]> | null>(null);
  const markersRef = useRef<InstanceType<NonNullable<Window["Tmapv2"]>["Marker"]>[]>([]);
  const polylineRef = useRef<InstanceType<NonNullable<Window["Tmapv2"]>["Polyline"]> | null>(null);
  const myLocationMarkerRef = useRef<InstanceType<NonNullable<Window["Tmapv2"]>["Marker"]> | null>(null);

  const [ready, setReady] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // 스크립트 로드 + 지도 인스턴스 생성 (마운트당 1회)
  useEffect(() => {
    let cancelled = false;
    waitForTmap()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current || !window.Tmapv2) return;
        mapRef.current = new window.Tmapv2.Map(containerRef.current, {
          center: new window.Tmapv2.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
          width: "100%",
          height: "100%",
          zoom: 12,
        });
        setReady(true);
      })
      .catch(() => setLocError("지도를 불러오지 못했어요"));
    return () => {
      cancelled = true;
    };
    // ponytail: TMap SDK에 공식 destroy API가 없어 언마운트 시 map 인스턴스는 정리하지 않음
    // (컨테이너 DOM이 제거되면서 GC됨) — 페이지 이동이 잦아지면 재검토
  }, []);

  // 마커 동기화
  useEffect(() => {
    if (!ready || !mapRef.current || !window.Tmapv2) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = pins.map((pin) => {
      const marker = new window.Tmapv2!.Marker({
        position: new window.Tmapv2!.LatLng(pin.lat, pin.lng),
        icon: pinIconUrl(pin),
        iconSize: new window.Tmapv2!.Size(30, 30),
        map: mapRef.current,
      });
      if (onPinClick) marker.addListener?.("click", () => onPinClick(pin.id));
      return marker;
    });
  }, [ready, pins, onPinClick]);

  // 경로선 동기화
  useEffect(() => {
    if (!ready || !mapRef.current || !window.Tmapv2) return;
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    if (!showPath || pins.length < 2) return;

    const points: [number, number][] =
      routeGeometry && routeGeometry.length > 1 ? routeGeometry : pins.map((p) => [p.lat, p.lng]);
    polylineRef.current = new window.Tmapv2.Polyline({
      path: points.map(([lat, lng]) => new window.Tmapv2!.LatLng(lat, lng)),
      strokeColor: "#7c5cfc",
      strokeWeight: 3,
      map: mapRef.current,
    });
  }, [ready, showPath, routeGeometry, pins]);

  // 화면에 핀이 다 보이도록 범위 맞추기
  useEffect(() => {
    if (!ready || !mapRef.current || !window.Tmapv2 || pins.length === 0) return;
    if (pins.length === 1) {
      mapRef.current.setCenter(new window.Tmapv2.LatLng(pins[0].lat, pins[0].lng));
      mapRef.current.setZoom(15);
      return;
    }
    const bounds = new window.Tmapv2.LatLngBounds();
    pins.forEach((p) => bounds.extend(new window.Tmapv2!.LatLng(p.lat, p.lng)));
    mapRef.current.fitBounds(bounds);
  }, [ready, pins]);

  // 내 위치 점 동기화
  useEffect(() => {
    if (!ready || !mapRef.current || !window.Tmapv2) return;
    myLocationMarkerRef.current?.setMap(null);
    myLocationMarkerRef.current = null;
    if (!myLocation) return;
    myLocationMarkerRef.current = new window.Tmapv2.Marker({
      position: new window.Tmapv2.LatLng(myLocation.lat, myLocation.lng),
      icon: MY_LOCATION_ICON,
      iconSize: new window.Tmapv2.Size(20, 20),
      map: mapRef.current,
    });
  }, [ready, myLocation]);

  function handleLocate() {
    if (!navigator.geolocation) {
      setLocError("이 브라우저는 위치 기능을 지원하지 않아요");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError("위치 권한을 허용해줘야 표시할 수 있어요");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className={`relative ${className ?? "h-full w-full"}`}>
      <div ref={containerRef} className="h-full w-full" />
      {!ready && !locError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm text-slate-400 dark:bg-slate-800">
          지도를 불러오는 중...
        </div>
      )}

      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        aria-label="내 위치 표시"
        className="absolute bottom-3 right-3 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-md disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100"
      >
        <LocateFixed size={20} className={locating ? "animate-pulse" : undefined} />
      </button>
      {locError && (
        <div className="absolute bottom-16 right-3 z-[1000] max-w-[200px] rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-white">
          {locError}
        </div>
      )}
    </div>
  );
}
