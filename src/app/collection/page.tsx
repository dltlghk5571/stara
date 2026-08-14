"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import TopBar from "@/components/layout/TopBar";

interface LocalUser {
  username: string;
}

export default function MyCollectionPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setChecking(false);
      return;
    }
    fetch("/api/user/username")
      .then((r) => r.json())
      .then((data: { user: LocalUser | null }) => {
        if (data.user?.username) {
          router.replace(`/collection/${data.user.username}`);
        } else {
          setChecking(false);
        }
      });
  }, [isLoaded, isSignedIn, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/user/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "실패했어요");
      return;
    }
    router.replace(`/collection/${data.user.username}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="내 컬렉션북" backHref="/travel" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-5 py-6">
        {!isLoaded || checking ? null : !isSignedIn ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              로그인하면 체크포인트 인증샷으로 컬렉션북을 만들 수 있어요
            </p>
            <a
              href="/sign-in"
              className="flex min-h-11 items-center justify-center rounded-xl bg-fuchsia-600 px-6 text-sm font-bold text-white"
            >
              로그인
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              컬렉션북 주소에 쓸 아이디를 정해줘
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="영소문자, 숫자, _ 3-20자"
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting || username.length < 3}
              className="flex min-h-11 items-center justify-center rounded-xl bg-fuchsia-600 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400"
            >
              시작하기
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
