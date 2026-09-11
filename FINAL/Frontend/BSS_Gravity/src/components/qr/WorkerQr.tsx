"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function createWorkerQrPayload(bssId: string) {
  const id = (bssId || "").toUpperCase();
  const type = id.startsWith("BSS-C") || id.startsWith("BSSC") ? "BSS_CONTRACTOR"
    : id.startsWith("BSS-E") ? "BSS_EMPLOYER"
    : "BSS_WORKER";
  return JSON.stringify({ v: 1, type, bssId, issuer: "Bharat Shram Setu" });
}

export default function WorkerQr({ bssId, className = "w-full h-full" }: { bssId: string; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(createWorkerQrPayload(bssId), { errorCorrectionLevel: "H", margin: 1, width: 512 }).then(setSrc); }, [bssId]);
  return src ? <img src={src} alt={`Scannable worker QR for ${bssId}`} className={className} /> : <div className={`${className} animate-pulse bg-gray-200`} aria-label="Generating QR code" />;
}

export function createSiteQrPayload(siteToken: string, siteCode = "") {
  return JSON.stringify({ v: 1, type: "BSS_SITE", siteToken, siteCode, issuer: "Bharat Shram Setu" });
}

export function SiteQr({ siteToken, siteCode = "", className = "w-full h-full" }: { siteToken: string; siteCode?: string; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(createSiteQrPayload(siteToken, siteCode), { errorCorrectionLevel: "H", margin: 1, width: 512 }).then(setSrc); }, [siteToken, siteCode]);
  return src ? <img src={src} alt={`Scannable site QR for ${siteCode || siteToken}`} className={className} /> : <div className={`${className} animate-pulse bg-gray-200`} aria-label="Generating QR code" />;
}
