"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useEffect } from "react";
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

export default function LeafletMap({ pins, showPath, onPinClick, className }: MapViewProps) {
  return (
    <MapContainer
      center={SEOUL_CENTER}
      zoom={12}
      scrollWheelZoom
      className={className ?? "h-full w-full"}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showPath && pins.length > 1 && (
        <Polyline
          positions={pins.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#7c5cfc", weight: 3, dashArray: "6 6" }}
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
      <FitBounds pins={pins} />
    </MapContainer>
  );
}
