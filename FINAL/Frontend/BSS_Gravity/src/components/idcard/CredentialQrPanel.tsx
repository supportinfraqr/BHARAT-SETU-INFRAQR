"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import QRCode from "qrcode";
import WorkerQr, { createWorkerQrPayload } from "@/components/qr/WorkerQr";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function downloadQr() {
    if (!bssId || busy) return;
    setBusy(true);
    setError("");
    try {
      const dataUrl = await QRCode.toDataURL(createWorkerQrPayload(bssId), {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 1024,
        color: { dark: "#0A192F", light: "#FFFFFF" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
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
            <img src="/bss-original-logo.png" alt="" className="w-[36px] h-[36px] object-contain" />
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
