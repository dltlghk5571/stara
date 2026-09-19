// STARA 대중교통 이동 안내(transit)의 도메인 표현. 제공사(ODsay/TMAP Transit 등) 원본
// JSON을 UI 전역에 직접 노출하지 않고, 이 안정된 타입으로만 다룬다 — 제공사별 매퍼
// (tmapTransitClient.ts의 parseTmapTransitResponse 등)가 이 형태로 변환한다.

export interface Coordinate {
  lat: number;
  lng: number;
}

/**
 * 이 경로 안내를 실제로 만들어준 제공사. 새 제공사를 추가하면 여기에만 값을 늘린다.
 * "odsay"는 더 이상 활성 경로가 아니다(ODSAY_ENABLED=false, route.ts가 더 이상 호출하지
 * 않음) — odsayClient.ts는 TMAP Transit이 실제 운영에서 검증된 뒤에 완전히 제거될 때까지
 * 컴파일 가능한 상태로만 남겨둔다.
 */
export type TransitProvider = "tmap_transit" | "odsay";

export type TransitStep =
  | {
      type: "walk";
      durationMinutes: number;
      distanceMeters: number;
      /** 업스트림 응답에 다음 역/정류장 이름이 있을 때만 채움 — 없으면 생략, 지어내지 않는다. */
      toName?: string;
    }
  | {
      type: "subway";
      lineName: string;
      /** 업스트림이 실제로 방향/행선지 정보를 줄 때만 채움 — 없으면 생략한다(지어내지 않음). */
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
  provider: TransitProvider;
}

/**
 * /api/transit가 실제로 반환하는 최상위 응답. 세 갈래:
 * - "walk": 도보 임계값 이내라 상세 대중교통 API를 아예 호출하지 않은 짧은 구간(도보
 *   구간은 detail 요청이어도 항상 이 결과다 — 업스트림 호출 자체가 없다)
 * - "itinerary": 사용자가 명시적으로 "상세 경로 보기"를 눌렀고(detail:true), 캐시 히트
 *   또는 쿼터 예약 성공 후 실제 업스트림에서 상세 대중교통 경로 안내를 받아온 경우
 * - "estimate": 기본값(자동 로드, detail:false — 업스트림을 아예 호출하지 않음) 이거나,
 *   detail:true였지만 상세 경로를 쓸 수 없었던 경우(reason 참고). 실제 역/버스 정보를
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
       * detail:true 요청이 상세 경로 제공사를 쓰지 못한 이유. 기본(detail:false) 자동
       * 로드 estimate에는 없다(정상 상태이지 실패가 아니므로) — "disabled"(제공사 기능
       * 꺼짐), "quota_unavailable"(오늘치 예산 소진), "failed"(호출은 했지만
       * 실패/경로없음/malformed). API 키, DB 상세, provider 원본 에러 메시지는 절대
       * 담지 않는다.
       */
      reason?: "disabled" | "quota_unavailable" | "failed";
    };
