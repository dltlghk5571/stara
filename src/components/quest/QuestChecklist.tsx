"use client";

import { Award, Check } from "lucide-react";
import type { Quest } from "@/types";

interface Props {
  quests: Quest[];
  completedQuestIds: string[];
  onToggle: (questId: string) => void;
  stampClaimed: boolean;
  onClaimStamp: () => void;
}

/** 체크포인트 필수 퀘스트 체크리스트 + 스탬프 받기 버튼 */
export default function QuestChecklist({
  quests,
  completedQuestIds,
  onToggle,
  stampClaimed,
  onClaimStamp,
}: Props) {
  const allDone = quests.every((q) => completedQuestIds.includes(q.id));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-slate-400">필수 퀘스트</p>
      <ul className="flex flex-col gap-2">
        {quests.map((q) => {
          const done = completedQuestIds.includes(q.id);
          return (
            <li key={q.id}>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => onToggle(q.id)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-fuchsia-600"
                />
                <span>
                  <span
                    className={`block text-sm font-semibold ${
                      done
                        ? "text-slate-400 line-through"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {q.titleKo}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {q.descriptionKo}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        disabled={!allDone || stampClaimed}
        onClick={onClaimStamp}
        className="mt-1 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {stampClaimed ? (
          <>
            <Check size={18} /> 스탬프 획득 완료
          </>
        ) : (
          <>
            <Award size={18} /> 스탬프 받기
          </>
        )}
      </button>
    </div>
  );
}
