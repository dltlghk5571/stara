// 지도 렌더링 구현(Leaflet 등)과 나머지 앱을 분리하기 위한 공용 인터페이스.
// 향후 다른 지도 SDK로 교체하더라도 이 타입만 지키면 화면 쪽 코드는 바꿀 필요가 없다.
export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  /** 방문 순서 번호 (없으면 숫자를 표시하지 않음) */
  order?: number;
  color: string;
  title: string;
}

export interface MapViewProps {
  pins: MapPin[];
  /** 핀을 순서대로 연결하는 선을 표시할지 여부 */
  showPath?: boolean;
  onPinClick?: (id: string) => void;
  className?: string;
}
