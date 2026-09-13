"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import QRCode from "qrcode";
import { createWorkerQrPayload } from "@/components/qr/WorkerQr";

const LOGO_SRC = "/bss-original-logo.png";
const SIZE = 1024;
// Overlay geometry matches the card QR zone: 46px tile / 36px logo / 9px
// radius over a 240px QR.
const TILE_RATIO = 46 / 240;
const LOGO_RATIO = 36 / 240;
const RADIUS_RATIO = 9 / 240;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Render the BSS credential QR (with the white tile + logo overlay) to a PNG
 *  data URL. The SAME data URL is used for the on-screen image and the
 *  download, so what you see is exactly what you download. */
async function renderCredentialQr(bssId: string): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(createWorkerQrPayload(bssId), {
    errorCorrectionLevel: "H",
    margin: 1,
    width: SIZE,
  });
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return qrDataUrl;

  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, 0, 0, SIZE, SIZE);

  const tile = Math.round(SIZE * TILE_RATIO);
  const logo = Math.round(SIZE * LOGO_RATIO);
  const radius = Math.round(SIZE * RADIUS_RATIO);
  const tilePos = (SIZE - tile) / 2;

  ctx.save();
  roundedRect(ctx, tilePos, tilePos, tile, tile, radius);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  try {
    const logoImg = await loadImage(LOGO_SRC);
    ctx.drawImage(logoImg, (SIZE - logo) / 2, (SIZE - logo) / 2, logo, logo);
  } catch {
    /* cosmetic overlay — the QR still scans without it */
  }
  return canvas.toDataURL("image/png");
}

/**
 * The large "scan to verify" QR block shown under every BSS identity card
 * (worker / contractor / employer), with an individual QR download button.
 */
export default function CredentialQrPanel({
  bssId,
  name,
  idLabel = "BSS credential",
  description,
}: {
  bssId: string;
  name?: string;
  idLabel?: string;
  description?: string;
}) {
  const [qrSrc, setQrSrc] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setQrSrc("");
    if (!bssId) return;
    renderCredentialQr(bssId)
      .then(src => { if (active) setQrSrc(src); })
      .catch(() => { if (active) setError("The QR code could not be generated."); });
    return () => { active = false; };
  }, [bssId]);

  function downloadQr() {
    if (!qrSrc || !bssId) return;
    const link = document.createElement("a");
    link.href = qrSrc;
    link.download = `BSS-QR-${bssId}.png`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
      <div className="w-56 h-56 sm:w-60 sm:h-60 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center flex-shrink-0">
        {qrSrc
          ? <img src={qrSrc} alt={`Scannable QR for ${bssId}`} className="w-full h-full" />
          : <div className="w-full h-full animate-pulse bg-gray-200" aria-label="Generating QR code" />}
      </div>
      <div className="text-center sm:text-left min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Scan to verify</p>
        {name && <h2 className="text-lg font-bold text-[#062D4F] mt-1 break-words">{name}</h2>}
        <p className="font-mono text-sm text-gray-500 mt-1 break-all">{bssId}</p>
        <p className="text-xs text-gray-500 mt-3">
          {description ?? `This QR carries the same BSS credential as the card — use it when the printed card QR is too small to scan. Anyone can scan it to verify this ${idLabel}.`}
        </p>
        <button
          type="button"
          onClick={downloadQr}
          disabled={!qrSrc}
          className="mt-4 inline-flex items-center gap-2 bg-[#073B67] hover:bg-[#062D4F] disabled:opacity-60 disabled:cursor-wait text-white px-4 py-2.5 rounded-[12px] font-bold text-sm shadow-sm transition-all"
        >
          <Download size={16} /> {qrSrc ? "Download QR" : "Preparing QR…"}
        </button>
        {error && <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mt-3">{error}</p>}
      </div>
    </section>
  );
}
