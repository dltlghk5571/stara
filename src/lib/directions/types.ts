export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  /** [lat, lng] 순서 — Leaflet Polyline positions와 바로 호환 */
  geometry: [number, number][];
}

export interface DirectionsProvider {
  getRoute(start: Coordinate, end: Coordinate): Promise<RouteResult | null>;
}
