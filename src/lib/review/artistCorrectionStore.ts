// artistIds 불일치 교정 제안 저장소 — previewdata/artist-corrections.json.
// citationStore.ts와 같은 원칙: 이 파일은 "제안"만 담는다. status가 "approved"로
// 바뀌기 전까지는 어떤 자동화도 previewdata/places.json의 artist_ids를 건드리지 않는다.
// review-decisions.json(발행 상태)과도 완전히 분리 — 교정 제안이 쌓여도 verified/published는
// 전혀 바뀌지 않는다.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_ARTIST_CORRECTIONS_PATH = join(process.cwd(), "previewdata", "artist-corrections.json");
export const DEFAULT_PLACES_PATH = join(process.cwd(), "previewdata", "places.json");

// previewdata는 이 저장소가 생기기 전에 이미 사람이 여러 근거로 검토한 "human-reviewed
// baseline"이다(정책 수정, 2026-09-18). 현재 보존된 citation이 특정 artistId를 언급하지
// 않는다고 해서 그 관계가 거짓이라는 뜻은 아니다 — 단지 그 근거의 traceability가 소실됐을
// 뿐이다. remove_artist_relation은 실제 모순 증거가 있을 때만 쓴다. 그 외에는
// needs_evidence_recovery로 표시하고 artistIds는 그대로 둔다.
export type ArtistCorrectionAction = "remove_artist_relation" | "attach_citation" | "needs_evidence_recovery";
export type ArtistCorrectionStatus = "proposed" | "approved" | "rejected" | "applied";

/**
 * 현재 증거 상태 분류 — "현재 인용 없음"과 "실제 모순"을 절대 섞지 않는다.
 * - provenance_missing: preview 단계에서 이미 인간 검토를 거친 관계지만, 현재 보존된
 *   인용만으로는 그 근거를 재구성할 수 없다. 거짓이라는 증거가 아니다.
 * - contradicted: 새 증거가 이 관계가 틀렸거나 다른 아티스트로 오귀속됐음을 실제로 가리킨다.
 * - unresolved: 증거가 실제로 상충하거나 불충분해서 원래 검토 결정을 지금 재구성할 수 없다.
 * (SUPPORTED_BY_CURRENT_EVIDENCE는 별도 상태를 저장하지 않는다 — correction 항목이
 * 아예 없는 게 기본값이자 "현재 근거로 뒷받침됨"을 뜻한다.)
 */
export type EvidenceDisposition = "provenance_missing" | "contradicted" | "unresolved";

export interface ArtistCorrection {
  placeId: string;
  artistId: string;
  action: ArtistCorrectionAction;
  status: ArtistCorrectionStatus;
  reason: string;
  proposedAt: string;
  /** action==="attach_citation"일 때만 — 이미 리서치에 있는 기존 근거를 가리킨다. */
  candidateCitationUrl?: string;
  appliedAt?: string;
  /** 정책 수정으로 재분류되기 전 원래 제안했던 action — 감사 이력이므로 지우지 않는다. */
  originalAction?: ArtistCorrectionAction;
  /** 재분류 이후의 증거 상태. 아직 재분류되지 않았으면 undefined. */
  disposition?: EvidenceDisposition;
  supersededAt?: string;
  supersededReason?: string;
}

/** placeId로 인덱싱 — 한 place에 여러 아티스트 교정 제안이 있을 수 있다. */
export type ArtistCorrections = Record<string, ArtistCorrection[]>;

export function loadArtistCorrections(path: string = DEFAULT_ARTIST_CORRECTIONS_PATH): ArtistCorrections {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8")) as ArtistCorrections;
}

export function saveArtistCorrections(
  corrections: ArtistCorrections,
  path: string = DEFAULT_ARTIST_CORRECTIONS_PATH
): void {
  writeFileSync(path, JSON.stringify(corrections, null, 2) + "\n");
}

/** 제안을 기록한다 — status는 항상 "proposed"로 시작한다(자동 승인 없음). */
export function proposeArtistCorrection(
  correction: Omit<ArtistCorrection, "status" | "proposedAt"> & { proposedAt?: string },
  path: string = DEFAULT_ARTIST_CORRECTIONS_PATH
): ArtistCorrections {
  const corrections = loadArtistCorrections(path);
  const list = corrections[correction.placeId] ?? [];
  list.push({
    ...correction,
    status: "proposed",
    proposedAt: correction.proposedAt ?? new Date().toISOString(),
  });
  corrections[correction.placeId] = list;
  saveArtistCorrections(corrections, path);
  return corrections;
}

/**
 * "현재 인용에 없음"에서 곧바로 remove로 갔던 과거 제안을 재분류한다. status는 절대
 * 건드리지 않는다("proposed" 그대로) — 재분류도 승인이 아니다. 원래 action/reason은
 * originalAction에 보존해 감사 이력을 지우지 않는다. 대상 항목이 없으면 아무것도 하지 않는다.
 */
export function reclassifyArtistCorrection(
  placeId: string,
  artistId: string,
  update: { disposition: EvidenceDisposition; newAction: ArtistCorrectionAction; supersededReason: string },
  path: string = DEFAULT_ARTIST_CORRECTIONS_PATH
): ArtistCorrections {
  const corrections = loadArtistCorrections(path);
  const entry = (corrections[placeId] ?? []).find((c) => c.artistId === artistId);
  if (!entry) return corrections;

  if (!entry.originalAction) entry.originalAction = entry.action;
  entry.action = update.newAction;
  entry.disposition = update.disposition;
  entry.supersededAt = new Date().toISOString();
  entry.supersededReason = update.supersededReason;

  saveArtistCorrections(corrections, path);
  return corrections;
}

/**
 * status==="approved"인 제안만 실제로 적용한다 — previewdata/places.json의 artist_ids에서
 * 해당 artistId를 제거하고, 제안 status를 "applied"로 바꾼다. "proposed" 상태는 절대
 * 건드리지 않는다 — 리뷰어가 명시적으로 approved로 바꾸기 전까지는 구조 변경이 없다.
 * placesPath/correctionsPath를 받아 테스트에서 실제 파일 없이도 검증할 수 있게 한다.
 */
export function applyApprovedArtistCorrections(
  placesPath: string = DEFAULT_PLACES_PATH,
  correctionsPath: string = DEFAULT_ARTIST_CORRECTIONS_PATH
): { appliedCount: number; appliedPlaceIds: string[] } {
  const corrections = loadArtistCorrections(correctionsPath);
  const places = JSON.parse(readFileSync(placesPath, "utf-8")) as Array<{
    place_id: string;
    artist_ids: string[];
  }>;
  const placeById = new Map(places.map((p) => [p.place_id, p]));

  let appliedCount = 0;
  const appliedPlaceIds: string[] = [];
  const appliedAt = new Date().toISOString();

  for (const [placeId, list] of Object.entries(corrections)) {
    const place = placeById.get(placeId);
    if (!place) continue;
    for (const correction of list) {
      if (correction.status !== "approved") continue;
      if (correction.action === "remove_artist_relation") {
        place.artist_ids = place.artist_ids.filter((id) => id !== correction.artistId);
      }
      correction.status = "applied";
      correction.appliedAt = appliedAt;
      appliedCount++;
      if (!appliedPlaceIds.includes(placeId)) appliedPlaceIds.push(placeId);
    }
  }

  if (appliedCount > 0) {
    writeFileSync(placesPath, JSON.stringify(places, null, 2));
    saveArtistCorrections(corrections, correctionsPath);
  }

  return { appliedCount, appliedPlaceIds };
}
