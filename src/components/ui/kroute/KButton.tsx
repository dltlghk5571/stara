"use client";

import { useState } from "react";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { BLACK, BORDER, BSHADOW, PINK, WHITE } from "@/lib/kroute-tokens";

interface Props {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  bg?: string;
  color?: string;
  outline?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: CSSProperties;
}

/** kroute.html의 KBtn — 눌렀을 때 그림자가 눌리는 효과가 핵심이라 그대로 옮겼다. */
export default function KButton({
  children,
  onClick,
  bg,
  color,
  outline,
  disabled,
  type = "button",
  style = {},
}: Props) {
  const bgC = outline ? "transparent" : bg || PINK;
  const col = color || (outline ? BLACK : WHITE);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseDown={() => {
        if (!disabled) setPressed(true);
      }}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => {
        if (!disabled) setPressed(true);
      }}
      onTouchEnd={() => setPressed(false)}
      style={{
        width: "100%",
        padding: "16px",
        borderRadius: 50,
        border: BORDER,
        fontFamily: "Outfit",
        fontWeight: 900,
        fontSize: 16,
        letterSpacing: ".5px",
        cursor: disabled ? "not-allowed" : "pointer",
        background: bgC,
        color: col,
        boxShadow: disabled ? "none" : pressed ? `1px 1px 0 ${BLACK}` : BSHADOW,
        transform: pressed ? "translate(2px,2px)" : "none",
        opacity: disabled ? 0.5 : 1,
        transition: "transform .08s,box-shadow .08s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
