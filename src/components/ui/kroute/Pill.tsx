import type { CSSProperties, ReactNode } from "react";
import { BLACK, BORDER, LIME } from "@/lib/kroute-tokens";

interface Props {
  children: ReactNode;
  bg?: string;
  color?: string;
  style?: CSSProperties;
}

export default function Pill({ children, bg, color, style = {} }: Props) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "4px 12px",
        borderRadius: 50,
        border: BORDER,
        background: bg || LIME,
        color: color || BLACK,
        fontFamily: "Outfit",
        fontWeight: 700,
        fontSize: 12,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
