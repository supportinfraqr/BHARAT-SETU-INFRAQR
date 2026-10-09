"use client";

import { useCallback, useEffect, useState } from "react";
import { Calculator, CheckCircle2, Copy, Loader2, Save, Trash2, X } from "lucide-react";
import EnterpriseDataTable, { type DataColumn } from "@/components/worker/EnterpriseDataTable";

type Custom = { name:string; amount:number; rateType:string; frequency:string; appliesTo:string; editableByOrg:boolean; isNew?:boolean };

// The standard (optional) custom cost heads — one-click to add (matches admin 3C).
const STANDARD_HEADS: Array<Omit<Custom, 'isNew'>> = [
  { name:"Uniform", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"PPE / Safety Equipment", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Medical Examination", amount:0, rateType:"FIXED", frequency:"ANNUAL", appliesTo:"both", editableByOrg:true },
  { name:"Insurance", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Training", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Food", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Accommodation", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Transport", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Administrative Cost", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"contractor", editableByOrg:true },
  { name:"Reliever Cost", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"contractor", editableByOrg:true },
  { name:"Site Allowance", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Shift Allowance", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Risk Allowance", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Profit Margin", amount:0, rateType:"PERCENT", frequency:"MONTHLY", appliesTo:"contractor", editableByOrg:true },
  { name:"Service Charges", amount:0, rateType:"PERCENT", frequency:"MONTHLY", appliesTo:"contractor", editableByOrg:true },
  { name:"Applicable Taxes (GST)", amount:0, rateType:"PERCENT", frequency:"MONTHLY", appliesTo:"contractor", editableByOrg:true },
  { name:"BSS Platform Cost", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:false },
];
type Template = {
  id:number; name:string; code:string; state:string; industry:string; workerCategory:string;
  designation:string; status:string; ownerId:number | null; currency:string;
  siteId?:number | null; siteName?:string;
  custom:Custom[]; minimumWage:{ basicWage:number; vda:number; minimumMonthlyWage:number; notificationNumber?:string } | null;
};
type Breakdown = {
  basicWage:number; vda:number; minimumWage:number; dailyWage:number;
  statutoryTotal:number; customTotal:number; employerCost:number; contractorBilling:number | null; ctc:number;
  statutory:Array<{ component:string; rate:number; amount:number }>;
  custom:Array<{ name:string; computed:number }>;
};

export default function OrgCostSheetsPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Template | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<Breakdown | null>(null);
  const [busy, setBusy] = useState(false);
  const [sites, setSites] = useState<Array<{ id:string; name:string; state?:string }>>([]);
  const [adoptSite, setAdoptSite] = useState<Record<number,string>>({});
  const [selectedMasterId, setSelectedMasterId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/cost-sheets", { cache:"no-store" });
      const body = await response.json().catch(() => ({})) as { rows?:Template[]; role?:string; error?:string };
      if (!response.ok) throw new Error(body.error ?? "Cost sheets could not be loaded.");
      setRows(body.rows ?? []);
      setRole(body.role ?? "");
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load cost sheets."); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  // Contractors adopt per allotted site — load their sites for the picker.
  useEffect(() => {
    if (role !== "contractor") return;
    fetch('/api/portal', { cache:'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((j: { data?: { sites?: Array<{ id:string; name:string; state?:string }> } } | null) => setSites(j?.data?.sites ?? []))
      .catch(() => {});
  }, [role]);

  async function computeCost(template: Template, overrides?: Record<string, number>) {
    const response = await fetch(`/api/cost-sheets/${template.id}/preview`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(overrides ? { overrides } : {}),
    });
    const body = await response.json().catch(() => ({})) as { data?:Breakdown; error?:string };
    if (!response.ok || !body.data) throw new Error(body.error ?? "Cost could not be computed.");
    setPreview(body.data);
  }

  async function copy(template: Template, siteId?: string) {
    if (!siteId) { setError("Choose the allotted site this cost sheet is for."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      // Contractor adoption is per-site — the site is sent with the clone.
      let response = await fetch(`/api/contractor/cost-sheets/${template.id}/clone`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ siteId: Number(siteId) }) });
      if (response.status === 404) {
        response = await fetch(`/api/cost-sheets/${template.id}/clone`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ siteId: Number(siteId) }) });
      }
      const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The template could not be adopted.");
      setRows(current => [body.data!, ...current]);
      setNotice(`Adopted "${template.name}" for ${body.data.siteName || "the site"} — Draft ready to edit.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Adoption failed."); }
    finally { setBusy(false); }
  }

  function openEditor(template: Template) {
    setEditing(template);
    setPreview(null);
    setAmounts(Object.fromEntries(template.custom.map(c => [c.name, c.amount])));
    void computeCost(template).catch(() => {});
  }

  function setCustom(i: number, patch: Partial<Custom>) {
    setEditing(e => e ? { ...e, custom: e.custom.map((x, j) => j === i ? { ...x, ...patch } : x) } : e);
  }
  function addCustomHead() {
    setEditing(e => e ? { ...e, custom: [...e.custom, { name:"", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"contractor", editableByOrg:true, isNew:true }] } : e);
  }
  function addStandardHeads() {
    setEditing(e => {
      if (!e) return e;
      const existing = new Set(e.custom.map(c => c.name));
      const add = STANDARD_HEADS.filter(h => !existing.has(h.name)).map(h => ({ ...h, isNew:true }));
      return { ...e, custom: [...e.custom, ...add] };
    });
  }
  function removeCustom(i: number) {
    setEditing(e => e ? { ...e, custom: e.custom.filter((_, j) => j !== i) } : e);
  }

  async function saveEditor() {
    if (!editing) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/cost-sheets/${editing.id}`, {
        method:"PATCH", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ name:editing.name, custom: editing.custom
          .filter(c => (c.name || "").trim())
          .map(c => ({ name:c.name, amount: c.isNew ? c.amount : (amounts[c.name] ?? c.amount), rateType:c.rateType, frequency:c.frequency, appliesTo:c.appliesTo })) }),
      });
      const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The cost sheet could not be saved.");
      setRows(current => current.map(r => r.id === editing.id ? body.data! : r));
      setEditing(null);
      setNotice("Cost sheet updated.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Save failed."); }
    finally { setBusy(false); }
  }

  async function approveCostSheet(template: Template) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/cost-sheets/${template.id}/approve`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
      });
      const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The cost sheet could not be approved.");
      setRows(current => current.map(r => r.id === template.id ? body.data! : r));
      if (editing?.id === template.id) setEditing(null);
      setNotice(`Accepted cost sheet proposal "${template.name}" for active use.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Approval failed."); }
    finally { setBusy(false); }
  }

  async function rejectCostSheet(template: Template) {
    if (!window.confirm(`Reject "${template.name}" and send it back to the contractor for revision?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/cost-sheets/${template.id}/reject`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
      });
      const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The cost sheet could not be rejected.");
      setRows(current => current.map(r => r.id === template.id ? body.data! : r));
      if (editing?.id === template.id) setEditing(null);
      setNotice(`Rejected "${template.name}" — returned to the contractor as a Draft.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Rejection failed."); }
    finally { setBusy(false); }
  }

  async function submitProposal(template: Template) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/cost-sheets/${template.id}/submit`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
      });
      const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The cost sheet could not be submitted.");
      setRows(current => current.map(r => r.id === template.id ? body.data! : r));
      if (editing?.id === template.id) setEditing(null);
      setNotice(`Submitted "${template.name}" to the Principal Employer for acceptance.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Submission failed."); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<Template>[] = [
    { id:"name", header:"Template", value:r => r.name, render:r => <div><strong className="text-gray-900">{r.name}</strong><p className="font-mono text-[10px] text-gray-400">{r.code}</p></div> },
    { id:"state", header:"State / Industry", value:r => `${r.state || "All India"} · ${r.industry || "All"}` },
    { id:"site", header:"Site", value:r => r.siteName || (r.siteId ? `#${r.siteId}` : "—") },
    { id:"category", header:"Category / Designation", value:r => `${r.workerCategory || "—"} · ${r.designation || "—"}` },
    { id:"status", header:"Status", value:r => r.status, render:r => {
      const label = r.status === "REVIEW" ? "⏳ Pending Employer Acceptance"
        : r.status === "DRAFT" ? "Draft — not submitted" : r.status;
      return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === "REVIEW" ? "bg-amber-100 text-amber-800 border border-amber-300" : r.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
        {label}
      </span>;
    } },
    { id:"origin", header:"Origin", value:r => r.ownerId ? "Adopted / Contractor" : "BSS Platform Master", render:r => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.ownerId ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-purple-50 text-purple-700 border border-purple-200"}`}>{r.ownerId ? "Contractor Proposal" : "Platform Master"}</span> },
    { id:"actions", header:"Actions", filterable:false, value:r => r.id, render:r => {
      const isContractor = role === "contractor";
      const isEmployer = role === "employer";
      const canEdit = isContractor && !!r.ownerId && r.status === "DRAFT";
      return <div className="flex items-center gap-2">
        {isContractor && !r.ownerId && <>
          <select value={adoptSite[r.id] ?? ""} onChange={e => setAdoptSite(s => ({ ...s, [r.id]: e.target.value }))} className="h-8 rounded-lg border border-gray-200 px-2 text-xs bg-white" aria-label="Allotted site">
            <option value="">{sites.length ? "Select allotted site…" : "No site allotted"}</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.state ? ` · ${s.state}` : ""}</option>)}
          </select>
          <button disabled={busy || !adoptSite[r.id]} onClick={() => void copy(r, adoptSite[r.id])} className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"><Copy size={12}/>Adopt for Site</button>
        </>}
        {canEdit && <button disabled={busy} onClick={() => void submitProposal(r)} className="text-xs font-bold text-white bg-[#073B67] hover:bg-[#0a4a80] px-2.5 py-1 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"><CheckCircle2 size={12}/>Submit to Employer</button>}
        {isEmployer && r.status === "REVIEW" && <>
          <button disabled={busy} onClick={() => void approveCostSheet(r)} className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 disabled:opacity-50 shadow-sm"><CheckCircle2 size={12}/>Accept Proposal</button>
          <button disabled={busy} onClick={() => void rejectCostSheet(r)} className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg disabled:opacity-50">Reject</button>
        </>}
        <button onClick={() => openEditor(r)} className="text-xs font-semibold text-gray-700 hover:text-[#073B67] inline-flex items-center gap-1"><Calculator size={12}/>{canEdit ? "Edit" : "View"}</button>
      </div>;
    } },
  ];

  const masterTemplates = rows.filter(r => !r.ownerId);

  return <div className="space-y-6 pb-10">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Payroll</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Cost Sheets</h1><p className="text-sm text-gray-500 mt-1">Published BSS cost sheet templates plus your own customised copies. Statutory and minimum-wage values are locked; you can adjust your own cost heads (where &ldquo;editable by org&rdquo; is allowed).</p></header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    {role === "contractor" && masterTemplates.length > 0 && (
      <section className="bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80 border border-blue-200/80 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100/80 pb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Copy size={16} className="text-[#073B67]"/>Quick Adopt Platform Master Template</h2>
            <p className="text-xs text-gray-500 mt-0.5">Select a master template and your allotted site to adopt it immediately into your cost sheet workspace.</p>
          </div>
          <span className="text-[11px] font-semibold text-blue-800 bg-blue-100/70 px-2.5 py-1 rounded-full">{masterTemplates.length} Master Template{masterTemplates.length === 1 ? '' : 's'} available</span>
        </div>
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end pt-1">
          <label className="block text-xs font-semibold text-gray-700">1. Master Template
            <select value={selectedMasterId} onChange={e => setSelectedMasterId(e.target.value)} className="mt-1 block w-full h-10 rounded-xl border border-gray-200 px-3 text-xs bg-white focus:ring-2 focus:ring-[#073B67] font-medium">
              <option value="">Choose Platform Master template…</option>
              {masterTemplates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.state || "All India"} · {t.workerCategory || "All"})</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-gray-700">2. Allotted Site
            <select value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)} className="mt-1 block w-full h-10 rounded-xl border border-gray-200 px-3 text-xs bg-white focus:ring-2 focus:ring-[#073B67] font-medium">
              <option value="">{sites.length ? "Select allotted site…" : "No site allotted"}</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.state ? ` · ${s.state}` : ""}</option>)}
            </select>
          </label>
          <button
            disabled={busy || !selectedMasterId || !selectedSiteId}
            onClick={() => {
              const tmpl = masterTemplates.find(t => String(t.id) === selectedMasterId);
              if (tmpl && selectedSiteId) void copy(tmpl, selectedSiteId);
            }}
            className="h-10 px-5 rounded-xl bg-[#073B67] hover:bg-[#0a4a80] text-white text-xs font-bold shadow-sm disabled:opacity-50 inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Copy size={14}/>Adopt for Site
          </button>
        </div>
      </section>
    )}

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading cost sheets…</p>
      : <EnterpriseDataTable title="Available cost sheet templates" rows={rows} columns={columns} rowKey={r => String(r.id)} filename="org-cost-sheets"/>}

    {editing && (() => {
      const editable = role === "contractor" && !!editing.ownerId && editing.status === "DRAFT";
      return <div className="fixed inset-0 z-[90] bg-black/50 flex justify-end" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Cost sheet" className="bg-white w-full max-w-2xl h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cost sheet</p><input value={editing.name} disabled={!editable} onChange={e => setEditing({ ...editing, name:e.target.value })} className="font-semibold text-gray-950 mt-0.5 w-full border-b border-transparent focus:border-gray-300 disabled:bg-transparent"/><p className="text-xs text-gray-500 mt-0.5">{editing.code} · {editing.state || "All India"} · {editing.workerCategory || "—"}</p></div>
          <button onClick={() => setEditing(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
        </header>
        <div className="p-5 space-y-5">
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Minimum wage (statutory — locked)</p>
            <div className="grid grid-cols-3 gap-2 text-xs"><span className="text-gray-500">Basic</span><span className="font-semibold text-right">₹{(editing.minimumWage?.basicWage ?? 0).toLocaleString("en-IN")}</span><span/><span className="text-gray-500">VDA</span><span className="font-semibold text-right">₹{(editing.minimumWage?.vda ?? 0).toLocaleString("en-IN")}</span><span/><span className="text-gray-500">Monthly minimum</span><span className="font-semibold text-right">₹{(editing.minimumWage?.minimumMonthlyWage ?? 0).toLocaleString("en-IN")}</span>{editing.minimumWage?.notificationNumber ? <><span className="text-gray-500">Notification no.</span><span className="font-semibold text-right col-span-2">{editing.minimumWage.notificationNumber}</span></> : null}</div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Custom cost heads</p>
            <div className="space-y-2">{editing.custom.map((c, i) => {
              const canAmount = c.isNew || c.editableByOrg || c.appliesTo === "contractor" || c.appliesTo === "both";
              return <div key={i} className="grid grid-cols-[1.5fr_110px_120px_auto] gap-2 items-center text-xs">
                {c.isNew
                  ? <input value={c.name} onChange={e => setCustom(i, { name:e.target.value })} placeholder="Cost head" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                  : <span className="font-semibold text-gray-800">{c.name}{!canAmount && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Platform fixed</span>}</span>}
                <input type="number" disabled={!editable || !canAmount} value={c.isNew ? c.amount : (amounts[c.name] ?? c.amount)} onChange={e => c.isNew ? setCustom(i, { amount:Number(e.target.value) }) : setAmounts(a => ({ ...a, [c.name]:Number(e.target.value) }))} className="h-9 border border-gray-200 rounded-lg px-2 text-xs disabled:bg-gray-50"/>
                {c.isNew
                  ? <select value={c.frequency} onChange={e => setCustom(i, { frequency:e.target.value })} className="h-9 border border-gray-200 rounded-lg px-2 text-xs bg-white"><option value="ONE_TIME">One-time</option><option value="MONTHLY">Monthly</option><option value="ANNUAL">Annual</option></select>
                  : <span className="text-gray-400">{c.frequency === "ONE_TIME" ? "one-time" : c.frequency.toLowerCase()} · {c.appliesTo}</span>}
                {editable && c.isNew
                  ? <button type="button" onClick={() => removeCustom(i)} aria-label="Remove cost head" className="text-gray-400 hover:text-red-600 justify-self-center"><Trash2 size={13}/></button>
                  : <span/>}
              </div>;
            })}</div>
            {editable && <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={addCustomHead} className="text-xs font-semibold text-[#073B67] border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">Add cost head</button>
              <button type="button" onClick={addStandardHeads} className="text-xs font-semibold text-[#073B67] border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">Add standard heads</button>
            </div>}
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
          {editable && <button disabled={busy} onClick={() => void saveEditor()} className="h-10 px-4 rounded-lg border border-[#073B67] text-[#073B67] text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><Save size={14}/>{busy ? "Saving…" : "Save draft"}</button>}
          {editable && <button disabled={busy} onClick={() => void submitProposal(editing)} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>Submit to Employer</button>}
          {editing.status === "REVIEW" && role === "employer" && <>
            <button disabled={busy} onClick={() => void rejectCostSheet(editing)} className="h-10 px-4 rounded-lg border border-red-200 text-red-700 bg-red-50 text-xs font-bold hover:bg-red-100 disabled:opacity-60">Reject</button>
            <button disabled={busy} onClick={() => void approveCostSheet(editing)} className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-1.5 shadow-sm"><CheckCircle2 size={14}/>Accept Proposal</button>
          </>}
        </footer>
      </section>
    </div>;
    })()}
  </div>;
}
