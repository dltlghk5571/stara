"use client";

import type { Place, PlaceCategory } from "@/types";

const CATEGORY_GLYPH: Record<PlaceCategory, string> = {
  photo: "📷",
  food: "🍜",
  culture: "🏛️",
  shopping: "🛍️",
  experience: "✨",
  local_tourism: "🗺️",
  local_restaurant: "🍽️",
};

interface Props {
  orderedPlaces: Place[];
  earnedStampIds: string[];
}

export default function StampGrid({ orderedPlaces, earnedStampIds }: Props) {
  return (
    <div className="stamp-grid">
      {orderedPlaces.map((place) => {
        const stampId = `stamp-${place.id}`;
        const earned = earnedStampIds.includes(stampId);
        return (
          <div key={place.id} className={`stamp${earned ? " earned" : " locked"}`}>
            <div className="glyph">{CATEGORY_GLYPH[place.category]}</div>
            <div className="name">{place.nameKo}</div>
            {earned && <div className="date">획득</div>}
          </div>
        );
      })}
    </div>
  );
}
