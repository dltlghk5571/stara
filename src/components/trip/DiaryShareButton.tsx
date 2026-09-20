"use client";

import { useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import { useLocale, useT } from "@/i18n";

interface Props {
  /** TripGroup.key — 실제 tripId, 또는 trip_id 도입 이전 레거시 기록이면 "legacy". */
  tripKey: string;
}

/** Instagram Graph API로 직접 게시하지 않고, OS 공유시트(navigator.share)를 띄워 사용자가
 *  인스타를 직접 고르게 한다(앱 심사/비즈니스 계정 연동 없이 바로 동작). Web Share를
 *  지원하지 않는 환경은 파일 다운로드로 대체한다. */
export default function DiaryShareButton({ tripKey }: Props) {
  const [sharing, setSharing] = useState(false);
  const { locale } = useLocale();
  const t = useT();
  const cardUrl = `/api/diary-card/${tripKey}?locale=${locale}`;

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation(); // 카드 클릭(다이어리 뷰어 열기)으로 전파되지 않게
    setSharing(true);
    try {
      const res = await fetch(cardUrl);
      if (!res.ok) return;
      const blob = await res.blob();
      const file = new File([blob], `stara-diary-${tripKey}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t("trip.diaryShareTitle"),
          text: t("trip.diaryShareText"),
        });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `stara-diary-${tripKey}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={sharing}
      aria-label={t("trip.diaryShareLabel")}
      style={{
        width: 40,
        height: 40,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        marginRight: 8,
        borderRadius: "50%",
        border: "none",
        background: "none",
        color: "var(--navy, #243b53)",
      }}
    >
      {sharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
    </button>
  );
}
