"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function createWorkerQrPayload(bssId: string) {
  return JSON.stringify({ v: 1, type: "BSS_WORKER", bssId, issuer: "Bharat Shram Setu" });
}

export default function WorkerQr({ bssId, className = "w-full h-full" }: { bssId: string; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(createWorkerQrPayload(bssId), { errorCorrectionLevel: "H", margin: 1, width: 512 }).then(setSrc); }, [bssId]);
  return src ? <img src={src} alt={`Scannable worker QR for ${bssId}`} className={className} /> : <div className={`${className} animate-pulse bg-gray-200`} aria-label="Generating QR code" />;
}
