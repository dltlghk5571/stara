import { describe, expect, it } from "vitest";
import { computeResizedDimensions, isSupportedImageType, TMONEY_MAX_IMAGE_SIDE_PX } from "./resizeImage";

describe("computeResizedDimensions", () => {
  it("does not upscale an image already under the limit", () => {
    expect(computeResizedDimensions(400, 300, 1280)).toEqual({ width: 400, height: 300 });
  });

  it("scales the longest side down to maxSide, preserving aspect ratio", () => {
    const result = computeResizedDimensions(4000, 2000, 1280);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(640);
  });

  it("scales a portrait image (height is the longest side) correctly", () => {
    const result = computeResizedDimensions(2000, 4000, 1280);
    expect(result.height).toBe(1280);
    expect(result.width).toBe(640);
  });

  it("never produces a zero dimension for a very thin image", () => {
    const result = computeResizedDimensions(10000, 1, 1280);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it("the default max side used by the quest flow is 1280px", () => {
    expect(TMONEY_MAX_IMAGE_SIDE_PX).toBe(1280);
  });
});

describe("isSupportedImageType", () => {
  it("accepts jpeg, png, webp", () => {
    expect(isSupportedImageType("image/jpeg")).toBe(true);
    expect(isSupportedImageType("image/png")).toBe(true);
    expect(isSupportedImageType("image/webp")).toBe(true);
  });

  it("rejects unsupported or invalid types", () => {
    expect(isSupportedImageType("image/heic")).toBe(false);
    expect(isSupportedImageType("application/pdf")).toBe(false);
    expect(isSupportedImageType("")).toBe(false);
  });
});
