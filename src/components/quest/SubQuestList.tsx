"use client";

import { Sparkles } from "lucide-react";
import { LIME } from "@/lib/kroute-tokens";
import type { Quest } from "@/types";

interface Props {
  quest: Quest;
  completedQuestIds: string[];
  onToggle: (questId: string) => void;
}

/** 핀과 핀 사이 이동 구간의 보너스 서브 퀘스트 (필수 코스에는 포함되지 않음) */
export default function SubQuestList({ quest, completedQuestIds, onToggle }: Props) {
  const done = completedQuestIds.includes(quest.id);
  return (
    <div
      style={{
        borderRadius: 14,
        border: `2px dashed #111111`,
        background: "#F7FFE0",
        padding: 12,
      }}
    >
      <p
        style={{
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "Outfit",
          fontWeight: 900,
          fontSize: 11,
          letterSpacing: 0.5,
          color: "#7a9900",
        }}
      >
        <Sparkles size={14} /> BONUS · 이동 중 서브 퀘스트
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
              color: done ? "#aaa" : "#111",
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {quest.titleKo}
          </span>
          <span style={{ display: "block", fontFamily: "Nunito", fontSize: 11, color: "#888" }}>
            {quest.descriptionKo}
          </span>
        </span>
      </label>
    </div>
  );
}
