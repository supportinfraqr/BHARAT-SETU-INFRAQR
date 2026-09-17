"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import EnterpriseDataTable, { type DataColumn } from "@/components/worker/EnterpriseDataTable";
import { INDIA_STATES } from "@/data/indiaStates";

type Designation = { workerCategory:string; subCategory:string; designation:string; inheritsParentRules:boolean };
type MinimumWage = { state:string; zone:string; district:string; scheduledEmployment:string; workerCategory:string; basicWage:number; vda:number; minimumMonthlyWage:number; minimumDailyWage:number; notificationNumber:string; effectiveDate:string };
type Statutory = { component:string; rate:number; rateType:string; applicable:boolean; condition:string; mandatory:boolean };
type Custom = { name:string; amount:number; rateType:string; frequency:string; appliesTo:string; editableByOrg:boolean };
type Template = {
  id:number; name:string; code:string; templateType:string; appliesTo:string; industry:string; state:string;
  effectiveDate:string; effectiveTo:string; workerCategory:string; designation:string; currency:string;
  calculationFrequency:string; status:string; version:number; inheritsParentRules:boolean; notes:string;
  designations:Designation[]; minimumWage:MinimumWage | null; statutory:Statutory[]; custom:Custom[];
};

const DEFAULT_STATUTORY: Statutory[] = [
  { component:"EPF", rate:12, rateType:"PERCENT", applicable:true, condition:"Establishments with 20+ employees", mandatory:true },
  { component:"EPS", rate:8.33, rateType:"PERCENT", applicable:true, condition:"Part of employer EPF contribution", mandatory:true },
  { component:"EDLI", rate:0.5, rateType:"PERCENT", applicable:true, condition:"Employer-only contribution", mandatory:true },
  { component:"ESIC", rate:3.25, rateType:"PERCENT", applicable:true, condition:"Wage ≤ ESIC threshold", mandatory:false },
  { component:"BONUS", rate:8.33, rateType:"PERCENT", applicable:true, condition:"Annual provision", mandatory:true },
  { component:"GRATUITY", rate:4.81, rateType:"PERCENT", applicable:true, condition:"Monthly provision", mandatory:true },
  { component:"LWF", rate:0, rateType:"FIXED", applicable:false, condition:"State-specific", mandatory:false },
  { component:"LEAVE_RESERVE", rate:0, rateType:"PERCENT", applicable:true, condition:"Earned leave provision", mandatory:true },
  { component:"WEEKLY_OFF", rate:0, rateType:"DAYS", applicable:true, condition:"Mandatory paid weekly off", mandatory:true },
  { component:"NATIONAL_HOLIDAYS", rate:0, rateType:"DAYS", applicable:true, condition:"Mandatory paid holidays", mandatory:true },
];
const EMPTY_MW: MinimumWage = { state:"", zone:"", district:"", scheduledEmployment:"", workerCategory:"", basicWage:0, vda:0, minimumMonthlyWage:0, minimumDailyWage:0, notificationNumber:"", effectiveDate:"" };
const emptyTemplate = (): Template => ({
  id:0, name:"", code:"", templateType:"UNIVERSAL", appliesTo:"both", industry:"", state:"",
  effectiveDate:"", effectiveTo:"", workerCategory:"", designation:"", currency:"INR",
  calculationFrequency:"MONTHLY", status:"DRAFT", version:1, inheritsParentRules:true, notes:"",
  designations:[], minimumWage:{ ...EMPTY_MW }, statutory:DEFAULT_STATUTORY.map(s => ({ ...s })), custom:[],
});

const input = "mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs";
const label = "text-[11px] font-semibold text-gray-600";

export default function CostSheetTemplatesPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/cost-sheets", { cache:"no-store" });
      const body = await response.json().catch(() => ({})) as { rows?:Template[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? "Cost sheet templates could not be loaded.");
      setRows(body.rows ?? []); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load templates."); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!draft) return;
    setBusy(true); setError("");
    try {
      const isEdit = draft.id > 0;
      const response = await fetch(`/api/admin/cost-sheets${isEdit ? `/${draft.id}` : ""}`, {
        method: isEdit ? "PATCH" : "POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(draft),
      });
      const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The template could not be saved.");
      setRows(current => isEdit ? current.map(r => r.id === draft.id ? body.data! : r) : [body.data!, ...current]);
      setDraft(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The template could not be saved."); }
    finally { setBusy(false); }
  }

  async function remove(row: Template) {
    if (!window.confirm(`Delete template "${row.name}"?`)) return;
    try {
      const response = await fetch(`/api/admin/cost-sheets/${row.id}`, { method:"DELETE" });
      if (!response.ok) throw new Error("The template could not be deleted.");
      setRows(current => current.filter(r => r.id !== row.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Delete failed."); }
  }

  const set = <K extends keyof Template>(key: K, value: Template[K]) => setDraft(d => d ? { ...d, [key]: value } : d);

  const columns: DataColumn<Template>[] = [
    { id:"name", header:"Template", value:r => r.name, render:r => <div><strong className="text-gray-900">{r.name}</strong><p className="font-mono text-[10px] text-gray-400">{r.code}</p></div> },
    { id:"state", header:"State / Industry", value:r => `${r.state || "All India"} · ${r.industry || "All"}` },
    { id:"category", header:"Category / Designation", value:r => `${r.workerCategory || "—"} · ${r.designation || "—"}` },
    { id:"type", header:"Type", value:r => r.templateType },
    { id:"freq", header:"Frequency", value:r => r.calculationFrequency },
    { id:"status", header:"Status", value:r => r.status, render:r => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === "PUBLISHED" ? "bg-green-50 text-green-700" : r.status === "DRAFT" ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-700"}`}>{r.status}</span> },
    { id:"lines", header:"Lines", value:r => r.custom.length + r.statutory.length, render:r => <span className="text-gray-500">{r.statutory.filter(s => s.applicable).length} statutory · {r.custom.length} custom</span> },
    { id:"actions", header:"Actions", filterable:false, value:r => r.id, render:r => (
      <div className="flex items-center gap-2">
        <button onClick={() => setDraft({ ...r, minimumWage: r.minimumWage ?? { ...EMPTY_MW } })} className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"><Pencil size={12}/>Edit</button>
        <button onClick={() => void remove(r)} className="text-xs font-semibold text-red-600 hover:underline inline-flex items-center gap-1"><Trash2 size={12}/>Delete</button>
      </div>
    ) },
  ];

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Masters</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Cost Sheet Templates</h1><p className="text-sm text-gray-500 mt-1">Universal worker cost templates — platform-locked statutory rules + minimum-wage link + org-configurable custom costs. Drives a worker&apos;s wage, employer cost and CTC.</p></div>
      <button onClick={() => { setDraft(emptyTemplate()); setError(""); }} className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black"><Plus size={16}/>New template</button>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading templates…</p>
      : <EnterpriseDataTable title="Cost sheet templates" rows={rows} columns={columns} rowKey={r => String(r.id)} filename="cost-sheet-templates"/>}

    {draft && <div className="fixed inset-0 z-[90] bg-black/50 flex justify-end" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Cost sheet template builder" className="bg-white w-full max-w-3xl h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cost sheet template</p><h2 className="font-semibold text-gray-950 mt-0.5">{draft.id ? draft.name : "New template"}</h2><p className="text-xs text-gray-500 mt-0.5">Step 1 identity · Step 2 scope · Step 3 minimum wage, statutory &amp; custom costs.</p></div>
          <button onClick={() => setDraft(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
        </header>
        <div className="p-5 space-y-6">
          {/* Step 1 */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-3">1 · Template identity</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className={label}>Template name<input value={draft.name} onChange={e => set("name", e.target.value)} className={input}/></label>
              <label className={label}>Template code<input value={draft.code} onChange={e => set("code", e.target.value)} placeholder="auto-generate" className={input}/></label>
              <label className={label}>Applicable for<select value={draft.appliesTo} onChange={e => set("appliesTo", e.target.value)} className={input}><option value="employer">Employer</option><option value="contractor">Contractor</option><option value="both">Both</option></select></label>
              <label className={label}>Industry<input value={draft.industry} onChange={e => set("industry", e.target.value)} placeholder="Construction" className={input}/></label>
              <label className={label}>State / All India<select value={draft.state} onChange={e => set("state", e.target.value)} className={input}><option value="">All India</option>{INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
              <label className={label}>Worker category<input value={draft.workerCategory} onChange={e => set("workerCategory", e.target.value)} placeholder="Semi-skilled" className={input}/></label>
              <label className={label}>Designation<input value={draft.designation} onChange={e => set("designation", e.target.value)} placeholder="Mason helper" className={input}/></label>
              <label className={label}>Effective date<input type="date" value={draft.effectiveDate} onChange={e => set("effectiveDate", e.target.value)} className={input}/></label>
              <label className={label}>Effective to<input type="date" value={draft.effectiveTo} onChange={e => set("effectiveTo", e.target.value)} className={input}/></label>
              <label className={label}>Calculation frequency<select value={draft.calculationFrequency} onChange={e => set("calculationFrequency", e.target.value)} className={input}><option value="MONTHLY">Monthly</option><option value="DAILY">Daily</option><option value="PER_SHIFT">Per-shift</option></select></label>
              <label className={label}>Currency<input value={draft.currency} onChange={e => set("currency", e.target.value)} className={input}/></label>
            </div>
          </section>

          {/* Step 2 */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-3">2 · Type &amp; designations</h3>
            <label className={label}>Template type<select value={draft.templateType} onChange={e => set("templateType", e.target.value)} className={input + " mb-3"}><option value="UNIVERSAL">Universal</option><option value="STATE">State-specific</option><option value="INDUSTRY">Industry-specific</option><option value="SITE">Site-specific</option></select></label>
            <div className="space-y-2">
              {draft.designations.map((d, i) => <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <input value={d.workerCategory} onChange={e => set("designations", draft.designations.map((x, j) => j === i ? { ...x, workerCategory:e.target.value } : x))} placeholder="Category" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                <input value={d.subCategory} onChange={e => set("designations", draft.designations.map((x, j) => j === i ? { ...x, subCategory:e.target.value } : x))} placeholder="Sub-category" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                <input value={d.designation} onChange={e => set("designations", draft.designations.map((x, j) => j === i ? { ...x, designation:e.target.value } : x))} placeholder="Designation" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                <button type="button" onClick={() => set("designations", draft.designations.filter((_, j) => j !== i))} className="w-8 h-9 grid place-items-center text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
              </div>)}
              <button type="button" onClick={() => set("designations", [...draft.designations, { workerCategory:draft.workerCategory, subCategory:"", designation:"", inheritsParentRules:true }])} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1"><Plus size={13}/>Add designation</button>
            </div>
          </section>

          {/* Step 3A */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-1">3A · Minimum wage (statutory)</h3>
            <p className="text-[11px] text-gray-400 mb-3">Auto-fetched from the Wage Master by state + category + effective date. The admin only confirms the zone — values are read-only statutory.</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className={label}>State<input readOnly value={draft.minimumWage?.state || draft.state} className={input + " bg-gray-50"}/></label>
              <label className={label}>Zone<select value={draft.minimumWage?.zone || ""} onChange={e => set("minimumWage", { ...(draft.minimumWage ?? EMPTY_MW), zone:e.target.value })} className={input}><option value="">Select</option><option>Zone 1</option><option>Zone 2</option><option>Zone 3</option><option>Zone A</option><option>Zone B</option><option>Zone C</option></select></label>
              <label className={label}>District<input readOnly value={draft.minimumWage?.district || ""} className={input + " bg-gray-50"}/></label>
              <label className={label}>Basic wage<input readOnly value={draft.minimumWage?.basicWage ?? 0} className={input + " bg-gray-50"}/></label>
              <label className={label}>VDA<input readOnly value={draft.minimumWage?.vda ?? 0} className={input + " bg-gray-50"}/></label>
              <label className={label}>Min monthly wage<input readOnly value={draft.minimumWage?.minimumMonthlyWage ?? 0} className={input + " bg-gray-50"}/></label>
              <label className={label}>Notification no.<input readOnly value={draft.minimumWage?.notificationNumber || ""} className={input + " bg-gray-50"}/></label>
              <label className={label}>Effective date<input readOnly value={draft.minimumWage?.effectiveDate || ""} className={input + " bg-gray-50"}/></label>
            </div>
          </section>

          {/* Step 3B */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-1">3B · Statutory components</h3>
            <p className="text-[11px] text-gray-400 mb-3">Rates come from the statutory master and stay locked for employers/contractors.</p>
            <div className="rounded-xl border border-gray-100 divide-y divide-gray-100">
              {draft.statutory.map((s, i) => <div key={s.component} className="flex flex-wrap items-center gap-3 px-3 py-2 text-xs">
                <label className="flex items-center gap-2 w-52"><input type="checkbox" checked={s.applicable} onChange={e => set("statutory", draft.statutory.map((x, j) => j === i ? { ...x, applicable:e.target.checked } : x))} className="accent-[#073B67]"/><span className="font-semibold text-gray-800">{s.component.replace(/_/g, " ")}</span></label>
                <input type="number" step="0.01" value={s.rate} onChange={e => set("statutory", draft.statutory.map((x, j) => j === i ? { ...x, rate:Number(e.target.value) } : x))} className="h-8 w-24 border border-gray-200 rounded-lg px-2 text-xs"/>
                <span className="text-gray-400">{s.rateType === "PERCENT" ? "% of wages" : s.rateType === "DAYS" ? "days" : "fixed"}</span>
                <span className="text-gray-400 flex-1 truncate">{s.condition}</span>
                {s.mandatory && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Mandatory</span>}
              </div>)}
            </div>
          </section>

          {/* Step 3C */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-1">3C · Custom cost components</h3>
            <p className="text-[11px] text-gray-400 mb-3">Org-specific costs. &ldquo;Editable by org&rdquo; controls whether employers/contractors may change the amount.</p>
            <div className="space-y-2">
              {draft.custom.map((c, i) => <div key={i} className="grid grid-cols-[1.4fr_90px_110px_110px_auto_auto] gap-2 items-center">
                <input value={c.name} onChange={e => set("custom", draft.custom.map((x, j) => j === i ? { ...x, name:e.target.value } : x))} placeholder="Cost head" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                <input type="number" value={c.amount} onChange={e => set("custom", draft.custom.map((x, j) => j === i ? { ...x, amount:Number(e.target.value) } : x))} className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                <select value={c.frequency} onChange={e => set("custom", draft.custom.map((x, j) => j === i ? { ...x, frequency:e.target.value } : x))} className="h-9 border border-gray-200 rounded-lg px-2 text-xs bg-white"><option value="ONE_TIME">One-time</option><option value="MONTHLY">Monthly</option><option value="ANNUAL">Annual</option></select>
                <select value={c.appliesTo} onChange={e => set("custom", draft.custom.map((x, j) => j === i ? { ...x, appliesTo:e.target.value } : x))} className="h-9 border border-gray-200 rounded-lg px-2 text-xs bg-white"><option value="both">Both</option><option value="employer">Employer</option><option value="contractor">Contractor</option></select>
                <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 whitespace-nowrap"><input type="checkbox" checked={c.editableByOrg} onChange={e => set("custom", draft.custom.map((x, j) => j === i ? { ...x, editableByOrg:e.target.checked } : x))} className="accent-[#073B67]"/>Editable by org</label>
                <button type="button" onClick={() => set("custom", draft.custom.filter((_, j) => j !== i))} className="w-8 h-9 grid place-items-center text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
              </div>)}
              <button type="button" onClick={() => set("custom", [...draft.custom, { name:"", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true }])} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1"><Plus size={13}/>Add cost head</button>
            </div>
          </section>
        </div>
        <footer className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex justify-end gap-2">
          <button onClick={() => setDraft(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button>
          <button disabled={busy || !draft.name.trim()} onClick={() => void save()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><Save size={14}/>{busy ? "Saving…" : "Save template"}</button>
        </footer>
      </section>
    </div>}
  </div>;
}
