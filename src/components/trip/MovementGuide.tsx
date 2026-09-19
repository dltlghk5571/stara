"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useTransitEstimate, fetchTransitGuide } from "@/store/useTransitEstimate";
import { travelMinutesBetween, isTransitSegment } from "@/lib/distance";
import { stepChain, googleMapsDirectionsUrl } from "@/lib/transit/presentation";
import { useT, useLocale, placeName } from "@/i18n";
import { KCard } from "@/components/ui/kroute";
import { BLACK, BORDER, CYAN, LBLUE } from "@/lib/kroute-tokens";
import type { Place } from "@/types";
import type { TransitItinerary, TransitStep } from "@/lib/transit/types";

type DetailState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; itinerary: TransitItinerary }
  | { phase: "unavailable"; reason?: "disabled" | "quota_unavailable" | "failed" };

const label: CSSProperties = {
  fontFamily: "Outfit",
  fontWeight: 900,
  fontSize: 11,
  letterSpacing: 0.5,
  color: "#555",
};

/**
 * 이전 장소 → 다음 장소 구간의 이동 안내. Place A(이전 체크포인트)와 세그먼트 퀘스트
 * 사이에 렌더링된다(TripShellClient의 RouteTab 참고, currentIndex-1 → currentIndex인
 * 현재 활성 구간 하나에만 붙는다 — 미래 구간을 미리 불러오지 않는다).
 *
 * 마운트 시 자동으로 가져오는 건 기본 추정치(도보 또는 TMAP/Haversine estimate)뿐이다
 * — ODsay는 절대 자동 호출하지 않는다. 사용자가 "상세 대중교통 경로 보기"를 직접 눌러야만
 * 그때 딱 한 번 /api/transit(detail:true)를 요청한다(서버가 그 요청에서만 쿼터를
 * 원자적으로 소비하고 ODsay를 호출한다 — src/app/api/transit/route.ts 참고). 실패/쿼터
 * 소진이어도 기존 추정치 + "지도에서 길찾기" 링크는 항상 그대로 남는다.
 */
export default function MovementGuide({ from, to }: { from: Place; to: Place }) {
  const t = useT();
  const { locale } = useLocale();
  const estimate = useTransitEstimate(from, to, locale);
  const [detail, setDetail] = useState<DetailState>({ phase: "idle" });
  const [expanded, setExpanded] = useState(false);
  const mapUrl = googleMapsDirectionsUrl(from, to);

  async function requestDetail() {
    setDetail({ phase: "loading" });
    const result = await fetchTransitGuide(from, to, locale, true);
    if (result?.kind === "itinerary") {
      setDetail({ phase: "ready", itinerary: result.itinerary });
      setExpanded(true);
    } else {
      setDetail({
        phase: "unavailable",
        reason: result?.kind === "estimate" ? result.reason : undefined,
      });
    }
  }

  if (estimate.status === "loading") {
    return (
      <KCard style={{ padding: "14px 16px", marginBottom: 10, background: "#F5F5F5" }}>
        <p style={label}>{t("movement.nextMove")}</p>
        <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#666", marginTop: 4 }}>
          {t("movement.loadingDirections")}
        </p>
      </KCard>
    );
  }

  // 기본 추정치 요청 자체가 실패(네트워크 등)해도 트립을 막지 않는다 — 좌표로 즉석 계산한
  // 값을 보여준다(서버와 같은 도보 임계값 공식이라 판정이 갈리지 않는다). 이 경로도 ODsay를
  // 전혀 호출하지 않는다.
  if (estimate.status === "error") {
    const minutes = Math.round(travelMinutesBetween(from, to));
    if (!isTransitSegment(from, to)) {
      return <WalkCard to={to} minutes={minutes} />;
    }
    return (
      <BaseCard
        to={to}
        minutes={minutes}
        mapUrl={mapUrl}
        detail={detail}
        onRequestDetail={requestDetail}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
      />
    );
  }

  if (estimate.data.kind === "walk") {
    return <WalkCard to={to} minutes={estimate.data.durationMinutes} distanceMeters={estimate.data.distanceMeters} />;
  }

  return (
    <BaseCard
      to={to}
      minutes={estimate.data.durationMinutes}
      mapUrl={mapUrl}
      detail={detail}
      onRequestDetail={requestDetail}
      expanded={expanded}
      onToggleExpand={() => setExpanded((v) => !v)}
    />
  );
}

function WalkCard({ to, minutes, distanceMeters }: { to: Place; minutes: number; distanceMeters?: number }) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <KCard style={{ padding: "14px 16px", marginBottom: 10, background: "#FFF9E6" }}>
      <p style={label}>{t("movement.nextMove")}</p>
      <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, marginTop: 6 }}>
        🚶 {t("movement.walkLabel")} — {placeName(to, locale)}
      </p>
      <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#666", marginTop: 2 }}>
        {t("movement.walkDuration", { min: minutes, m: distanceMeters ?? 0 })}
      </p>
    </KCard>
  );
}

function BaseCard({
  to,
  minutes,
  mapUrl,
  detail,
  onRequestDetail,
  expanded,
  onToggleExpand,
}: {
  to: Place;
  minutes: number;
  mapUrl: string;
  detail: DetailState;
  onRequestDetail: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const isReady = detail.phase === "ready";

  return (
    <KCard style={{ padding: "14px 16px", marginBottom: 10, background: isReady ? LBLUE : "#F5F5F5" }}>
      <p style={label}>{t("movement.nextMove")}</p>
      <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 15, marginTop: 4 }}>
        {placeName(to, locale)}
      </p>
      <p style={{ fontFamily: "Nunito", fontSize: 12, fontWeight: 700, color: "#333", marginTop: 2 }}>
        {isReady
          ? t("common.minutes", { n: detail.itinerary.totalMinutes }) +
            (detail.itinerary.transferCount
              ? ` · ${t("movement.transferCount", { n: detail.itinerary.transferCount })}`
              : "")
          : t("movement.estimatedTransit", { n: minutes })}
      </p>
      {isReady && expanded && (
        <p style={{ fontFamily: "Nunito", fontSize: 13, marginTop: 6 }}>
          {stepChain(detail.itinerary.steps).join(" → ")}
        </p>
      )}

      {detail.phase === "unavailable" && (
        <p style={{ fontFamily: "Nunito", fontSize: 12, color: "#996600", marginTop: 6 }}>
          {t("movement.detailUnavailable")}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <DetailButton detail={detail} expanded={expanded} onRequestDetail={onRequestDetail} onToggleExpand={onToggleExpand} />
        <OpenInMapLink mapUrl={mapUrl} />
      </div>

      {isReady && expanded && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {detail.itinerary.steps.map((step, i) => (
            <TransitStepRow key={i} index={i} step={step} />
          ))}
          <p style={{ fontFamily: "Nunito", fontSize: 10, color: "#999", marginTop: 2 }}>
            {t("movement.poweredByOdsay")}
          </p>
        </div>
      )}
    </KCard>
  );
}

function DetailButton({
  detail,
  expanded,
  onRequestDetail,
  onToggleExpand,
}: {
  detail: DetailState;
  expanded: boolean;
  onRequestDetail: () => void;
  onToggleExpand: () => void;
}) {
  const t = useT();

  if (detail.phase === "loading") {
    return (
      <button type="button" className="kr-reset" disabled style={buttonStyle(false, true)}>
        {t("movement.loadingDetailedRoute")}
      </button>
    );
  }

  if (detail.phase === "ready") {
    return (
      <button type="button" className="kr-reset" onClick={onToggleExpand} style={buttonStyle(expanded, false)}>
        {expanded ? t("movement.hideDirections") : t("movement.viewDetailedRoute")}
      </button>
    );
  }

  // idle 또는 unavailable(재시도) — 둘 다 명시적 클릭으로만 요청을 트리거한다(자동 재시도 없음).
  return (
    <button type="button" className="kr-reset" onClick={onRequestDetail} style={buttonStyle(false, false)}>
      {detail.phase === "unavailable" ? t("common.retry") : t("movement.viewDetailedRoute")}
    </button>
  );
}

function buttonStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    border: BORDER,
    background: active ? BLACK : disabled ? "#ddd" : CYAN,
    color: active ? "#fff" : BLACK,
    fontFamily: "Outfit",
    fontWeight: 700,
    fontSize: 12,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
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
