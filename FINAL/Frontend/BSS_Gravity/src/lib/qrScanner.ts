"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import jsQR from "jsqr";

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

/** Decode a QR from an already-loaded image via jsQR (more tolerant than ZXing
 *  on still images). `padRatio` adds a white quiet-zone border. */
function decodeImageWithJsQr(img: HTMLImageElement, padRatio: number): string | null {
  const pad = Math.round(Math.max(img.width, img.height) * padRatio);
  const canvas = document.createElement("canvas");
  canvas.width = img.width + pad * 2;
  canvas.height = img.height + pad * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, pad, pad);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  return code ? code.data : null;
}

/**
 * Decode a QR from an uploaded image file. Uses jsQR because ZXing's still-image
 * path can throw a ChecksumException on some BSS credential QRs (e.g. the longer
 * employer payload) even though the live camera reads them fine. A padded
 * quiet-zone retry covers QRs composited with a tight margin.
 */
export async function decodeQrFromImageFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const direct = decodeImageWithJsQr(img, 0);
    if (direct) return direct;
    const padded = decodeImageWithJsQr(img, 0.1);
    if (padded) return padded;
    throw new Error("No QR code found in the image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
