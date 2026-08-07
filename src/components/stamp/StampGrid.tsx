"use client";

import { Lock, Stamp as StampIcon } from "lucide-react";
import type { Place } from "@/types";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";

interface Props {
  orderedPlaces: Place[];
  earnedStampIds: string[];
}

export default function StampGrid({ orderedPlaces, earnedStampIds }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {orderedPlaces.map((place) => {
        const stampId = `stamp-${place.id}`;
        const earned = earnedStampIds.includes(stampId);
        const style = CATEGORY_STYLE[place.category];
        return (
          <div
            key={place.id}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-3 text-center dark:border-slate-700"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                backgroundColor: earned ? style.color : "#e2e8f0",
              }}
            >
              {earned ? (
                <StampIcon size={24} className="text-white" />
              ) : (
                <Lock size={20} className="text-slate-400" />
              )}
            </div>
            <span
              className={`line-clamp-2 text-xs ${
                earned
                  ? "font-semibold text-slate-700 dark:text-slate-200"
                  : "text-slate-400"
              }`}
            >
              {place.nameKo}
            </span>
          </div>
        );
      })}
    </div>
  );
}
