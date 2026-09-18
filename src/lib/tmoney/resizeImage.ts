// Client-side image preprocessing for the T-money verification flow. Adapted from
// card-checker's public/index.html resizeToJpeg() — same longest-side/quality behavior,
// extracted into a small reusable helper instead of embedding canvas logic in the
// component. The pure size math is factored out (computeResizedDimensions) so it can be
// unit tested without a DOM; the actual Image/canvas work only runs in the browser.

export const TMONEY_MAX_IMAGE_SIDE_PX = 1280;
export const TMONEY_JPEG_QUALITY = 0.85;

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isSupportedImageType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.has(mimeType);
}

/** Pure — scales width/height down so the longest side is at most maxSide, never upscales. */
export function computeResizedDimensions(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface ResizedImage {
  base64: string;
  mediaType: "image/jpeg";
}

/**
 * Resizes an image file/blob client-side and re-encodes it as JPEG, returning base64 data
 * ready to send to the server. Browser-only (Image/canvas/FileReader) — not unit tested
 * directly (no DOM in this project's test setup); computeResizedDimensions covers the math.
 */
export function resizeImageToJpeg(
  file: File | Blob,
  maxSide: number = TMONEY_MAX_IMAGE_SIDE_PX,
  quality: number = TMONEY_JPEG_QUALITY
): Promise<ResizedImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const { width, height } = computeResizedDimensions(img.naturalWidth, img.naturalHeight, maxSide);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("canvas 2d context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("image resize failed"));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1] ?? "";
            resolve({ base64, mediaType: "image/jpeg" });
          };
          reader.onerror = () => reject(new Error("failed to read resized image"));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image load failed"));
    };
    img.src = objectUrl;
  });
}
