"use client";

import type { Artist } from "@/types";
import { USER_FACING_CATEGORIES, type PlaceCategory } from "@/types";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";

interface Props {
  artists: Artist[];
  selectedArtistIds: string[];
  onToggleArtist: (id: string) => void;
  selectedCategories: PlaceCategory[];
  onToggleCategory: (c: PlaceCategory) => void;
}

export default function FilterBar({
  artists,
  selectedArtistIds,
  onToggleArtist,
  selectedCategories,
  onToggleCategory,
}: Props) {
  return (
    <div className="filter-bar">
      <div className="filter-row">
        {USER_FACING_CATEGORIES.map((c) => {
          const active = selectedCategories.includes(c);
          const style = CATEGORY_STYLE[c];
          return (
            <button
              key={c}
              type="button"
              onClick={() => onToggleCategory(c)}
              className={`filter-chip${active ? " active" : ""}`}
              style={active ? { background: style.color } : undefined}
            >
              {style.labelKo}
            </button>
          );
        })}
      </div>
      <div className="filter-row">
        {artists.map((a) => {
          const active = selectedArtistIds.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onToggleArtist(a.id)}
              className={`filter-chip${active ? " active" : ""}`}
              style={active ? { background: "var(--coral)" } : undefined}
            >
              {a.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
