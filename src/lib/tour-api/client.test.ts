import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSearchKeyword } from "./client";

describe("callTourApi retry", () => {
  const originalKey = process.env.TOUR_API_KEY;

  beforeEach(() => {
    process.env.TOUR_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.TOUR_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("네트워크 오류(throw)는 한 번 재시도하고, 재시도가 성공하면 결과를 돌려준다", async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      if (calls === 1) throw new Error("network blip");
      return new Response(
        JSON.stringify({
          response: { body: { items: { item: [{ contentid: "1", contenttypeid: "12", title: "X" }] } } },
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    // 캐시(모듈 스코프 TTL 캐시) 충돌을 피하려고 테스트마다 다른 keyword를 쓴다 — provider.test.ts와 동일한 관례.
    const result = await fetchSearchKeyword({ keyword: "retry-success-test" });
    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("두 번 다 실패하면 빈 배열을 돌려주고(throw 안 함) 쿼터를 더 쓰지 않는다", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("still down");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSearchKeyword({ keyword: "retry-both-fail-test" });
    expect(result).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("HTTP 오류 응답(4xx/5xx)은 재시도하지 않는다", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSearchKeyword({ keyword: "retry-http-error-test" });
    expect(result).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
