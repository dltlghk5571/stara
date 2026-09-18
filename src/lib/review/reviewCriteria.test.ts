import { describe, expect, it } from "vitest";
import { checkVerifiable, checkPublishable, checkProvenance, type ReviewablePlace } from "./reviewCriteria";

const KNOWN_ARTISTS = new Set(["bts", "enhypen"]);

function place(overrides: Partial<ReviewablePlace> = {}): ReviewablePlace {
  return {
    id: "bts-culture-gyeongbokgung",
    nameKo: "경복궁",
    nameEn: "Gyeongbokgung Palace",
    latitude: 37.5796,
    longitude: 126.977,
    category: "culture",
    artistIds: ["bts"],
    relationTextKo: "BTS가 이곳에서 화보를 찍었습니다.",
    relationTextEn: "BTS shot a pictorial here.",
    sourceUrl: "https://example.com/article",
    openTime: "09:00",
    closeTime: "18:00",
    dwellMinutes: 60,
    ...overrides,
  };
}

describe("checkVerifiable", () => {
  it("모든 필드가 유효하면 에러 없이 통과한다", () => {
    const result = checkVerifiable(place(), KNOWN_ARTISTS);
    expect(result.errors).toEqual([]);
  });

  it("sourceUrl이 없어도 verified를 막지 않는다(정책 수정 — provenance는 별도 축)", () => {
    const result = checkVerifiable(place({ sourceUrl: null }), KNOWN_ARTISTS);
    expect(result.errors).toEqual([]);
  });

  it("sourceUrl이 URL 형식이 아니어도(인용 메모 등) verified를 막지 않는다", () => {
    const result = checkVerifiable(
      place({ sourceUrl: "[콘텐츠 인용 - 링크 미확인] 어떤 브랜드" }),
      KNOWN_ARTISTS
    );
    expect(result.errors).toEqual([]);
  });

  it("존재하지 않는 아티스트 id(orphan)면 verified를 막는다", () => {
    const result = checkVerifiable(place({ artistIds: ["not-a-real-artist"] }), KNOWN_ARTISTS);
    expect(result.errors.some((e) => e.includes("존재하지 않는 아티스트"))).toBe(true);
  });

  it("아티스트가 하나도 없으면 verified를 막는다", () => {
    const result = checkVerifiable(place({ artistIds: [] }), KNOWN_ARTISTS);
    expect(result.errors.some((e) => e.includes("아티스트가 하나도"))).toBe(true);
  });

  it("relationText가 ko/en 둘 다 비어있으면 막는다", () => {
    const result = checkVerifiable(place({ relationTextKo: "", relationTextEn: "" }), KNOWN_ARTISTS);
    expect(result.errors.some((e) => e.includes("관계 설명"))).toBe(true);
  });

  it("운영시간이 없으면 경고만 하고 막지 않는다", () => {
    const result = checkVerifiable(place({ openTime: null, closeTime: null }), KNOWN_ARTISTS);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((w) => w.includes("운영시간"))).toBe(true);
  });

  it("KTO 매칭 관련 정보는 애초에 이 함수의 입력에 없다 — KTO는 verified 조건이 아니다", () => {
    // ReviewablePlace 타입 자체에 koContentId/enStatus 같은 필드가 없음을 타입으로 보장.
    const result = checkVerifiable(place(), KNOWN_ARTISTS);
    expect(result).not.toHaveProperty("koContentId");
    expect(result).not.toHaveProperty("enStatus");
  });

  it("잘못된 category는 막는다", () => {
    // @ts-expect-error 의도적으로 잘못된 카테고리를 넣어 검증한다
    const result = checkVerifiable(place({ category: "not-a-category" }), KNOWN_ARTISTS);
    expect(result.errors.some((e) => e.includes("category"))).toBe(true);
  });

  it("dwellMinutes가 0 이하이거나 없으면 막는다", () => {
    expect(checkVerifiable(place({ dwellMinutes: 0 }), KNOWN_ARTISTS).errors.length).toBeGreaterThan(0);
    expect(checkVerifiable(place({ dwellMinutes: null }), KNOWN_ARTISTS).errors.length).toBeGreaterThan(0);
  });
});

describe("checkProvenance — sourceUrl은 별도 축(traceability), verified를 막지 않는다", () => {
  it("sourceUrl이 유효하면 에러 없다", () => {
    expect(checkProvenance(place()).errors).toEqual([]);
  });

  it("sourceUrl이 없으면 provenance 에러를 낸다(verified와는 무관)", () => {
    const result = checkProvenance(place({ sourceUrl: null }));
    expect(result.errors.some((e) => e.includes("출처"))).toBe(true);
  });

  it("sourceUrl이 URL 형식이 아니면 provenance 에러를 낸다", () => {
    const result = checkProvenance(place({ sourceUrl: "[콘텐츠 인용 - 링크 미확인] 어떤 브랜드" }));
    expect(result.errors.some((e) => e.includes("sourceUrl"))).toBe(true);
  });
});

describe("checkPublishable", () => {
  it("draft 상태에서는 바로 published로 갈 수 없다", () => {
    const result = checkPublishable(place(), KNOWN_ARTISTS, "draft");
    expect(result.errors.some((e) => e.includes("verified"))).toBe(true);
  });

  it("verified 상태이고 나머지 조건이 유효하면 published를 허용한다", () => {
    const result = checkPublishable(place(), KNOWN_ARTISTS, "verified");
    expect(result.errors).toEqual([]);
  });

  it("verified 상태여도 다른 필수 조건(sourceUrl 등)이 깨지면 published를 막는다", () => {
    const result = checkPublishable(place({ sourceUrl: null }), KNOWN_ARTISTS, "verified");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("published 상태에서 재검증해도(재승인 시나리오) 조건이 유효하면 통과한다", () => {
    const result = checkPublishable(place(), KNOWN_ARTISTS, "published");
    expect(result.errors).toEqual([]);
  });
});
