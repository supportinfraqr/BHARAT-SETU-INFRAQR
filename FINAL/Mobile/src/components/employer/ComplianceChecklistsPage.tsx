"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Lock } from "lucide-react";
import { exportMatrixToXlsx } from "@/lib/exportXlsx";

type Field = { id:number; key:string; label:string; category:string; status:string; officer:string; completedAt:string };
type Checklist = { id:number; worker:string; workerId:string; site?:string; template:string; fields:Field[]; done:number; total:number; passType?:string; missing?:string[] };

const SOURCE: Record<string, string> = {
  medical: "Captured in the Medical tab",
  health_safety: "Captured in the Health & Safety tab",
  healthsafety: "Captured in the Health & Safety tab",
  compliance: "Captured during contractor onboarding",
};
const sourceFor = (category: string) => SOURCE[(category || "").toLowerCase().replace(/\s+/g, "_")] ?? "";

export default function WorkerComplianceChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/employer/compliance-checklists", { cache:"no-store" });
      const body = await response.json().catch(() => ({})) as { rows?:Checklist[] };
      setChecklists(body.rows ?? []);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load compliance data."); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  function exportExcel() {
    const rows = checklists.flatMap(c => c.fields.map(f => [c.worker, c.workerId, c.site ?? "", f.label, f.category.replace(/_/g, " "), f.status, f.officer || "", f.completedAt]));
    exportMatrixToXlsx({ filename:`worker-compliance-checklists-${new Date().toISOString().slice(0, 10)}`, head:["Worker","BSS ID","Site","Field","Category","Status","Officer","Completed at"], rows, sheetName:"Compliance checklists" });
  }

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Gate Pass</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-text-primary mt-1">Worker Compliance Checklists</h1><p className="text-sm text-bss-text-muted mt-1">A compliance checklist is auto-created for each onboarded worker. Status updates automatically from the records you capture — it is read-only.</p></div>
      <div className="flex flex-wrap items-center gap-2 self-start"><span className="inline-flex items-center gap-1.5 rounded-full border border-bss-border bg-bss-bg px-3 py-1.5 text-[11px] font-semibold text-bss-text-muted"><Lock size={12}/>Read-only · auto-derived</span><button type="button" onClick={exportExcel} disabled={!checklists.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-bss-border bg-white px-3 text-xs font-bold text-bss-text-primary disabled:opacity-40"><Download size={13}/>Export Excel</button></div>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-bss-text-muted py-10"><Loader2 size={16} className="animate-spin"/>Loading…</p>
      : <section className="bss-card rounded-2xl divide-y divide-bss-border">
          {checklists.map(c => <div key={c.id}>
            <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-bss-bg text-left">
              <div><strong className="text-sm text-bss-text-primary">{c.worker}</strong><p className="font-mono text-[10px] text-bss-text-muted">{c.workerId} · {c.template || "default"}</p>
                <p className="text-[10px] mt-0.5"><span className={`font-bold ${c.passType === 'Permanent' ? 'text-bss-green' : c.passType === 'Temporary' ? 'text-bss-orange' : 'text-bss-text-muted'}`}>{c.passType === 'Permanent' ? 'Permanent pass' : c.passType === 'Temporary' ? 'Temporary pass' : 'No pass'}</span>{c.missing?.length ? <span className="text-bss-text-muted"> · missing {c.missing.join(', ')}</span> : <span className="text-bss-green"> · eligible</span>}</p></div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.done === c.total ? "bg-bss-soft-green text-bss-green" : "bg-bss-soft-orange text-bss-orange"}`}>{c.done}/{c.total} done</span>
            </button>
            {expanded === c.id && <div className="px-5 pb-5 grid sm:grid-cols-2 gap-2">
              {c.fields.map(f => <div key={f.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left ${f.status === "DONE" ? "border-bss-border bg-bss-soft-green" : "border-bss-border"}`}>
                <span className={`w-4 h-4 rounded-full grid place-items-center text-white text-[9px] ${f.status === "DONE" ? "bg-bss-green" : "bg-bss-surface"}`}>{f.status === "DONE" ? "✓" : ""}</span>
                <span className="flex-1 min-w-0"><strong className="block text-bss-text-primary truncate">{f.label}</strong><span className="text-[10px] text-bss-text-muted">{f.category.replace(/_/g, " ")}{f.officer ? ` · ${f.officer}` : sourceFor(f.category) ? ` · ${sourceFor(f.category)}` : ""}</span></span>
              </div>)}
            </div>}
          </div>)}
          {!checklists.length && <p className="p-5 text-xs text-bss-text-muted">No checklists yet — bind a worker to auto-create one.</p>}
        </section>}
  </div>;
}
