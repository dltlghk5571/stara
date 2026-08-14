import { describe, expect, it } from "vitest";
import { normalizeUsername, validateUsername } from "./username";

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  Isihwa  ")).toBe("isihwa");
  });
});

describe("validateUsername", () => {
  it("accepts a normal username", () => {
    expect(validateUsername("k_pop_fan_01")).toEqual({ ok: true });
  });

  it("rejects too short", () => {
    expect(validateUsername("ab")).toEqual({
      ok: false,
      error: "username must be 3-20 chars: a-z, 0-9, _",
    });
  });

  it("rejects too long", () => {
    expect(validateUsername("a".repeat(21)).ok).toBe(false);
  });

  it("rejects uppercase and special characters", () => {
    expect(validateUsername("Bad Name!").ok).toBe(false);
  });

  it("rejects reserved words regardless of case", () => {
    expect(validateUsername("Admin")).toEqual({ ok: false, error: "username is reserved" });
    expect(validateUsername("stara")).toEqual({ ok: false, error: "username is reserved" });
  });
});
