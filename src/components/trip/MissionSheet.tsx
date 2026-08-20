"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { Camera, Loader2 } from "lucide-react";
import { useTripStore } from "@/store/tripStore";
import { getQuestsForPlace } from "@/data/quests";
import type { DiaryPhoto } from "@/components/trip/TripShellClient";
import type { Place } from "@/types";

interface Props {
  place: Place;
  onClose: () => void;
  /** 스탬프까지 확정된 뒤(성공 모달의 "Receive Stamp" 클릭 시) 호출 — 방금 저장된 사진 정보를 그대로 넘긴다 */
  onComplete: (photo: DiaryPhoto) => void;
}

/**
 * 체크포인트 미션 시트 — 사진 첨부가 필수다. 제출하면 업로드 → quest_photos 저장 →
 * 필수 퀘스트 완료 처리 → 스탬프 확정까지 한 번에 처리한다(기존엔 사진 업로드와
 * 퀘스트 체크가 서로 무관했음 — 이 컴포넌트가 그 둘을 하나로 묶는다).
 */
export default function MissionSheet({ place, onClose, onComplete }: Props) {
  const activeTripId = useTripStore((s) => s.activeTripId);
  const activeTripName = useTripStore((s) => s.activeTripName);
  const toggleQuest = useTripStore((s) => s.toggleQuest);
  const completedQuestIds = useTripStore((s) => s.completedQuestIds);
  const claimStamp = useTripStore((s) => s.claimStamp);

  const [file, setFile] = useState<File | Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "error" | "success">("idle");
  const [savedPhoto, setSavedPhoto] = useState<DiaryPhoto | null>(null);

  const quest = getQuestsForPlace(place)[0];

  async function handleFile(rawFile: File) {
    const isHeic =
      rawFile.type === "image/heic" ||
      rawFile.type === "image/heif" ||
      /\.hei[cf]$/i.test(rawFile.name);

    let picked: File | Blob = rawFile;
    if (isHeic) {
      try {
        const { default: heic2any } = await import("heic2any");
        const converted = await heic2any({ blob: rawFile, toType: "image/jpeg", quality: 0.85 });
        picked = Array.isArray(converted) ? converted[0] : converted;
      } catch (conversionError) {
        console.error("[mission-sheet] heic conversion failed, using original:", conversionError);
      }
    }
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
  }

  async function handleSubmit() {
    if (!file) return;
    setStatus("uploading");
    try {
      const isHeicName = /\.hei[cf]$/i.test((file as File).name ?? "");
      const filename = isHeicName
        ? ((file as File).name ?? "photo").replace(/\.hei[cf]$/i, ".jpg")
        : ((file as File).name ?? "photo.jpg");

      const blob = await upload(filename, file, {
        access: "public",
        handleUploadUrl: "/api/photo-upload",
      });
      const res = await fetch("/api/quest-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: place.id,
          photoUrl: blob.url,
          note: caption || undefined,
          tripId: activeTripId ?? undefined,
          tripName: activeTripName ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const { photo } = (await res.json()) as {
        photo: {
          id: string;
          placeId: string;
          photoUrl: string;
          note: string | null;
          completedAt: string;
          tripId: string | null;
          tripName: string | null;
        };
      };

      if (quest && !completedQuestIds.includes(quest.id)) toggleQuest(quest.id);
      claimStamp(place);
      setSavedPhoto(photo);
      setStatus("success");
    } catch (error) {
      console.error("[mission-sheet] submit failed:", error);
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55"
      onClick={status === "success" ? undefined : onClose}
    >
      <div
        className="font-jakarta w-full max-w-md rounded-t-3xl bg-white p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-stone-200" />

        {status === "success" ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="text-[46px]">🎉</span>
            <p className="font-fraunces text-xl font-bold">Mission Complete!</p>
            <p className="text-xs text-stone-500">인증샷이 확인됐어요.</p>
            <button
              type="button"
              onClick={() => savedPhoto && onComplete(savedPhoto)}
              className="mt-5 flex min-h-11 w-full items-center justify-center rounded-2xl bg-stara-coral text-sm font-bold text-white"
            >
              Receive Stamp →
            </button>
          </div>
        ) : (
          <>
            <p className="text-left text-lg font-bold">{quest?.titleKo ?? place.nameKo}</p>
            <p className="mt-1 text-xs text-stone-500">{quest?.descriptionKo}</p>

            <label
              className={`mt-4 flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 ${
                previewUrl ? "border-stara-coral" : "border-dashed border-stara-coral"
              }`}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Camera size={26} className="text-stara-coral" />
                  <span className="text-[11.5px] font-bold text-stara-coral">사진 첨부하기</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="hidden"
                disabled={status === "uploading"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>

            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="한마디 남기기 (선택)"
              maxLength={80}
              className="mt-3 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stara-coral"
            />

            {status === "error" && (
              <p className="mt-2 text-xs font-semibold text-rose-500">
                제출에 실패했어요. 다시 시도해주세요.
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || status === "uploading"}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-stara-coral text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "uploading" && <Loader2 size={16} className="animate-spin" />}
              {status === "uploading" ? "제출 중…" : "Submit Mission"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
