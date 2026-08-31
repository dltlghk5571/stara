"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { KButton } from "@/components/ui/kroute";
import { BORDER, CREAM } from "@/lib/kroute-tokens";

interface LocalUser {
  username: string;
}

export default function MyCollectionPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [usernameCheckDone, setUsernameCheckDone] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/user/username")
      .then((r) => r.json())
      .then((data: { user: LocalUser | null }) => {
        if (data.user?.username) {
          router.replace(`/collection/${data.user.username}`);
        } else {
          setUsernameCheckDone(true);
        }
      });
  }, [isLoaded, isSignedIn, router]);

  const checking = !isLoaded || (isSignedIn && !usernameCheckDone);

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
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: CREAM }}>
      <TopBar title="내 컬렉션북" backHref="/trip" />
      <main style={{ margin: "0 auto", display: "flex", width: "100%", maxWidth: 400, flex: 1, flexDirection: "column", justifyContent: "center", gap: 16, padding: "24px 20px" }}>
        {checking ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#666" }}>
            <Loader2 size={24} className="animate-spin" />
            <p style={{ fontFamily: "Nunito", fontSize: 12 }}>불러오는 중...</p>
          </div>
        ) : !isSignedIn ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
            <p style={{ fontFamily: "Nunito", fontSize: 14, color: "#666" }}>
              로그인하면 체크포인트 인증샷으로 컬렉션북을 만들 수 있어요
            </p>
            <Link href="/sign-in" style={{ width: "100%", maxWidth: 240 }}>
              <KButton>로그인</KButton>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13 }}>
              컬렉션북 주소에 쓸 아이디를 정해줘
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="영소문자, 숫자, _ 3-20자"
              style={{ minHeight: 44, borderRadius: 12, border: BORDER, padding: "0 14px", fontFamily: "Nunito", fontSize: 14, outline: "none" }}
            />
            {error && <p style={{ fontSize: 12, color: "#e11d48" }}>{error}</p>}
            <KButton type="submit" disabled={submitting || username.length < 3}>
              시작하기
            </KButton>
          </form>
        )}
      </main>
    </div>
  );
}
