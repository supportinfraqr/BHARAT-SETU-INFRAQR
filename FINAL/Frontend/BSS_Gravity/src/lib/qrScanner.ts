"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";

/**
 * Optimised QR capture settings shared by all BSS scanners:
 *  - higher-resolution back camera,
 *  - TRY_HARDER decode hint,
 *  - short delay between attempts (snappier) and between successes (debounce).
 */
export const QR_VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

export function createQrReader(): BrowserQRCodeReader {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserQRCodeReader(hints as Map<DecodeHintType, never>, {
    delayBetweenScanAttempts: 80,
    delayBetweenScanSuccess: 500,
  });
}

/** Ask the camera track for continuous autofocus (best-effort; unsupported on some devices). */
export function applyContinuousFocus(controls: { streamVideoConstraintsApply?: (c: MediaTrackConstraints, f?: (track: MediaStreamTrack) => MediaStreamTrack[]) => void } | null): void {
  try {
    controls?.streamVideoConstraintsApply?.({ focusMode: "continuous" } as unknown as MediaTrackConstraints);
  } catch {
    /* not supported */
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Decode a QR from an uploaded image file. The BSS credential/site QRs are
 * composited with a small (1-module) quiet zone, which the live camera tolerates
 * but ZXing's still-image path can reject — so on failure we re-draw the image
 * on a canvas with a generous white quiet-zone border and try again.
 */
export async function decodeQrFromImageFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    try {
      return (await createQrReader().decodeFromImageUrl(url)).getText();
    } catch {
      const img = await loadImage(url);
      const pad = Math.round(Math.max(img.width, img.height) * 0.1);
      const canvas = document.createElement("canvas");
      canvas.width = img.width + pad * 2;
      canvas.height = img.height + pad * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad);
      return (await createQrReader().decodeFromImageUrl(canvas.toDataURL("image/png"))).getText();
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}
