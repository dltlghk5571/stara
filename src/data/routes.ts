import type { StaraRoute } from "@/types";
import { MAIN_ROUTE_PLACE_IDS } from "./places";
import { TRIP_START_TIME, TRIP_END_LIMIT } from "@/config";

// 서울 지역 대표 메인 루트 (region 1개만 지원하는 MVP 범위)
export const SEOUL_MAIN_ROUTE: StaraRoute = {
  id: "route-seoul-main",
  regionId: "seoul",
  nameKo: "서울 스타 따라 STARA 코스",
  nameEn: "Seoul STARA Course",
  startTime: TRIP_START_TIME,
  endTimeLimit: TRIP_END_LIMIT,
  mainPlaceIds: MAIN_ROUTE_PLACE_IDS,
};

export const ROUTES: StaraRoute[] = [SEOUL_MAIN_ROUTE];
