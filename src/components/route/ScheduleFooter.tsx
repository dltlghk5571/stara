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
  endTime?: string;
  onEndTimeChange?: (time: string) => void;
}

/** 장소를 추가·삭제할 때마다 실시간으로 갱신되는 종료시각/이동시간 요약 바 */
export default function ScheduleFooter({
  schedule,
  removalSuggestion,
  onRemoveSuggestion,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
}: Props) {
  const editable = Boolean(startTime && onStartTimeChange);
  return (
    <div className="schedule-footer">
      <div className="row">
        {editable ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label className="time-field">
              <Clock size={16} />
              시작
              <input type="time" value={startTime} onChange={(e) => onStartTimeChange!(e.target.value)} />
            </label>
            {endTime && onEndTimeChange && (
              <label className="time-field">
                종료
                <input type="time" value={endTime} onChange={(e) => onEndTimeChange(e.target.value)} />
              </label>
            )}
          </div>
        ) : (
          <div className="time-field">
            <Clock size={16} />
            종료 예상 {schedule.endTime}
          </div>
        )}
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "var(--gray)" }}>
          이동 {schedule.totalTravelMinutes}분 · 체류 {schedule.totalDwellMinutes}분
        </span>
      </div>
      {editable && (
        <p style={{ marginTop: "4px", fontSize: "11px", color: "var(--gray)" }}>종료 예상 {schedule.endTime}</p>
      )}

      {schedule.isOverLimit && (
        <div className="warning">
          <AlertTriangle size={16} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700 }}>
              {endTime ? `종료 시각(${endTime})` : "종료 예정 시각"}을{" "}
              {schedule.overLimitMinutes}분 초과할 예정이에요.
            </p>
            {removalSuggestion && (
              <p style={{ marginTop: "4px" }}>
                &apos;{removalSuggestion.place.nameKo}&apos; 를 제거하면 약{" "}
                {Math.round(removalSuggestion.detourMinutes)}분을 절약할 수 있어요.
                {onRemoveSuggestion && (
                  <button
                    type="button"
                    onClick={onRemoveSuggestion}
                    style={{ marginLeft: "8px", borderRadius: "100px", background: "#e11d48", padding: "2px 10px", fontWeight: 700, color: "#fff", border: "none" }}
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
