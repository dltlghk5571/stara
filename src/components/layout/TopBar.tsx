"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface Props {
  title: string;
  backHref?: string;
}

export default function TopBar({ title, backHref }: Props) {
  const router = useRouter();
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => (backHref ? router.push(backHref) : router.back())}
        aria-label="뒤로가기"
        className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ChevronLeft size={22} />
      </button>
      <h1 className="text-base font-bold text-slate-900 dark:text-white">{title}</h1>
    </header>
  );
}
