// MovementGuide(UI)가 쓰는 순수 표시 로직 — 번역이 필요 없는 부분만 여기 둔다(React 렌더링
// 테스트 인프라가 이 저장소에 아직 없어서, 로직은 최대한 순수 함수로 뽑아 여기서 테스트한다).

import type { TransitItinerary, TransitStep } from "./types";

/** 접힌 요약 줄에 쓰는 아이콘+데이터 체인. 예: ["🚶", "🚇 수인분당선", "🚌 421"].
 *  노선명/버스번호는 API가 실제로 준 값 그대로다 — 지어내지 않는다. */
export function stepChain(steps: TransitStep[]): string[] {
  return steps.map((s) => {
    if (s.type === "walk") return "🚶";
    if (s.type === "subway") return `🚇 ${s.lineName}`;
    return `🚌 ${s.busNumber}`;
  });
}

/** 도보를 제외한 실제 교통수단 구간 수(환승 횟수 계산에 쓰인다 — odsayClient.ts와 동일 정의). */
export function transitStepCount(itinerary: TransitItinerary): number {
  return itinerary.steps.filter((s) => s.type !== "walk").length;
}

/** 외부 지도 앱으로 넘기는 "Open in map" CTA 링크. API 키가 필요 없는 유일한 폴백이라
 *  ODsay 실패 시에도 항상 렌더링할 수 있다(13번 항목: 기존 외부 내비게이션 폴백 유지). */
export function googleMapsDirectionsUrl(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${from.latitude},${from.longitude}`,
    destination: `${to.latitude},${to.longitude}`,
    travelmode: "transit",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
