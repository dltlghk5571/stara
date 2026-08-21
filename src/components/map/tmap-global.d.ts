// TMap JS SDK는 <script> 태그로 로드되는 전역 객체라 별도 npm 타입 패키지가 없다.
export {};

declare global {
  interface Window {
    Tmapv2?: {
      Map: new (el: HTMLElement, options: Record<string, unknown>) => TmapMapInstance;
      LatLng: new (lat: number, lng: number) => TmapLatLngInstance;
      LatLngBounds: new () => { extend: (latLng: unknown) => void };
      Size: new (width: number, height: number) => unknown;
      Marker: new (options: Record<string, unknown>) => TmapMarkerInstance;
      Polyline: new (options: Record<string, unknown>) => { setMap: (map: unknown) => void };
    };
  }
}

interface TmapLatLngInstance {
  lat: () => number;
  lng: () => number;
}

interface TmapClickEvent {
  latLng: TmapLatLngInstance;
}

interface TmapMapInstance {
  setCenter: (latLng: unknown) => void;
  setZoom: (zoom: number) => void;
  fitBounds: (bounds: unknown) => void;
  addListener?: (event: "click", handler: (evt: TmapClickEvent) => void) => void;
}

interface TmapMarkerInstance {
  setMap: (map: unknown) => void;
  addListener?: (event: string, handler: () => void) => void;
}
