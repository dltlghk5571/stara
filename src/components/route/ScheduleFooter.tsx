"use client";

import { useState, type CSSProperties } from "react";
import { AlertTriangle, Clock, Minus, Plus } from "lucide-react";
import type { ScheduleResult } from "@/types";
import type { RemovalSuggestion } from "@/store/useTripPlan";
import type { Locale } from "@/i18n";
import { useT, useLocale, placeName } from "@/i18n";
import { formatTime, toHHMM, toMinutes } from "@/lib/time";

const STEP_MINUTES = 30;
const MINUTES_PER_DAY = 24 * 60;

/** 네이티브 `<input type="time">`는 AM/PM 표기를 브라우저/OS 로케일로 그려서 STARA
 *  UI 언어와 어긋날 수 있다(예: 영문 UI인데 "오전/오후"로 표시). 그래서 직접 값을
 *  들고 있는 스테퍼로 대체하고, 표시는 항상 formatTime(로케일 고정)으로만 한다 —
 *  화면도 훨씬 덜 차지한다(30분 단위 +/-, 네이티브 피커 팝업 없음). */
function TimeStepper({
  label,
  value,
  locale,
  onChange,
}: {
  label: string;
  value: string;
  locale: Locale;
  onChange: (time: string) => void;
}) {
  function step(deltaMinutes: number) {
    const next = (toMinutes(value) + deltaMinutes + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    onChange(toHHMM(next));
  }
  const btnStyle: CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: "1.5px solid #e7e2d4",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--navy)",
    flexShrink: 0,
  };
  return (
    <div className="time-field" style={{ gap: 6 }}>
      <span>{label}</span>
      <button type="button" onClick={() => step(-STEP_MINUTES)} aria-label={`-${STEP_MINUTES}min`} style={btnStyle}>
        <Minus size={12} />
      </button>
      <span style={{ minWidth: 72, textAlign: "center" }}>{formatTime(value, locale)}</span>
      <button type="button" onClick={() => step(STEP_MINUTES)} aria-label={`+${STEP_MINUTES}min`} style={btnStyle}>
        <Plus size={12} />
      </button>
    </div>
  );
}

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
  // 스테퍼 두 개를 상시 노출하면 /edit 하단이 꽉 차서, 평소엔 한 줄 요약만 두고
  // 누를 때만 팝업으로 연다(팝업 스타일은 기존 .confirm-add-* 를 그대로 재사용).
  const [timeEditorOpen, setTimeEditorOpen] = useState(false);
  return (
    <div className="schedule-footer">
      <div className="row">
        {editable ? (
          <button
            type="button"
            className="time-field"
            style={{ border: "none", background: "none", padding: 0, font: "inherit", cursor: "pointer" }}
            onClick={() => setTimeEditorOpen(true)}
          >
            <Clock size={16} />
            {formatTime(startTime!, locale)}
            {endTime && ` – ${formatTime(endTime, locale)}`}
          </button>
        ) : (
          <div className="time-field">
            <Clock size={16} />
            {t("schedule.endEstimate", { time: formatTime(schedule.endTime, locale) })}
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
          {t("schedule.endEstimate", { time: formatTime(schedule.endTime, locale) })}
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
                  ? t("schedule.endTimeLabel", { time: formatTime(endTime, locale) })
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

      {editable && (
        <div className={`confirm-add-overlay${timeEditorOpen ? " open" : ""}`} onClick={() => setTimeEditorOpen(false)}>
          <div className="confirm-add-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
              <TimeStepper label={t("schedule.start")} value={startTime!} locale={locale} onChange={onStartTimeChange!} />
              {endTime && onEndTimeChange && (
                <TimeStepper label={t("schedule.end")} value={endTime} locale={locale} onChange={onEndTimeChange} />
              )}
            </div>
            <button
              type="button"
              className="btn btn-coral"
              style={{ marginTop: "16px", height: "40px", width: "100%", fontSize: "12.5px" }}
              onClick={() => setTimeEditorOpen(false)}
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
