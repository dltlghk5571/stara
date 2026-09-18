// Server-only. Sends a user-submitted photo to the Anthropic Messages API (Claude Vision)
// to classify whether it shows a physical T-money transit card. This is a *photo*
// classifier, not proof of physical possession — the prompt and the result shape both
// stay honest about that; it never claims cryptographic certainty.
//
// Adapted from github.com/SeojunLim7/card-checker's lib/checkCard.js (Anthropic Messages
// API call shape, lenient JSON extraction), but the prompt and pass condition are STARA-
// specific: card-checker accepts ANY Korean transit card brand, STARA requires T-money
// specifically (Cashbee/RailPlus/e-Z and generic cards must fail).

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";

const TMONEY_PROMPT = `You are an expert at identifying Korean transit cards, specifically the T-money brand.

Look at the single card in the attached photo and answer two separate questions:
1. Is there one physical card visible in the photo (not a phone/tablet screen displaying a card image, not a printed picture of a card)?
2. Is that physical card specifically a T-money card (the T-money brand/logo must be identifiable on the card)?

Requirements:
- Exactly one physical card should be the subject of the photo, clearly enough in view that its printed branding can actually be inspected.
- Only the T-money brand/logo counts as "is_tmoney_card": true. Other Korean transit card brands (Cashbee, RailPlus, e-Z, ONE Card, Hanaro Card, or any bank/credit card with a transit payment logo that is not T-money) must be answered "is_tmoney_card": false, even though they are transit cards in general.
- A phone or other screen displaying a photo/image of a T-money card does NOT count as a physical card — answer "is_physical_card": false in that case.
- Student IDs, membership cards, employee badges, generic credit/debit cards without T-money branding, and any other non-T-money card must be answered "is_tmoney_card": false.
- If the card, its branding, or its identity is not clearly visible enough to be confident, do not guess — set "confidence": "low" and "is_tmoney_card": false.
- Base your answer only on printed logos/text visible in the photo. Do not assume anything about who owns the card or whether they are physically holding it beyond what the photo shows.

Respond with ONLY the following JSON object, no other text:
{"is_physical_card": boolean, "is_tmoney_card": boolean, "confidence": "high" | "medium" | "low", "detected_brand": string or null, "reason": "one or two sentences explaining the decision"}`;

export type TmoneyConfidence = "high" | "medium" | "low";

export interface TmoneyClassification {
  isPhysicalCard: boolean;
  isTmoneyCard: boolean;
  confidence: TmoneyConfidence;
  detectedBrand: string | null;
  reason: string;
}

/**
 * The shape returned to the browser — deliberately simpler than the raw model contract.
 * `bypassed: true` only ever comes from the server-verified test-account path (never from
 * the real classifier) — the client uses it to render an explicitly different "this was
 * not really checked" result instead of pretending AI verification occurred.
 */
export interface VerifyTmoneyApiResponse {
  passed: boolean;
  confidence?: TmoneyConfidence;
  detectedBrand?: string | null;
  reason: string;
  bypassed?: boolean;
}

/**
 * Recommended quest success condition. A low-confidence result never passes — the caller
 * should ask the user to retake the photo rather than completing the quest.
 */
export function isQuestPass(c: TmoneyClassification): boolean {
  return c.isPhysicalCard && c.isTmoneyCard && c.confidence !== "low";
}

/** Leniently extracts one JSON object from model output (raw, fenced, or with surrounding prose). */
function extractJson(text: string): unknown {
  if (!text) throw new Error("empty model response");
  try {
    return JSON.parse(text);
  } catch {
    // fall through to more lenient extraction
  }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      // fall through
    }
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(text.slice(start, end + 1));
  }
  throw new Error("could not find a JSON object in model response");
}

const SAFE_FAILURE: TmoneyClassification = {
  isPhysicalCard: false,
  isTmoneyCard: false,
  confidence: "low",
  detectedBrand: null,
  reason: "Could not parse a valid classification from the model response.",
};

/**
 * Never trusts the raw model output blindly: unknown/missing fields fail safe (false /
 * "low" confidence) rather than being coerced into a pass.
 */
function normalizeClassification(parsed: unknown): TmoneyClassification {
  if (!parsed || typeof parsed !== "object") return SAFE_FAILURE;
  const obj = parsed as Record<string, unknown>;
  const confidence: TmoneyConfidence =
    obj.confidence === "high" || obj.confidence === "medium" || obj.confidence === "low"
      ? obj.confidence
      : "low";
  return {
    isPhysicalCard: obj.is_physical_card === true,
    isTmoneyCard: obj.is_tmoney_card === true,
    confidence,
    detectedBrand: typeof obj.detected_brand === "string" && obj.detected_brand.trim() ? obj.detected_brand : null,
    reason: typeof obj.reason === "string" ? obj.reason : "",
  };
}

export interface ClassifyTmoneyCardParams {
  base64: string;
  mediaType: string;
  apiKey: string;
  model?: string;
  /** Injectable for tests — defaults to the global fetch. Never call the live API from a test. */
  fetchImpl?: typeof fetch;
}

/**
 * Classifies one card photo. Throws only for conditions the caller must treat as a hard
 * error (missing config, missing image, upstream/network failure) — a malformed model
 * response is NOT thrown, it fails safe to SAFE_FAILURE so the API route can always return
 * a normal {passed:false} result instead of a 5xx for that case.
 */
export async function classifyTmoneyCard(params: ClassifyTmoneyCardParams): Promise<TmoneyClassification> {
  const { base64, mediaType, apiKey, model, fetchImpl = fetch } = params;

  if (!apiKey) {
    const err = new Error("ANTHROPIC_API_KEY is not configured") as Error & { code?: string };
    err.code = "missing_api_key";
    throw err;
  }
  if (!base64 || !mediaType) {
    const err = new Error("missing image data") as Error & { code?: string };
    err.code = "missing_image";
    throw err;
  }

  const res = await fetchImpl(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: TMONEY_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const err = new Error(`Anthropic API error (${res.status}): ${bodyText.slice(0, 500)}`) as Error & {
      code?: string;
      status?: number;
    };
    err.code = "upstream_error";
    err.status = res.status;
    throw err;
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n");

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    return SAFE_FAILURE;
  }

  return normalizeClassification(parsed);
}
