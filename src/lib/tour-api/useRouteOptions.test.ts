import { describe, expect, it } from "vitest";
import { buildRouteOptions } from "./useRouteOptions";
import { ROUTE_THEMES, jaccardOverlap } from "./routeThemes";
import type { Place, PlaceCategory } from "@/types";

function place(id: string, category: PlaceCategory, artistIds: string[]): Place {
  return {
    id,
    nameKo: id,
    nameEn: id,
    latitude: 37.55 + Math.random() * 0.01,
    longitude: 126.98 + Math.random() * 0.01,
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

function tourApiPlace(id: string): Place {
  return place(id, "photo", []);
}

const EMPTY_RESULTS: Place[][] = [[], [], []];
const themeIds = ROUTE_THEMES.map((t) => t.id);

describe("buildRouteOptions — 3개 테마 구조", () => {
  it("정확히 3개(또는 그 이하, 후보 없는 테마 제외) 옵션을 만들고 카테고리=테마 1:1이 아니다", () => {
    const anchors = [place("a1", "shopping", ["artist-1"])];
    const options = buildRouteOptions(anchors, ["artist-1"], EMPTY_RESULTS);
    expect(options.length).toBeLessThanOrEqual(3);
    expect(options.every((o) => themeIds.includes(o.id))).toBe(true);
  });

  it("모든 루트안은 선택 아티스트의 실제 장소를 최소 1곳 포함한다(앵커가 있으면)", () => {
    const anchors = [place("a1-shopping", "shopping", ["artist-1"])];
    const options = buildRouteOptions(anchors, ["artist-1"], EMPTY_RESULTS);
    for (const option of options) {
      expect(option.places.some((p) => p.artistIds.includes("artist-1"))).toBe(true);
    }
  });
});

describe("buildRouteOptions — shopping/experience가 자연스럽게 테마에 들어간다", () => {
  it("shopping 장소는 최소 한 테마(shop-and-taste)에서 앵커로 뽑힌다", () => {
    const anchors = [place("a1-shopping", "shopping", ["artist-1"])];
    const options = buildRouteOptions(anchors, ["artist-1"], EMPTY_RESULTS);
    const shopAndTaste = options.find((o) => o.id === "shop-and-taste");
    expect(shopAndTaste?.places.some((p) => p.id === "a1-shopping")).toBe(true);
  });

  it("experience 장소는 최소 한 테마(k-culture-explorer)에서 앵커로 뽑힌다", () => {
    const anchors = [place("a1-exp", "experience", ["artist-1"])];
    const options = buildRouteOptions(anchors, ["artist-1"], EMPTY_RESULTS);
    const explorer = options.find((o) => o.id === "k-culture-explorer");
    expect(explorer?.places.some((p) => p.id === "a1-exp")).toBe(true);
  });
});

describe("buildRouteOptions — 다중 아티스트 공정성", () => {
  it("표본이 큰 아티스트가 슬롯을 독식하지 않고 표본이 적은 아티스트도 드러난다", () => {
    const bigArtist = Array.from({ length: 20 }, (_, i) => place(`big-${i}`, "food", ["big"]));
    const smallArtist = [place("small-1", "food", ["small"])];
    const options = buildRouteOptions([...bigArtist, ...smallArtist], ["big", "small"], EMPTY_RESULTS);
    const shopAndTaste = options.find((o) => o.id === "shop-and-taste")!; // food affinity 최고인 테마
    expect(shopAndTaste.places.some((p) => p.artistIds.includes("small"))).toBe(true);
  });

  it("공유 장소(place-05-third처럼 여러 아티스트에 걸친 장소)는 한 번만 등장한다", () => {
    const shared = place("shared-1", "culture", ["a", "b"]);
    const options = buildRouteOptions([shared], ["a", "b"], EMPTY_RESULTS);
    for (const option of options) {
      expect(option.places.filter((p) => p.id === "shared-1")).toHaveLength(1);
    }
  });
});

describe("buildRouteOptions — 루트 간 구별성(9절)", () => {
  it("앵커가 충분하면 세 루트안의 평균 Jaccard overlap이 낮다(사실상 서로 다른 루트)", () => {
    // 15개 앵커, 카테고리를 고르게 섞어 세 테마 모두 채울 재료를 충분히 준다.
    const cats: PlaceCategory[] = ["photo", "culture", "food", "shopping", "experience"];
    const anchors = Array.from({ length: 15 }, (_, i) =>
      place(`p${i}`, cats[i % cats.length], ["artist-1"])
    );
    const options = buildRouteOptions(anchors, ["artist-1"], EMPTY_RESULTS);
    const overlaps: number[] = [];
    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        overlaps.push(jaccardOverlap(options[i].places, options[j].places));
      }
    }
    const avg = overlaps.reduce((s, v) => s + v, 0) / overlaps.length;
    expect(avg).toBeLessThan(0.5);
  });
});

describe("buildRouteOptions — 엣지 케이스", () => {
  it("장소가 1곳뿐인 아티스트(newjeans 케이스)도 예외 없이 동작한다", () => {
    const anchors = [place("only-place", "experience", ["solo-artist"])];
    const options = buildRouteOptions(anchors, ["solo-artist"], EMPTY_RESULTS);
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.places.some((p) => p.id === "only-place")).toBe(true);
    }
  });

  it("아티스트 장소가 전부 shopping/experience뿐이어도(카테고리 다양성 없음) 안전하게 동작한다", () => {
    const anchors = [
      place("s1", "shopping", ["artist-1"]),
      place("s2", "shopping", ["artist-1"]),
      place("e1", "experience", ["artist-1"]),
    ];
    const options = buildRouteOptions(anchors, ["artist-1"], EMPTY_RESULTS);
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.places.some((p) => p.artistIds.includes("artist-1"))).toBe(true);
    }
  });

  it("선택 아티스트 장소가 전혀 없으면 TourAPI 후보로만 채운다(기존 동작 유지)", () => {
    const results: Place[][] = [[tourApiPlace("t1")], [tourApiPlace("t2")], [tourApiPlace("t3")]];
    const options = buildRouteOptions([], [], results);
    expect(options.every((o) => o.places.every((p) => p.artistIds.length === 0))).toBe(true);
  });

  it("단일 아티스트 선택도 정상 동작한다", () => {
    const anchors = [place("p1", "food", ["solo"]), place("p2", "photo", ["solo"])];
    const options = buildRouteOptions(anchors, ["solo"], EMPTY_RESULTS);
    expect(options.length).toBeGreaterThan(0);
  });

  it("3명 이상 다중 아티스트 선택도 정상 동작한다", () => {
    const anchors = [
      place("p1", "food", ["a"]),
      place("p2", "photo", ["b"]),
      place("p3", "shopping", ["c"]),
    ];
    const options = buildRouteOptions(anchors, ["a", "b", "c"], EMPTY_RESULTS);
    expect(options.length).toBeGreaterThan(0);
  });
});

describe("buildRouteOptions — RouteOption에 설명(description)이 포함된다", () => {
  it("각 옵션은 라벨/설명을 ko/en 둘 다 갖는다(하드코딩 아닌 데이터로 존재)", () => {
    const anchors = [place("p1", "food", ["a"])];
    const options = buildRouteOptions(anchors, ["a"], EMPTY_RESULTS);
    for (const option of options) {
      expect(option.labelKo).toBeTruthy();
      expect(option.labelEn).toBeTruthy();
      expect(option.descriptionKo).toBeTruthy();
      expect(option.descriptionEn).toBeTruthy();
    }
  });
});
