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

  it("shopping 카테고리 + artistIds가 있으면 카테고리 대신 kpop 테마 문구를 쓴다(굿즈샵 문맥과 맞음)", () => {
    const withArtist = buildLanguageSubQuest(
      place({ id: "p-artist", category: "shopping", artistIds: ["bts"] })
    );
    const withoutArtist = buildLanguageSubQuest(place({ id: "p-artist", category: "shopping" }));
    expect(withArtist.titleKo).not.toBe(withoutArtist.titleKo);
  });

  it("shopping이 아닌 카테고리는 artistIds가 있어도 카테고리 테마를 그대로 쓴다(굿즈샵 전제 문구가 음식점 등에 나오는 버그 회귀 방지)", () => {
    // 실사례: bigbang-food-mosu-seoul(category: food, artistIds: [bigbang])이 kpop 테마를
    // 타면 "이 앨범 있어요?" 같은 굿즈샵 문구가 파인다이닝 레스토랑에서 나왔다.
    const withArtist = buildLanguageSubQuest(
      place({ id: "p-food-artist", category: "food", artistIds: ["bts"] })
    );
    const withoutArtist = buildLanguageSubQuest(place({ id: "p-food-artist", category: "food" }));
    expect(withArtist.titleKo).toBe(withoutArtist.titleKo);
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

  it("영어 로케일 필드에도 한국어 원문 + 로마자 발음이 빠짐없이 들어있다(번역만 있고 원문이 없던 버그)", () => {
    const q = buildLanguageSubQuest(place({ id: "p-food-en", category: "food" }));
    const hangulPattern = /[가-힣]/; // 한글 음절 범위
    expect(q.titleEn).toMatch(hangulPattern);
    expect(q.descriptionEn).toMatch(hangulPattern);
    // descriptionEn에는 로마자 발음(괄호 안)과 영어 뜻(따옴표 안)도 같이 있어야 한다.
    expect(q.descriptionEn).toMatch(/\(.+\)/);
    expect(q.descriptionEn).toMatch(/"[^"]+"/);
  });

  it("titleEn은 한국어 원문을 그대로 담는다(번역문이 아니라)", () => {
    const q = buildLanguageSubQuest(place({ id: "p-food-title", category: "food" }));
    const koFromTitle = q.titleKo.replace("한국어 한마디: ", "");
    expect(q.titleEn).toContain(koFromTitle);
  });
});
