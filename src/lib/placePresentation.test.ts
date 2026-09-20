import { describe, expect, it } from "vitest";
import { buildPlacePresentation } from "./placePresentation";
import type { Place } from "@/types";
import type { SeoulTourismEnrichment } from "@/data/generated/seoulTourismEnrichment";

function place(overrides: Partial<Place> = {}): Place {
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
    dwellMinutes: 30,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: false,
    questIds: [],
    ...overrides,
  };
}

function enrichment(overrides: Partial<SeoulTourismEnrichment> = {}): SeoulTourismEnrichment {
  return {
    placeId: "bts-culture-gyeongbokgung",
    status: "matched",
    koContentId: "130525",
    koContentTypeId: "14",
    enStatus: "matched",
    enContentId: "264337",
    enContentTypeId: "14",
    enTitle: "Gyeongbokgung Palace",
    enOverview: "A historic royal palace in central Seoul.",
    enAddress: "161 Sajik-ro, Jongno-gu, Seoul",
    ...overrides,
  };
}

describe("buildPlacePresentation — primaryImage", () => {
  it("STARA 이미지가 있으면 그대로 쓴다", () => {
    const p = buildPlacePresentation(
      place({ imageUrl: "https://stara/image.jpg" }),
      "en",
      enrichment()
    );
    expect(p.primaryImage).toBe("https://stara/image.jpg");
  });

  it("STARA 이미지가 없으면 null — 컴포넌트가 기존 카테고리 플레이스홀더를 그대로 쓴다(KTO 이미지로 대체하지 않음)", () => {
    const p = buildPlacePresentation(place(), "en", enrichment());
    expect(p.primaryImage).toBeNull();
    const p2 = buildPlacePresentation(place(), "en", undefined);
    expect(p2.primaryImage).toBeNull();
  });
});

describe("buildPlacePresentation — relationText 소유권 보존", () => {
  it("KTO overview는 relationText를 절대 대체하지 않는다(presentation에 relationText 필드 자체가 없음)", () => {
    const p = buildPlacePresentation(place(), "en", enrichment());
    expect(p).not.toHaveProperty("relationText");
    expect(p).not.toHaveProperty("relationTextEn");
    expect(p.tourismOverview).toBe(enrichment().enOverview);
  });
});

describe("buildPlacePresentation — locale 동작", () => {
  it("locale=en이면 KTO 영문 개요/주소를 노출할 수 있다", () => {
    const p = buildPlacePresentation(place(), "en", enrichment());
    expect(p.tourismOverview).toBe("A historic royal palace in central Seoul.");
    expect(p.tourismAddress).toBe("161 Sajik-ro, Jongno-gu, Seoul");
  });

  it("locale=ko면 KTO 영문 개요를 노출하지 않는다", () => {
    const p = buildPlacePresentation(place(), "ko", enrichment());
    expect(p.tourismOverview).toBeNull();
    expect(p.tourismAddress).toBeNull();
  });
});

describe("buildPlacePresentation — 중복 영문 제목 억제", () => {
  it("KTO enTitle이 place.nameEn과 사실상 같으면 억제한다", () => {
    const p = buildPlacePresentation(
      place({ nameEn: "Gyeongbokgung Palace" }),
      "en",
      enrichment({ enTitle: "Gyeongbokgung Palace" })
    );
    expect(p.tourismTitle).toBeNull();
  });

  it("정규화해도 다르면(공백/구두점 차이가 아니라 실제로 다르면) 노출한다", () => {
    const p = buildPlacePresentation(
      place({ nameEn: "Leeum Museum" }),
      "en",
      enrichment({ enTitle: "Leeum, Samsung Museum of Art" })
    );
    expect(p.tourismTitle).toBe("Leeum, Samsung Museum of Art");
  });

  it("공백/쉼표 차이만 있으면 같은 걸로 보고 억제한다", () => {
    const p = buildPlacePresentation(
      place({ nameEn: "Gyeongbokgung Palace" }),
      "en",
      enrichment({ enTitle: "Gyeongbokgung, Palace" })
    );
    expect(p.tourismTitle).toBeNull();
  });

  it("Place.nameEn 자체는 절대 바뀌지 않는다", () => {
    const original = place({ nameEn: "Gyeongbokgung Palace" });
    buildPlacePresentation(original, "en", enrichment({ enTitle: "Something Else" }));
    expect(original.nameEn).toBe("Gyeongbokgung Palace");
  });
});

describe("buildPlacePresentation — 매칭 안 된 STARA 장소도 정상 동작", () => {
  it("enrichment가 undefined여도(예: unmatched) 예외 없이 유효한 presentation을 돌려준다", () => {
    const p = buildPlacePresentation(place(), "en", undefined);
    expect(p.displayName).toBe("Gyeongbokgung Palace");
    expect(p.hasKtoEnrichment).toBe(false);
    expect(p.tourismOverview).toBeNull();
  });

  it("국문 매칭이 unmatched인 sidecar 레코드가 있어도 KTO 텍스트를 노출하지 않는다", () => {
    const p = buildPlacePresentation(place(), "en", enrichment({ status: "unmatched", enStatus: "unavailable", enOverview: undefined }));
    expect(p.hasKtoEnrichment).toBe(false);
    expect(p.primaryImage).toBeNull();
  });
});

describe("buildPlacePresentation — KTO 텍스트의 HTML 엔티티를 풀어서 내보낸다", () => {
  it("enOverview의 &ldquo;/&rdquo;를 실제 따옴표 문자로 바꾼다", () => {
    const p = buildPlacePresentation(
      place(),
      "en",
      enrichment({ enOverview: "&ldquo;HOW YOU LIKE THAT&rdquo; filming location" })
    );
    expect(p.tourismOverview).toBe("“HOW YOU LIKE THAT” filming location");
    expect(p.tourismOverview).not.toContain("&ldquo;");
  });
});

describe("buildPlacePresentation — source=kto는 sidecar를 이중 적용하지 않는다", () => {
  it("source가 kto인 place는 enrichment를 넘겨도 무시한다(이미 자기 contentId 실시간 조회 경로가 따로 있음)", () => {
    const ktoPlace = place({ source: "kto", contentId: "999999", imageUrl: undefined });
    const p = buildPlacePresentation(ktoPlace, "en", enrichment());
    expect(p.hasKtoEnrichment).toBe(false);
    expect(p.tourismOverview).toBeNull();
    expect(p.primaryImage).toBeNull();
  });
});
