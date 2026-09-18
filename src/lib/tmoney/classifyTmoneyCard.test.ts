import { describe, expect, it, vi } from "vitest";
import { classifyTmoneyCard, isQuestPass } from "./classifyTmoneyCard";

/** Builds a fake fetch that returns a Claude-Messages-API-shaped response with the given text block. */
function fakeFetch(modelText: string, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => ({ content: [{ type: "text", text: modelText }] }),
    text: async () => modelText,
  });
}

const BASE_PARAMS = { base64: "abc123", mediaType: "image/jpeg", apiKey: "sk-test" };

describe("classifyTmoneyCard — never calls the live Anthropic API (fetchImpl is always mocked)", () => {
  it("physical T-money card, high confidence → passes", async () => {
    const fetchImpl = fakeFetch(
      JSON.stringify({
        is_physical_card: true,
        is_tmoney_card: true,
        confidence: "high",
        detected_brand: "T-money",
        reason: "T-money logo clearly visible.",
      })
    );
    const result = await classifyTmoneyCard({ ...BASE_PARAMS, fetchImpl });
    expect(result.isPhysicalCard).toBe(true);
    expect(result.isTmoneyCard).toBe(true);
    expect(result.confidence).toBe("high");
    expect(isQuestPass(result)).toBe(true);
  });

  it("Cashbee card → fails (not T-money, even though it is a transit card)", async () => {
    const fetchImpl = fakeFetch(
      JSON.stringify({
        is_physical_card: true,
        is_tmoney_card: false,
        confidence: "high",
        detected_brand: "Cashbee",
        reason: "Cashbee branding visible, not T-money.",
      })
    );
    const result = await classifyTmoneyCard({ ...BASE_PARAMS, fetchImpl });
    expect(isQuestPass(result)).toBe(false);
    expect(result.detectedBrand).toBe("Cashbee");
  });

  it("RailPlus card → fails", async () => {
    const fetchImpl = fakeFetch(
      JSON.stringify({ is_physical_card: true, is_tmoney_card: false, confidence: "high", detected_brand: "RailPlus", reason: "RailPlus, not T-money." })
    );
    const result = await classifyTmoneyCard({ ...BASE_PARAMS, fetchImpl });
    expect(isQuestPass(result)).toBe(false);
  });

  it("generic credit card → fails", async () => {
    const fetchImpl = fakeFetch(
      JSON.stringify({
        is_physical_card: true,
        is_tmoney_card: false,
        confidence: "high",
        detected_brand: null,
        reason: "No transit branding, ordinary bank card.",
      })
    );
    const result = await classifyTmoneyCard({ ...BASE_PARAMS, fetchImpl });
    expect(isQuestPass(result)).toBe(false);
  });

  it("phone screenshot of a T-money card → fails (not a physical card)", async () => {
    const fetchImpl = fakeFetch(
      JSON.stringify({
        is_physical_card: false,
        is_tmoney_card: true,
        confidence: "medium",
        detected_brand: "T-money",
        reason: "Image shows a phone screen displaying a T-money card, not a physical card.",
      })
    );
    const result = await classifyTmoneyCard({ ...BASE_PARAMS, fetchImpl });
    expect(result.isPhysicalCard).toBe(false);
    expect(isQuestPass(result)).toBe(false);
  });

  it("low-confidence T-money → fails (ask user to retake rather than pass)", async () => {
    const fetchImpl = fakeFetch(
      JSON.stringify({
        is_physical_card: true,
        is_tmoney_card: true,
        confidence: "low",
        detected_brand: "T-money",
        reason: "Card is blurry, branding not fully legible.",
      })
    );
    const result = await classifyTmoneyCard({ ...BASE_PARAMS, fetchImpl });
    expect(result.confidence).toBe("low");
    expect(isQuestPass(result)).toBe(false);
  });

  it("malformed model JSON → safe failure, never throws", async () => {
    const fetchImpl = fakeFetch("this is not json at all, sorry!");
    const result = await classifyTmoneyCard({ ...BASE_PARAMS, fetchImpl });
    expect(result.isPhysicalCard).toBe(false);
    expect(result.isTmoneyCard).toBe(false);
    expect(result.confidence).toBe("low");
    expect(isQuestPass(result)).toBe(false);
  });

  it("model wraps JSON in a code fence → still parses correctly", async () => {
    const fetchImpl = fakeFetch(
      "```json\n" +
        JSON.stringify({ is_physical_card: true, is_tmoney_card: true, confidence: "high", detected_brand: "T-money", reason: "ok" }) +
        "\n```"
    );
    const result = await classifyTmoneyCard({ ...BASE_PARAMS, fetchImpl });
    expect(isQuestPass(result)).toBe(true);
  });

  it("model response missing expected fields → normalizes to safe defaults, does not throw", async () => {
    const fetchImpl = fakeFetch(JSON.stringify({ foo: "bar" }));
    const result = await classifyTmoneyCard({ ...BASE_PARAMS, fetchImpl });
    expect(result.isPhysicalCard).toBe(false);
    expect(result.isTmoneyCard).toBe(false);
    expect(result.confidence).toBe("low");
    expect(result.detectedBrand).toBeNull();
  });

  it("missing apiKey → throws with code missing_api_key, never calls fetch", async () => {
    const fetchImpl = fakeFetch("{}");
    await expect(
      classifyTmoneyCard({ base64: "x", mediaType: "image/jpeg", apiKey: "", fetchImpl })
    ).rejects.toMatchObject({ code: "missing_api_key" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("missing image data → throws with code missing_image", async () => {
    const fetchImpl = fakeFetch("{}");
    await expect(
      classifyTmoneyCard({ base64: "", mediaType: "", apiKey: "sk-test", fetchImpl })
    ).rejects.toMatchObject({ code: "missing_image" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("upstream HTTP error → throws with code upstream_error and the status", async () => {
    const fetchImpl = fakeFetch("rate limited", false, 429);
    await expect(classifyTmoneyCard({ ...BASE_PARAMS, fetchImpl })).rejects.toMatchObject({
      code: "upstream_error",
      status: 429,
    });
  });
});
