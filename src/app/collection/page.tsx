"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { KButton } from "@/components/ui/kroute";
import { BORDER, CREAM } from "@/lib/kroute-tokens";
import { useT } from "@/i18n";

interface LocalUser {
  username: string;
}

export default function MyCollectionPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const t = useT();
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
      setError(data.error ?? t("collection.genericError"));
      return;
    }
    router.replace(`/collection/${data.user.username}`);
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: CREAM }}>
      <TopBar title={t("collection.title")} backHref="/trip" />
      <main style={{ margin: "0 auto", display: "flex", width: "100%", maxWidth: 400, flex: 1, flexDirection: "column", justifyContent: "center", gap: 16, padding: "24px 20px" }}>
        {checking ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#666" }}>
            <Loader2 size={24} className="animate-spin" />
            <p style={{ fontFamily: "Nunito", fontSize: 12 }}>{t("common.loading")}</p>
          </div>
        ) : !isSignedIn ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
            <p style={{ fontFamily: "Nunito", fontSize: 14, color: "#666" }}>
              {t("collection.signedOutHint")}
            </p>
            <Link href="/sign-in" style={{ width: "100%", maxWidth: 240 }}>
              <KButton>{t("nav.signIn")}</KButton>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13 }}>
              {t("collection.chooseUsername")}
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("collection.usernamePlaceholder")}
              style={{ minHeight: 44, borderRadius: 12, border: BORDER, padding: "0 14px", fontFamily: "Nunito", fontSize: 14, outline: "none" }}
            />
            {error && <p style={{ fontSize: 12, color: "#e11d48" }}>{error}</p>}
            <KButton type="submit" disabled={submitting || username.length < 3}>
              {t("collection.start")}
            </KButton>
          </form>
        )}
      </main>
    </div>
  );
}
