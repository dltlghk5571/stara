"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import { LocateFixed } from "lucide-react";
import type { MapPin, MapViewProps } from "./types";

const SEOUL_CENTER: [number, number] = [37.5665, 126.978];

function pinIcon(pin: MapPin): L.DivIcon {
  const label = pin.order ?? "";
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${pin.color};
      width:30px;height:30px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      border:2px solid white;
    "><span style="
      transform:rotate(45deg);
      color:white;font-weight:700;font-size:12px;font-family:sans-serif;
    ">${label}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 15);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [pins, map]);
  return null;
}

export default function LeafletMap({
  pins,
  showPath,
  routeGeometry,
  onPinClick,
  className,
}: MapViewProps) {
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

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
      <MapContainer center={SEOUL_CENTER} zoom={12} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showPath && pins.length > 1 && (
          <Polyline
            positions={routeGeometry && routeGeometry.length > 1 ? routeGeometry : pins.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: "#7c5cfc", weight: 3, dashArray: routeGeometry?.length ? undefined : "6 6" }}
          />
        )}
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={pinIcon(pin)}
            eventHandlers={onPinClick ? { click: () => onPinClick(pin.id) } : undefined}
          >
            <Tooltip direction="top" offset={[0, -28]}>
              {pin.title}
            </Tooltip>
          </Marker>
        ))}
        {myLocation && (
          <CircleMarker
            center={[myLocation.lat, myLocation.lng]}
            radius={8}
            pathOptions={{ color: "white", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }}
          />
        )}
        <FitBounds pins={pins} />
      </MapContainer>

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
