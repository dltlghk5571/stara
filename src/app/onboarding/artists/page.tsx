"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div id="tv-artists" className="tl-view">
      <div className="artist-counter">{selected.length}/5</div>
      <div className="flow-h1">Pick your bias</div>
      <div className="flow-sub">아티스트를 몇 명 골라주세요 — 취향에 맞춰 루트를 만들어드려요.</div>

      <div className="artist-grid">
        {ARTISTS.map((artist, i) => (
          <div
            key={artist.id}
            className={`artist-chip${selected.includes(artist.id) ? " selected" : ""}`}
            onClick={() => toggle(artist.id)}
          >
            <div className="artist-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
              {initialsOf(artist.nameEn)}
              <div className="artist-check">✓</div>
            </div>
            <div className="artist-name">{artist.nameEn}</div>
            <div className="artist-tag">STARA</div>
          </div>
        ))}
      </div>

      <div className="flow-footer">
        <button className="btn btn-coral" disabled={selected.length === 0} onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
