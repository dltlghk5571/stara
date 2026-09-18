// draft → verified → published 승격에 필요한 검증 규칙. 순수 함수 — 파일 I/O, DB, KTO 호출 없음.
// KTO 매칭/보강은 절대 검증 조건이 아니다 — "KTO에서 찾았다"는 "이 장소가 이 아티스트와
// 관련 있다"의 증거가 아니다. 그 판단은 오직 STARA의 sourceUrl 인용으로만 한다(2/8절).

import type { PlaceCategory } from "@/types";

export interface ReviewablePlace {
  id: string;
  nameKo: string;
  nameEn: string;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  artistIds: string[];
  relationTextKo: string;
  relationTextEn: string;
  sourceUrl: string | null;
  openTime: string | null;
  closeTime: string | null;
  dwellMinutes: number | null;
}

export interface CheckResult {
  errors: string[];
  warnings: string[];
}

const VALID_CATEGORIES: PlaceCategory[] = [
  "photo",
  "food",
  "culture",
  "shopping",
  "experience",
  "local_tourism",
  "local_restaurant",
];

/** "확인 가능한 링크"인지 최소한으로만 본다 — 실제 접근 가능 여부까지는 검증하지 않는다(그건 리뷰어 몫). */
function isAcceptableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 사실/구조적 유효성만 본다(정책 수정, 2026-09-18) — 좌표/카테고리/아티스트 참조/이름/
 * relationText/체류시간처럼 "이 레코드 자체가 말이 되는가"만 검증한다. sourceUrl/인용
 * 완결성은 여기 없다 — 그건 별도 축(provenance)이다: previewdata는 이미 사람이 검토한
 * human-reviewed baseline이므로, "현재 보존된 인용이 부족하다"는 사실 검증을 막지 않는다.
 */
export function checkStructuralValidity(
  place: ReviewablePlace,
  knownArtistIds: ReadonlySet<string>
): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!place.id) errors.push("place id가 없습니다.");
  if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
    errors.push("좌표(latitude/longitude)가 유효하지 않습니다.");
  }
  if (!VALID_CATEGORIES.includes(place.category)) {
    errors.push(`알 수 없는 category입니다: ${place.category}`);
  }
  if (place.artistIds.length === 0) {
    errors.push("연결된 아티스트가 하나도 없습니다.");
  }
  const orphanArtistIds = place.artistIds.filter((id) => !knownArtistIds.has(id));
  if (orphanArtistIds.length > 0) {
    errors.push(`존재하지 않는 아티스트 id입니다: ${orphanArtistIds.join(", ")}`);
  }
  if (!place.nameKo.trim() && !place.nameEn.trim()) {
    errors.push("한글/영문 이름이 둘 다 비어 있습니다.");
  }
  if (!place.relationTextKo.trim() && !place.relationTextEn.trim()) {
    errors.push("아티스트 관계 설명(relationText)이 비어 있습니다.");
  }
  if (place.dwellMinutes === null || !Number.isFinite(place.dwellMinutes) || place.dwellMinutes <= 0) {
    errors.push("체류시간(dwellMinutes)이 유효하지 않습니다.");
  }

  if (!place.openTime || !place.closeTime) {
    warnings.push("운영시간 정보가 없습니다(차단하지 않음 — 상시 운영으로 간주됨).");
  }

  return { errors, warnings };
}

/**
 * sourceUrl 존재/형식만 본다 — traceability(provenance) 축. 이 결과는 draft→verified를
 * 막지 않는다("verified"는 이제 사실 검증만 의미). checkPublishable에서만 구조 검증과
 * 합쳐져 발행을 막는 데 쓰인다.
 */
export function checkProvenance(place: ReviewablePlace): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!place.sourceUrl || !place.sourceUrl.trim()) {
    errors.push("출처(sourceUrl)가 없습니다 — 현재 보존된 근거로는 출처를 재구성할 수 없습니다.");
  } else if (!isAcceptableUrl(place.sourceUrl)) {
    errors.push(
      `sourceUrl이 유효한 http(s) 링크 형식이 아닙니다(확인 안 된 인용 메모일 수 있음): "${place.sourceUrl.slice(0, 60)}"`
    );
  }

  return { errors, warnings };
}

/**
 * draft → verified 승격 전 필수 검증(6절, 정책 수정 2026-09-18). 사실/구조적 유효성만
 * 본다 — sourceUrl/인용 완결성(checkProvenance)은 별도 축이라 여기서 막지 않는다.
 * KTO 매칭/이미지/영문개요도 여전히 요구하지 않는다 — 선택적 보강이라 판정과 무관하다.
 */
export function checkVerifiable(
  place: ReviewablePlace,
  knownArtistIds: ReadonlySet<string>
): CheckResult {
  return checkStructuralValidity(place, knownArtistIds);
}

/**
 * verified → published 승격 전 검증(7절). 이미 verified 상태여야 하고, 구조 검증 +
 * provenance(sourceUrl) 검증이 둘 다 통과해야 한다 — 발행 기준은 이번 정책 수정으로
 * 낮추지 않는다(9절: "Publication stays stricter... do not implement that cutover yet" —
 * 기존 기준 그대로 유지). export 시점에 자동으로 verified→published 전환하지 않는다
 * (반드시 리뷰어의 명시적 승인 액션이 있어야 함).
 */
export function checkPublishable(
  place: ReviewablePlace,
  knownArtistIds: ReadonlySet<string>,
  currentStatus: "draft" | "verified" | "published"
): CheckResult {
  const structural = checkStructuralValidity(place, knownArtistIds);
  const provenance = checkProvenance(place);
  const errors = [...structural.errors, ...provenance.errors];
  const warnings = [...structural.warnings, ...provenance.warnings];
  if (currentStatus === "draft") {
    errors.push("먼저 verified 상태를 거쳐야 합니다(draft에서 바로 published로 갈 수 없음).");
  }
  return { errors, warnings };
}
