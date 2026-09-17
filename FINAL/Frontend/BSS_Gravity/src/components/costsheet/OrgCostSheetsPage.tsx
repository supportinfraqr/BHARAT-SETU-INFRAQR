"use client";

import { useCallback, useEffect, useState } from "react";
import { Calculator, Copy, Loader2, Save, X } from "lucide-react";
import EnterpriseDataTable, { type DataColumn } from "@/components/worker/EnterpriseDataTable";

type Custom = { name:string; amount:number; rateType:string; frequency:string; appliesTo:string; editableByOrg:boolean };
type Template = {
  id:number; name:string; code:string; state:string; industry:string; workerCategory:string;
  designation:string; status:string; ownerId:number | null; currency:string;
  custom:Custom[]; minimumWage:{ basicWage:number; vda:number; minimumMonthlyWage:number } | null;
};
type Breakdown = {
  basicWage:number; vda:number; minimumWage:number; dailyWage:number;
  statutoryTotal:number; customTotal:number; employerCost:number; contractorBilling:number | null; ctc:number;
  statutory:Array<{ component:string; rate:number; amount:number }>;
  custom:Array<{ name:string; computed:number }>;
};

export default function OrgCostSheetsPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Template | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<Breakdown | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/cost-sheets", { cache:"no-store" });
      const body = await response.json().catch(() => ({})) as { rows?:Template[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? "Cost sheets could not be loaded.");
      setRows(body.rows ?? []); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load cost sheets."); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  async function computeCost(template: Template, overrides?: Record<string, number>) {
    const response = await fetch(`/api/cost-sheets/${template.id}/preview`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(overrides ? { overrides } : {}),
    });
    const body = await response.json().catch(() => ({})) as { data?:Breakdown; error?:string };
    if (!response.ok || !body.data) throw new Error(body.error ?? "Cost could not be computed.");
    setPreview(body.data);
  }

  async function copy(template: Template) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/cost-sheets/${template.id}/clone`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({}) });
      const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The template could not be copied.");
      setRows(current => [body.data!, ...current]);
      setNotice(`Copied "${template.name}" — you can now adjust your own cost heads.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Copy failed."); }
    finally { setBusy(false); }
  }

  function openEditor(template: Template) {
    setEditing(template);
    setPreview(null);
    setAmounts(Object.fromEntries(template.custom.map(c => [c.name, c.amount])));
    void computeCost(template).catch(() => {});
  }

  async function saveEditor() {
    if (!editing) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/cost-sheets/${editing.id}`, {
        method:"PATCH", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ name:editing.name, custom: editing.custom.map(c => ({ name:c.name, amount:amounts[c.name] ?? c.amount })) }),
      });
      const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The cost sheet could not be saved.");
      setRows(current => current.map(r => r.id === editing.id ? body.data! : r));
      setEditing(null);
      setNotice("Cost sheet updated.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Save failed."); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<Template>[] = [
    { id:"name", header:"Template", value:r => r.name, render:r => <div><strong className="text-gray-900">{r.name}</strong><p className="font-mono text-[10px] text-gray-400">{r.code}</p></div> },
    { id:"state", header:"State / Industry", value:r => `${r.state || "All India"} · ${r.industry || "All"}` },
    { id:"category", header:"Category / Designation", value:r => `${r.workerCategory || "—"} · ${r.designation || "—"}` },
    { id:"origin", header:"Origin", value:r => r.ownerId ? "Yours" : "BSS platform", render:r => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.ownerId ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{r.ownerId ? "Yours" : "BSS platform"}</span> },
    { id:"custom", header:"Custom heads", value:r => r.custom.length },
    { id:"actions", header:"Actions", filterable:false, value:r => r.id, render:r => (
      <div className="flex items-center gap-2">
        {!r.ownerId && <button disabled={busy} onClick={() => void copy(r)} className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 disabled:opacity-50"><Copy size={12}/>Copy</button>}
        <button onClick={() => openEditor(r)} className="text-xs font-semibold text-gray-700 hover:text-[#073B67] inline-flex items-center gap-1"><Calculator size={12}/>View &amp; edit</button>
      </div>
    ) },
  ];

  return <div className="space-y-6 pb-10">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Payroll</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Cost Sheets</h1><p className="text-sm text-gray-500 mt-1">Published BSS cost sheet templates plus your own customised copies. Statutory and minimum-wage values are locked; you can adjust your own cost heads (where &ldquo;editable by org&rdquo; is allowed).</p></header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading cost sheets…</p>
      : <EnterpriseDataTable title="Available cost sheet templates" rows={rows} columns={columns} rowKey={r => String(r.id)} filename="org-cost-sheets"/>}

    {editing && <div className="fixed inset-0 z-[90] bg-black/50 flex justify-end" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Cost sheet" className="bg-white w-full max-w-2xl h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cost sheet</p><input value={editing.name} disabled={!editing.ownerId} onChange={e => setEditing({ ...editing, name:e.target.value })} className="font-semibold text-gray-950 mt-0.5 w-full border-b border-transparent focus:border-gray-300 disabled:bg-transparent"/><p className="text-xs text-gray-500 mt-0.5">{editing.code} · {editing.state || "All India"} · {editing.workerCategory || "—"}</p></div>
          <button onClick={() => setEditing(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
        </header>
        <div className="p-5 space-y-5">
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Minimum wage (statutory — locked)</p>
            <div className="grid grid-cols-3 gap-2 text-xs"><span className="text-gray-500">Basic</span><span className="font-semibold text-right">₹{(editing.minimumWage?.basicWage ?? 0).toLocaleString("en-IN")}</span><span/><span className="text-gray-500">VDA</span><span className="font-semibold text-right">₹{(editing.minimumWage?.vda ?? 0).toLocaleString("en-IN")}</span><span/><span className="text-gray-500">Monthly minimum</span><span className="font-semibold text-right">₹{(editing.minimumWage?.minimumMonthlyWage ?? 0).toLocaleString("en-IN")}</span></div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Custom cost heads</p>
            <div className="space-y-2">{editing.custom.map((c, i) => <div key={i} className="grid grid-cols-[1.6fr_120px_120px] gap-2 items-center text-xs">
              <span className="font-semibold text-gray-800">{c.name}{!c.editableByOrg && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Platform fixed</span>}</span>
              <input type="number" disabled={!c.editableByOrg} value={amounts[c.name] ?? c.amount} onChange={e => setAmounts(a => ({ ...a, [c.name]:Number(e.target.value) }))} className="h-9 border border-gray-200 rounded-lg px-2 text-xs disabled:bg-gray-50"/>
              <span className="text-gray-400">{c.frequency === "ONE_TIME" ? "one-time" : c.frequency.toLowerCase()} · {c.appliesTo}</span>
            </div>)}</div>
          </div>

          {preview && <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Computed cost</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <span className="text-gray-500">Basic + VDA (wage)</span><span className="font-semibold text-right">₹{preview.minimumWage.toLocaleString("en-IN")}</span>
              <span className="text-gray-500">Statutory total</span><span className="font-semibold text-right">₹{preview.statutoryTotal.toLocaleString("en-IN")}</span>
              <span className="text-gray-500">Custom total</span><span className="font-semibold text-right">₹{preview.customTotal.toLocaleString("en-IN")}</span>
              <span className="text-gray-700 font-bold border-t border-gray-100 pt-1.5">Employer cost</span><span className="font-bold text-right border-t border-gray-100 pt-1.5">₹{preview.employerCost.toLocaleString("en-IN")}</span>
              <span className="text-gray-700 font-bold">CTC</span><span className="font-bold text-right text-[#073B67]">₹{preview.ctc.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{preview.statutory.map(s => <span key={s.component} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-gray-600">{s.component} ₹{s.amount.toLocaleString("en-IN")}</span>)}</div>
          </div>}
        </div>
        <footer className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex justify-end gap-2">
          <button onClick={() => setEditing(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Close</button>
          {editing.ownerId && <button disabled={busy} onClick={() => void saveEditor()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><Save size={14}/>{busy ? "Saving…" : "Save cost sheet"}</button>}
        </footer>
      </section>
    </div>}
  </div>;
}
