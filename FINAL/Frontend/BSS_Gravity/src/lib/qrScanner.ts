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
