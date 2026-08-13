import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRelatedTourismScores, resolveSignguCdFromAddress } from "./relatedTourism";

function relatedResponse(items: { rlteTatsNm: string; rlteRank: string }[]) {
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

describe("resolveSignguCdFromAddress", () => {
  it("주소에서 구를 추출해 시군구코드로 변환한다", () => {
    expect(resolveSignguCdFromAddress("서울특별시 종로구 사직로 161")).toBe("11110");
  });

  it("구가 없는 주소나 undefined면 undefined를 반환한다", () => {
    expect(resolveSignguCdFromAddress(undefined)).toBeUndefined();
    expect(resolveSignguCdFromAddress("알 수 없는 주소")).toBeUndefined();
  });
});

describe("getRelatedTourismScores", () => {
  const originalKey = process.env.TOUR_API_KEY;

  beforeEach(() => {
    process.env.TOUR_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.TOUR_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("1위는 1.0에 가깝게, 순위가 낮을수록 점수가 낮게 정규화된다", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(
          relatedResponse([
            { rlteTatsNm: "북촌한옥마을", rlteRank: "1" },
            { rlteTatsNm: "광장시장", rlteRank: "2" },
            { rlteTatsNm: "먼관광지", rlteRank: "50" },
          ])
        ),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const scores = await getRelatedTourismScores([{ name: "경복궁-a", signguCd: "11110" }]);
    expect(scores.get("북촌한옥마을")).toBeCloseTo(1);
    expect(scores.get("광장시장")).toBeGreaterThan(0.9);
    expect(scores.get("광장시장")!).toBeLessThan(scores.get("북촌한옥마을")!);
    expect(scores.get("먼관광지")).toBeCloseTo(0, 1);
  });

  it("여러 anchor에 같은 이름이 나오면 더 좋은(낮은) 순위를 유지한다", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const isFirstAnchor = url.includes("anchor-a");
      return new Response(
        JSON.stringify(
          relatedResponse([{ rlteTatsNm: "북촌한옥마을", rlteRank: isFirstAnchor ? "10" : "1" }])
        ),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const scores = await getRelatedTourismScores([
      { name: "anchor-a", signguCd: "11110" },
      { name: "anchor-b", signguCd: "11140" },
    ]);
    // rank 1(anchor-b)이 rank 10(anchor-a)보다 좋으므로 최종 점수는 rank 1 기준이어야 함
    expect(scores.get("북촌한옥마을")).toBeCloseTo(1);
  });

  it("키 없음/실패면 빈 맵을 반환한다", async () => {
    process.env.TOUR_API_KEY = "";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const scores = await getRelatedTourismScores([{ name: "x", signguCd: "11110" }]);
    expect(scores.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
