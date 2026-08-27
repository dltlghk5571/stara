"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ARTISTS } from "@/data/artists";
import { KButton } from "@/components/ui/kroute";
import { BLACK, BORDER, CREAM, LIME, PINK, SHADOW, WHITE } from "@/lib/kroute-tokens";

const AVATAR_COLORS = ["#C4B5FD", "#FBCFE8", "#BAE6FD", "#BBF7D0", "#FED7AA", "#FECACA"];

function initialsOf(name: string): string {
  return name.replace(/[^가-힣A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
}

export default function OnboardingArtistsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function handleContinue() {
    if (!selected) return;
    router.push(`/onboarding/region?artists=${selected}`);
  }

  return (
    <div style={{ minHeight: "100dvh", background: CREAM, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "48px 24px 12px" }}>
        <span style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 13, letterSpacing: 1, color: "#888" }}>
          PICK YOUR BIAS
        </span>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 26, lineHeight: 1.2, marginTop: 4 }}>
          Select your travel mate!
        </h2>
        <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#666", marginTop: 6, lineHeight: 1.5 }}>
          아티스트 한 명을 골라주세요 — 취향에 맞춰 루트를 만들어드려요.
        </p>
      </div>

      <div className="kr-scrollY" style={{ flex: 1, padding: "0 24px" }}>
        <div className="kr-artistGrid">
          {ARTISTS.map((artist, i) => {
            const isSel = selected === artist.id;
            return (
              <button
                key={artist.id}
                type="button"
                className="kr-reset"
                onClick={() => setSelected(artist.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "12px 8px",
                  borderRadius: 16,
                  border: isSel ? `2.5px solid ${PINK}` : BORDER,
                  background: WHITE,
                  position: "relative",
                  boxShadow: isSel ? `4px 4px 0 ${PINK}` : SHADOW,
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 12,
                    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                    border: BORDER,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Outfit",
                    fontWeight: 900,
                    fontSize: 16,
                    color: BLACK,
                  }}
                >
                  {initialsOf(artist.nameEn)}
                </div>
                <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 11, textAlign: "center", lineHeight: 1.2 }}>
                  {artist.nameEn}
                </span>
                {isSel && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -10,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: PINK,
                      borderRadius: 50,
                      border: BORDER,
                      padding: "2px 10px",
                      fontFamily: "Outfit",
                      fontWeight: 900,
                      fontSize: 10,
                      color: WHITE,
                      whiteSpace: "nowrap",
                      boxShadow: `2px 2px 0 ${BLACK}`,
                      zIndex: 1,
                    }}
                  >
                    BIAS ✦
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "20px 24px 32px" }}>
        <KButton bg={LIME} color={BLACK} disabled={!selected} onClick={handleContinue}>
          CONTINUE TO REGION MAP →
        </KButton>
      </div>
    </div>
  );
}
