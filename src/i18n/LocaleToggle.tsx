"use client";

import { useLocale } from "./LocaleProvider";
import type { Locale } from "./types";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ko", label: "한국어" },
];

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  return (
    <div
      className={className}
      role="group"
      aria-label="Language"
      style={{ display: "inline-flex", gap: 4, border: "2.5px solid #111", borderRadius: 999, padding: 3, background: "#fff" }}
    >
      {OPTIONS.map((o) => {
        const active = o.value === locale;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => !active && setLocale(o.value)}
            aria-pressed={active}
            style={{
              minHeight: 30,
              padding: "0 12px",
              borderRadius: 999,
              border: "none",
              fontFamily: "Outfit, sans-serif",
              fontWeight: 800,
              fontSize: 12,
              cursor: active ? "default" : "pointer",
              background: active ? "#111" : "transparent",
              color: active ? "#fff" : "#111",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
