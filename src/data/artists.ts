// ─────────────────────────────────────────────────────────
// 서울 실제 K-pop 아티스트 데이터(SEOUL_ARTISTS, scripts/export-seoul-dataset.ts 산출물).
//   imageUrl에 실제 이미지 경로를 넣으면 카드/스탬프 UI에 자동 반영됨(비워두면 이니셜 플레이스홀더 표시)
// ─────────────────────────────────────────────────────────
import type { Artist } from "@/types";
import { SEOUL_ARTISTS } from "./generated/seoulArtists";

export const ARTISTS = SEOUL_ARTISTS;

export function getArtistById(id: string): Artist | undefined {
  return ARTISTS.find((a) => a.id === id);
}
