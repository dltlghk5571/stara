"use client";

import { useState } from "react";
import { KButton, Pill } from "@/components/ui/kroute";
import { useT, useLocale, questTitle, questDesc } from "@/i18n";
import { LIME, PALGREEN, PINK, YELLOW } from "@/lib/kroute-tokens";
import { isSupportedImageType, resizeImageToJpeg } from "@/lib/tmoney/resizeImage";
import { useVerificationCapabilities } from "@/lib/auth/useVerificationCapabilities";
import type { VerifyTmoneyApiResponse } from "@/lib/tmoney/classifyTmoneyCard";
import type { Quest } from "@/types";

interface Props {
  quest: Quest;
  onClose: () => void;
  /** 서버가 passed:true를 돌려준 직후에만 호출된다 — 실패/에러 시에는 절대 호출되지 않는다. */
  onVerified: () => void;
}

type Phase = "pick" | "preview" | "verifying" | "result";

/**
 * T-money 카드 인증 시트 — GPS를 전혀 쓰지 않는 사진/사물 인증 퀘스트다. 사진은 분류를
 * 위해서만 서버로 전송되고 저장되지 않는다(Blob/Diary/quest_photos 어디에도 안 감).
 * 흐름: 사진 선택 → 미리보기 → "카드 확인하기" → 로딩 → 성공/실패. 성공해야만 onVerified
 * 호출 — 실패한 요청이 퀘스트를 완료 처리하는 일은 없다.
 *
 * 테스터 계정(capabilities.bypassTmoneyVerification)에게는 사진 선택 UI 자체를 보여주지
 * 않는다 — 대신 "실제 AI 인증이 아니다"라는 것이 명백한 별도 CTA만 보여준다(TesterBypassPanel).
 * 그래도 완료 처리는 여전히 서버 응답(POST /api/quests/verify-tmoney, testBypass:true)이
 * passed:true를 돌려준 뒤에만 일어난다 — 클라이언트가 임의로 onVerified를 부르지 않는다.
 */
export default function TmoneyVerifySheet({ quest, onClose, onVerified }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const { bypassTmoneyVerification } = useVerificationCapabilities();

  const [phase, setPhase] = useState<Phase>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyTmoneyApiResponse | null>(null);

  function handleFile(f: File) {
    setError(null);
    setResult(null);
    if (!f.type.startsWith("image/")) {
      setError(t("tmoney.invalidImage"));
      return;
    }
    if (!isSupportedImageType(f.type)) {
      setError(t("tmoney.unsupportedType"));
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setPhase("preview");
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setPhase("pick");
  }

  async function handleVerify() {
    if (!file) return;
    setPhase("verifying");
    setError(null);
    try {
      const resized = await resizeImageToJpeg(file);
      const res = await fetch("/api/quests/verify-tmoney", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: resized.base64, mediaType: resized.mediaType }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || "error" in body) {
        setError((body && "error" in body && body.error) || t("tmoney.submitFailed"));
        setPhase("preview");
        return;
      }
      const verifyResult = body as VerifyTmoneyApiResponse;
      setResult(verifyResult);
      setPhase("result");
      if (verifyResult.passed) onVerified();
    } catch (err) {
      console.error("[tmoney-verify] failed:", err);
      setError(t("tmoney.loadFailed"));
      setPhase("preview");
    }
  }

  /** 테스터 전용 — 이미지 없이, Anthropic 호출 없이 서버에 testBypass:true만 보낸다. 서버가
   *  실제로 tester capability를 가진 세션인지 다시 확인한 뒤에만 passed:true를 돌려준다. */
  async function handleTestBypassVerify() {
    setPhase("verifying");
    setError(null);
    try {
      const res = await fetch("/api/quests/verify-tmoney", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testBypass: true }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || "error" in body) {
        setError((body && "error" in body && body.error) || t("tmoney.submitFailed"));
        setPhase("pick");
        return;
      }
      const verifyResult = body as VerifyTmoneyApiResponse;
      setResult(verifyResult);
      setPhase("result");
      if (verifyResult.passed) onVerified();
    } catch (err) {
      console.error("[tmoney-verify] test bypass failed:", err);
      setError(t("tmoney.submitFailed"));
      setPhase("pick");
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.65)", display: "flex", flexDirection: "column" }}
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
              💳
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 18, marginBottom: 2 }}>
                {questTitle(quest, locale)}
              </h3>
              <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#666" }}>{questDesc(quest, locale)}</p>
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

          {phase === "result" && result ? (
            <ResultView result={result} onRetry={reset} onClose={onClose} />
          ) : bypassTmoneyVerification ? (
            <TesterBypassPanel phase={phase} error={error} onVerify={handleTestBypassVerify} />
          ) : (
            <>
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
                  cursor: phase === "verifying" ? "default" : "pointer",
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
                    <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                      {questTitle(quest, locale)}
                    </p>
                    <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#666" }}>{t("tmoney.choosePhotoHint")}</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  style={{ display: "none" }}
                  disabled={phase === "verifying"}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>

              {previewUrl && phase !== "verifying" && (
                <button
                  type="button"
                  className="kr-reset"
                  onClick={reset}
                  style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 12, color: "#666", marginBottom: 14, display: "block" }}
                >
                  {t("tmoney.retake")}
                </button>
              )}

              {error && (
                <p style={{ color: "#e11d48", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{error}</p>
              )}

              <p style={{ fontFamily: "Nunito", fontSize: 11, color: "#999", marginBottom: 14, lineHeight: 1.5 }}>
                {t("tmoney.privacyNote")}
              </p>

              <KButton
                bg={phase === "verifying" ? "#eee" : LIME}
                color={phase === "verifying" ? "#666" : "#111"}
                disabled={!file || phase === "verifying"}
                onClick={handleVerify}
              >
                {phase === "verifying" ? t("tmoney.verifying") : t("tmoney.verifyButton")}
              </KButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 테스터 전용 패널 — 사진 선택 UI를 아예 안 보여주고, "실제 AI 인증이 아니다"라는 게
 * 명백한 별도 CTA 하나만 보여준다(8절: "must be visually obvious as a test bypass").
 */
function TesterBypassPanel({
  phase,
  error,
  onVerify,
}: {
  phase: Phase;
  error: string | null;
  onVerify: () => void;
}) {
  const t = useT();
  return (
    <div
      style={{
        border: `2.5px dashed ${YELLOW}`,
        borderRadius: 16,
        padding: "20px 18px",
        background: "#FFFBEA",
        marginBottom: 14,
      }}
    >
      <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 12, color: "#a67c00", marginBottom: 8 }}>
        {t("common.testModeBadge")}
      </p>
      <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 16 }}>
        {t("tmoney.testBypassBody")}
      </p>
      {error && <p style={{ color: "#e11d48", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{error}</p>}
      <KButton
        bg={phase === "verifying" ? "#eee" : YELLOW}
        color={phase === "verifying" ? "#666" : "#111"}
        disabled={phase === "verifying"}
        onClick={onVerify}
      >
        {phase === "verifying" ? t("tmoney.testBypassVerifying") : t("tmoney.testBypassCta")}
      </KButton>
    </div>
  );
}

function ResultView({
  result,
  onRetry,
  onClose,
}: {
  result: VerifyTmoneyApiResponse;
  onRetry: () => void;
  onClose: () => void;
}) {
  const t = useT();

  if (result.passed) {
    const passTitle = result.bypassed ? t("tmoney.testBypassPassTitle") : t("tmoney.passTitle");
    const passBody = result.bypassed ? t("tmoney.testBypassPassBody") : t("tmoney.passBody");
    return (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: YELLOW,
            border: "2.5px solid #111111",
            boxShadow: "4px 4px 0 #111111",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            margin: "0 auto 16px",
          }}
        >
          {result.bypassed ? "🧪" : "⭐"}
        </div>
        <h4 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 18, color: PINK, marginBottom: 6 }}>
          {passTitle}
        </h4>
        <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#555", marginBottom: 18 }}>{passBody}</p>
        <KButton onClick={onClose}>{t("mission.continueCta")}</KButton>
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0" }}>
      <div
        style={{
          background: "#FFF0F0",
          border: "2.5px solid #111111",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 14,
        }}
      >
        <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 15, color: "#c0392b", marginBottom: 6 }}>
          {t("tmoney.failTitle")}
        </p>
        {result.reason && (
          <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#555", lineHeight: 1.5 }}>{result.reason}</p>
        )}
        {result.detectedBrand && (
          <div style={{ marginTop: 8 }}>
            <Pill bg="#eee" color="#666">
              {result.detectedBrand}
            </Pill>
          </div>
        )}
      </div>
      <KButton bg={LIME} color="#111" onClick={onRetry}>
        {t("tmoney.retryCta")}
      </KButton>
    </div>
  );
}
