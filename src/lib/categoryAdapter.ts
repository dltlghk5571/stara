// 파이프라인(data-pipeline) place_category → 웹 PlaceCategory 매핑.
// 단일 lookup table로 유지 — 재조정이 필요하면 이 표만 한 줄 바꾸면 된다(O-3).
import type { PlaceCategory } from "@/types";

export type PipelineCategory =
  | "food"
  | "shopping"
  | "culture"
  | "activity"
  | "landmark_observatory"
  | "kpop";

export const PIPELINE_TO_WEB_CATEGORY: Record<PipelineCategory, PlaceCategory> = {
  food: "food",
  shopping: "shopping",
  culture: "culture",
  activity: "experience",
  landmark_observatory: "photo",
  kpop: "culture",
};

export function mapPipelineCategory(category: string): PlaceCategory {
  const mapped = PIPELINE_TO_WEB_CATEGORY[category as PipelineCategory];
  if (!mapped) {
    throw new Error(`Unknown pipeline place_category: ${category}`);
  }
  return mapped;
}
