"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { LIME } from "@/lib/kroute-tokens";
import type { Quest } from "@/types";
import { useT, useLocale, questTitle, questDesc } from "@/i18n";
import TmoneyVerifySheet from "./TmoneyVerifySheet";

interface Props {
  quest: Quest;
  completedQuestIds: string[];
  /** manual(체크박스) 퀘스트 전용 — verification.type이 있는 퀘스트에는 쓰지 않는다. */
  onToggle: (questId: string) => void;
  /** tmoney_photo처럼 서버 검증이 필요한 퀘스트가 성공했을 때만 호출된다(idempotent completeQuest). */
  onVerifiedComplete: (questId: string) => void;
}

const wrapperStyle: React.CSSProperties = {
  borderRadius: 14,
  border: `2px dashed #111111`,
  background: "#F7FFE0",
  padding: 12,
};

const kickerStyle: React.CSSProperties = {
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "Outfit",
  fontWeight: 900,
  fontSize: 11,
  letterSpacing: 0.5,
  color: "#7a9900",
};

/** 핀과 핀 사이 이동 구간의 보너스 서브 퀘스트 (필수 코스에는 포함되지 않음) */
export default function SubQuestList({ quest, completedQuestIds, onToggle, onVerifiedComplete }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const done = completedQuestIds.includes(quest.id);

  if (quest.verification?.type === "tmoney_photo") {
    return (
      <TmoneyPhotoSubQuest quest={quest} done={done} onVerified={() => onVerifiedComplete(quest.id)} />
    );
  }

  return (
    <div style={wrapperStyle}>
      <p style={kickerStyle}>
        <Sparkles size={14} /> {t("stamps.bonusSubQuest")}
      </p>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", minHeight: 44 }}>
        <input
          type="checkbox"
          checked={done}
          onChange={() => onToggle(quest.id)}
          style={{ marginTop: 2, width: 20, height: 20, flexShrink: 0, accentColor: LIME }}
        />
        <span>
          <span
            style={{
              display: "block",
              fontFamily: "Outfit",
              fontWeight: 700,
              fontSize: 13,
              color: done ? "#666" : "#111",
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {questTitle(quest, locale)}
          </span>
          <span style={{ display: "block", fontFamily: "Nunito", fontSize: 11, color: "#666" }}>
            {questDesc(quest, locale)}
          </span>
        </span>
      </label>
    </div>
  );
}

/**
 * verification.type === "tmoney_photo"인 퀘스트는 체크박스를 렌더링하지 않는다 — 사람이
 * 직접 완료 표시를 할 수 없고, 오직 서버의 passed:true 응답만 완료로 인정한다(GPS 없음,
 * 사진은 저장되지 않음. TmoneyVerifySheet 참고).
 */
function TmoneyPhotoSubQuest({ quest, done, onVerified }: { quest: Quest; done: boolean; onVerified: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div style={wrapperStyle}>
      <p style={kickerStyle}>
        <Sparkles size={14} /> {t("stamps.bonusSubQuest")}
      </p>
      {done ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
          <span
            style={{
              fontFamily: "Outfit",
              fontWeight: 700,
              fontSize: 13,
              color: "#666",
            }}
          >
            {questTitle(quest, locale)} — {t("tmoney.completedBadge")}
          </span>
        </div>
      ) : (
        <button
          type="button"
          className="kr-reset"
          onClick={() => setSheetOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            minHeight: 44,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13, color: "#111" }}>
            {t("tmoney.verifyCta")}
          </span>
        </button>
      )}
      {!done && (
        <span style={{ display: "block", fontFamily: "Nunito", fontSize: 11, color: "#666", marginTop: 2 }}>
          {questDesc(quest, locale)}
        </span>
      )}
      {sheetOpen && (
        <TmoneyVerifySheet
          quest={quest}
          onClose={() => setSheetOpen(false)}
          onVerified={() => {
            onVerified();
            setSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}
