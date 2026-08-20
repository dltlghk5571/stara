"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { ARTISTS } from "@/data/artists";

const AVATAR_COLORS = ["#ff8f7a", "#243b53", "#4e9d78", "#5b8fb3", "#e0a63c", "#a86bd6"];

function initialsOf(name: string): string {
  return name.replace(/[^가-힣A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
}

export default function OnboardingArtistsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleContinue() {
    const query = selected.length > 0 ? `?artists=${selected.join(",")}` : "";
    router.push(`/onboarding/region${query}`);
  }

  return (
    <div className="font-jakarta text-stara-navy flex min-h-screen flex-col bg-stara-bg px-6 pb-8 pt-12">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h1 className="font-fraunces text-2xl font-bold">Pick your bias</h1>
          <p className="mt-1 text-sm text-stone-500">
            아티스트를 몇 명 골라주세요 — 취향에 맞춰 루트를 만들어드려요.
          </p>
        </div>
        <span className="font-space-mono shrink-0 rounded-full bg-stara-mint px-2.5 py-1 text-[11px] font-bold">
          {selected.length}/5
        </span>
      </div>

      <div className="mt-6 grid flex-1 grid-cols-3 gap-x-3 gap-y-5 overflow-y-auto pb-4">
        {ARTISTS.map((artist, i) => {
          const isSelected = selected.includes(artist.id);
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          return (
            <button
              key={artist.id}
              type="button"
              onClick={() => toggle(artist.id)}
              className="flex flex-col items-center gap-2"
            >
              <span
                className="relative flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white transition"
                style={{
                  background: color,
                  boxShadow: isSelected ? `0 0 0 3px ${color}30, 0 0 0 2.5px #ff8f7a` : undefined,
                }}
              >
                {initialsOf(artist.nameEn)}
                {isSelected && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-stara-bg bg-stara-coral text-white">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="text-center text-[11px] font-bold leading-tight">
                {artist.nameEn}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={selected.length === 0}
        className="mt-4 flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-stara-coral text-sm font-bold text-white shadow-lg shadow-orange-200 transition disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-none"
      >
        Continue
      </button>
    </div>
  );
}
