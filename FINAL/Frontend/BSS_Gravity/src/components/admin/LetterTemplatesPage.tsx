"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { INDIA_STATES } from "@/data/indiaStates";

type LetterTemplate = {
  id: number; name: string; state: string;
  letterType: 'APPOINTMENT' | 'EXPERIENCE';
  letterTypeLabel: string; html: string; active: boolean; updatedAt: string;
};

const TOKENS = [
  'letterTitle', 'refNo', 'issueDate', 'workerName', 'workerBssId', 'fatherName', 'dob',
  'gender', 'mobile', 'address', 'designation', 'department', 'doj', 'wage',
  'contractorName', 'contractorBssId', 'contractorAddress', 'employerName', 'siteName', 'siteAddress',
];

const input = "mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs";

export default function LetterTemplatesPage() {
  const [rows, setRows] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Partial<LetterTemplate> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LetterTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/letter-templates", { cache: "no-store" });
      const body = await res.json().catch(() => ({})) as { rows?: LetterTemplate[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not load templates.");
      setRows(body.rows ?? []); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load templates."); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!edit) return;
    if (!edit.name?.trim()) { setError("Template name is required."); return; }
    setBusy(true); setError("");
    try {
      const payload = {
        name: edit.name, state: edit.state ?? "", letterType: edit.letterType ?? "APPOINTMENT",
        html: edit.html ?? "", active: edit.active ?? true,
      };
      const res = await fetch(edit.id ? `/api/admin/letter-templates/${edit.id}` : "/api/admin/letter-templates", {
        method: edit.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Save failed.");
      setEdit(null); setNotice(edit.id ? "Template updated." : "Template created.");
      void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Save failed."); }
    finally { setBusy(false); }
  }

  async function remove(t: LetterTemplate) {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/admin/letter-templates/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setConfirmDelete(null); setNotice("Template deleted."); void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Delete failed."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Masters</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Letter Templates</h1>
        <p className="text-sm text-gray-500 mt-1">State-wise HTML templates for Appointment and Experience (releasing) letters. Employers pick one per site; all workers of that site get letters in that format.</p>
      </div>
      <button onClick={() => { setEdit({ letterType: "APPOINTMENT", state: "", active: true, html: "" }); setError(""); }} className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black"><Plus size={16} />New template</button>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin" />Loading…</p>
      : <section className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {rows.map(t => <div key={t.id} className="px-5 py-4 flex items-center justify-between gap-3">
            <div>
              <strong className="text-sm text-gray-900">{t.name}</strong>
              <p className="text-[11px] text-gray-400 mt-0.5">{t.letterTypeLabel} · {t.state || "All India"} · updated {t.updatedAt?.slice(0, 10)}</p>
            </div>
            <div className="flex items-center gap-2">
              {t.active ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Active</span>
                : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
              <button onClick={() => setEdit({ ...t })} className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-gray-50"><Pencil size={12} />Edit</button>
              <button onClick={() => setConfirmDelete(t)} className="h-8 px-3 rounded-lg border border-red-200 text-[11px] font-semibold text-red-600 inline-flex items-center gap-1 hover:bg-red-50"><Trash2 size={12} />Delete</button>
            </div>
          </div>)}
          {!rows.length && <p className="py-12 text-center text-sm text-gray-400">No letter templates yet.</p>}
        </section>}

    {edit && <div className="fixed inset-0 z-[90] bg-black/50 grid place-items-center p-4">
      <section role="dialog" aria-modal="true" className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="text-sm font-semibold">{edit.id ? "Edit letter template" : "New letter template"}</h2><button onClick={() => setEdit(null)} aria-label="Close"><X size={16} /></button></header>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-[11px] font-semibold text-gray-600">Name<input value={edit.name ?? ""} onChange={e => setEdit(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Maharashtra — Appointment" className={input} /></label>
            <label className="text-[11px] font-semibold text-gray-600">Letter type<select value={edit.letterType ?? "APPOINTMENT"} onChange={e => setEdit(v => ({ ...v, letterType: e.target.value as LetterTemplate['letterType'] }))} className={input}><option value="APPOINTMENT">Appointment Letter</option><option value="EXPERIENCE">Experience / Releasing Letter</option></select></label>
            <label className="text-[11px] font-semibold text-gray-600">State<select value={edit.state ?? ""} onChange={e => setEdit(v => ({ ...v, state: e.target.value }))} className={input}><option value="">All India (default)</option>{INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={edit.active ?? true} onChange={e => setEdit(v => ({ ...v, active: e.target.checked }))} className="accent-[#073B67]" />Active</label>
          <div>
            <div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-gray-600">HTML template</p><p className="text-[10px] text-gray-400">Click a token to insert it</p></div>
            <textarea value={edit.html ?? ""} onChange={e => setEdit(v => ({ ...v, html: e.target.value }))} rows={16} spellCheck={false} className="mt-1 w-full rounded-lg border border-gray-200 p-3 font-mono text-[11px] leading-relaxed" />
            <div className="mt-2 flex flex-wrap gap-1.5">{TOKENS.map(tok => <button key={tok} type="button" onClick={() => setEdit(v => ({ ...v, html: (v?.html ?? "") + `{{${tok}}}` }))} className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">{`{{${tok}}}`}</button>)}</div>
          </div>
        </div>
        <footer className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2"><button onClick={() => setEdit(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button><button disabled={busy || !edit.name?.trim()} onClick={() => void save()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">{busy ? "Saving…" : "Save template"}</button></footer>
      </section>
    </div>}

    {confirmDelete && <div className="fixed inset-0 z-[95] bg-black/50 grid place-items-center p-4">
      <section role="dialog" aria-modal="true" className="w-full max-w-sm bg-white rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-900">Delete this template?</h2>
        <p className="text-xs text-gray-500 mt-1">{confirmDelete.name} · {confirmDelete.letterTypeLabel} · {confirmDelete.state || "All India"}. Sites using it will fall back to the state/default template.</p>
        <div className="mt-4 flex justify-end gap-2"><button onClick={() => setConfirmDelete(null)} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold">Cancel</button><button disabled={busy} onClick={() => void remove(confirmDelete)} className="h-9 px-4 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-60">Delete</button></div>
      </section>
    </div>}
  </div>;
}
