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
        <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Gate</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-navy mt-1">Gate Scan</h1>
        <p className="text-sm text-bss-text-secondary mt-1">
          Scan a gate-pass QR via camera, upload a pass QR image, or type a verified gate pass number. Only valid, active gate passes are accepted.
        </p>
      </header>

      {/* Camera Modal / Scanner Drawer */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative">
            <div className="px-5 py-4 bg-bss-navy text-white flex items-center justify-between">
              <span className="font-semibold text-sm flex items-center gap-2"><Camera size={18} /> Live Gate Pass Scanner</span>
              <button onClick={stopCamera} className="p-1 hover:bg-white/20 rounded-lg text-white transition"><X size={20} /></button>
            </div>
            <div className="relative aspect-square bg-black overflow-hidden flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <ScanFrame active={true} />
            </div>
            <div className="p-4 bg-bss-bg text-center">
              <p className="text-xs font-medium text-bss-text-secondary">Align the Gate Pass QR code inside the frame to scan</p>
              <button onClick={stopCamera} className="mt-3 px-4 py-2 text-xs font-semibold text-bss-text-primary bg-bss-surface hover:bg-bss-blue-tint rounded-lg transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white border border-bss-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void startCamera()}
            disabled={busy}
            className="h-11 px-5 rounded-lg bg-bss-interactive-blue hover:bg-bss-deep-navy text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60 transition shadow-sm"
          >
            <Camera size={16} /> Scan QR with Camera
          </button>
          
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="h-11 px-5 rounded-lg border border-bss-border bg-white hover:bg-bss-bg text-bss-text-primary text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60 transition shadow-xs"
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

        <div className="border-t border-bss-border pt-4">
          <label className="text-xs font-semibold text-bss-text-secondary block mb-1">
            Or enter gate pass number manually
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void processPassCode(code); }}
              placeholder="Scan the worker QR, or enter the worker BSS ID"
              className="flex-1 min-w-[240px] h-11 rounded-lg border border-bss-border px-3 text-sm font-mono text-bss-text-primary focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue focus:outline-none"
            />
            <button
              disabled={busy || !code.trim()}
              onClick={() => void processPassCode(code)}
              className="h-11 px-5 rounded-lg bg-bss-navy hover:bg-bss-deep-navy text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60 transition shadow-sm"
            >
              <ScanLine size={16} /> {busy ? "Verifying..." : "Verify Pass"}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-3 flex items-start gap-2">
            <XCircle size={18} className="text-bss-error shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {last && (
        <section className={`rounded-2xl border p-5 ${last.result === "ALLOW" ? "bg-bss-soft-green border-bss-border" : "bg-bss-soft-orange border-bss-border"}`}>
          <div className="flex items-center gap-3">
            {last.result === "ALLOW" ? <CheckCircle2 size={28} className="text-bss-green" /> : <XCircle size={28} className="text-bss-error" />}
            <div>
              <p className={`text-xl font-bold ${last.result === "ALLOW" ? "text-bss-green" : "text-bss-error"}`}>
                {last.result === "ALLOW" ? "ENTRY ALLOWED" : "ENTRY DENIED"}
              </p>
              <p className="text-sm text-bss-text-secondary mt-0.5">{last.reason}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><dt className="text-bss-text-muted font-medium">Gate Pass</dt><dd className="font-mono font-semibold text-bss-text-primary">{last.gatePassNo || "—"}</dd></div>
            <div><dt className="text-bss-text-muted font-medium">Worker</dt><dd className="font-semibold text-bss-text-primary">{last.worker || "—"}</dd></div>
            <div><dt className="text-bss-text-muted font-medium">Site</dt><dd className="font-semibold text-bss-text-primary">{last.site || "—"}</dd></div>
            <div><dt className="text-bss-text-muted font-medium">Scanned At</dt><dd className="font-semibold text-bss-text-primary">{last.at ? new Date(last.at).toLocaleTimeString("en-IN") : "—"}</dd></div>
          </div>
        </section>
      )}

      <section className="bg-white border border-bss-border rounded-2xl overflow-hidden shadow-sm">
        <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-bss-text-primary">Recent Gate Scans</h2>
          <button onClick={() => void loadLog()} className="text-xs font-semibold text-bss-interactive-blue hover:underline">Refresh</button>
        </header>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-bss-bg text-bss-text-secondary uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">When</th>
                  <th className="px-5 py-2.5 font-semibold">Pass</th>
                  <th className="px-5 py-2.5 font-semibold">Worker</th>
                  <th className="px-5 py-2.5 font-semibold">Site</th>
                  <th className="px-5 py-2.5 font-semibold">Result</th>
                  <th className="px-5 py-2.5 font-semibold">Reason</th>
                  <th className="px-5 py-2.5 font-semibold">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bss-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-bss-bg/60">
                    <td className="px-5 py-2 text-bss-text-secondary">{r.at ? new Date(r.at).toLocaleString("en-IN") : "—"}</td>
                    <td className="px-5 py-2 font-mono text-bss-interactive-blue font-semibold">{r.gatePassNo || "—"}</td>
                    <td className="px-5 py-2 text-bss-text-primary">{r.worker || "—"}</td>
                    <td className="px-5 py-2 text-bss-text-secondary">{r.site || "—"}</td>
                    <td className="px-5 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.result === "ALLOW" ? "bg-bss-soft-green text-bss-green" : "bg-bss-soft-orange text-bss-error"}`}>{r.result === "ALLOW" ? <CheckCircle2 size={11}/> : <XCircle size={11}/>}{r.result}</span>
                    </td>
                    <td className="px-5 py-2 text-bss-text-secondary">{r.reason}</td>
                    <td className="px-5 py-2 text-bss-text-muted">{r.scannedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-xs text-bss-text-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" />No gate scans recorded yet.</p>
        )}
      </section>
    </div>
  );
}
