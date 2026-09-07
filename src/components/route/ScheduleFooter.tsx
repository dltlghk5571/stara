"use client";

import { AlertTriangle, Clock } from "lucide-react";
import type { ScheduleResult } from "@/types";
import type { RemovalSuggestion } from "@/store/useTripPlan";
import { useT, useLocale, placeName } from "@/i18n";

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
  const t = useT();
  const { locale } = useLocale();
  const editable = Boolean(startTime && onStartTimeChange);
  return (
    <div className="schedule-footer">
      <div className="row">
        {editable ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label className="time-field">
              <Clock size={16} />
              {t("schedule.start")}
              <input type="time" value={startTime} onChange={(e) => onStartTimeChange!(e.target.value)} />
            </label>
            {endTime && onEndTimeChange && (
              <label className="time-field">
                {t("schedule.end")}
                <input type="time" value={endTime} onChange={(e) => onEndTimeChange(e.target.value)} />
              </label>
            )}
          </div>
        ) : (
          <div className="time-field">
            <Clock size={16} />
            {t("schedule.endEstimate", { time: schedule.endTime })}
          </div>
        )}
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "var(--gray)" }}>
          {t("schedule.travelDwell", {
            travel: schedule.totalTravelMinutes,
            dwell: schedule.totalDwellMinutes,
          })}
        </span>
      </div>
      {editable && (
        <p style={{ marginTop: "4px", fontSize: "11px", color: "var(--gray)" }}>
          {t("schedule.endEstimate", { time: schedule.endTime })}
        </p>
      )}

      {schedule.isOverLimit && (
        <div className="warning">
          <AlertTriangle size={16} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700 }}>
              {t("schedule.overByTitle", {
                n: schedule.overLimitMinutes,
                label: endTime
                  ? t("schedule.endTimeLabel", { time: endTime })
                  : t("schedule.endTimePlanned"),
              })}
            </p>
            {removalSuggestion && (
              <p style={{ marginTop: "4px" }}>
                {t("schedule.removeSuggestion", {
                  name: placeName(removalSuggestion.place, locale),
                  n: Math.round(removalSuggestion.detourMinutes),
                })}
                {onRemoveSuggestion && (
                  <button
                    type="button"
                    onClick={onRemoveSuggestion}
                    style={{ marginLeft: "8px", borderRadius: "100px", background: "#e11d48", padding: "2px 10px", fontWeight: 700, color: "#fff", border: "none" }}
                  >
                    {t("schedule.removeThisPlace")}
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
