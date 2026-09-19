// STARA 대중교통 이동 안내(transit)의 도메인 표현. ODsay 원본 JSON을 UI 전역에 직접
// 노출하지 않고, 이 안정된 타입으로만 다룬다(odsayClient.ts의 parseOdsayResponse가 변환).

export interface Coordinate {
  lat: number;
  lng: number;
}

export type TransitStep =
  | {
      type: "walk";
      durationMinutes: number;
      distanceMeters: number;
      /** ODsay subPath.endName이 있을 때만 채움(예: 다음 역/정류장 이름) — 없으면 생략, 지어내지 않는다. */
      toName?: string;
    }
  | {
      type: "subway";
      lineName: string;
      direction?: string;
      startName: string;
      endName: string;
      stationCount: number;
      durationMinutes: number;
    }
  | {
      type: "bus";
      busNumber: string;
      startName: string;
      endName: string;
      stationCount: number;
      durationMinutes: number;
    };

export interface TransitItinerary {
  fromPlaceId: string;
  toPlaceId: string;
  totalMinutes: number;
  transferCount?: number;
  totalWalkMinutes?: number;
  fare?: number;
  steps: TransitStep[];
  source: "odsay";
}

/**
 * /api/transit가 실제로 반환하는 최상위 응답. 세 갈래:
 * - "walk": 도보 임계값 이내라 ODsay를 아예 호출하지 않은 짧은 구간(6번 항목 참고)
 * - "itinerary": ODsay 상세 대중교통 경로 안내 성공
 * - "estimate": ODsay 실패/키없음/경로없음 — TMAP/Haversine 추정치로 폴백(10번 항목 참고).
 *   실제 역/버스 정보를 지어내지 않고 예상 소요시간만 보여준다.
 */
export type TransitGuideResponse =
  | { kind: "walk"; durationMinutes: number; distanceMeters: number }
  | { kind: "itinerary"; itinerary: TransitItinerary }
  | { kind: "estimate"; durationMinutes: number; estimateSource: "tmap" | "haversine" };
