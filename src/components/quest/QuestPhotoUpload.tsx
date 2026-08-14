"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { useUser } from "@clerk/nextjs";
import { Camera, Check, Loader2 } from "lucide-react";

interface Props {
  placeId: string;
}

/** 체크포인트 인증샷 첨부 — 로그인 시 컬렉션북에 저장됨 */
export default function QuestPhotoUpload({ placeId }: Props) {
  const { isSignedIn } = useUser();
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStatus("uploading");
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/photo-upload",
      });
      const res = await fetch("/api/quest-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, photoUrl: blob.url }),
      });
      if (!res.ok) throw new Error("save failed");
      setPreviewUrl(blob.url);
      setStatus("done");
    } catch (error) {
      console.error("[quest-photo] upload failed:", error);
      setStatus("error");
    }
  }

  if (!isSignedIn) {
    return (
      <a
        href="/sign-in"
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-500 dark:border-slate-600 dark:text-slate-400"
      >
        <Camera size={16} /> 로그인하면 인증샷을 컬렉션북에 저장할 수 있어요
      </a>
    );
  }

  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-fuchsia-300 text-xs font-semibold text-fuchsia-600 dark:border-fuchsia-800 dark:text-fuchsia-300">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-6 w-6 rounded object-cover" />
      ) : status === "uploading" ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Camera size={16} />
      )}
      {status === "done"
        ? "인증샷 저장 완료"
        : status === "uploading"
          ? "업로드 중..."
          : status === "error"
            ? "업로드 실패, 다시 시도해줘"
            : "인증샷 추가"}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={status === "uploading" || status === "done"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </label>
  );
}
