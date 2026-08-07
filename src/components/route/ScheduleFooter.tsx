"use client";

import { AlertTriangle, Clock } from "lucide-react";
import type { ScheduleResult } from "@/types";
import type { RemovalSuggestion } from "@/store/useTripPlan";

interface Props {
  schedule: ScheduleResult;
  removalSuggestion: RemovalSuggestion | null;
  onRemoveSuggestion?: () => void;
  startTime?: string;
  onStartTimeChange?: (time: string) => void;
}

/** 장소를 추가·삭제할 때마다 실시간으로 갱신되는 종료시각/이동시간 요약 바 */
export default function ScheduleFooter({
  schedule,
  removalSuggestion,
  onRemoveSuggestion,
  startTime,
  onStartTimeChange,
}: Props) {
  return (
    <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between text-sm">
        {startTime && onStartTimeChange ? (
          <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
            <Clock size={16} />
            출발
            <input
              type="time"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className="min-h-8 rounded-lg border border-slate-200 bg-transparent px-1.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            />
          </label>
        ) : (
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
            <Clock size={16} />
            종료 예상 {schedule.endTime}
          </div>
        )}
        <span className="text-xs text-slate-400">
          이동 {schedule.totalTravelMinutes}분 · 체류 {schedule.totalDwellMinutes}분
        </span>
      </div>
      {startTime && onStartTimeChange && (
        <p className="mt-1 text-xs text-slate-400">종료 예상 {schedule.endTime}</p>
      )}

      {schedule.isOverLimit && (
        <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">
              오후 9시를 {schedule.overLimitMinutes}분 초과할 예정이에요.
            </p>
            {removalSuggestion && (
              <p className="mt-1">
                &apos;{removalSuggestion.place.nameKo}&apos; 를 제거하면 약{" "}
                {Math.round(removalSuggestion.detourMinutes)}분을 절약할 수 있어요.
                {onRemoveSuggestion && (
                  <button
                    type="button"
                    onClick={onRemoveSuggestion}
                    className="ml-2 min-h-6 rounded-full bg-rose-600 px-2 py-0.5 font-semibold text-white"
                  >
                    이 장소 제거
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
