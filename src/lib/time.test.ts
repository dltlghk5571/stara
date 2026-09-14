import { describe, expect, it } from "vitest";
import { formatTime } from "./time";

describe("formatTime", () => {
  it("formats Korean AM/PM", () => {
    expect(formatTime("09:00", "ko")).toBe("오전 9:00");
    expect(formatTime("18:30", "ko")).toBe("오후 6:30");
  });

  it("formats English AM/PM", () => {
    expect(formatTime("09:00", "en")).toBe("9:00 AM");
    expect(formatTime("18:30", "en")).toBe("6:30 PM");
  });

  it("handles midnight and noon boundaries", () => {
    expect(formatTime("00:00", "en")).toBe("12:00 AM");
    expect(formatTime("12:00", "en")).toBe("12:00 PM");
  });
});
