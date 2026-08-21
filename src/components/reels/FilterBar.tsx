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
    <div className="font-jakarta flex flex-col gap-2 border-b border-stone-200 bg-white/90 p-2.5 backdrop-blur">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {USER_FACING_CATEGORIES.map((c) => {
          const active = selectedCategories.includes(c);
          const style = CATEGORY_STYLE[c];
          return (
            <button
              key={c}
              type="button"
              onClick={() => onToggleCategory(c)}
              className="min-h-9 shrink-0 rounded-full border-2 px-3 text-xs font-bold transition-colors"
              style={
                active
                  ? { backgroundColor: style.color, borderColor: style.color, color: "white" }
                  : { borderColor: "#e7e2d4", color: "#78716c" }
              }
            >
              {style.labelKo}
            </button>
          );
        })}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {artists.map((a) => {
          const active = selectedArtistIds.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onToggleArtist(a.id)}
              className={`min-h-9 shrink-0 rounded-full border-2 px-3 text-xs font-bold transition-colors ${
                active
                  ? "border-stara-coral bg-stara-coral text-white"
                  : "border-stone-200 text-stone-500"
              }`}
            >
              {a.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
