import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tourismDataProvider } from "./provider";

function tourApiResponse(items: unknown[]) {
  return {
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: {
        items: items.length ? { item: items } : "",
        numOfRows: items.length,
        pageNo: 1,
        totalCount: items.length,
      },
    },
  };
}

describe("tourismDataProvider.getNearby locale fallback", () => {
  const originalKey = process.env.TOUR_API_KEY;

  beforeEach(() => {
    process.env.TOUR_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.TOUR_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("영문 응답이 있으면 국문 엔드포인트는 호출하지 않는다", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("EngService2");
      return new Response(
        JSON.stringify(
          tourApiResponse([
            { contentid: "1", contenttypeid: "12", title: "Gyeongbokgung", mapx: "126.1", mapy: "37.1" },
          ])
        ),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const places = await tourismDataProvider.getNearby(
      { lat: 37.1, lng: 126.1, radius: 2000 },
      "en"
    );
    expect(places).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("영문 응답이 비어있으면 국문으로 한 번 더 시도해 폴백한다", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("EngService2")) {
        return new Response(JSON.stringify(tourApiResponse([])), { status: 200 });
      }
      expect(url).toContain("KorService2");
      return new Response(
        JSON.stringify(
          tourApiResponse([
            { contentid: "2", contenttypeid: "12", title: "경복궁", mapx: "126.2", mapy: "37.2" },
          ])
        ),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const places = await tourismDataProvider.getNearby(
      { lat: 37.2, lng: 126.2, radius: 2000 },
      "en"
    );
    expect(places).toHaveLength(1);
    expect(places[0].nameKo).toBe("경복궁");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("locale이 ko(기본값)이면 영문 엔드포인트를 아예 호출하지 않는다", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("KorService2");
      return new Response(JSON.stringify(tourApiResponse([])), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await tourismDataProvider.getNearby({ lat: 37.3, lng: 126.3, radius: 2000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
