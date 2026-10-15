"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Field = { id:number; key:string; label:string; category:string; status:string; officer:string; completedAt:string };
type Checklist = { id:number; worker:string; workerId:string; template:string; fields:Field[]; done:number; total:number };

export default function WorkerComplianceChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function toggleField(checklist: Checklist, field: Field) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/employer/compliance-checklists/${checklist.id}/field`, {
        method:"PATCH", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ key: field.key, done: field.status !== "DONE" }),
      });
      const body = await response.json().catch(() => ({})) as { data?:Checklist; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The field could not be updated.");
      setChecklists(current => current.map(c => c.id === checklist.id ? body.data! : c));
      setNotice(`Updated ${field.label} for ${checklist.worker}.`);
      window.setTimeout(() => setNotice(""), 4000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Update failed."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Gate Pass</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-text-primary mt-1">Worker Compliance Checklists</h1><p className="text-sm text-bss-text-muted mt-1">A compliance checklist is auto-created for each onboarded worker. Officers complete their fields; the categories feed gate-pass eligibility.</p></div>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-bss-text-muted py-10"><Loader2 size={16} className="animate-spin"/>Loading…</p>
      : <section className="bss-card rounded-2xl divide-y divide-bss-border">
          {checklists.map(c => <div key={c.id}>
            <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-bss-bg text-left">
              <div><strong className="text-sm text-bss-text-primary">{c.worker}</strong><p className="font-mono text-[10px] text-bss-text-muted">{c.workerId} · {c.template || "default"}</p></div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.done === c.total ? "bg-bss-soft-green text-bss-green" : "bg-bss-soft-orange text-bss-orange"}`}>{c.done}/{c.total} done</span>
            </button>
            {expanded === c.id && <div className="px-5 pb-5 grid sm:grid-cols-2 gap-2">
              {c.fields.map(f => <button key={f.id} disabled={busy} onClick={() => void toggleField(c, f)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left disabled:opacity-60 ${f.status === "DONE" ? "border-bss-border bg-bss-soft-green" : "border-bss-border"}`}>
                <span className={`w-4 h-4 rounded-full grid place-items-center text-white text-[9px] ${f.status === "DONE" ? "bg-bss-green" : "bg-bss-surface"}`}>{f.status === "DONE" ? "✓" : ""}</span>
                <span className="flex-1 min-w-0"><strong className="block text-bss-text-primary truncate">{f.label}</strong><span className="text-[10px] text-bss-text-muted">{f.category.replace("_", " ")}{f.officer ? ` · ${f.officer}` : ""}</span></span>
              </button>)}
            </div>}
          </div>)}
          {!checklists.length && <p className="p-5 text-xs text-bss-text-muted">No checklists yet — bind a worker to auto-create one.</p>}
        </section>}
  </div>;
}
