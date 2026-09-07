"use client";

import { BORDER, BSHADOW, PINK, WHITE } from "@/lib/kroute-tokens";
import { useT } from "@/i18n";

export type KrouteTab = "cover" | "route" | "stamps" | "diary";

const TABS: { id: KrouteTab; icon: string }[] = [
  { id: "cover", icon: "🏠" },
  { id: "route", icon: "🗺️" },
  { id: "stamps", icon: "🏅" },
  { id: "diary", icon: "📖" },
];

interface Props {
  active: KrouteTab;
  onChange: (tab: KrouteTab) => void;
}

export default function BottomNav({ active, onChange }: Props) {
  const t = useT();
  return (
    <div style={{ display: "flex", borderTop: BORDER, background: WHITE, flexShrink: 0 }}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="kr-reset"
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "10px 0",
            gap: 3,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              background: active === tab.id ? PINK : "transparent",
              border: active === tab.id ? BORDER : "2.5px solid transparent",
              boxShadow: active === tab.id ? BSHADOW : "none",
              transition: "all .15s",
            }}
          >
            {tab.icon}
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "Outfit",
              color: active === tab.id ? PINK : "#111111",
            }}
          >
            {t(`trip.tab.${tab.id}`)}
          </span>
        </button>
      ))}
    </div>
  );
}
