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

/** Large, downloadable site QR block (used on the sites list + site detail). */
export function SiteQrPanel({ siteToken, siteCode = "", name, className = "" }: { siteToken: string; siteCode?: string; name?: string; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    if (!siteToken) { setSrc(""); return; }
    QRCode.toDataURL(createSiteQrPayload(siteToken, siteCode), { errorCorrectionLevel: "H", margin: 1, width: 1024 }).then(url => { if (active) setSrc(url); });
    return () => { active = false; };
  }, [siteToken, siteCode]);
  const download = () => {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `BSS-Site-QR-${siteCode || siteToken}.png`;
    a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  };
  return <div className={`flex flex-col sm:flex-row items-center gap-5 ${className}`}>
    <div className="relative w-52 h-52 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center flex-shrink-0">
      {src ? <img src={src} alt={`Site QR ${siteCode}`} className="w-full h-full" /> : <div className="w-full h-full animate-pulse bg-gray-200 rounded-xl" aria-label="Generating QR code" />}
      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[46px] h-[46px] bg-white rounded-[9px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[36px] h-[36px] object-contain" /></span></span>
    </div>
    <div className="text-center sm:text-left min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Site QR — scan to request binding</p>
      {name && <h2 className="text-lg font-bold text-[#062D4F] mt-1 break-words">{name}</h2>}
      <p className="font-mono text-sm text-gray-500 mt-1 break-all">{siteCode}</p>
      <p className="text-xs text-gray-500 mt-3">Contractors scan this to request a binding for this site. The employer approves the binding and the site allotment.</p>
      <button type="button" onClick={download} disabled={!src} className="mt-4 inline-flex items-center gap-2 bg-[#073B67] hover:bg-[#062D4F] disabled:opacity-60 disabled:cursor-wait text-white px-4 py-2.5 rounded-[12px] font-bold text-sm shadow-sm transition-all">
        <Download size={16} /> {src ? "Download QR" : "Preparing QR…"}
      </button>
    </div>
  </div>;
}
