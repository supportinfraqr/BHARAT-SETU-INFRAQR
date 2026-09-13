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

/** Decode a QR from an already-loaded image via jsQR.
 *  Allows downscaling/upscaling, adding quiet zone padding, and masking central logo. */
function decodeCanvasWithJsQr(
  img: HTMLImageElement,
  scale: number,
  padRatio: number,
  maskCenterLogo: boolean = false
): string | null {
  const targetW = Math.round(img.width * scale);
  const targetH = Math.round(img.height * scale);
  const pad = Math.round(Math.max(targetW, targetH) * padRatio);
  const canvas = document.createElement("canvas");
  canvas.width = targetW + pad * 2;
  canvas.height = targetH + pad * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, pad, pad, targetW, targetH);

  if (maskCenterLogo) {
    // Fill the central 22% of the QR matrix with white to prevent logo artwork from breaking finder alignment
    const logoW = Math.round(targetW * 0.22);
    const logoH = Math.round(targetH * 0.22);
    const logoX = pad + Math.round((targetW - logoW) / 2);
    const logoY = pad + Math.round((targetH - logoH) / 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(logoX, logoY, logoW, logoH);
  }

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  return code ? code.data : null;
}

/**
 * Decode a QR from an uploaded image file using multi-pass strategies:
 *  1. Direct jsQR decoding at full scale
 *  2. jsQR with quiet-zone padding (for tight margin crops)
 *  3. jsQR downsampled (0.5x, 0.75x) for high-resolution images (1000px+)
 *  4. jsQR with central logo masking (for QRs with BSS logos in center)
 *  5. ZXing BrowserQRCodeReader fallback
 */
export async function decodeQrFromImageFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    // Multi-pass scaling & padding configurations
    const scales = [1, 0.75, 0.5, 1.25];
    const padRatios = [0, 0.1, 0.2];

    // Pass 1 & 2: Standard jsQR decode at various scales and paddings
    for (const scale of scales) {
      for (const padRatio of padRatios) {
        const decoded = decodeCanvasWithJsQr(img, scale, padRatio, false);
        if (decoded) return decoded;
      }
    }

    // Pass 3: Mask central logo if present (BSS logo cover)
    for (const scale of [1, 0.75, 0.5]) {
      for (const padRatio of [0.05, 0.15]) {
        const decoded = decodeCanvasWithJsQr(img, scale, padRatio, true);
        if (decoded) return decoded;
      }
    }

    // Pass 4: ZXing BrowserQRCodeReader fallback
    try {
      const zxingReader = createQrReader();
      const result = await zxingReader.decodeFromImageUrl(url);
      if (result) return result.getText();
    } catch {
      /* fallback attempted */
    }

    throw new Error("No valid QR code could be read from that image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
