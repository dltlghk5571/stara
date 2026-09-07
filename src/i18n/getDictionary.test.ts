import { describe, it, expect, vi } from "vitest";
import { getDictionary, translate } from "./getDictionary";

describe("getDictionary", () => {
  it("returns the English dict for 'en'", () => {
    expect(getDictionary("en").common.retry).toBe("Try again");
  });
  it("returns the Korean dict for 'ko'", () => {
    expect(getDictionary("ko").common.retry).toBe("다시 시도");
  });
});

describe("translate", () => {
  const dict = getDictionary("en");
  it("resolves a dotted path", () => {
    expect(translate(dict, "common.retry")).toBe("Try again");
  });
  it("interpolates", () => {
    expect(translate(dict, "common.minutes", { n: 5 })).toBe("5 min");
  });
  it("returns the key and warns on a miss", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(translate(dict, "common.nope")).toBe("common.nope");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
