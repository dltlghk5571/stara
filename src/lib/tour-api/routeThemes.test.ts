import { describe, expect, it } from "vitest";
import { ROUTE_THEMES, themeScore, jaccardOverlap, MULTI_ARTIST_BONUS, CROSS_ROUTE_REUSE_PENALTY } from "./routeThemes";
import type { Place, PlaceCategory } from "@/types";

function place(id: string, category: PlaceCategory, artistIds: string[]): Place {
  return {
    id,
    nameKo: id,
    nameEn: id,
    latitude: 37.55,
    longitude: 126.98,
    category,
    artistIds,
    relationTextKo: "",
    relationTextEn: "",
    dwellMinutes: 30,
    isFood: category === "food",
    isLocalSpot: false,
    isMainRoute: false,
    questIds: [],
  };
}

const [fanHighlights, kCultureExplorer, shopAndTaste] = ROUTE_THEMES;

describe("ROUTE_THEMES — 실데이터 기반 3개 테마", () => {
  it("정확히 3개 테마를 유지한다(카테고리별 5개 루트로 늘리지 않음)", () => {
    expect(ROUTE_THEMES).toHaveLength(3);
  });

  it("각 테마는 카테고리마다 서로 다른 affinity를 가져 색깔이 갈린다(1:1 매핑 아님)", () => {
    // 세 테마의 affinity 벡터가 서로 동일하지 않아야(진짜 다른 여행 성격) 한다.
    const vector = (t: (typeof ROUTE_THEMES)[number]) =>
      JSON.stringify(t.categoryAffinity);
    expect(vector(fanHighlights)).not.toBe(vector(kCultureExplorer));
    expect(vector(kCultureExplorer)).not.toBe(vector(shopAndTaste));
  });

  it("shopping은 shop-and-taste에서 가장 높은 affinity를 갖는다", () => {
    const affinities = ROUTE_THEMES.map((t) => t.categoryAffinity.shopping);
    expect(Math.max(...affinities)).toBe(shopAndTaste.categoryAffinity.shopping);
  });

  it("experience는 k-culture-explorer에서 가장 높은 affinity를 갖는다", () => {
    const affinities = ROUTE_THEMES.map((t) => t.categoryAffinity.experience);
    expect(Math.max(...affinities)).toBe(kCultureExplorer.categoryAffinity.experience);
  });

  it("어떤 카테고리도 0점(완전 배제)인 테마가 없다 — 표본이 얇아도 완전히 못 들어가진 않는다", () => {
    for (const theme of ROUTE_THEMES) {
      for (const affinity of Object.values(theme.categoryAffinity)) {
        expect(affinity).toBeGreaterThan(0);
      }
    }
  });
});

describe("themeScore — 결정적 스코어링", () => {
  it("affinity가 높은 카테고리가 더 높은 점수를 받는다", () => {
    const shoppingPlace = place("p1", "shopping", ["a"]);
    const foodPlace = place("p2", "food", ["a"]);
    const shoppingScore = themeScore(shoppingPlace, shopAndTaste, ["a"], new Set());
    const foodScore = themeScore(foodPlace, shopAndTaste, ["a"], new Set());
    expect(shoppingScore).toBeGreaterThan(foodScore);
  });

  it("선택 아티스트 2명 이상이 겹치면 보너스를 받는다", () => {
    const solo = place("p1", "culture", ["a"]);
    const shared = place("p2", "culture", ["a", "b"]);
    const soloScore = themeScore(solo, kCultureExplorer, ["a", "b"], new Set());
    const sharedScore = themeScore(shared, kCultureExplorer, ["a", "b"], new Set());
    expect(sharedScore - soloScore).toBeCloseTo(MULTI_ARTIST_BONUS, 5);
  });

  it("이미 다른 루트안에서 쓴 장소는 페널티를 받는다", () => {
    const p = place("p1", "photo", ["a"]);
    const fresh = themeScore(p, fanHighlights, ["a"], new Set());
    const reused = themeScore(p, fanHighlights, ["a"], new Set(["p1"]));
    expect(fresh - reused).toBeCloseTo(CROSS_ROUTE_REUSE_PENALTY, 5);
  });

  it("같은 입력이면 항상 같은 점수(결정적, LLM 없음)", () => {
    const p = place("p1", "food", ["a", "b"]);
    const s1 = themeScore(p, shopAndTaste, ["a", "b"], new Set(["x"]));
    const s2 = themeScore(p, shopAndTaste, ["a", "b"], new Set(["x"]));
    expect(s1).toBe(s2);
  });
});

describe("jaccardOverlap", () => {
  it("완전히 같은 두 루트는 1이다", () => {
    const a = [place("p1", "food", []), place("p2", "food", [])];
    expect(jaccardOverlap(a, a)).toBe(1);
  });

  it("완전히 다른 두 루트는 0이다", () => {
    const a = [place("p1", "food", [])];
    const b = [place("p2", "food", [])];
    expect(jaccardOverlap(a, b)).toBe(0);
  });

  it("일부만 겹치면 |교집합|/|합집합|을 정확히 계산한다", () => {
    const a = [place("p1", "food", []), place("p2", "food", [])];
    const b = [place("p2", "food", []), place("p3", "food", [])];
    expect(jaccardOverlap(a, b)).toBeCloseTo(1 / 3, 5);
  });

  it("둘 다 비어있으면 0(겹침 없음)이다", () => {
    expect(jaccardOverlap([], [])).toBe(0);
  });
});
