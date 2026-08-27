"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import { BookImage, LogIn } from "lucide-react";
import { PINK } from "@/lib/kroute-tokens";

/** 어느 화면에서든 로그인/내 컬렉션북에 닿을 수 있는 진입점 */
export default function AuthNav() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <Link
        href="/sign-in"
        style={{
          display: "flex",
          height: 36,
          alignItems: "center",
          gap: 4,
          borderRadius: 50,
          padding: "0 12px",
          fontFamily: "Outfit",
          fontWeight: 700,
          fontSize: 12,
          color: PINK,
        }}
      >
        <LogIn size={16} /> 로그인
      </Link>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <Link
        href="/collection"
        aria-label="내 컬렉션북"
        style={{
          display: "flex",
          height: 36,
          width: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          color: "#555",
        }}
      >
        <BookImage size={18} />
      </Link>
      <UserButton />
    </div>
  );
}
