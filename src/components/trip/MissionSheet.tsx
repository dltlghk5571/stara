"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
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
 * 미션 시트 — 사진 첨부가 필수다. 제출하면 업로드 → quest_photos 저장 →
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

  if (status === "success") {
    return (
      <div className="modal-overlay open">
        <div className="modal-card">
          <div className="modal-emoji">🎉</div>
          <div className="modal-title">Mission Complete!</div>
          <div className="modal-sub">인증샷이 확인됐어요.</div>
          <div className="modal-stamp-preview">🏅</div>
          <button className="btn btn-coral" onClick={() => savedPhoto && onComplete(savedPhoto)}>
            Receive Stamp →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle"></div>
        <div className="sheet-q" style={{ textAlign: "left", fontSize: "18px" }}>
          {quest?.titleKo ?? place.nameKo}
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "var(--coral)", fontWeight: 700, marginTop: "2px" }}>
          📍 {place.nameKo}
        </div>
        <div style={{ fontSize: "12.5px", color: "var(--gray)", lineHeight: 1.55, margin: "12px 0 18px" }}>
          {quest?.descriptionKo}
        </div>

        <label className={`photo-dropzone${previewUrl ? " captured" : ""}`}>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <>
              <div className="ic">📷</div>
              <div className="t">Tap to add a photo</div>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            style={{ display: "none" }}
            disabled={status === "uploading"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        <input
          type="text"
          className="field"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="한마디 남기기 (선택)"
          maxLength={80}
        />

        {status === "error" && (
          <p style={{ color: "#e11d48", fontSize: "12px", fontWeight: 700, marginBottom: "10px" }}>
            제출에 실패했어요. 다시 시도해주세요.
          </p>
        )}

        <button className="btn btn-coral" disabled={!file || status === "uploading"} onClick={handleSubmit}>
          {status === "uploading" ? "제출 중…" : "Submit Mission"}
        </button>
      </div>
    </div>
  );
}
