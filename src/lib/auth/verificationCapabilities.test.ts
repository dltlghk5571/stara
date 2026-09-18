import { describe, expect, it } from "vitest";
import { capabilitiesFromPublicMetadata } from "./verificationCapabilities";

describe("capabilitiesFromPublicMetadata", () => {
  it("role: tester → both bypass capabilities true", () => {
    const c = capabilitiesFromPublicMetadata({ role: "tester" });
    expect(c).toEqual({ isTester: true, bypassGpsMission: true, bypassTmoneyVerification: true });
  });

  it("ordinary user (no role field) → both false", () => {
    const c = capabilitiesFromPublicMetadata({});
    expect(c).toEqual({ isTester: false, bypassGpsMission: false, bypassTmoneyVerification: false });
  });

  it("missing metadata entirely (null/undefined) → normal behavior, not tester", () => {
    expect(capabilitiesFromPublicMetadata(null)).toEqual({
      isTester: false,
      bypassGpsMission: false,
      bypassTmoneyVerification: false,
    });
    expect(capabilitiesFromPublicMetadata(undefined)).toEqual({
      isTester: false,
      bypassGpsMission: false,
      bypassTmoneyVerification: false,
    });
  });

  it("an unrelated or misspelled role value never grants tester capabilities", () => {
    expect(capabilitiesFromPublicMetadata({ role: "admin" }).isTester).toBe(false);
    expect(capabilitiesFromPublicMetadata({ role: "Tester" }).isTester).toBe(false); // 대소문자 다름 — 우연히 통과되면 안 됨
    expect(capabilitiesFromPublicMetadata({ role: "" }).isTester).toBe(false);
  });

  it("a client-supplied isTester:true field is not the recognized shape — never honored", () => {
    // 이 함수는 metadata.role만 본다. 임의의 isTester 필드는 애초에 무시된다.
    const c = capabilitiesFromPublicMetadata({ isTester: true });
    expect(c.isTester).toBe(false);
  });
});
