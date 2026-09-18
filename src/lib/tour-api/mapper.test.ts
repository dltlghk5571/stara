import { describe, expect, it } from "vitest";
import { mapTourItemToPlace } from "./mapper";
import type { TourApiRawItem } from "./types";

const baseItem: TourApiRawItem = {
  contentid: "1",
  contenttypeid: "12",
  title: "Gyeongbokgung Palace",
  mapx: "126.977",
  mapy: "37.5796",
  overview: "A historic royal palace in central Seoul.",
};

describe("mapTourItemToPlace — locale-aware overview", () => {
  it("locale=en이면 overview가 relationTextEn에만 들어가고 relationTextKo는 일반 안내문이다", () => {
    const place = mapTourItemToPlace(baseItem, "en");
    expect(place!.relationTextEn).toBe(baseItem.overview);
    expect(place!.relationTextKo).not.toBe(baseItem.overview);
    expect(place!.relationTextKo).toContain("한국관광공사");
  });

  it("locale=ko이면 overview가 relationTextKo에만 들어가고 relationTextEn은 일반 안내문이다", () => {
    const koItem: TourApiRawItem = { ...baseItem, overview: "서울 도심의 역사적인 궁궐입니다." };
    const place = mapTourItemToPlace(koItem, "ko");
    expect(place!.relationTextKo).toBe(koItem.overview);
    expect(place!.relationTextEn).not.toBe(koItem.overview);
    expect(place!.relationTextEn).toContain("Korea Tourism Organization");
  });

  it("반대쪽 언어 필드에 원문(overview)이 새는 일이 없다 — 영문 요청이 국문 폴백을 받아도 relationTextEn에 국문 원문이 남지 않는다", () => {
    // withEnglishFallbackTracked가 실패 시 actualLocale="ko"로 정확히 넘기므로,
    // 여기서는 그 결과를 그대로 시뮬레이션한다: 국문 overview를 locale="ko"로 매핑.
    const fallbackItem: TourApiRawItem = { ...baseItem, overview: "국문 폴백 원문입니다." };
    const place = mapTourItemToPlace(fallbackItem, "ko");
    expect(place!.relationTextEn).not.toContain("국문 폴백 원문");
  });

  it("artistIds는 절대 채워지지 않는다", () => {
    expect(mapTourItemToPlace(baseItem, "en")!.artistIds).toEqual([]);
  });
});
