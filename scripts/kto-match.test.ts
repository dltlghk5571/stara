import { describe, expect, it, vi } from "vitest";
import { matchAndEnrichPlace, type MatchDeps, type SeoulTourismEnrichment } from "./kto-match";
import { dedupeMatchedContentIds, type MatchStatus, type EnMatchStatus } from "../src/lib/tour-api/ktoMatch";
import type { TourApiRawItem } from "../src/lib/tour-api/types";

const PLACE = {
  place_id: "bts-culture-gyeongbokgung",
  city_id: "seoul",
  place_name_ko: "경복궁",
  place_name_en: "Gyeongbokgung Palace",
  latitude: 37.5796,
  longitude: 126.977,
  tour_api_content_id: null as string | null,
};

function koItem(overrides: Partial<TourApiRawItem> = {}): TourApiRawItem {
  return {
    contentid: "130525",
    contenttypeid: "14",
    title: "경복궁",
    mapx: "126.977",
    mapy: "37.5796",
    ...overrides,
  };
}

function enItem(overrides: Partial<TourApiRawItem> = {}): TourApiRawItem {
  return {
    contentid: "264337",
    contenttypeid: "14",
    title: "Gyeongbokgung Palace",
    mapx: "126.977",
    mapy: "37.5796",
    ...overrides,
  };
}

function fakeDeps(overrides: Partial<MatchDeps> = {}): MatchDeps {
  return {
    searchKeyword: vi.fn(async () => []),
    locationBasedList: vi.fn(async () => []),
    detailCommon: vi.fn(async () => []),
    detailIntro: vi.fn(async () => []),
    detailImages: vi.fn(async () => []),
    ...overrides,
  };
}

describe("matchAndEnrichPlace — Korean/English identity split", () => {
  it("KorService2와 EngService2는 같은 실제 장소여도 서로 다른 contentId를 갖는다", async () => {
    const deps = fakeDeps({
      searchKeyword: vi.fn(async (params, baseUrl) =>
        baseUrl?.includes("Eng") ? [enItem()] : [koItem()]
      ),
    });
    const result = await matchAndEnrichPlace(PLACE, deps);
    expect(result.koContentId).toBe("130525");
    expect(result.enContentId).toBe("264337");
    expect(result.koContentId).not.toBe(result.enContentId);
  });

  it("koContentId는 확정되고 enContentId는 없을 수 있다 — 유효한 상태다", async () => {
    const deps = fakeDeps({
      searchKeyword: vi.fn(async (params, baseUrl) => (baseUrl?.includes("Eng") ? [] : [koItem()])),
      locationBasedList: vi.fn(async () => []),
    });
    const result = await matchAndEnrichPlace(PLACE, deps);
    expect(result.status).toBe("matched");
    expect(result.koContentId).toBe("130525");
    expect(result.enContentId).toBeUndefined();
    expect(result.enStatus).toBe("unmatched");
  });

  it("영문 매칭은 nameEn으로 검색한다 — nameKo를 영문 후보와 비교하지 않는다", async () => {
    const searchKeyword = vi.fn(async (params: { keyword: string }, baseUrl?: string) => {
      if (baseUrl?.includes("Eng")) {
        expect(params.keyword).toBe(PLACE.place_name_en);
        return [enItem()];
      }
      return [koItem()];
    });
    const result = await matchAndEnrichPlace(PLACE, fakeDeps({ searchKeyword }));
    expect(result.enStatus).toBe("matched");
    expect(searchKeyword).toHaveBeenCalledWith({ keyword: PLACE.place_name_en }, expect.stringContaining("Eng"));
  });

  it("nameEn이 없으면 키워드 검색 없이 좌표 주변 폴백만 쓴다(검색어 날조 안 함)", async () => {
    const searchKeyword = vi.fn(async (params: { keyword: string }, baseUrl?: string) => {
      if (baseUrl?.includes("Eng")) return []; // nameEn 없으면 영문 키워드 검색 자체를 안 함
      return [koItem()];
    });
    const locationBasedList = vi.fn(async (params, baseUrl?: string) =>
      baseUrl?.includes("Eng") ? [enItem()] : []
    );
    const placeNoEn = { ...PLACE, place_name_en: "" };
    const result = await matchAndEnrichPlace(placeNoEn, fakeDeps({ searchKeyword, locationBasedList }));
    // 이름 근거 없이 거리만으로는 AUTO_MATCH 문턱을 못 넘도록 스코어 공식이 막는다 — matched가 아니어야 한다.
    expect(result.enStatus).not.toBe("matched");
    expect(searchKeyword).not.toHaveBeenCalledWith(
      expect.objectContaining({ keyword: expect.stringMatching(/./) }),
      expect.stringContaining("Eng")
    );
  });

  it("국문이 matched가 아니면 영문 매칭을 아예 시도하지 않고 unavailable로 남긴다", async () => {
    const deps = fakeDeps(); // 아무 후보도 없음 → 국문 unmatched
    const result = await matchAndEnrichPlace(PLACE, deps);
    expect(result.status).toBe("unmatched");
    expect(result.enStatus).toBe("unavailable");
    expect(deps.searchKeyword).toHaveBeenCalledTimes(1); // 국문 키워드만, 영문 시도 없음(검색은 있었지만 Eng URL로는 안 감)
  });

  it("애매한 영문 후보는 ambiguous로 남고 자동 확정되지 않는다", async () => {
    const deps = fakeDeps({
      searchKeyword: vi.fn(async (params, baseUrl) =>
        baseUrl?.includes("Eng")
          ? [
              enItem({ contentid: "1", title: "Gyeongbokgung Palace East Gate" }),
              enItem({ contentid: "2", title: "Gyeongbokgung Palace West Gate" }),
            ]
          : [koItem()]
      ),
    });
    const result = await matchAndEnrichPlace(PLACE, deps);
    expect(["ambiguous", "manual_review"]).toContain(result.enStatus);
  });

  it("sidecar 재실행 시 이전 koContentId를 재사용해 국문 재검색 없이 검증만 한다", async () => {
    const previous: SeoulTourismEnrichment = {
      placeId: PLACE.place_id,
      status: "matched",
      koContentId: "130525",
      koContentTypeId: "14",
      matchScore: 0.95,
      enStatus: "unmatched",
    };
    const detailCommon = vi.fn(async (contentId: string, baseUrl?: string) =>
      baseUrl?.includes("Eng") ? [] : [koItem({ contentid: contentId })]
    );
    const deps = fakeDeps({ detailCommon });
    const result = await matchAndEnrichPlace(PLACE, deps, previous, true); // --force
    expect(result.status).toBe("matched");
    expect(result.koContentId).toBe("130525");
    expect(deps.searchKeyword).not.toHaveBeenCalledWith(
      expect.anything(),
      undefined // 국문(KorService2) 기본 baseUrl로는 키워드 검색을 아예 안 함 — 검증만.
    );
    // locationBasedList가 호출됐다면 전부 영문(EngService2) 폴백이지 국문 재검색이 아니어야 한다.
    for (const call of (deps.locationBasedList as ReturnType<typeof vi.fn>).mock.calls) {
      expect(call[1]).toContain("Eng");
    }
  });

  it("force가 아니면 이전 결과를 그대로 재사용한다(네트워크 호출 없음)", async () => {
    const previous: SeoulTourismEnrichment = { placeId: PLACE.place_id, status: "unmatched" };
    const deps = fakeDeps();
    const result = await matchAndEnrichPlace(PLACE, deps, previous, false);
    expect(result).toBe(previous);
    expect(deps.searchKeyword).not.toHaveBeenCalled();
  });

  it("STARA의 relationText/artistIds/quest/sourceUrl 필드는 절대 건드리지 않는다", async () => {
    const deps = fakeDeps({
      searchKeyword: vi.fn(async (params, baseUrl) => (baseUrl?.includes("Eng") ? [] : [koItem()])),
    });
    const result = await matchAndEnrichPlace(PLACE, deps);
    const forbidden = ["artistIds", "relationTextKo", "relationTextEn", "questIds", "sourceUrl", "nameKo", "nameEn"];
    for (const key of forbidden) expect(Object.keys(result)).not.toContain(key);
  });
});

describe("dedupeMatchedContentIds — 국문/영문 독립 중복 검사", () => {
  it("같은 koContentId로 matched된 두 장소는 status를 manual_review로 낮춘다", () => {
    const results = [
      { placeId: "a", status: "matched" as MatchStatus, koContentId: "999" },
      { placeId: "b", status: "matched" as MatchStatus, koContentId: "999" },
      { placeId: "c", status: "matched" as MatchStatus, koContentId: "111" },
    ];
    const deduped = dedupeMatchedContentIds(
      results,
      (r) => r.status,
      (r) => r.koContentId,
      (r) => ({ ...r, status: "manual_review" as MatchStatus })
    );
    expect(deduped.find((r) => r.placeId === "a")!.status).toBe("manual_review");
    expect(deduped.find((r) => r.placeId === "b")!.status).toBe("manual_review");
    expect(deduped.find((r) => r.placeId === "c")!.status).toBe("matched");
  });

  it("같은 enContentId로 matched된 두 장소는 enStatus만 낮추고 국문 status는 건드리지 않는다", () => {
    const results = [
      { placeId: "a", status: "matched" as MatchStatus, enStatus: "matched" as EnMatchStatus, enContentId: "777" },
      { placeId: "b", status: "matched" as MatchStatus, enStatus: "matched" as EnMatchStatus, enContentId: "777" },
    ];
    const deduped = dedupeMatchedContentIds(
      results,
      (r) => r.enStatus,
      (r) => r.enContentId,
      (r) => ({ ...r, enStatus: "manual_review" as EnMatchStatus })
    );
    expect(deduped[0].enStatus).toBe("manual_review");
    expect(deduped[0].status).toBe("matched"); // 국문 status는 그대로
    expect(deduped[1].enStatus).toBe("manual_review");
  });
});
