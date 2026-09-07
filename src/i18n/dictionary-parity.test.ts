import { describe, it, expect } from "vitest";
import { en } from "./dictionaries/en";
import { ko } from "./dictionaries/ko";

function paths(obj: unknown, prefix = ""): string[] {
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      paths(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe("dictionary parity", () => {
  it("ko has exactly the same key paths as en", () => {
    const a = paths(en).sort();
    const b = paths(ko).sort();
    expect(b).toEqual(a);
  });
});
