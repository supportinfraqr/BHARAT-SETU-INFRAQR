"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import QRCode from "qrcode";
import WorkerQr, { createWorkerQrPayload } from "@/components/qr/WorkerQr";

const LOGO_SRC = "/bss-original-logo.png";
// Overlay geometry matches the on-screen panel: 46px tile / 36px logo / 9px
// radius over a 240px QR. Ratios are reused so the download looks identical.
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

/**
 * The large "scan to verify" QR block shown under every BSS identity card
 * (worker / contractor / employer), with an individual QR download button.
 * The downloaded PNG is composited exactly like the displayed QR (same
 * payload, margin, colours and BSS logo overlay).
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function downloadQr() {
    if (!bssId || busy) return;
    setBusy(true);
    setError("");
    try {
      const size = 1024;
      const dataUrl = await QRCode.toDataURL(createWorkerQrPayload(bssId), {
        errorCorrectionLevel: "H",
        margin: 1,
        width: size,
      });

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable.");

      const qrImg = await loadImage(dataUrl);
      ctx.drawImage(qrImg, 0, 0, size, size);

      const tile = Math.round(size * TILE_RATIO);
      const logo = Math.round(size * LOGO_RATIO);
      const radius = Math.round(size * RADIUS_RATIO);
      const tileX = (size - tile) / 2;
      const tileY = (size - tile) / 2;

      ctx.save();
      roundedRect(ctx, tileX, tileY, tile, tile, radius);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.restore();

      try {
        const logoImg = await loadImage(LOGO_SRC);
        ctx.drawImage(logoImg, (size - logo) / 2, (size - logo) / 2, logo, logo);
      } catch {
        /* logo is a cosmetic overlay — the QR still scans without it */
      }

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `BSS-QR-${bssId}.png`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("The QR code could not be downloaded. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-56 h-56 sm:w-60 sm:h-60 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center flex-shrink-0">
        <WorkerQr bssId={bssId} className="w-full h-full" />
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-[46px] h-[46px] bg-white rounded-[9px] grid place-items-center shadow-sm">
            <img src={LOGO_SRC} alt="" className="w-[36px] h-[36px] object-contain" />
          </span>
        </span>
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
          disabled={busy || !bssId}
          className="mt-4 inline-flex items-center gap-2 bg-[#073B67] hover:bg-[#062D4F] disabled:opacity-60 disabled:cursor-wait text-white px-4 py-2.5 rounded-[12px] font-bold text-sm shadow-sm transition-all"
        >
          <Download size={16} /> {busy ? "Preparing QR…" : "Download QR"}
        </button>
        {error && <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mt-3">{error}</p>}
      </div>
    </section>
  );
}
