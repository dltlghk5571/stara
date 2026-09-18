// 인용(citation) 리서치 결과 저장소 — review-decisions.json과 완전히 분리된 별도 파일이다.
// 이 파일은 "발행 상태"가 아니다: 크롤러/자동화가 후보 출처를 채워도 draft→verified나
// verified→published는 여기서 절대 바뀌지 않는다(리서치 정보를 사람이 참고할 뿐).
// review-decisions.json만 verified/published의 권위 소스로 남는다.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_CITATION_RESEARCH_PATH = join(process.cwd(), "previewdata", "citation-research.json");

export type CitationStatus = "unreviewed" | "direct" | "partial" | "weak" | "broken" | "wrong";
export type SourceTier = 1 | 2 | 3 | 4;

export interface CitationResearch {
  placeId: string;
  citationStatus: CitationStatus;
  citationNote?: string;
  candidateSourceUrl?: string;
  candidateSourceTier?: SourceTier;
  candidateSourceTitle?: string;
  researchNote?: string;
  /** relationText가 출처가 실제로 뒷받침하는 것보다 더 강하게 주장하면 true. relationText는 건드리지 않는다. */
  relationOverclaim?: boolean;
  /** ko/en relationText가 사실관계에서 어긋나면 true(9절). */
  koEnMismatch?: boolean;
  /** 사람이 이 레코드를 실제로 검토했는지. 자동화가 채운 값은 전부 false로 시작한다. */
  reviewed: boolean;
  suggestedQueryKo?: string;
  suggestedQueryEn?: string;
}

export type CitationResearchStore = Record<string, CitationResearch>;

export function loadCitationResearch(path: string = DEFAULT_CITATION_RESEARCH_PATH): CitationResearchStore {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8")) as CitationResearchStore;
}

export function saveCitationResearch(
  store: CitationResearchStore,
  path: string = DEFAULT_CITATION_RESEARCH_PATH
): void {
  writeFileSync(path, JSON.stringify(store, null, 2) + "\n");
}

export function setCitationResearch(
  placeId: string,
  entry: CitationResearch,
  path: string = DEFAULT_CITATION_RESEARCH_PATH
): CitationResearchStore {
  const store = loadCitationResearch(path);
  store[placeId] = entry;
  saveCitationResearch(store, path);
  return store;
}
