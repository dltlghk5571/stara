import type { Place } from "@/types";

/**
 * 선택된 아티스트와 연관된 Place[]를 찾는 단일 지점.
 * edit 페이지 필터, 루트 생성 앵커, 지역 상세 카운트가 모두 이 함수를 거쳐
 * "장소가 이 아티스트들과 연관되어 있는가"를 판단한다(join 로직 중복 방지).
 * artistIds가 비어 있으면 빈 배열을 돌려준다 — "필터 없음(전체 보기)" 정책은
 * 호출부(UI)가 결정할 일이지 이 함수의 책임이 아니다.
 */
export function placesForArtists(places: Place[], artistIds: string[]): Place[] {
  if (artistIds.length === 0) return [];
  const idSet = new Set(artistIds);
  return places.filter((p) => p.artistIds.some((id) => idSet.has(id)));
}
