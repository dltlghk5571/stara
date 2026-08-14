"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { BookImage, LogIn } from "lucide-react";

/** 어느 화면에서든 로그인/내 컬렉션북에 닿을 수 있는 진입점 */
export default function AuthNav() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <a
        href="/sign-in"
        className="flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-fuchsia-600 hover:bg-fuchsia-50 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/30"
      >
        <LogIn size={16} /> 로그인
      </a>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <a
        href="/collection"
        aria-label="내 컬렉션북"
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <BookImage size={18} />
      </a>
      <UserButton />
    </div>
  );
}
