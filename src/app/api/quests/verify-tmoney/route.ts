import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { classifyTmoneyCard, isQuestPass } from "@/lib/tmoney/classifyTmoneyCard";
import { isSupportedImageType } from "@/lib/tmoney/resizeImage";
import { getServerVerificationCapabilities } from "@/lib/auth/getServerVerificationCapabilities";

/**
 * Verifies a T-money card photo for the segment quest. Image is used only to classify
 * the photo — it is never stored (not Blob, not the DB, not Diary). ANTHROPIC_API_KEY is
 * read server-side only and never exposed to the client.
 *
 * Test-account bypass: a client may request `testBypass: true` to skip the photo check
 * entirely, but this endpoint is the sole authority on whether that request is honored —
 * it always re-derives the tester capability from the authenticated Clerk session
 * (getServerVerificationCapabilities), never from the request body. An ordinary user
 * sending `testBypass: true` falls straight back into the normal image-required path and
 * fails exactly as if they hadn't sent it.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    imageBase64?: string;
    mediaType?: string;
    testBypass?: boolean;
  } | null;

  if (body?.testBypass) {
    const capabilities = await getServerVerificationCapabilities();
    if (capabilities.bypassTmoneyVerification) {
      // Anthropic is never called on this path — no image required, no cost incurred.
      return NextResponse.json({ passed: true, bypassed: true, reason: "test-account" });
    }
    // Not an authorized tester — fall through to the normal path below, which will fail
    // this request the same way it fails any request without a real image.
  }

  if (!body?.imageBase64 || !body?.mediaType) {
    return NextResponse.json({ error: "imageBase64 and mediaType are required" }, { status: 400 });
  }
  if (!isSupportedImageType(body.mediaType)) {
    return NextResponse.json({ error: "unsupported image type" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[verify-tmoney] ANTHROPIC_API_KEY is not configured");
    return NextResponse.json({ error: "verification is not configured on the server" }, { status: 500 });
  }

  try {
    const result = await classifyTmoneyCard({
      base64: body.imageBase64,
      mediaType: body.mediaType,
      apiKey,
      model: process.env.ANTHROPIC_MODEL,
    });

    return NextResponse.json({
      passed: isQuestPass(result),
      confidence: result.confidence,
      detectedBrand: result.detectedBrand,
      reason: result.reason,
      bypassed: false,
    });
  } catch (error) {
    console.error("[verify-tmoney] classification failed:", error);
    return NextResponse.json({ error: "verification failed, please try again" }, { status: 502 });
  }
}
