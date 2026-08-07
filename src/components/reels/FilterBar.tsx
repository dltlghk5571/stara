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
    <div className="flex flex-col gap-2 border-b border-slate-200 bg-white/80 p-2.5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {USER_FACING_CATEGORIES.map((c) => {
          const active = selectedCategories.includes(c);
          const style = CATEGORY_STYLE[c];
          return (
            <button
              key={c}
              type="button"
              onClick={() => onToggleCategory(c)}
              className="min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors"
              style={
                active
                  ? { backgroundColor: style.color, borderColor: style.color, color: "white" }
                  : { borderColor: "#e2e8f0", color: "#64748b" }
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
              className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${
                active
                  ? "border-fuchsia-500 bg-fuchsia-500 text-white"
                  : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"
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
