"use client";

import { useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { useLocale, useT } from "@/i18n";

interface Props {
  username: string;
}

export default function CollectionShare({ username }: Props) {
  const [sharing, setSharing] = useState(false);
  const { locale } = useLocale();
  const t = useT();
  const cardUrl = `/api/collection-card/${username}?locale=${locale}`;

  async function handleShare() {
    setSharing(true);
    try {
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      const file = new File([blob], `stara-${username}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t("collection.shareTitle"),
          text: t("collection.shareText"),
        });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `stara-${username}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardUrl}
        alt={t("collection.shareAlt", { name: username })}
        className="w-full rounded-2xl border border-slate-200"
      />
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-fuchsia-600 text-sm font-bold text-white disabled:bg-slate-300"
      >
        {sharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
        {t("collection.shareInstagram")}
      </button>
      <a
        href={cardUrl}
        download={`stara-${username}.png`}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900"
      >
        <Download size={18} /> {t("collection.downloadImage")}
      </a>
    </div>
  );
}
