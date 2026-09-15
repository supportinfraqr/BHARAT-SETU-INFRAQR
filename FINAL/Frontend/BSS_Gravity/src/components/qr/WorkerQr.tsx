"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

export function createWorkerQrPayload(bssId: string) {
  const id = (bssId || "").toUpperCase();
  const type = id.startsWith("BSS-C") || id.startsWith("BSSC") ? "BSS_CONTRACTOR"
    : id.startsWith("BSS-E") ? "BSS_EMPLOYER"
    : "BSS_WORKER";
  return JSON.stringify({ v: 1, type, bssId, issuer: "Bharat Shram Setu" });
}

export default function WorkerQr({ bssId, size = 512, className = "w-full h-full" }: { bssId: string; size?: number; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(createWorkerQrPayload(bssId), { errorCorrectionLevel: "H", margin: 4, width: size }).then(setSrc); }, [bssId, size]);
  return src ? <img src={src} alt={`Scannable worker QR for ${bssId}`} className={className} /> : <div className={`${className} animate-pulse bg-gray-200`} aria-label="Generating QR code" />;
}

const LOGO_SRC = "/bss-original-logo.png";
const SITE_QR_SIZE = 1024;
// Overlay geometry mirrors the credential QR: 46px tile / 36px logo / 9px
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

export function createSiteQrPayload(siteToken: string, siteCode = "", bssId = "") {
  return JSON.stringify({ v: 1, type: "BSS_SITE", siteToken, siteCode, bssId, issuer: "Bharat Shram Setu" });
}

/** Composite the site QR with the white tile + BSS logo, so the SAME image is
 *  used for display and download (the download now carries the logo too). */
async function renderSiteQr(siteToken: string, siteCode: string, bssId: string): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(createSiteQrPayload(siteToken, siteCode, bssId), {
    errorCorrectionLevel: "H",
    margin: 4,
    width: SITE_QR_SIZE,
  });
  const canvas = document.createElement("canvas");
  canvas.width = SITE_QR_SIZE;
  canvas.height = SITE_QR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return qrDataUrl;

  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, 0, 0, SITE_QR_SIZE, SITE_QR_SIZE);

  const tile = Math.round(SITE_QR_SIZE * TILE_RATIO);
  const logo = Math.round(SITE_QR_SIZE * LOGO_RATIO);
  const radius = Math.round(SITE_QR_SIZE * RADIUS_RATIO);
  const tilePos = (SITE_QR_SIZE - tile) / 2;

  ctx.save();
  roundedRect(ctx, tilePos, tilePos, tile, tile, radius);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  try {
    const logoImg = await loadImage(LOGO_SRC);
    ctx.drawImage(logoImg, (SITE_QR_SIZE - logo) / 2, (SITE_QR_SIZE - logo) / 2, logo, logo);
  } catch {
    /* cosmetic overlay — the QR still scans without it */
  }
  return canvas.toDataURL("image/png");
}

export function SiteQr({ siteToken, siteCode = "", bssId = "", className = "w-full h-full" }: { siteToken: string; siteCode?: string; bssId?: string; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    if (!siteToken) return;
    renderSiteQr(siteToken, siteCode, bssId).then(url => { if (active) setSrc(url); });
    return () => { active = false; };
  }, [siteToken, siteCode, bssId]);
  return src ? <img src={src} alt={`Scannable site QR for ${siteCode || siteToken}`} className={className} /> : <div className={`${className} animate-pulse bg-gray-200`} aria-label="Generating QR code" />;
}

/** Large, downloadable site QR block (used on the sites list + site detail). */
export function SiteQrPanel({ siteToken, siteCode = "", bssId = "", name, className = "" }: { siteToken: string; siteCode?: string; bssId?: string; name?: string; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    if (!siteToken) return;
    renderSiteQr(siteToken, siteCode, bssId).then(url => { if (active) setSrc(url); });
    return () => { active = false; };
  }, [siteToken, siteCode, bssId]);
  const download = () => {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `BSS-Site-QR-${bssId || siteCode || siteToken}.png`;
    a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  };
  return <div className={`flex flex-col sm:flex-row items-center gap-5 ${className}`}>
    <div className="relative w-52 h-52 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center flex-shrink-0">
      {src ? <img src={src} alt={`Site QR ${siteCode}`} className="w-full h-full" /> : <div className="w-full h-full animate-pulse bg-gray-200 rounded-xl" aria-label="Generating QR code" />}
    </div>
    <div className="text-center sm:text-left min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Site QR — scan to request binding</p>
      {name && <h2 className="text-lg font-bold text-[#062D4F] mt-1 break-words">{name}</h2>}
      {bssId && <p className="font-mono text-sm text-[#073B67] mt-1 break-all">{bssId}</p>}
      <p className="font-mono text-xs text-gray-400 mt-0.5 break-all">{siteCode}</p>
      <p className="text-xs text-gray-500 mt-3">Contractors scan this to request a binding for this site. The employer approves the binding and the site allotment.</p>
      <button type="button" onClick={download} disabled={!src} className="mt-4 inline-flex items-center gap-2 bg-[#073B67] hover:bg-[#062D4F] disabled:opacity-60 disabled:cursor-wait text-white px-4 py-2.5 rounded-[12px] font-bold text-sm shadow-sm transition-all">
        <Download size={16} /> {src ? "Download QR" : "Preparing QR…"}
      </button>
    </div>
  </div>;
}
