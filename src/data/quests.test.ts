import { describe, expect, it } from "vitest";
import { buildLanguageSubQuest } from "./quests";
import type { Place } from "@/types";

function place(overrides: Partial<Place> & Pick<Place, "id" | "category">): Place {
  return {
    nameKo: overrides.id,
    nameEn: overrides.id,
    latitude: 37.5,
    longitude: 127,
    artistIds: [],
    relationTextKo: "",
    relationTextEn: "",
    dwellMinutes: 30,
    isFood: false,
    isLocalSpot: false,
    isMainRoute: false,
    questIds: [],
    ...overrides,
  };
}

describe("buildLanguageSubQuest", () => {
  it("장소 카테고리에 맞는 언어 퀘스트를 만든다(필수 아님, bonus_badge)", () => {
    const q = buildLanguageSubQuest(place({ id: "p-food", category: "food" }));
    expect(q.type).toBe("language");
    expect(q.required).toBe(false);
    expect(q.rewardType).toBe("bonus_badge");
    expect(q.titleKo).toContain("한국어 한마디");
  });

  it("artistIds가 있으면 카테고리 대신 kpop 테마 문구를 쓴다", () => {
    const withArtist = buildLanguageSubQuest(
      place({ id: "p-artist", category: "food", artistIds: ["bts"] })
    );
    const withoutArtist = buildLanguageSubQuest(place({ id: "p-artist", category: "food" }));
    expect(withArtist.titleKo).not.toBe(withoutArtist.titleKo);
  });

  it("같은 장소는 항상 같은 문구를 반환한다(결정론적)", () => {
    const p = place({ id: "p-deterministic", category: "culture" });
    expect(buildLanguageSubQuest(p).titleKo).toBe(buildLanguageSubQuest(p).titleKo);
  });

  it("장소가 달라지면 (보통) 다른 문구가 나온다 — 항상 같은 문구로 고정되지 않는다", () => {
    const titles = new Set(
      Array.from({ length: 8 }, (_, i) =>
        buildLanguageSubQuest(place({ id: `p-${i}`, category: "shopping" })).titleKo
      )
    );
    expect(titles.size).toBeGreaterThan(1);
  });
});
