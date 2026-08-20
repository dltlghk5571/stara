"use client";

import { Lock, Stamp as StampIcon } from "lucide-react";
import type { Place } from "@/types";

const ROTATIONS = ["-rotate-3", "rotate-1", "rotate-3", "-rotate-1"];

interface Props {
  orderedPlaces: Place[];
  earnedStampIds: string[];
}

export default function StampGrid({ orderedPlaces, earnedStampIds }: Props) {
  return (
    <div className="font-jakarta grid grid-cols-3 gap-3.5">
      {orderedPlaces.map((place, i) => {
        const stampId = `stamp-${place.id}`;
        const earned = earnedStampIds.includes(stampId);
        return (
          <div
            key={place.id}
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl p-2 text-center transition ${
              earned
                ? `${ROTATIONS[i % ROTATIONS.length]} border-2 border-stara-mint bg-white shadow-[0_6px_14px_-8px_rgba(36,59,83,0.35)]`
                : "border-2 border-dashed border-stone-300"
            }`}
          >
            {earned ? (
              <StampIcon size={22} className="text-stara-coral" />
            ) : (
              <Lock size={18} className="text-stone-300" />
            )}
            <span
              className={`line-clamp-2 text-[9.5px] font-bold leading-tight ${
                earned ? "text-stara-navy" : "text-stone-300"
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
