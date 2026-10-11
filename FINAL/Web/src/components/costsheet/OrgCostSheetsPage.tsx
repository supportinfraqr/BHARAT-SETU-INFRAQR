"use client";

import { useCallback, useEffect, useState } from "react";
import { Calculator, CheckCircle2, Clock3, Copy, Loader2, Save, Trash2, X } from "lucide-react";
import EnterpriseDataTable, { type DataColumn } from "@/components/worker/EnterpriseDataTable";

type Custom = { name:string; amount:number; rateType:string; frequency:string; appliesTo:string; editableByOrg:boolean; isNew?:boolean };

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
  function removeCustom(i: number) {
    setEditing(e => e ? { ...e, custom: e.custom.filter((_, j) => j !== i) } : e);
  }

  async function saveEditor() {
    if (!editing) return;
    setBusy(true); setError("");
    try {
      const saved = await persistEditor();
      setRows(current => current.map(r => r.id === editing.id ? saved : r));
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

  // Persist the editor's pending changes (custom heads / amounts / name).
  async function persistEditor(): Promise<Template> {
    if (!editing) throw new Error("Nothing to save.");
    const response = await fetch(`/api/cost-sheets/${editing.id}`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ name:editing.name, custom: editing.custom
        .filter(c => (c.name || "").trim())
        .map(c => ({ name:c.name, amount: c.isNew ? c.amount : (amounts[c.name] ?? c.amount), rateType:c.rateType, frequency:c.frequency, appliesTo:c.appliesTo })) }),
    });
    const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
    if (!response.ok || !body.data) throw new Error(body.error ?? "The cost sheet could not be saved.");
    return body.data;
  }

  async function submitProposal(template: Template) {
    setBusy(true); setError(""); setNotice("");
    try {
      // Auto-save: persist any pending editor edits before submitting, so a
      // contractor who clicks Submit without Save never loses their changes.
      if (editing && editing.id === template.id) {
        const saved = await persistEditor();
        setRows(current => current.map(r => r.id === editing.id ? saved : r));
      }
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
    { id:"name", header:"Template", value:r => r.name, render:r => <div><strong className="text-bss-text-primary">{r.name}</strong><p className="font-mono text-[10px] text-bss-text-muted">{r.code}</p></div> },
    { id:"state", header:"State / Industry", value:r => `${r.state || "All India"} · ${r.industry || "All"}` },
    { id:"site", header:"Site", value:r => r.siteName || (r.siteId ? `#${r.siteId}` : "—") },
    { id:"category", header:"Category / Designation", value:r => `${r.workerCategory || "—"} · ${r.designation || "—"}` },
    { id:"status", header:"Status", value:r => r.status, render:r => {
      const label = r.status === "REVIEW" ? "Pending Employer Acceptance"
        : r.status === "DRAFT" ? "Draft — not submitted" : r.status;
      return <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-bss-border ${r.status === "REVIEW" ? "bg-bss-soft-orange text-bss-orange" : r.status === "PUBLISHED" ? "bg-bss-soft-green text-bss-green" : "bg-bss-bg text-bss-text-secondary"}`}>
        {r.status === "REVIEW" ? <Clock3 size={11}/> : r.status === "PUBLISHED" ? <CheckCircle2 size={11}/> : <Clock3 size={11}/>}
        {label}
      </span>;
    } },
    { id:"origin", header:"Origin", value:r => r.ownerId ? "Adopted / Contractor" : "BSS Platform Master", render:r => <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-bss-border ${r.ownerId ? "bg-bss-blue-tint text-bss-interactive-blue" : "bg-bss-soft-green text-bss-green"}`}>{r.ownerId ? "Contractor Proposal" : "Platform Master"}</span> },
    { id:"actions", header:"Actions", filterable:false, value:r => r.id, render:r => {
      const isContractor = role === "contractor";
      const isEmployer = role === "employer";
      const canEdit = isContractor && !!r.ownerId && r.status === "DRAFT";
      return <div className="flex items-center gap-2">
        {isContractor && !r.ownerId && <>
          <select value={adoptSite[r.id] ?? ""} onChange={e => setAdoptSite(s => ({ ...s, [r.id]: e.target.value }))} className="h-8 rounded-lg border border-bss-border px-2 text-xs bg-white" aria-label="Allotted site">
            <option value="">{sites.length ? "Select allotted site…" : "No site allotted"}</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.state ? ` · ${s.state}` : ""}</option>)}
          </select>
          <button disabled={busy || !adoptSite[r.id]} onClick={() => void copy(r, adoptSite[r.id])} className="text-xs font-bold text-bss-interactive-blue hover:text-bss-text-primary bg-bss-blue-tint hover:bg-bss-blue-tint border border-bss-border px-2.5 py-1 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"><Copy size={12}/>Adopt for Site</button>
        </>}
        {canEdit && <button disabled={busy} onClick={() => void submitProposal(r)} className="text-xs font-bold text-white bg-[#01183A] hover:bg-[#022B5E] px-2.5 py-1 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"><CheckCircle2 size={12}/>Submit to Employer</button>}
        {isEmployer && r.status === "REVIEW" && <>
          <button disabled={busy} onClick={() => void approveCostSheet(r)} className="text-xs font-bold text-white bg-bss-green hover:bg-bss-green px-2.5 py-1 rounded-lg inline-flex items-center gap-1 disabled:opacity-50 shadow-sm"><CheckCircle2 size={12}/>Accept Proposal</button>
          <button disabled={busy} onClick={() => void rejectCostSheet(r)} className="text-xs font-bold text-bss-error bg-bss-soft-orange hover:bg-bss-soft-orange border border-bss-border px-2.5 py-1 rounded-lg disabled:opacity-50">Reject</button>
        </>}
        <button onClick={() => openEditor(r)} className="text-xs font-semibold text-bss-text-primary hover:text-[#01183A] inline-flex items-center gap-1"><Calculator size={12}/>{canEdit ? "Edit" : "View"}</button>
      </div>;
    } },
  ];

  const masterTemplates = rows.filter(r => !r.ownerId);

  return <div className="space-y-6 pb-10">
    <header className="bss-reveal"><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Payroll</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-navy mt-1">Cost Sheets</h1><p className="text-sm text-bss-text-muted mt-1">Published BSS cost sheet templates plus your own customised copies. Statutory and minimum-wage values are locked; you can adjust your own cost heads (where &ldquo;editable by org&rdquo; is allowed).</p></header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    {role === "contractor" && masterTemplates.length > 0 && (
      <section className="bss-reveal bss-card p-5 space-y-3" style={{ ['--bss-delay' as string]: '80ms' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bss-border/80 pb-3">
          <div>
            <h2 className="text-sm font-bold text-bss-text-primary flex items-center gap-2"><Copy size={16} className="text-[#01183A]"/>Quick Adopt Platform Master Template</h2>
            <p className="text-xs text-bss-text-muted mt-0.5">Select a master template and your allotted site to adopt it immediately into your cost sheet workspace.</p>
          </div>
          <span className="text-[11px] font-semibold text-bss-interactive-blue bg-bss-blue-tint/70 px-2.5 py-1 rounded-full">{masterTemplates.length} Master Template{masterTemplates.length === 1 ? '' : 's'} available</span>
        </div>
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end pt-1">
          <label className="block text-xs font-semibold text-bss-text-primary">1. Master Template
            <select value={selectedMasterId} onChange={e => setSelectedMasterId(e.target.value)} className="mt-1 block w-full h-10 rounded-xl border border-bss-border px-3 text-xs bg-white focus:ring-2 focus:ring-[#01183A] font-medium">
              <option value="">Choose Platform Master template…</option>
              {masterTemplates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.state || "All India"} · {t.workerCategory || "All"})</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-bss-text-primary">2. Allotted Site
            <select value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)} className="mt-1 block w-full h-10 rounded-xl border border-bss-border px-3 text-xs bg-white focus:ring-2 focus:ring-[#01183A] font-medium">
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
            className="h-10 px-5 rounded-xl bg-[#01183A] hover:bg-[#022B5E] text-white text-xs font-bold shadow-sm disabled:opacity-50 inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Copy size={14}/>Adopt for Site
          </button>
        </div>
      </section>
    )}

    {loading ? <p className="flex items-center gap-2 text-sm text-bss-text-muted py-10"><Loader2 size={16} className="animate-spin"/>Loading cost sheets…</p>
      : <EnterpriseDataTable title="Available cost sheet templates" rows={rows} columns={columns} rowKey={r => String(r.id)} filename="org-cost-sheets"/>}

    {editing && (() => {
      const editable = role === "contractor" && !!editing.ownerId && editing.status === "DRAFT";
      return <div className="fixed inset-0 z-[90] bg-bss-navy/40 backdrop-blur-sm grid place-items-center p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setEditing(null); }}>
      <section role="dialog" aria-modal="true" aria-label="Cost sheet" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-bss-border px-5 py-4 flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Cost sheet</p><input value={editing.name} disabled={!editable} onChange={e => setEditing({ ...editing, name:e.target.value })} className="font-semibold text-bss-text-primary mt-0.5 w-full border-b border-transparent focus:border-bss-border disabled:bg-transparent"/><p className="text-xs text-bss-text-muted mt-0.5">{editing.code} · {editing.state || "All India"} · {editing.workerCategory || "—"}</p></div>
          <button onClick={() => setEditing(null)} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-bss-bg text-bss-text-secondary"><X size={18}/></button>
        </header>
        <div className="p-5 space-y-5">
          <div className="rounded-xl border border-bss-border p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Minimum wage (statutory — locked)</p>
            <div className="grid grid-cols-3 gap-2 text-xs"><span className="text-bss-text-muted">Basic</span><span className="font-semibold text-right">₹{(editing.minimumWage?.basicWage ?? 0).toLocaleString("en-IN")}</span><span/><span className="text-bss-text-muted">VDA</span><span className="font-semibold text-right">₹{(editing.minimumWage?.vda ?? 0).toLocaleString("en-IN")}</span><span/><span className="text-bss-text-muted">Monthly minimum</span><span className="font-semibold text-right">₹{(editing.minimumWage?.minimumMonthlyWage ?? 0).toLocaleString("en-IN")}</span>{editing.minimumWage?.notificationNumber ? <><span className="text-bss-text-muted">Notification no.</span><span className="font-semibold text-right col-span-2">{editing.minimumWage.notificationNumber}</span></> : null}</div>
          </div>

          <div className="rounded-xl border border-bss-border p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Custom cost heads</p>
            <div className="space-y-2">{editing.custom.map((c, i) => {
              const canAmount = c.isNew || c.editableByOrg || c.appliesTo === "contractor" || c.appliesTo === "both";
              return <div key={i} className="grid grid-cols-[1.5fr_110px_120px_auto] gap-2 items-center text-xs">
                {c.isNew
                  ? <input value={c.name} onChange={e => setCustom(i, { name:e.target.value })} placeholder="Cost head" className="h-9 border border-bss-border rounded-lg px-2 text-xs"/>
                  : <span className="font-semibold text-bss-text-primary">{c.name}{!canAmount && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-bg text-bss-text-muted">Platform fixed</span>}</span>}
                <input type="number" disabled={!editable || !canAmount} value={c.isNew ? c.amount : (amounts[c.name] ?? c.amount)} onChange={e => c.isNew ? setCustom(i, { amount:Number(e.target.value) }) : setAmounts(a => ({ ...a, [c.name]:Number(e.target.value) }))} className="h-9 border border-bss-border rounded-lg px-2 text-xs disabled:bg-bss-bg"/>
                {c.isNew
                  ? <select value={c.frequency} onChange={e => setCustom(i, { frequency:e.target.value })} className="h-9 border border-bss-border rounded-lg px-2 text-xs bg-white"><option value="ONE_TIME">One-time</option><option value="MONTHLY">Monthly</option><option value="ANNUAL">Annual</option></select>
                  : <span className="text-bss-text-muted">{c.frequency === "ONE_TIME" ? "one-time" : c.frequency.toLowerCase()} · {c.appliesTo}</span>}
                {editable && c.isNew
                  ? <button type="button" onClick={() => removeCustom(i)} aria-label="Remove cost head" className="text-bss-text-muted hover:text-bss-error justify-self-center"><Trash2 size={13}/></button>
                  : <span/>}
              </div>;
            })}</div>
            {editable && <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={addCustomHead} className="text-xs font-semibold text-[#01183A] border border-bss-border rounded-lg px-2.5 py-1.5 hover:bg-bss-bg">Add cost head</button>
            </div>}
          </div>

          {preview && <div className="rounded-xl border border-bss-border p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Computed cost</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <span className="text-bss-text-muted">Basic + VDA (wage)</span><span className="font-semibold text-right">₹{preview.minimumWage.toLocaleString("en-IN")}</span>
              <span className="text-bss-text-muted">Statutory total</span><span className="font-semibold text-right">₹{preview.statutoryTotal.toLocaleString("en-IN")}</span>
              <span className="text-bss-text-muted">Custom total</span><span className="font-semibold text-right">₹{preview.customTotal.toLocaleString("en-IN")}</span>
              <span className="text-bss-text-primary font-bold border-t border-bss-border pt-1.5">Employer cost</span><span className="font-bold text-right border-t border-bss-border pt-1.5">₹{preview.employerCost.toLocaleString("en-IN")}</span>
              <span className="text-bss-text-primary font-bold">CTC</span><span className="font-bold text-right text-[#01183A]">₹{preview.ctc.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{preview.statutory.map(s => <span key={s.component} className="text-[10px] px-2 py-0.5 rounded-full bg-bss-bg border border-bss-border text-bss-text-secondary">{s.component} ₹{s.amount.toLocaleString("en-IN")}</span>)}</div>
          </div>}
        </div>
        <footer className="sticky bottom-0 bg-white border-t border-bss-border px-5 py-4 flex justify-end gap-2">
          <button onClick={() => setEditing(null)} className="h-10 px-4 rounded-lg border border-bss-border text-xs font-bold text-bss-text-secondary">Close</button>
          {editable && <button disabled={busy} onClick={() => void saveEditor()} className="h-10 px-4 rounded-lg border border-[#01183A] text-[#01183A] text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><Save size={14}/>{busy ? "Saving…" : "Save draft"}</button>}
          {editable && <button disabled={busy} onClick={() => void submitProposal(editing)} className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>Submit to Employer</button>}
          {editing.status === "REVIEW" && role === "employer" && <>
            <button disabled={busy} onClick={() => void rejectCostSheet(editing)} className="h-10 px-4 rounded-lg border border-bss-border text-bss-error bg-bss-soft-orange text-xs font-semibold hover:brightness-95 disabled:opacity-60">Reject</button>
            <button disabled={busy} onClick={() => void approveCostSheet(editing)} className="h-10 px-4 rounded-lg bg-bss-green text-white text-xs font-semibold hover:brightness-110 disabled:opacity-60 inline-flex items-center gap-1.5 shadow-sm"><CheckCircle2 size={14}/>Accept Proposal</button>
          </>}
        </footer>
      </section>
    </div>;
    })()}
  </div>;
}
