import { describe, it, expect } from "vitest";
import {
  placeName,
  questTitle,
  regionDesc,
  artistName,
  categoryLabel,
} from "./localize";

describe("placeName", () => {
  const p = { nameKo: "경복궁", nameEn: "Gyeongbokgung Palace" };
  it("picks Korean for ko", () => expect(placeName(p, "ko")).toBe("경복궁"));
  it("picks English for en", () =>
    expect(placeName(p, "en")).toBe("Gyeongbokgung Palace"));
  it("falls back to Korean when English is empty", () =>
    expect(placeName({ nameKo: "낙산공원", nameEn: "" }, "en")).toBe("낙산공원"));
});

describe("questTitle", () => {
  it("falls back to Korean when English missing", () =>
    expect(
      questTitle({ titleKo: "오마주샷 남기기", titleEn: "" }, "en"),
    ).toBe("오마주샷 남기기"));
});

describe("regionDesc / artistName / categoryLabel", () => {
  it("regionDesc en", () =>
    expect(
      regionDesc({ descriptionKo: "가", descriptionEn: "A" }, "en"),
    ).toBe("A"));
  it("artistName ko uses .name", () =>
    expect(artistName({ name: "아이유", nameEn: "IU" }, "ko")).toBe("아이유"));
  it("categoryLabel en", () => expect(categoryLabel("food", "en")).toBe("Food"));
});
