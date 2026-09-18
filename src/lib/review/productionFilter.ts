// "프로덕션에 노출해도 되는 place는 어느 것인가"를 판단하는 순수 필터. 아직 어디에도
// 연결하지 않는다 — src/data/places.ts는 여전히 status 필터 없이 전부 노출한다(Demo Mode).
// 실제 전환은 이 유틸을 써서 영향도를 본 뒤 사람이 따로 결정한다(12절).
import type { Place } from "@/types";
import type { SeoulPlaceMetadata } from "@/data/generated/seoulPlaceMetadata";

/** 프로덕션 정책: published만. draft/verified는 아직 사용자에게 보여주지 않는다. */
export function isProductionReady(metadata: SeoulPlaceMetadata | undefined): boolean {
  return metadata?.status === "published";
}

/** places를 published인 것만 남긴다. metadataByPlaceId는 SEOUL_PLACE_METADATA를 id로 인덱싱한 Map. */
export function filterPublishedPlaces(
  places: Place[],
  metadataByPlaceId: ReadonlyMap<string, SeoulPlaceMetadata>
): Place[] {
  return places.filter((p) => isProductionReady(metadataByPlaceId.get(p.id)));
}

/** preview(개발/리뷰) 모드는 draft를 포함한 전부를 보여준다 — 프로덕션 정책과 명시적으로 분리. */
export function filterPreviewPlaces(places: Place[]): Place[] {
  return places;
}
