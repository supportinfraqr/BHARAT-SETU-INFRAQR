"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, ScanLine, XCircle } from "lucide-react";

type ScanResult = { result:'ALLOW' | 'DENY'; reason:string; gatePassNo:string; worker:string; site:string; at:string };
type ScanRow = { id:number; gatePassNo:string; worker:string; site:string; result:string; reason:string; scannedBy:string; at:string };

export default function GateScanConsole() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState<ScanResult | null>(null);
  const [rows, setRows] = useState<ScanRow[]>([]);

  const loadLog = useCallback(async () => {
    try {
      const response = await fetch("/api/gate/scans", { cache:"no-store" });
      const body = await response.json().catch(() => ({})) as { rows?:ScanRow[] };
      if (body.rows) setRows(body.rows);
    } catch { /* ignore */ }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void loadLog(); }, [loadLog]);

  async function scan() {
    if (!code.trim()) return;
    setBusy(true); setError(""); setLast(null);
    try {
      const response = await fetch("/api/gate/scan", {
        method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ gatePassNo: code.trim() }),
      });
      const body = await response.json().catch(() => ({})) as { data?:ScanResult; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The scan could not be completed.");
      setLast(body.data);
      setCode("");
      void loadLog();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Scan failed."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 pb-10">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Gate</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Gate Scan</h1><p className="text-sm text-gray-500 mt-1">Scan a gate-pass QR (or enter the pass number). An Active pass within its validity allows entry; anything else is denied, logged and alerted.</p></header>

    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-gray-600 flex-1 min-w-[240px]">Gate pass number
          <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void scan(); }} placeholder="e.g. BSS-T7KQ2M9X4RTA or BSS-W…" className="mt-1 w-full h-11 rounded-lg border border-gray-200 px-3 text-sm font-mono"/>
        </label>
        <button disabled={busy || !code.trim()} onClick={() => void scan()} className="h-11 px-5 rounded-lg bg-[#073B67] text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"><ScanLine size={16}/>{busy ? "Scanning…" : "Scan"}</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>}
    </section>

    {last && <section className={`rounded-2xl border p-5 ${last.result === "ALLOW" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-center gap-3">
        {last.result === "ALLOW" ? <CheckCircle2 size={28} className="text-green-700"/> : <XCircle size={28} className="text-red-600"/>}
        <div>
          <p className={`text-xl font-black ${last.result === "ALLOW" ? "text-green-800" : "text-red-700"}`}>{last.result === "ALLOW" ? "ENTRY ALLOWED" : "ENTRY DENIED"}</p>
          <p className="text-sm text-gray-700 mt-0.5">{last.reason}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div><dt className="text-gray-400">Pass</dt><dd className="font-mono font-semibold">{last.gatePassNo || "—"}</dd></div>
        <div><dt className="text-gray-400">Worker</dt><dd className="font-semibold">{last.worker || "—"}</dd></div>
        <div><dt className="text-gray-400">Site</dt><dd className="font-semibold">{last.site || "—"}</dd></div>
        <div><dt className="text-gray-400">At</dt><dd className="font-semibold">{last.at ? new Date(last.at).toLocaleTimeString("en-IN") : "—"}</dd></div>
      </div>
    </section>}

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-950">Recent scans</h2><button onClick={() => void loadLog()} className="text-xs font-semibold text-blue-700">Refresh</button></header>
      {rows.length ? <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-gray-500 uppercase tracking-wider"><tr><th className="px-5 py-2.5">When</th><th className="px-5 py-2.5">Pass</th><th className="px-5 py-2.5">Worker</th><th className="px-5 py-2.5">Site</th><th className="px-5 py-2.5">Result</th><th className="px-5 py-2.5">Reason</th><th className="px-5 py-2.5">By</th></tr></thead>
        <tbody className="divide-y divide-gray-100">{rows.map(r => <tr key={r.id}><td className="px-5 py-2 text-gray-500">{r.at ? new Date(r.at).toLocaleString("en-IN") : "—"}</td><td className="px-5 py-2 font-mono text-[#073B67]">{r.gatePassNo || "—"}</td><td className="px-5 py-2">{r.worker || "—"}</td><td className="px-5 py-2 text-gray-600">{r.site || "—"}</td><td className="px-5 py-2"><span className={`font-bold ${r.result === "ALLOW" ? "text-green-700" : "text-red-600"}`}>{r.result}</span></td><td className="px-5 py-2 text-gray-500">{r.reason}</td><td className="px-5 py-2 text-gray-400">{r.scannedBy}</td></tr>)}</tbody></table></div>
        : <p className="p-5 text-xs text-gray-400 flex items-center gap-2"><Loader2 size={14}/>No scans recorded yet.</p>}
    </section>
  </div>;
}
