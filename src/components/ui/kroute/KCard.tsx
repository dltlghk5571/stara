import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { BORDER, SHADOW, WHITE } from "@/lib/kroute-tokens";

interface Props {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export default function KCard({ children, style = {}, className = "", onClick }: Props) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{ background: WHITE, border: BORDER, borderRadius: 16, boxShadow: SHADOW, ...style }}
    >
      {children}
    </div>
  );
}
