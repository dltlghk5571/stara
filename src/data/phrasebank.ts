// ─────────────────────────────────────────────────────────
// 테마별 한국어 문구 은행 — previewdata/theme_phrasebank.json을 그대로 불러와 쓴다.
// 이동 구간(segment)의 "다음 행선지" 장소 카테고리(badgeCategoryForPlaceCategory)에 맞는
// 테마를 골라 서브 퀘스트 문구로 쓴다(quests.ts의 buildLanguageSubQuest 참고).
// ─────────────────────────────────────────────────────────
import raw from "../../previewdata/theme_phrasebank.json";

export type PhrasebankThemeId =
  | "food"
  | "cafe"
  | "shopping"
  | "culture"
  | "activity"
  | "landmark"
  | "kpop"
  | "transit"
  | "basic";

export interface Phrase {
  ko: string;
  romanization: string;
  en: string;
  is_representative: boolean;
}

const THEMES = raw.themes as Record<PhrasebankThemeId, { label_ko: string; phrases: Phrase[] }>;

export function phrasesForTheme(theme: PhrasebankThemeId): Phrase[] {
  return THEMES[theme]?.phrases ?? [];
}
