"use client";

import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/kroute";
import { CREAM } from "@/lib/kroute-tokens";

interface Props {
  title: string;
  backHref?: string;
  rightSlot?: React.ReactNode;
}

export default function TopBar({ title, backHref, rightSlot }: Props) {
  const router = useRouter();
  return (
    <header
      style={{
        display: "flex",
        height: 56,
        flexShrink: 0,
        alignItems: "center",
        gap: 10,
        borderBottom: "2.5px solid #111111",
        background: CREAM,
        padding: "0 14px",
      }}
    >
      <BackButton onClick={() => (backHref ? router.push(backHref) : router.back())} />
      <h1 style={{ flex: 1, fontFamily: "Outfit", fontWeight: 900, fontSize: 15 }}>{title}</h1>
      {rightSlot}
    </header>
  );
}
