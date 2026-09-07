import { describe, it, expect } from "vitest";
import { interpolate } from "./interpolate";

describe("interpolate", () => {
  it("replaces named tokens", () => {
    expect(interpolate("Add {name}?", { name: "Leeum" })).toBe("Add Leeum?");
  });

  it("replaces a numeric token and repeats", () => {
    expect(interpolate("{n} of {n}", { n: 3 })).toBe("3 of 3");
  });

  it("leaves unknown tokens untouched", () => {
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });

  it("returns the template unchanged when no vars given", () => {
    expect(interpolate("plain")).toBe("plain");
  });
});
