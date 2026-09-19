"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useTransitItinerary } from "@/store/useTransitItinerary";
import { travelMinutesBetween } from "@/lib/distance";
import { stepChain, googleMapsDirectionsUrl } from "@/lib/transit/presentation";
import { useT, useLocale, placeName } from "@/i18n";
import { KCard } from "@/components/ui/kroute";
import { BLACK, BORDER, CYAN, LBLUE } from "@/lib/kroute-tokens";
import type { Place } from "@/types";
import type { TransitStep } from "@/lib/transit/types";

const label: CSSProperties = {
  fontFamily: "Outfit",
  fontWeight: 900,
  fontSize: 11,
  letterSpacing: 0.5,
  color: "#555",
};

/**
 * 이전 장소 → 다음 장소 구간의 실제 이동 안내. Place A(이전 체크포인트)와 세그먼트
 * 퀘스트 사이에 렌더링된다(TripShellClient의 RouteTab 참고) — T-money 세그먼트라면
 * "Place A → MovementGuide → T-money 인증 → Place B" 순서가 된다(8번 항목).
 *
 * 세 가지 카드 중 하나를 보여준다:
 * - 도보만으로 충분한 짧은 구간: 단순 WALK 카드(ODsay 호출 없음)
 * - ODsay 상세 경로 성공: 접힌 요약 + 펼치면 단계별 안내
 * - ODsay 실패/키없음/네트워크 오류: "대중교통 · 약 N분" 추정치 카드(역/버스 정보를
 *   지어내지 않는다) — 항상 "지도에서 열기" 외부 링크를 함께 보여준다.
 */
export default function MovementGuide({ from, to }: { from: Place; to: Place }) {
  const t = useT();
  const { locale } = useLocale();
  const state = useTransitItinerary(from, to, locale);
  const [expanded, setExpanded] = useState(false);
  const mapUrl = googleMapsDirectionsUrl(from, to);

  if (state.status === "loading") {
    return (
      <KCard style={{ padding: "14px 16px", marginBottom: 10, background: "#F5F5F5" }}>
        <p style={label}>{t("movement.nextMove")}</p>
        <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#666", marginTop: 4 }}>
          {t("movement.loadingDirections")}
        </p>
      </KCard>
    );
  }

  // 네트워크/서버 오류 — 클라이언트에서 직접 Haversine 추정치를 계산해 estimate 카드와
  // 동일하게 보여준다(추가 API 호출 없이 10번 항목의 폴백 계층을 완성한다).
  if (state.status === "error") {
    return <EstimateCard minutes={Math.round(travelMinutesBetween(from, to))} mapUrl={mapUrl} />;
  }

  const { data } = state;

  if (data.kind === "walk") {
    return (
      <KCard style={{ padding: "14px 16px", marginBottom: 10, background: "#FFF9E6" }}>
        <p style={label}>{t("movement.nextMove")}</p>
        <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, marginTop: 6 }}>
          🚶 {t("movement.walkLabel")} — {placeName(to, locale)}
        </p>
        <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#666", marginTop: 2 }}>
          {t("movement.walkDuration", { min: data.durationMinutes, m: data.distanceMeters })}
        </p>
      </KCard>
    );
  }

  if (data.kind === "estimate") {
    return <EstimateCard minutes={data.durationMinutes} mapUrl={mapUrl} />;
  }

  const { itinerary } = data;
  const chain = stepChain(itinerary.steps);

  return (
    <KCard style={{ padding: "14px 16px", marginBottom: 10, background: LBLUE }}>
      <p style={label}>{t("movement.nextMove")}</p>
      <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 15, marginTop: 4 }}>
        {placeName(to, locale)}
      </p>
      <p style={{ fontFamily: "Nunito", fontSize: 12, fontWeight: 700, color: "#333", marginTop: 2 }}>
        {t("common.minutes", { n: itinerary.totalMinutes })}
        {itinerary.transferCount ? ` · ${t("movement.transferCount", { n: itinerary.transferCount })}` : ""}
      </p>
      <p style={{ fontFamily: "Nunito", fontSize: 13, marginTop: 6 }}>{chain.join(" → ")}</p>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          type="button"
          className="kr-reset"
          onClick={() => setExpanded((v) => !v)}
          style={{
            flex: 1,
            minHeight: 36,
            borderRadius: 10,
            border: BORDER,
            background: expanded ? BLACK : CYAN,
            color: expanded ? "#fff" : BLACK,
            fontFamily: "Outfit",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {expanded ? t("movement.hideDirections") : t("movement.viewDirections")}
        </button>
        <OpenInMapLink mapUrl={mapUrl} />
      </div>

      {expanded && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {itinerary.steps.map((step, i) => (
            <TransitStepRow key={i} index={i} step={step} />
          ))}
        </div>
      )}
    </KCard>
  );
}

function EstimateCard({ minutes, mapUrl }: { minutes: number; mapUrl: string }) {
  const t = useT();
  return (
    <KCard style={{ padding: "14px 16px", marginBottom: 10, background: "#F5F5F5" }}>
      <p style={label}>{t("movement.nextMove")}</p>
      <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, marginTop: 6 }}>
        {t("movement.estimatedTransit", { n: minutes })}
      </p>
      <div style={{ marginTop: 10 }}>
        <OpenInMapLink mapUrl={mapUrl} />
      </div>
    </KCard>
  );
}

function OpenInMapLink({ mapUrl }: { mapUrl: string }) {
  const t = useT();
  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="kr-reset"
      style={{
        flex: 1,
        minHeight: 36,
        borderRadius: 10,
        border: BORDER,
        background: "#fff",
        color: BLACK,
        fontFamily: "Outfit",
        fontWeight: 700,
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
      }}
    >
      {t("movement.openInMap")}
    </a>
  );
}

function TransitStepRow({ index, step }: { index: number; step: TransitStep }) {
  const t = useT();
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 12, color: "#999", flexShrink: 0 }}>
        {index + 1}.
      </span>
      <div style={{ flex: 1 }}>
        {step.type === "walk" && (
          <>
            <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13 }}>
              🚶 {t("movement.walkLabel")}
            </p>
            <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#444", marginTop: 2 }}>
              {step.toName ? t("movement.walkTo", { name: step.toName }) : t("movement.walkToDestination")}
            </p>
            <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#666", marginTop: 1 }}>
              {t("movement.walkDuration", { min: step.durationMinutes, m: step.distanceMeters })}
            </p>
          </>
        )}
        {step.type === "subway" && (
          <>
            <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13 }}>
              🚇 {t("movement.subwayLabelWord")}
            </p>
            <p style={{ fontFamily: "Nunito", fontSize: 12, fontWeight: 700, color: "#111", marginTop: 2 }}>
              {step.lineName}
            </p>
            <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#444", marginTop: 1 }}>
              {step.startName} → {step.endName}
            </p>
            {step.direction && (
              <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#666", marginTop: 1 }}>
                {t("movement.toward", { destination: step.direction })}
              </p>
            )}
            <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#666", marginTop: 1 }}>
              {t("movement.subwayStops", { stops: step.stationCount, min: step.durationMinutes })}
            </p>
          </>
        )}
        {step.type === "bus" && (
          <>
            <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13 }}>
              🚌 {t("movement.busLabelWord")} {step.busNumber}
            </p>
            <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#444", marginTop: 1 }}>
              {step.startName} → {step.endName}
            </p>
            <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#666", marginTop: 1 }}>
              {t("movement.busStops", { stops: step.stationCount, min: step.durationMinutes })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
