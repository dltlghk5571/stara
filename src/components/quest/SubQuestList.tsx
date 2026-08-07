"use client";

import { Sparkles } from "lucide-react";
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
    <div className="rounded-xl border border-dashed border-fuchsia-300 bg-fuchsia-50/60 p-3 dark:border-fuchsia-800 dark:bg-fuchsia-950/20">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-300">
        <Sparkles size={14} /> 이동 중 보너스 서브 퀘스트
      </p>
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          onChange={() => onToggle(quest.id)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-fuchsia-600"
        />
        <span>
          <span
            className={`block text-sm font-semibold ${
              done ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-100"
            }`}
          >
            {quest.titleKo}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            {quest.descriptionKo}
          </span>
        </span>
      </label>
    </div>
  );
}
