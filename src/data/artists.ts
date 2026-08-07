// ─────────────────────────────────────────────────────────
// 더미 아티스트 데이터 (실존 인물 아님)
// 실제 데이터로 교체하는 방법:
//   1. 아래 ARTISTS 배열의 각 항목을 실제 아티스트 정보로 교체
//   2. id는 places.ts / quests.ts 의 artistIds 와 반드시 일치해야 함
//   3. imageUrl에 실제 이미지 경로를 넣으면 카드/스탬프 UI에 자동 반영됨
//      (비워두면 이니셜 플레이스홀더가 표시됨)
// ─────────────────────────────────────────────────────────
import type { Artist } from "@/types";

export const ARTISTS: Artist[] = Array.from({ length: 10 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `artist-${n}`,
    name: `아티스트 ${n}`,
    nameEn: `Artist ${n}`,
    description: `서울 곳곳에 발자취를 남긴 글로벌 K-pop 아티스트 ${n}. (MVP 더미 프로필)`,
  } satisfies Artist;
});

export function getArtistById(id: string): Artist | undefined {
  return ARTISTS.find((a) => a.id === id);
}
