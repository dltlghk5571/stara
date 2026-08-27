import { BORDER, BSHADOW, PINK, WHITE } from "@/lib/kroute-tokens";

export type KrouteTab = "cover" | "route" | "stamps" | "diary";

const TABS: { id: KrouteTab; label: string; icon: string }[] = [
  { id: "cover", label: "Cover", icon: "🏠" },
  { id: "route", label: "Route", icon: "🗺️" },
  { id: "stamps", label: "Stamps", icon: "🏅" },
  { id: "diary", label: "Diary", icon: "📖" },
];

interface Props {
  active: KrouteTab;
  onChange: (tab: KrouteTab) => void;
}

export default function BottomNav({ active, onChange }: Props) {
  return (
    <div style={{ display: "flex", borderTop: BORDER, background: WHITE, flexShrink: 0 }}>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="kr-reset"
          onClick={() => onChange(t.id)}
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
              background: active === t.id ? PINK : "transparent",
              border: active === t.id ? BORDER : "2.5px solid transparent",
              boxShadow: active === t.id ? BSHADOW : "none",
              transition: "all .15s",
            }}
          >
            {t.icon}
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "Outfit",
              color: active === t.id ? PINK : "#111111",
            }}
          >
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}
