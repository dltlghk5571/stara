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
 * - "walk": 도보 임계값 이내라 ODsay를 아예 호출하지 않은 짧은 구간(도보 구간은 detail
 *   요청이어도 항상 이 결과다 — ODsay 호출 자체가 없다)
 * - "itinerary": 사용자가 명시적으로 "상세 경로 보기"를 눌렀고(detail:true), 쿼터 예약에
 *   성공해 ODsay 상세 대중교통 경로 안내를 받아온 경우
 * - "estimate": 기본값(자동 로드, detail:false — ODsay를 아예 호출하지 않음) 이거나,
 *   detail:true였지만 ODsay를 쓸 수 없었던 경우(reason 참고). 실제 역/버스 정보를
 *   지어내지 않고 예상 소요시간만 보여준다.
 */
export type TransitGuideResponse =
  | { kind: "walk"; durationMinutes: number; distanceMeters: number }
  | { kind: "itinerary"; itinerary: TransitItinerary }
  | {
      kind: "estimate";
      durationMinutes: number;
      estimateSource: "tmap" | "haversine";
      /**
       * detail:true 요청이 ODsay를 쓰지 못한 이유. 기본(detail:false) 자동 로드
       * estimate에는 없다(정상 상태이지 실패가 아니므로) — "disabled"(ODSAY_ENABLED=false),
       * "quota_unavailable"(오늘치 예산 소진), "failed"(호출은 했지만 실패/경로없음/malformed).
       * API 키, DB 상세, provider 원본 에러 메시지는 절대 담지 않는다.
       */
      reason?: "disabled" | "quota_unavailable" | "failed";
    };
