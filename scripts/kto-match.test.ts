import { describe, expect, it } from "vitest";
import { namesLikelyMatch, pickConfidentMatch, type Candidate } from "./kto-match";

describe("namesLikelyMatch", () => {
  it("matches names ignoring spacing/punctuation", () => {
    expect(namesLikelyMatch("모수 서울", "모수서울")).toBe(true);
    expect(namesLikelyMatch("경복궁", "경복궁 근정전")).toBe(true);
  });

  it("rejects unrelated names", () => {
    expect(namesLikelyMatch("모수 서울", "로코스 비비큐 경리단길본점")).toBe(false);
  });
});

describe("pickConfidentMatch", () => {
  const candidates: Candidate[] = [
    { contentid: "1", title: "경복궁", distanceKm: 0.05 },
    { contentid: "2", title: "경복궁 근정전", distanceKm: 0.4 },
  ];

  it("returns the single candidate within radius with a matching name", () => {
    const only = [candidates[0]];
    expect(pickConfidentMatch(only, "경복궁", 0.5)?.contentid).toBe("1");
  });

  it("refuses to pick when 2+ candidates are within radius (ambiguous)", () => {
    expect(pickConfidentMatch(candidates, "경복궁", 0.5)).toBeNull();
  });

  it("refuses to pick when the only candidate is outside the radius", () => {
    expect(pickConfidentMatch([candidates[0]], "경복궁", 0.01)).toBeNull();
  });
});
