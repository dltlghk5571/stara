import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

const classifyTmoneyCardMock = vi.fn();
vi.mock("@/lib/tmoney/classifyTmoneyCard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tmoney/classifyTmoneyCard")>(
    "@/lib/tmoney/classifyTmoneyCard"
  );
  return {
    ...actual,
    classifyTmoneyCard: (...args: unknown[]) => classifyTmoneyCardMock(...args),
  };
});

const getServerVerificationCapabilitiesMock = vi.fn();
vi.mock("@/lib/auth/getServerVerificationCapabilities", () => ({
  getServerVerificationCapabilities: () => getServerVerificationCapabilitiesMock(),
}));

const NORMAL_CAPABILITIES = { isTester: false, bypassGpsMission: false, bypassTmoneyVerification: false };
const TESTER_CAPABILITIES = { isTester: true, bypassGpsMission: true, bypassTmoneyVerification: true };

// Imported after the mocks above so the route picks up the mocked modules.
const { POST } = await import("./route");

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/quests/verify-tmoney", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/quests/verify-tmoney", () => {
  beforeEach(() => {
    authMock.mockReset();
    classifyTmoneyCardMock.mockReset();
    getServerVerificationCapabilitiesMock.mockReset();
    getServerVerificationCapabilitiesMock.mockResolvedValue(NORMAL_CAPABILITIES); // 기본값 — 명시적으로 오버라이드하지 않는 한 일반 유저
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("rejects an unauthenticated request with 401 and never calls the classifier", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await POST(req({ imageBase64: "abc", mediaType: "image/jpeg" }));
    expect(res.status).toBe(401);
    expect(classifyTmoneyCardMock).not.toHaveBeenCalled();
  });

  it("rejects a request missing the image", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    const res = await POST(req({ mediaType: "image/jpeg" }));
    expect(res.status).toBe(400);
    expect(classifyTmoneyCardMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid/unsupported MIME type", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    const res = await POST(req({ imageBase64: "abc", mediaType: "application/pdf" }));
    expect(res.status).toBe(400);
    expect(classifyTmoneyCardMock).not.toHaveBeenCalled();
  });

  it("returns 500 and never calls the classifier when ANTHROPIC_API_KEY is missing", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    const res = await POST(req({ imageBase64: "abc", mediaType: "image/jpeg" }));
    expect(res.status).toBe(500);
    expect(classifyTmoneyCardMock).not.toHaveBeenCalled();
  });

  it("returns a passed:true mocked classifier result for an authenticated, valid request", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    authMock.mockResolvedValue({ userId: "user_1" });
    classifyTmoneyCardMock.mockResolvedValue({
      isPhysicalCard: true,
      isTmoneyCard: true,
      confidence: "high",
      detectedBrand: "T-money",
      reason: "clear T-money logo",
    });

    const res = await POST(req({ imageBase64: "abc", mediaType: "image/jpeg" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      passed: true,
      confidence: "high",
      detectedBrand: "T-money",
      reason: "clear T-money logo",
      bypassed: false,
    });
  });

  it("returns passed:false (not a 5xx) when the classifier result fails the quest condition", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    authMock.mockResolvedValue({ userId: "user_1" });
    classifyTmoneyCardMock.mockResolvedValue({
      isPhysicalCard: true,
      isTmoneyCard: false,
      confidence: "high",
      detectedBrand: "Cashbee",
      reason: "not T-money",
    });

    const res = await POST(req({ imageBase64: "abc", mediaType: "image/jpeg" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.passed).toBe(false);
  });

  it("returns 502 when the classifier throws (upstream/network failure) — the request can be retried", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    authMock.mockResolvedValue({ userId: "user_1" });
    classifyTmoneyCardMock.mockRejectedValue(Object.assign(new Error("boom"), { code: "upstream_error" }));

    const res = await POST(req({ imageBase64: "abc", mediaType: "image/jpeg" }));
    expect(res.status).toBe(502);
  });

  describe("test-account bypass — server is authoritative, never trusts the request body alone", () => {
    it("a tester requesting testBypass passes immediately, without an image, and without calling the classifier", async () => {
      authMock.mockResolvedValue({ userId: "tester_1" });
      getServerVerificationCapabilitiesMock.mockResolvedValue(TESTER_CAPABILITIES);

      const res = await POST(req({ testBypass: true }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ passed: true, bypassed: true, reason: "test-account" });
      expect(classifyTmoneyCardMock).not.toHaveBeenCalled();
    });

    it("tester bypass never makes a network call at all (Anthropic cost avoided)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      authMock.mockResolvedValue({ userId: "tester_1" });
      getServerVerificationCapabilitiesMock.mockResolvedValue(TESTER_CAPABILITIES);

      await POST(req({ testBypass: true }));
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("an ordinary authenticated user requesting testBypass does NOT pass — falls back to the normal (failing, no-image) path", async () => {
      authMock.mockResolvedValue({ userId: "user_1" });
      getServerVerificationCapabilitiesMock.mockResolvedValue(NORMAL_CAPABILITIES);

      const res = await POST(req({ testBypass: true }));
      expect(res.status).toBe(400); // 이미지 없음 — 우회는 절대 승인되지 않았다
      const body = await res.json();
      expect(body.passed).toBeUndefined();
      expect(classifyTmoneyCardMock).not.toHaveBeenCalled();
    });

    it("an ordinary user cannot force a pass even if they also include image fields alongside testBypass", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-test";
      authMock.mockResolvedValue({ userId: "user_1" });
      getServerVerificationCapabilitiesMock.mockResolvedValue(NORMAL_CAPABILITIES);
      classifyTmoneyCardMock.mockResolvedValue({
        isPhysicalCard: true,
        isTmoneyCard: false,
        confidence: "high",
        detectedBrand: null,
        reason: "not T-money",
      });

      const res = await POST(req({ testBypass: true, imageBase64: "abc", mediaType: "image/jpeg" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.passed).toBe(false); // 실제 분류기 결과를 그대로 따른다 — bypassed 아님
      expect(body.bypassed).toBe(false);
      expect(classifyTmoneyCardMock).toHaveBeenCalledOnce(); // 우회가 아니라 정상 분류 경로를 탔다
    });

    it("unauthenticated + testBypass is still rejected with 401 before any capability check", async () => {
      authMock.mockResolvedValue({ userId: null });
      const res = await POST(req({ testBypass: true }));
      expect(res.status).toBe(401);
      expect(getServerVerificationCapabilitiesMock).not.toHaveBeenCalled();
    });
  });
});
