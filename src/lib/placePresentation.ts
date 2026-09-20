// Place + 선택적 seoulTourismEnrichment(KTO 보강)를 합쳐 화면에 바로 쓸 값으로 만드는
// 단일 지점. ReelCard/PlaceDetailSheet가 각자 sidecar를 import해서 해석하지 않도록 한다.
// Place는 절대 mutate하지 않고(새 객체만 반환), Zustand에도 저장하지 않는다 — 매번 파생 계산.
import type { Place } from "@/types";
import type { Locale } from "@/i18n";
import { placeName } from "@/i18n";
import { SEOUL_TOURISM_ENRICHMENT, type SeoulTourismEnrichment } from "@/data/generated/seoulTourismEnrichment";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";

export interface PlacePresentation {
  /** placeName(place, locale)과 동일 — KTO 보강과 무관, STARA가 그대로 소유. */
  displayName: string;
  /** Place.imageUrl → null(호출부가 기존 카테고리 플레이스홀더를 그대로 씀). */
  primaryImage: string | null;
  /** 이 place에 적용 가능한 KTO 보강 정보(국문 매칭 성공)가 있는지. */
  hasKtoEnrichment: boolean;
  /** locale==="en"이고 KTO 영문 개요가 있을 때만 값이 있다 — relationText를 절대 대체하지 않는다. */
  tourismOverview: string | null;
  tourismAddress: string | null;
  /** place.nameEn과 사실상 같으면(정규화 비교) null — 중복 노출 방지. nameEn 자체는 절대 안 바꿈. */
  tourismTitle: string | null;
}

function normalizeForCompare(s: string): string {
  return s.replace(/[\s·・\-()（）,.]/g, "").toLowerCase();
}

/**
 * 순수 조합 로직 — getPlacePresentation에서 sidecar 조회를 분리해뒀다. 테스트에서 실제
 * 164곳 라이브 데이터에 기대지 않고 enrichment를 직접 넘겨 케이스별로 검증할 수 있다.
 */
export function buildPlacePresentation(
  place: Place,
  locale: Locale,
  enrichment: SeoulTourismEnrichment | undefined
): PlacePresentation {
  // 제네릭 KTO 장소(source==="kto")는 이미 자기 contentId로 실시간 조회하는 별도 경로가
  // 있다(PlaceDetailSheet의 useTourismInfo) — STARA 아티스트 장소 sidecar를 이중 적용하지 않는다.
  const applicable = place.source === "kto" ? undefined : enrichment;
  const hasKtoEnrichment = applicable?.status === "matched" && applicable?.enStatus === "matched";
  const showEnglishKto = locale === "en" && hasKtoEnrichment;

  // KTO 원문의 HTML 엔티티(&ldquo; 등)를 여기서 풀어서 순수 텍스트로만 내보낸다(20절) —
  // dangerouslySetInnerHTML은 쓰지 않으며, 신뢰 HTML로 취급하지 않고 문자 치환만 한다.
  const tourismOverview = showEnglishKto && applicable?.enOverview
    ? decodeHtmlEntities(applicable.enOverview)
    : null;
  const tourismAddress = showEnglishKto && applicable?.enAddress
    ? decodeHtmlEntities(applicable.enAddress)
    : null;

  let tourismTitle: string | null = null;
  if (showEnglishKto && applicable?.enTitle) {
    const decodedEnTitle = decodeHtmlEntities(applicable.enTitle);
    const duplicate = normalizeForCompare(decodedEnTitle) === normalizeForCompare(place.nameEn);
    tourismTitle = duplicate ? null : decodedEnTitle;
  }

  const primaryImage = place.imageUrl || null;

  return {
    displayName: placeName(place, locale),
    primaryImage,
    hasKtoEnrichment,
    tourismOverview,
    tourismAddress,
    tourismTitle,
  };
}

const enrichmentByPlaceId = new Map<string, SeoulTourismEnrichment>(
  SEOUL_TOURISM_ENRICHMENT.map((e) => [e.placeId, e])
);

export function getPlacePresentation(place: Place, locale: Locale): PlacePresentation {
  return buildPlacePresentation(place, locale, enrichmentByPlaceId.get(place.id));
}
