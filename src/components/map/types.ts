// 지도 렌더링 구현(TMap 등)과 나머지 앱을 분리하기 위한 공용 인터페이스.
// 향후 다른 지도 SDK로 교체하더라도 이 타입만 지키면 화면 쪽 코드는 바꿀 필요가 없다.
export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  /** 방문 순서 번호 (없으면 숫자를 표시하지 않음) */
  order?: number;
  color: string;
  title: string;
  /** Route 탭 등에서 진행 상태별로 핀을 다르게 그릴 때 사용(없으면 기존처럼 color만 사용). */
  status?: "done" | "next" | "locked";
}

export interface MapViewProps {
  pins: MapPin[];
  /** 핀을 순서대로 연결하는 선을 표시할지 여부 */
  showPath?: boolean;
  /** TMAP 등에서 받은 실제 경로 좌표([lat,lng][]). 없으면 pins를 순서대로 이은 직선을 그린다. */
  routeGeometry?: [number, number][];
  onPinClick?: (id: string) => void;
  className?: string;
}
