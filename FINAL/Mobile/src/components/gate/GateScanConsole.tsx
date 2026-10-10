"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, ScanLine, Upload, X, XCircle } from "lucide-react";
import { IScannerControls } from "@zxing/browser";
import { createQrReader, QR_VIDEO_CONSTRAINTS, applyContinuousFocus, decodeQrFromImageFile } from "@/lib/qrScanner";
import { playScanBeep, primeAudio } from "@/lib/scanFeedback";
import ScanFrame from "@/components/qr/ScanFrame";

type ScanResult = { result: 'ALLOW' | 'DENY'; reason: string; gatePassNo: string; worker: string; site: string; at: string };
type ScanRow = { id: number; gatePassNo: string; worker: string; site: string; result: string; reason: string; scannedBy: string; at: string };

export default function GateScanConsole() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState<ScanResult | null>(null);
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const loadLog = useCallback(async () => {
    try {
      const response = await fetch("/api/gate/scans", { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as { rows?: ScanRow[] };
      if (body.rows) setRows(body.rows);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadLog(); }, [loadLog]);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch { /* ignore */ }
      controlsRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  async function processPassCode(passCode: string) {
    const cleanCode = passCode.trim();
    if (!cleanCode) return;
    setBusy(true); setError(""); setLast(null);
    try {
      const response = await fetch("/api/gate/scan", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gatePassNo: cleanCode }),
      });
      const body = await response.json().catch(() => ({})) as { data?: ScanResult; error?: string };
      if (!response.ok || !body.data) {
        playScanBeep(false);
        throw new Error(body.error ?? "The gate scan could not be completed.");
      }
      playScanBeep(body.data.result === 'ALLOW');
      setLast(body.data);
      setCode("");
      void loadLog();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  }

  const startCamera = async () => {
    setError("");
    primeAudio();
    setIsScanning(true);
    try {
      stopCamera();
      const reader = createQrReader();
      const ctrl = await reader.decodeFromConstraints(
        QR_VIDEO_CONSTRAINTS,
        videoRef.current!,
        (result, err, c) => {
          controlsRef.current = c;
          applyContinuousFocus(c);
          if (result) {
            const rawText = result.getText();
            stopCamera();
            void processPassCode(rawText);
          }
        }
      );
      controlsRef.current = ctrl;
    } catch (err) {
      stopCamera();
      setError("Failed to open camera: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleFileUpload = async (file?: File) => {
    if (!file) return;
    setError(""); setBusy(true);
    try {
      const decodedText = await decodeQrFromImageFile(file);
      await processPassCode(decodedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decode QR code from the uploaded image.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <header>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Gate</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Gate Scan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scan a gate-pass QR via camera, upload a pass QR image, or type a verified gate pass number. Only valid, active gate passes are accepted.
        </p>
      </header>

      {/* Camera Modal / Scanner Drawer */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative">
            <div className="px-5 py-4 bg-[#073B67] text-white flex items-center justify-between">
              <span className="font-semibold text-sm flex items-center gap-2"><Camera size={18} /> Live Gate Pass Scanner</span>
              <button onClick={stopCamera} className="p-1 hover:bg-white/20 rounded-lg text-white transition"><X size={20} /></button>
            </div>
            <div className="relative aspect-square bg-black overflow-hidden flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <ScanFrame active={true} />
            </div>
            <div className="p-4 bg-gray-50 text-center">
              <p className="text-xs font-medium text-gray-600">Align the Gate Pass QR code inside the frame to scan</p>
              <button onClick={stopCamera} className="mt-3 px-4 py-2 text-xs font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void startCamera()}
            disabled={busy}
            className="h-11 px-5 rounded-lg bg-[#073B67] hover:bg-[#052b4c] text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60 transition"
          >
            <Camera size={16} /> Scan QR with Camera
          </button>
          
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="h-11 px-5 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-800 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60 transition"
          >
            <Upload size={16} /> Upload QR Image
          </button>
          
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFileUpload(e.target.files?.[0])}
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1">
            Or enter gate pass number manually
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void processPassCode(code); }}
              placeholder="Scan the worker QR, or enter the worker BSS ID"
              className="flex-1 min-w-[240px] h-11 rounded-lg border border-gray-200 px-3 text-sm font-mono focus:ring-2 focus:ring-[#073B67] focus:outline-none"
            />
            <button
              disabled={busy || !code.trim()}
              onClick={() => void processPassCode(code)}
              className="h-11 px-5 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60 transition"
            >
              <ScanLine size={16} /> {busy ? "Verifying..." : "Verify Pass"}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
            <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {last && (
        <section className={`rounded-2xl border p-5 ${last.result === "ALLOW" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-3">
            {last.result === "ALLOW" ? <CheckCircle2 size={28} className="text-green-700" /> : <XCircle size={28} className="text-red-600" />}
            <div>
              <p className={`text-xl font-black ${last.result === "ALLOW" ? "text-green-800" : "text-red-700"}`}>
                {last.result === "ALLOW" ? "ENTRY ALLOWED" : "ENTRY DENIED"}
              </p>
              <p className="text-sm text-gray-700 mt-0.5">{last.reason}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><dt className="text-gray-500 font-medium">Gate Pass</dt><dd className="font-mono font-semibold text-gray-900">{last.gatePassNo || "—"}</dd></div>
            <div><dt className="text-gray-500 font-medium">Worker</dt><dd className="font-semibold text-gray-900">{last.worker || "—"}</dd></div>
            <div><dt className="text-gray-500 font-medium">Site</dt><dd className="font-semibold text-gray-900">{last.site || "—"}</dd></div>
            <div><dt className="text-gray-500 font-medium">Scanned At</dt><dd className="font-semibold text-gray-900">{last.at ? new Date(last.at).toLocaleTimeString("en-IN") : "—"}</dd></div>
          </div>
        </section>
      )}

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-950">Recent Gate Scans</h2>
          <button onClick={() => void loadLog()} className="text-xs font-semibold text-blue-700 hover:underline">Refresh</button>
        </header>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-2.5">When</th>
                  <th className="px-5 py-2.5">Pass</th>
                  <th className="px-5 py-2.5">Worker</th>
                  <th className="px-5 py-2.5">Site</th>
                  <th className="px-5 py-2.5">Result</th>
                  <th className="px-5 py-2.5">Reason</th>
                  <th className="px-5 py-2.5">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-2 text-gray-500">{r.at ? new Date(r.at).toLocaleString("en-IN") : "—"}</td>
                    <td className="px-5 py-2 font-mono text-[#073B67] font-semibold">{r.gatePassNo || "—"}</td>
                    <td className="px-5 py-2">{r.worker || "—"}</td>
                    <td className="px-5 py-2 text-gray-600">{r.site || "—"}</td>
                    <td className="px-5 py-2">
                      <span className={`font-bold ${r.result === "ALLOW" ? "text-green-700" : "text-red-600"}`}>{r.result}</span>
                    </td>
                    <td className="px-5 py-2 text-gray-500">{r.reason}</td>
                    <td className="px-5 py-2 text-gray-400">{r.scannedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-xs text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" />No gate scans recorded yet.</p>
        )}
      </section>
    </div>
  );
}
