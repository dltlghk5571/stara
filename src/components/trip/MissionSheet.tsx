"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useTripStore } from "@/store/tripStore";
import { getQuestsForPlace } from "@/data/quests";
import { haversineKm } from "@/lib/distance";
import { GPS_MISSION_RADIUS_METERS } from "@/config";
import { KButton, KCard, Pill } from "@/components/ui/kroute";
import { LIME, PALGREEN, PINK, YELLOW } from "@/lib/kroute-tokens";
import type { DiaryPhoto } from "@/components/trip/TripShellClient";
import type { Place } from "@/types";

interface Props {
  place: Place;
  onClose: () => void;
  /** 스탬프까지 확정된 뒤(성공 모달의 "Receive Stamp" 클릭 시) 호출 — 방금 저장된 사진 정보를 그대로 넘긴다 */
  onComplete: (photo: DiaryPhoto) => void;
}

type GpsStatus = "checking" | "ok" | "far" | "unavailable";

/**
 * 미션 시트 — 사진 첨부 + 위치 확인이 필수다. 제출하면 업로드 → quest_photos 저장 →
 * 필수 퀘스트 완료 처리 → 스탬프 확정까지 한 번에 처리한다.
 *
 * 사진 자체(내용)는 아직 검증하지 않고 항상 통과시킨다 — 대신 GPS로 "이 장소 근처에
 * 실제로 있었는지"만 확인한다. 위치를 못 가져오면(권한거부/미지원/타임아웃) 사용자가
 * 영구히 막히지 않도록 검증을 건너뛰고 통과시킨다.
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

  const [gps, setGps] = useState<GpsStatus>(() =>
    typeof navigator !== "undefined" && navigator.geolocation ? "checking" : "unavailable"
  );
  const [gpsDistanceM, setGpsDistanceM] = useState<number | null>(null);

  const quest = getQuestsForPlace(place)[0];

  function fetchLocation() {
    if (!navigator.geolocation) return; // gps는 이미 "unavailable"로 초기화됨
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const km = haversineKm(
          { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          { latitude: place.latitude, longitude: place.longitude }
        );
        const meters = Math.round(km * 1000);
        setGpsDistanceM(meters);
        setGps(meters <= GPS_MISSION_RADIUS_METERS ? "ok" : "far");
      },
      () => setGps("unavailable"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function retryLocation() {
    setGps("checking");
    fetchLocation();
  }

  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.id]);

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
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(0,0,0,.72)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <KCard className="kr-aBounceIn" style={{ width: "100%", maxWidth: 320, padding: 28, textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: YELLOW,
              border: "2.5px solid #111111",
              boxShadow: "4px 4px 0 #111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              margin: "0 auto 16px",
            }}
          >
            ⭐
          </div>
          <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 22, color: PINK, marginBottom: 4 }}>
            CONGRATULATIONS!
          </h2>
          <p style={{ fontFamily: "Caveat", fontSize: 20, fontStyle: "italic", color: "#555", marginBottom: 16 }}>
            Mission Complete!
          </p>
          <div
            className="kr-aStampIn"
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              border: "2.5px solid #111111",
              background: PALGREEN,
              boxShadow: "4px 4px 0 #111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              margin: "8px auto 20px",
            }}
          >
            🏅
          </div>
          <KButton onClick={() => savedPhoto && onComplete(savedPhoto)}>Receive Stamp →</KButton>
        </KCard>
      </div>
    );
  }

  const canSubmit = !!file && status !== "uploading" && gps !== "far";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.65)", display: "flex", flexDirection: "column" }}
      onClick={onClose}
    >
      <div style={{ flex: 1 }} />
      <div
        className="kr-aSlideUp"
        style={{ borderRadius: "24px 24px 0 0", border: "2.5px solid #111111", borderBottom: "none", background: "#fff", maxHeight: "85%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 50, background: "#ddd" }} />
        </div>
        <div className="kr-scrollY" style={{ maxHeight: 580, padding: "0 24px 32px" }}>
          <div style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill bg={YELLOW}>ACTIVE MISSION 🎯</Pill>
            {gps === "checking" && <Pill bg="#eee" color="#777">📍 위치 확인 중…</Pill>}
            {gps === "ok" && <Pill bg={PALGREEN}>📍 위치 확인됨</Pill>}
            {gps === "far" && <Pill bg="#FFD6D6">📍 {gpsDistanceM}m 떨어짐</Pill>}
            {gps === "unavailable" && <Pill bg="#eee" color="#777">📍 위치 확인 생략</Pill>}
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                border: "2.5px solid #111111",
                background: PALGREEN,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                flexShrink: 0,
                boxShadow: "3px 3px 0 #111111",
              }}
            >
              🎯
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 18, marginBottom: 2 }}>
                {quest?.titleKo ?? place.nameKo}
              </h3>
              <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#888" }}>📍 {place.nameKo}</p>
            </div>
            <button
              type="button"
              className="kr-reset"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "2.5px solid #111111",
                background: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>

          <p style={{ fontFamily: "Nunito", fontSize: 14, color: "#555", lineHeight: 1.6, marginBottom: 14 }}>
            {quest?.descriptionKo}
          </p>

          {gps === "far" && (
            <div
              style={{
                background: "#FFF0F0",
                border: "2.5px solid #111111",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#c0392b", fontWeight: 700 }}>
                장소에서 {gpsDistanceM}m 떨어져 있어요. 가까이 가서 다시 확인해주세요.
              </p>
              <button
                type="button"
                className="kr-reset"
                onClick={retryLocation}
                style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 12, color: "#c0392b", whiteSpace: "nowrap" }}
              >
                다시 확인
              </button>
            </div>
          )}

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: `2.5px dashed ${PINK}`,
              borderRadius: 16,
              padding: previewUrl ? 0 : "28px 20px",
              textAlign: "center",
              marginBottom: 14,
              background: "#FFF5FA",
              cursor: "pointer",
              overflow: "hidden",
              minHeight: previewUrl ? 180 : undefined,
            }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" style={{ width: "100%", height: 180, objectFit: "cover" }} />
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Upload Mission Photo</p>
                <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#bbb" }}>Tap to take or upload a photo</p>
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
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="한마디 남기기 (선택)"
            maxLength={80}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              border: "2.5px solid #111111",
              fontFamily: "Nunito",
              fontSize: 14,
              outline: "none",
              marginBottom: 14,
            }}
          />

          {status === "error" && (
            <p style={{ color: "#e11d48", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
              제출에 실패했어요. 다시 시도해주세요.
            </p>
          )}

          <KButton bg={status === "uploading" ? "#eee" : LIME} color={status === "uploading" ? "#aaa" : "#111"} disabled={!canSubmit} onClick={handleSubmit}>
            {status === "uploading" ? "제출 중…" : "COMPLETE MISSION 🎯"}
          </KButton>
        </div>
      </div>
    </div>
  );
}
