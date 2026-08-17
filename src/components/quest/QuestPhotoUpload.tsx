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

  async function handleFile(rawFile: File) {
    setStatus("uploading");
    try {
      // input의 accept가 heic를 안 넣어두면 iOS Safari가 사진을 넘겨주기 전에
      // 자체적으로 JPEG 변환을 해준다(OS 차원, 아래 accept="image/jpeg,..." 참고) —
      // 그래도 데스크톱에서 HEIC 파일을 직접 끌어다 놓는 등 여전히 HEIC가 넘어올 수
      // 있어서 여기서도 한 번 더 시도한다. 다만 heic2any(WASM libheif)는 일부 실제
      // 아이폰 사진에서 디코딩 자체가 실패하는 걸 확인함 — 실패해도 업로드는 막지
      // 않고 원본 그대로 올린다(서버는 image/* 다 받고, 카드 합성에서 HEIC만 걸러냄).
      const isHeic =
        rawFile.type === "image/heic" ||
        rawFile.type === "image/heif" ||
        /\.hei[cf]$/i.test(rawFile.name);

      let file: File | Blob = rawFile;
      let filename = rawFile.name;
      if (isHeic) {
        try {
          const { default: heic2any } = await import("heic2any");
          const converted = await heic2any({ blob: rawFile, toType: "image/jpeg", quality: 0.85 });
          file = Array.isArray(converted) ? converted[0] : converted;
          filename = rawFile.name.replace(/\.hei[cf]$/i, ".jpg");
        } catch (conversionError) {
          console.error("[quest-photo] heic conversion failed, uploading as-is:", conversionError);
        }
      }

      const blob = await upload(filename, file, {
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
        // capture="environment"를 안 쓰는 게 의도적임: 사진 라이브러리/카메라를 고를 수 있는
        // 표준 피커를 열어야 iOS Safari가 HEIC 사진을 JPEG로 변환해서 넘겨줌. capture로
        // 카메라 앱을 직접 띄우면 이 변환을 안 거치고 기기 기본 포맷(HEIC) 그대로 넘어옴.
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
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
