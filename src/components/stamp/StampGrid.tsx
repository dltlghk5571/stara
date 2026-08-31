"use client";

import type { Place, PlaceCategory } from "@/types";
import { KCard, Pill } from "@/components/ui/kroute";
import { BLACK, LIME } from "@/lib/kroute-tokens";

const CATEGORY_GLYPH: Record<PlaceCategory, string> = {
  photo: "📷",
  food: "🍜",
  culture: "🏛️",
  shopping: "🛍️",
  experience: "✨",
  local_tourism: "🗺️",
  local_restaurant: "🍽️",
};

const CATEGORY_BG: Record<PlaceCategory, string> = {
  photo: "#D6EEFF",
  food: "#FFFBD6",
  culture: "#F0E8FF",
  shopping: "#E8FFD6",
  experience: "#FFE0F0",
  local_tourism: "#FFEAD6",
  local_restaurant: "#FFE0D6",
};

interface Props {
  orderedPlaces: Place[];
  earnedStampIds: string[];
}

export default function StampGrid({ orderedPlaces, earnedStampIds }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingBottom: 8 }}>
      {orderedPlaces.map((place) => {
        const stampId = `stamp-${place.id}`;
        const earned = earnedStampIds.includes(stampId);
        return (
          <KCard key={place.id} style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                background: earned ? CATEGORY_BG[place.category] : "#F5F5F5",
                padding: "24px 16px",
                textAlign: "center",
                borderBottom: "2.5px solid #111111",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  margin: "0 auto",
                  border: `2.5px solid ${earned ? BLACK : "#ccc"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  filter: earned ? "none" : "grayscale(1) opacity(.35)",
                }}
              >
                {CATEGORY_GLYPH[place.category]}
              </div>
            </div>
            <div style={{ padding: "10px 12px", textAlign: "center" }}>
              <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 13, marginBottom: 2, color: earned ? BLACK : "#666" }}>
                {place.nameKo}
              </p>
              {earned ? (
                <Pill bg={LIME} style={{ fontSize: 10, padding: "3px 12px" }}>
                  STAMPED
                </Pill>
              ) : (
                <Pill bg="#e8e8e8" color="#666" style={{ fontSize: 10, padding: "3px 12px", border: "2px solid #ddd" }}>
                  LOCKED
                </Pill>
              )}
            </div>
          </KCard>
        );
      })}
    </div>
  );
}
