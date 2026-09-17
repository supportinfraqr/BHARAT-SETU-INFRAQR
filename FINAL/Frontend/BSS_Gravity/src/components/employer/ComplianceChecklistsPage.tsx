"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";

type Field = { id:number; key:string; label:string; category:string; status:string; officer:string; completedAt:string };
type Checklist = { id:number; worker:string; workerId:string; template:string; fields:Field[]; done:number; total:number };
type Template = { id:number; name:string; requiredFields:Record<string, boolean>; validity:Record<string, number>; active:boolean };

const FIELDS: Array<[string, string, string]> = [
  ["medical", "Medical Examination", "Medical"],
  ["safety_kit", "Safety Kit", "Health & Safety"],
  ["safety_training", "Safety Training", "Health & Safety"],
  ["site_induction", "Site Induction", "Health & Safety"],
  ["aadhaar", "Aadhaar", "Compliance"],
  ["bank", "Bank Account", "Compliance"],
  ["uan", "UAN", "Compliance"],
  ["esi", "ESI", "Compliance"],
];

export default function ComplianceChecklistsPage() {
  const [tab, setTab] = useState<"checklists" | "templates">("checklists");
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [required, setRequired] = useState<Record<string, boolean>>(Object.fromEntries(FIELDS.map(([k]) => [k, true])));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        fetch("/api/employer/compliance-checklists", { cache:"no-store" }),
        fetch("/api/employer/compliance-templates", { cache:"no-store" }),
      ]);
      const cBody = await cRes.json().catch(() => ({})) as { rows?:Checklist[] };
      const tBody = await tRes.json().catch(() => ({})) as { rows?:Template[] };
      setChecklists(cBody.rows ?? []);
      setTemplates(tBody.rows ?? []);
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
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Update failed."); }
    finally { setBusy(false); }
  }

  async function createTemplate() {
    if (!name.trim()) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/employer/compliance-templates", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ name: name.trim(), requiredFields: required, validity: { temporaryDays: 7, permanentDays: 365 } }),
      });
      if (!response.ok) throw new Error("The template could not be saved.");
      setNewOpen(false); setName(""); setNotice("Compliance template created.");
      void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Save failed."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Gate Pass</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Compliance Checklists</h1><p className="text-sm text-gray-500 mt-1">A compliance checklist is auto-created for each onboarded worker from your compliance template. Officers complete their fields; the categories feed gate-pass eligibility.</p></div>
      <button onClick={() => { setNewOpen(true); setError(""); }} className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black"><Plus size={16}/>New template</button>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    <div className="flex border-b">
      {([["checklists","Worker checklists"],["templates","Compliance templates"]] as const).map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === id ? "border-blue-700 text-blue-700" : "border-transparent text-gray-500"}`}>{label}</button>)}
    </div>

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading…</p>
      : tab === "checklists"
      ? <section className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {checklists.map(c => <div key={c.id}>
            <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 text-left">
              <div><strong className="text-sm text-gray-900">{c.worker}</strong><p className="font-mono text-[10px] text-gray-400">{c.workerId} · {c.template || "default"}</p></div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.done === c.total ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>{c.done}/{c.total} done</span>
            </button>
            {expanded === c.id && <div className="px-5 pb-5 grid sm:grid-cols-2 gap-2">
              {c.fields.map(f => <button key={f.id} disabled={busy} onClick={() => void toggleField(c, f)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left disabled:opacity-60 ${f.status === "DONE" ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
                <span className={`w-4 h-4 rounded-full grid place-items-center text-white text-[9px] ${f.status === "DONE" ? "bg-green-600" : "bg-gray-300"}`}>{f.status === "DONE" ? "✓" : ""}</span>
                <span className="flex-1 min-w-0"><strong className="block text-gray-800 truncate">{f.label}</strong><span className="text-[10px] text-gray-400">{f.category.replace("_", " ")}{f.officer ? ` · ${f.officer}` : ""}</span></span>
              </button>)}
            </div>}
          </div>)}
          {!checklists.length && <p className="p-5 text-xs text-gray-400">No checklists yet — bind a worker to auto-create one.</p>}
        </section>
      : <section className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {templates.map(t => <div key={t.id} className="px-5 py-4 flex items-center justify-between gap-3">
            <div><strong className="text-sm text-gray-900">{t.name}</strong><p className="text-[11px] text-gray-400">{Object.values(t.requiredFields).filter(Boolean).length} required fields · TGP {t.validity.temporaryDays ?? 7}d · PGP {t.validity.permanentDays ?? 365}d</p></div>
            {t.active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Active</span>}
          </div>)}
        </section>}

    {newOpen && <div className="fixed inset-0 z-[90] bg-black/50 grid place-items-center p-4"><section role="dialog" aria-modal="true" className="w-full max-w-lg bg-white rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="text-sm font-semibold">New compliance template</h2><button onClick={() => setNewOpen(false)} aria-label="Close"><X size={16}/></button></header>
      <div className="p-5 space-y-4">
        <label className="text-xs font-semibold text-gray-700">Template name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Construction site gate compliance" className="mt-1 w-full h-10 border rounded-lg px-3 text-sm"/></label>
        <div><p className="text-xs font-semibold text-gray-700 mb-2">Required fields</p><div className="grid grid-cols-2 gap-2">{FIELDS.map(([key,label,cat]) => <label key={key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={required[key]} onChange={e => setRequired(r => ({ ...r, [key]: e.target.checked }))} className="accent-[#073B67]"/><span className="text-gray-700">{label}<span className="text-gray-400"> · {cat}</span></span></label>)}</div></div>
        <div className="flex justify-end gap-2"><button onClick={() => setNewOpen(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button><button disabled={busy || !name.trim()} onClick={() => void createTemplate()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>Create</button></div>
      </div>
    </section></div>}
  </div>;
}
