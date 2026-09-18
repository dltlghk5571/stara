"use client";

import { useVerificationCapabilities } from "@/lib/auth/useVerificationCapabilities";
import { useT } from "@/i18n";
import { YELLOW } from "@/lib/kroute-tokens";

/**
 * 테스터 계정으로 로그인했을 때만 보이는 작은 전역 표시. 화면을 압도하지 않게 구석에
 * 고정하고, 일반 유저에게는 아무것도 렌더링하지 않는다 — 데모/테스트 스크린샷이 정상
 * 인증 흐름으로 오인되지 않도록 하기 위함이다(12절).
 */
export default function TestModeBadge() {
  const t = useT();
  const { isTester } = useVerificationCapabilities();
  if (!isTester) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        zIndex: 100,
        background: YELLOW,
        border: "2px solid #111111",
        borderRadius: 8,
        padding: "3px 8px",
        fontFamily: "Outfit",
        fontWeight: 900,
        fontSize: 10,
        letterSpacing: 0.5,
        color: "#111111",
        pointerEvents: "none",
      }}
    >
      {t("common.testModeBadge")}
    </div>
  );
}
