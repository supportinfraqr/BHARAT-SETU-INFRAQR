"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BadgeCheck, Briefcase, CheckCircle2, Download, Eye, FileText, MoreVertical, Plus, Trash2, Upload, UserRound, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorWorker, GatePassEligibility } from '@/types/portal';
import WorkerEmploymentCard from '@/components/idcard/WorkerEmploymentCard';
import ScanIdentityCard, { type ScanVerifyData } from '@/components/scan/ScanIdentityCard';
import { useContractorDocView } from '@/components/documentEngine/portalAdapters';
import { buildGatePassHtml } from '@/lib/documentEngine/gatePass';
import { GatePassViewer } from '@/components/documentEngine/GatePassViewer';
import { exportMatrixToXlsx } from '@/lib/exportXlsx';

const fmtCardDate = (v?: string) => { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const columns: DataColumn<ContractorWorker>[] = [
  { id:'name', header:'Worker', value:row => row.name, render:row => <div><strong className="text-bss-text-primary">{row.name}</strong><p className="font-mono text-[11px] text-bss-text-muted">{row.bssId}</p></div> },
  { id:'refCode', header:'Ref Worker Code', value:row => row.refCode ?? '—', render:row => <span className="font-mono text-xs text-bss-text-secondary">{row.refCode ?? '—'}</span> },
  { id:'mobile', header:'Mobile', value:row => row.mobile },
  { id:'designation', header:'Designation', value:row => row.designation },
  { id:'department', header:'Department', value:row => row.department ?? '—' },
  { id:'site', header:'Site', value:row => row.site, export:{split:','} },
  { id:'employer', header:'Employer', value:row => row.employer },
  { id:'doj', header:'Joined', value:row => row.doj },
  { id:'status', header:'Status', value:row => row.status, render:row => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.status === 'Accepted' ? 'bg-bss-soft-green text-bss-green' : row.status === 'Pending' ? 'bg-bss-soft-orange text-bss-orange' : row.status === 'Expired' ? 'bg-bss-bg text-bss-text-muted' : 'bg-bss-soft-orange text-bss-error'}`}>{row.status}</span> },
];

type RowDraft = { bssId:string; site:string; costSheetId:string; dateOfJoining:string };
const emptyRow = (): RowDraft => ({ bssId:'', site:'', costSheetId:'', dateOfJoining:'' });

export default function WorkerMasterPage() {
  const { contractor, mutate, scoped } = useContractor();
  const [modal, setModal] = useState<'single' | 'bulk' | null>(null);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openMenuFor, setOpenMenuFor] = useState('');
  const [profileView, setProfileView] = useState<ContractorWorker | null>(null);
  const [profileDetail, setProfileDetail] = useState<ScanVerifyData | null>(null);
  const [docsView, setDocsView] = useState<ContractorWorker | null>(null);
  const [empView, setEmpView] = useState<ContractorWorker | null>(null);
  const [costSheets, setCostSheets] = useState<Array<{ id:number; name:string; code:string; status?:string; ownerId?:number|null; siteId?:number|null; siteName?:string }>>([]);
  const [bindSite, setBindSite] = useState('');
  const docCtx = useContractorDocView();
  const [passPreview, setPassPreview] = useState<{ html: string; title: string } | null>(null);
  const scopedRows = scoped(contractor.workers, w => w.employer);

  // Cost sheet templates available for binding (replaces manual wage entry).
  useEffect(() => {
    let active = true;
    void fetch('/api/contractor/cost-sheets', { cache:'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { rows?: Array<{ id:number; name:string; code:string; status?:string; ownerId?:number|null; siteId?:number|null; siteName?:string }> } | null) => {
        if (active && body?.rows) setCostSheets(body.rows);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const active = scopedRows.filter(w => w.status === 'Accepted').length;
  const pending = scopedRows.filter(w => w.status === 'Pending').length;
  const inactive = scopedRows.filter(w => w.status === 'Rejected' || w.status === 'Cancelled' || w.status === 'Expired').length;
  // Only the employer-accepted cost sheet for the chosen site may be used to bind.
  const bindSiteObj = contractor.sites.find(s => s.name === bindSite);
  const bindCostSheets = costSheets.filter(s => s.status === 'PUBLISHED' && !!s.ownerId && (!s.siteId || String(s.siteId) === bindSiteObj?.id));
  // Employer-accepted cost sheets usable for a given site (per bulk row).
  const sheetsForSite = (siteName: string) => {
    const siteId = contractor.sites.find(s => s.name === siteName)?.id;
    return costSheets.filter(s => s.status === 'PUBLISHED' && !!s.ownerId && (!s.siteId || String(s.siteId) === siteId));
  };

  // Open the full worker profile: the row carries the binding summary, and the
  // identity-verify endpoint returns the extensive record (bound tier).
  function openProfile(row: ContractorWorker) {
    setProfileView(row);
    setProfileDetail(null);
    setOpenMenuFor('');
    void fetch(`/api/identity/verify/${encodeURIComponent(row.bssId)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((j: { data?: ScanVerifyData } | null) => { if (j?.data) setProfileDetail(j.data); })
      .catch(() => {});
  }

  // View the worker's dispatched gate pass (only offered when one was released
  // by the principal employer).
  async function viewGatePass(row: ContractorWorker) {
    setOpenMenuFor('');
    const pass = row.gatePass;
    if (!pass) return;
    const worker = docCtx.workers.find(w => w.bssId === row.bssId || w.id === row.id);
    if (!worker) { setError('Gate pass could not be opened for this worker.'); return; }
    try {
      const html = await buildGatePassHtml(
        docCtx.owner, docCtx.view, worker,
        pass.type === 'Permanent' ? 'permanent-gate-pass' : 'temporary-gate-pass',
        { validFrom: pass.validFrom, validTo: pass.validTo, number: pass.number, status: pass.status, branding: pass.branding },
      );
      setPassPreview({ html, title: `${row.name} · ${pass.type} Gate Pass` });
    } catch { setError('Gate pass could not be opened.'); }
  }

  async function submitSingle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await mutate<{ data: unknown }>('workers', 'POST', data);
      setModal(null);
      setNotice(`Binding request for ${String(data.bssId)} sent — the worker must accept before the profile unlocks. Track it under Binding Requests.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Worker could not be bound.'); }
    finally { setBusy(false); }
  }

  async function submitBulk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const valid = rows.filter(row => row.bssId && row.site);
    if (!valid.length) { setError('Add at least one row with a BSS ID and site.'); setBusy(false); return; }
    if (valid.some(row => !row.costSheetId)) { setError('Pick an employer-accepted cost sheet for each worker.'); setBusy(false); return; }
    try {
      const payload = valid.map(row => ({ bssId: row.bssId.trim().toUpperCase(), site: row.site, costSheetId: Number(row.costSheetId), dateOfJoining: row.dateOfJoining || undefined }));
      await mutate<{ data: number[] }>('workers', 'POST', { bulk: payload });
      setNotice(`Binding requests sent for ${valid.length} worker${valid.length === 1 ? '' : 's'} — each worker must accept before their profile unlocks.`); setRows([]); setModal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Bulk binding could not be completed.'); }
    finally { setBusy(false); }
  }

  function addRow() { setRows(current => [...current, emptyRow()]); }  function updateRow(index: number, key: keyof RowDraft, value: string) { setRows(current => current.map((row, i) => i === index ? { ...row, [key]: value } : row)); }
  function removeRow(index: number) { setRows(current => current.filter((_, i) => i !== index)); }

  function importCsv(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const lines = text.split(/\r?\n/).filter(line => line.trim()).slice(0, 500);
      const parsed = lines.map(line => {
        const [bssId, site, dateOfJoining] = parseCsv(line);
        return { bssId: bssId?.trim() ?? '', site: site?.trim() ?? '', costSheetId: '', dateOfJoining: dateOfJoining?.trim() ?? '' };
      }).filter(r => r.bssId);
      setRows(current => [...current, ...parsed]); setError('');
      if (!parsed.length) setError('No valid rows. Expected: BSS ID, Site, Date of Joining (date optional).');
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    exportMatrixToXlsx({ filename: 'worker-binding-template', head: ['BSS ID', 'Site', 'Date of Joining'], rows: [], sheetName: 'Template' });
  }

  return <div className="space-y-6 pb-12">
    <header className="bss-reveal flex flex-col sm:flex-row justify-between gap-4">
      <div><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Master data</p><h1 className="text-2xl font-bold mt-1 text-bss-navy">Worker Master</h1><p className="text-sm text-bss-text-secondary mt-1">Bind existing workers to a site by BSS ID. A site already belongs to one principal employer, so the employer is taken from the site.</p></div>
      <div className="flex gap-2">
        <button onClick={() => { setModal('bulk'); setRows([emptyRow()]); setError(''); }} className="h-10 px-4 border border-bss-border rounded-lg text-sm font-semibold flex gap-2 items-center bg-white"><Upload size={16}/>Bulk bind</button>
        <button onClick={() => { setModal('single'); setError(''); }} className="h-10 px-4 rounded-lg bg-bss-navy text-white text-sm font-semibold flex items-center gap-2"><UserRound size={16}/>Bind worker</button>
      </div>
    </header>

    <div className="bss-reveal bg-bss-blue-tint border border-bss-border text-bss-interactive-blue rounded-xl px-4 py-3 text-xs font-medium" style={{ ['--bss-delay' as string]: '60ms' }}>Showing workers across all bound principal employers.</div>
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <section className="bss-reveal bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3" style={{ ['--bss-delay' as string]: '120ms' }}>
      <article className="bss-kpi-card bss-hover-lift"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">Total Workers</span><span className="bss-kpi-icon bg-bss-blue-tint text-bss-interactive-blue"><UserRound size={16}/></span></div><strong>{scopedRows.length}</strong><p>All bindings</p></article>
      <article className="bss-kpi-card bss-hover-lift"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">Active</span><span className="bss-kpi-icon bg-bss-soft-green text-bss-green"><CheckCircle2 size={16}/></span></div><strong>{active}</strong><p>Accepted</p></article>
      <article className="bss-kpi-card bss-hover-lift"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">Pending</span><span className="bss-kpi-icon bg-bss-soft-orange text-bss-orange"><BadgeCheck size={16}/></span></div><strong>{pending}</strong><p>Awaiting acceptance</p></article>
      <article className="bss-kpi-card bss-hover-lift"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">Inactive</span><span className="bss-kpi-icon bg-bss-bg text-bss-text-muted"><X size={16}/></span></div><strong>{inactive}</strong><p>Rejected / cancelled</p></article>
    </section>

    <div className="bss-3d bss-scroll-rise">
    <EnterpriseDataTable
      title="Workforce directory"
      rows={scopedRows}
      columns={[...columns, { id:'actions', header:'Actions', filterable:false, value:row => row.id, render:row => <ActionMenu open={openMenuFor === row.id} onToggle={() => setOpenMenuFor(openMenuFor === row.id ? '' : row.id)} onViewProfile={() => openProfile(row)} onViewDocs={() => { setDocsView(row); setOpenMenuFor(''); }} onEmploymentCard={() => { setEmpView(row); setOpenMenuFor(''); }} onGatePass={row.gatePass ? () => void viewGatePass(row) : undefined} /> }]}
      rowKey={row => row.id}
      filename="contractor-workers"
    />
    </div>

    {/* Single bind modal (BSS ID based) */}
    {modal === 'single' && <div className="fixed inset-0 z-50 bg-bss-navy/40 backdrop-blur-sm p-4 grid place-items-center" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="add-worker-title" className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
      <header className="p-5 border-b border-bss-border flex justify-between"><div><h2 id="add-worker-title" className="font-semibold text-bss-text-primary">Bind an existing BSS worker</h2><p className="text-xs text-bss-text-muted mt-0.5">Enter the worker&apos;s BSS ID — the worker must accept before the profile unlocks. Workers register themselves; you cannot create one here.</p></div><button onClick={() => setModal(null)} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-bss-bg text-bss-text-secondary"><X size={18}/></button></header>
      <form onSubmit={submitSingle} className="p-5 grid sm:grid-cols-2 gap-4">
        <Field name="bssId" label="BSS ID" pattern="(?:BSS-?W[A-Za-z0-9]{10,11}|BSS\d{12})" placeholder="BSS-W7KQ2M9X4RT"/>
        <label className="text-xs font-semibold text-bss-text-primary">Site<select required name="site" value={bindSite} onChange={e => setBindSite(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-3 text-sm bg-white"><option value="">Select site</option>{contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name} — {s.employer}</option>)}</select></label>
        <label className="text-xs font-semibold text-bss-text-primary sm:col-span-2">Cost sheet (required)<select required name="costSheetId" disabled={!bindSite || !bindCostSheets.length} className="mt-1 w-full h-10 border rounded-lg px-3 text-sm bg-white disabled:bg-bss-bg disabled:text-bss-text-muted"><option value="">{!bindSite ? 'Select a site first' : bindCostSheets.length ? 'Select an employer-accepted cost sheet…' : 'No accepted cost sheet for this site'}</option>{bindCostSheets.map(s => <option key={s.id} value={s.id}>{s.name}{s.siteName ? ` · ${s.siteName}` : ''} · {s.code}</option>)}</select><span className="block text-[10px] text-bss-text-muted mt-1">Wage, statutory components, custom costs and CTC are auto-computed from the cost sheet. Adopt a template for the site and get the employer&apos;s acceptance first.</span></label>
        <label className="text-xs font-semibold text-bss-text-primary sm:col-span-2">Date of joining (optional)<input type="date" name="dateOfJoining" max={todayIso()} className="mt-1 w-full h-10 border rounded-lg px-3 text-sm bg-white"/><span className="block text-[10px] text-bss-text-muted mt-1">The worker&apos;s real employment start date (used on the appointment letter). Leave blank to use the binding date.</span></label>
        {error && <p role="alert" className="sm:col-span-2 text-sm text-bss-error">{error}</p>}
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="px-4 py-2 bg-bss-interactive-blue text-white rounded-lg text-sm font-semibold">{busy ? 'Saving…' : 'Bind worker'}</button></div>
      </form>
    </section></div>}

    {/* Bulk bind modal */}
    {modal === 'bulk' && <div className="fixed inset-0 z-[80] bg-bss-navy/40 backdrop-blur-sm p-4 grid place-items-center"><section role="dialog" aria-modal="true" className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
      <header className="p-5 border-b border-bss-border flex justify-between items-center"><div><h2 className="font-semibold text-sm text-bss-text-primary">Bulk bind workers</h2><p className="text-xs text-bss-text-muted mt-1">Download the template, import a CSV (BSS ID, Site, Date of Joining) or add rows. Pick an employer-accepted cost sheet per worker, plus an optional date of joining. Workers must already exist in BSS — you can only propose a binding by BSS ID.</p></div><button onClick={() => setModal(null)} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-bss-bg text-bss-text-secondary"><X size={18}/></button></header>
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadTemplate} className="text-xs font-semibold text-bss-text-primary flex items-center gap-2 border border-bss-border rounded-lg px-3 py-2"><Download size={14}/>Download template</button>
          <label className="text-xs font-semibold text-bss-text-secondary flex items-center gap-2 border border-dashed border-bss-border rounded-lg px-3 py-2 cursor-pointer">Import CSV <input type="file" accept=".csv" className="hidden" onChange={e => importCsv(e.target.files?.[0])}/></label>
          <button type="button" onClick={addRow} className="h-9 px-3 border border-bss-border rounded-lg text-xs font-semibold flex items-center gap-1"><Plus size={14}/>Add row</button>
        </div>
        {error && <p role="alert" className="text-sm text-bss-error">{error}</p>}
        <form onSubmit={submitBulk} className="space-y-3">
          <div className="overflow-x-auto"><div className="grid grid-cols-[minmax(160px,1fr)_minmax(170px,1fr)_minmax(200px,1fr)_140px_30px] gap-2 text-[11px] uppercase text-bss-text-muted font-bold px-1">{['BSS ID','Site','Cost sheet','Date of joining',''].map((label, i) => <span key={i}>{label}</span>)}</div>
            {rows.map((row, index) => { const rowSheets = sheetsForSite(row.site); return <div key={index} className="grid grid-cols-[minmax(160px,1fr)_minmax(170px,1fr)_minmax(200px,1fr)_140px_30px] gap-2 items-center mt-2">
              <input value={row.bssId} onChange={e => updateRow(index, 'bssId', e.target.value)} placeholder="BSS-W7KQ2M9X4RT" className="h-9 border border-bss-border rounded-lg px-2 text-xs font-mono"/>
              <select value={row.site} onChange={e => setRows(cur => cur.map((r, i) => i === index ? { ...r, site: e.target.value, costSheetId: '' } : r))} className="h-9 border border-bss-border rounded-lg px-2 text-xs bg-white"><option value="">Site</option>{contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name} — {s.employer}</option>)}</select>
              <select value={row.costSheetId} disabled={!row.site || !rowSheets.length} onChange={e => updateRow(index, 'costSheetId', e.target.value)} className="h-9 border border-bss-border rounded-lg px-2 text-xs bg-white disabled:bg-bss-bg disabled:text-bss-text-muted"><option value="">{!row.site ? 'Select a site first' : rowSheets.length ? 'Select cost sheet…' : 'No accepted cost sheet'}</option>{rowSheets.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` · ${s.code}` : ''}</option>)}</select>
              <input type="date" value={row.dateOfJoining} max={todayIso()} onChange={e => updateRow(index, 'dateOfJoining', e.target.value)} title="Date of joining (optional)" className="h-9 border border-bss-border rounded-lg px-2 text-xs bg-white"/>
              <button type="button" onClick={() => removeRow(index)} className="w-8 h-9 grid place-items-center text-bss-text-muted hover:text-bss-error" aria-label="Remove row"><Trash2 size={15}/></button>
            </div>; })}
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="px-4 py-2 bg-bss-interactive-blue text-white rounded-lg text-sm font-semibold">{busy ? 'Binding…' : `Bind ${rows.length} worker${rows.length === 1 ? '' : 's'}`}</button></div>
        </form>
      </div>
    </section></div>}

    {/* Worker profile drawer */}
    {profileView && <div className="fixed inset-0 z-[90] bg-bss-navy/40 backdrop-blur-sm grid place-items-center p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setProfileView(null); }}><section role="dialog" aria-modal="true" aria-label="Worker profile" className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
      <header className="sticky top-0 bg-white border-b border-bss-border px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {profileView.photoUrl && profileView.photoUrl !== '/worker-profile.png' ? (
            <img src={profileView.photoUrl} alt={profileView.name} className="w-12 h-12 rounded-xl object-cover border border-bss-border" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-bss-bg text-bss-text-muted flex items-center justify-center border border-bss-border">
              <UserRound size={24} />
            </div>
          )}
          <div><h2 className="font-semibold text-bss-text-primary">{profileView.name}</h2><p className="text-xs text-bss-text-muted font-mono mt-0.5">{profileView.bssId}</p></div>
        </div>
        <button onClick={() => setProfileView(null)} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-bss-bg text-bss-text-secondary"><X size={18}/></button>
      </header>
      <div className="p-5 space-y-4 text-xs">
        <div className="flex flex-wrap gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profileView.status === 'Accepted' ? 'bg-bss-soft-green text-bss-green' : profileView.status === 'Pending' ? 'bg-bss-soft-orange text-bss-orange' : profileView.status === 'Expired' ? 'bg-bss-bg text-bss-text-muted' : 'bg-bss-soft-orange text-bss-error'}`}>{profileView.status}</span></div>
        {profileDetail
          ? <ScanIdentityCard data={profileDetail} />
          : <p className="text-xs text-bss-text-muted py-6 text-center rounded-xl border border-dashed border-bss-border">Loading full profile…</p>}
        <EligibilityGrid eligibility={profileView.eligibility} />
        <div className="rounded-xl border border-bss-border p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-3">Binding</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Info label="Ref Worker Code" value={profileView.refCode ?? '—'}/>
            <Info label="Designation" value={profileView.designation || '—'}/>
            <Info label="Site" value={profileView.site || '—'}/>
            <Info label="Employer" value={profileView.employer || '—'}/>
            <Info label="Date of Joining" value={profileView.doj || '—'}/>
            <Info label="Compliance" value={profileView.compliance}/>
            <Info label="Cost sheet" value={profileView.costSheetName || profileView.costSheet || '—'}/>
            <Info label="CTC (monthly)" value={profileView.ctc ? `₹${profileView.ctc.toLocaleString('en-IN')}` : '—'}/>
          </dl>
          {profileView.skills && profileView.skills.length > 0 && <div className="mt-3"><p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Skills</p><div className="flex flex-wrap gap-1.5">{profileView.skills.map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-bss-blue-tint text-bss-interactive-blue text-[10px] font-semibold">{s}</span>)}</div></div>}
          {profileView.costBreakdown && ((profileView.costBreakdown.statutory?.length ?? 0) > 0 || (profileView.costBreakdown.custom?.length ?? 0) > 0) && <div className="mt-4 rounded-xl border border-bss-border p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-3">Worker cost · {profileView.costBreakdown.templateCode || 'cost sheet'}</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <span className="text-bss-text-muted">Basic + VDA (wage)</span><span className="font-semibold text-right">₹{(profileView.costBreakdown.minimumWage ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-bss-text-muted">Statutory total</span><span className="font-semibold text-right">₹{(profileView.costBreakdown.statutoryTotal ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-bss-text-muted">Contractor billing</span><span className="font-semibold text-right">₹{(profileView.costBreakdown.contractorTotal ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-bss-text-primary font-bold border-t border-bss-border pt-1.5">Employer cost</span><span className="font-bold text-right border-t border-bss-border pt-1.5">₹{(profileView.costBreakdown.employerCost ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-bss-text-primary font-bold">Final employer CTC</span><span className="font-bold text-right text-[#01183A]">₹{(profileView.costBreakdown.ctc ?? profileView.ctc ?? 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{(profileView.costBreakdown.statutory ?? []).map(s => <span key={s.component} className="text-[10px] px-2 py-0.5 rounded-full bg-bss-bg border border-bss-border text-bss-text-secondary">{s.component} ₹{s.amount.toLocaleString('en-IN')}</span>)}{(profileView.costBreakdown.custom ?? []).map(c => <span key={c.name} className="text-[10px] px-2 py-0.5 rounded-full bg-bss-blue-tint border border-bss-border text-bss-interactive-blue">{c.name} ₹{c.computed.toLocaleString('en-IN')}</span>)}</div>
          </div>}
        </div>
        <p className="text-[11px] text-bss-text-muted">Compliance documents and the identity card are available from the actions menu.</p>
      </div>
    </section></div>}

    {/* Compliance documents modal */}
    {docsView && <div className="fixed inset-0 z-[95] bg-bss-navy/40 backdrop-blur-sm grid place-items-center p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setDocsView(null); }}><section role="dialog" aria-modal="true" aria-label="Worker compliance documents" className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
      <header className="sticky top-0 bg-white border-b border-bss-border px-5 py-4 flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Compliance Documents</p><h2 className="font-semibold text-bss-text-primary mt-0.5">{docsView.name}</h2><p className="text-xs text-bss-text-muted font-mono mt-0.5">{docsView.bssId}</p></div><button onClick={() => setDocsView(null)} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-bss-bg text-bss-text-secondary"><X size={18}/></button></header>
      <div className="p-5"><EligibilityGrid eligibility={docsView.eligibility} /></div>
    </section></div>}

    {empView && <WorkerEmploymentCard workerName={empView.name} bssId={empView.bssId} designation={empView.designation} mobile={empView.mobile} department={empView.department} uan={empView.uan} esic={empView.esic} campNo={empView.campNo} routeBusNo={empView.routeBusNo} photoUrl={empView.photoUrl} siteName={empView.site} siteId={empView.siteId} siteCode={empView.siteCode} siteAddress={empView.siteAddress} supervisorName={empView.supervisorName} supervisorContact={empView.supervisorContact} emergencyName={empView.emergencyName} emergencyNumber={empView.emergencyNumber} emergencyRelation={empView.emergencyRelation} bloodGroup={empView.bloodGroup} companyName={empView.employer} contractorName={empView.contractorName} contractorId={empView.contractorCode} contractorContact={empView.contractorContact} contractorEmail={empView.contractorEmail} siteColour={empView.siteColour || undefined} issueDate={fmtCardDate(empView.idCardIssueDate)} validTill={fmtCardDate(empView.idCardValidityTill)} onClose={() => setEmpView(null)} />}
    {passPreview && <GatePassViewer html={passPreview.html} title={passPreview.title} onClose={() => setPassPreview(null)} />}
  </div>;
}

function ActionMenu({ open, onToggle, onViewProfile, onViewDocs, onEmploymentCard, onGatePass }: { open: boolean; onToggle: () => void; onViewProfile: () => void; onViewDocs: () => void; onEmploymentCard?: () => void; onGatePass?: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggle(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onToggle]);

  const run = (fn: () => void) => () => { onToggle(); fn(); };

  const action = (icon: ReactNode, title: string, description: string, onClick: () => void) => (
    <button role="menuitem" onClick={run(onClick)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-bss-bg transition-colors">
      <span className="w-10 h-10 rounded-lg bg-bss-bg text-bss-interactive-blue grid place-items-center flex-shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-bss-text-primary">{title}</span>
        <span className="block text-xs text-bss-text-muted mt-0.5">{description}</span>
      </span>
    </button>
  );

  return (
    <>
      <button onClick={onToggle} aria-label="Worker actions" aria-expanded={open} aria-haspopup="dialog" className={`w-8 h-8 grid place-items-center rounded-lg transition-colors ${open ? 'bg-bss-blue-tint text-bss-interactive-blue' : 'text-bss-text-muted hover:bg-bss-bg'}`}><MoreVertical size={16}/></button>
      {open && createPortal(
        <div className="fixed inset-0 z-[120] bg-bss-navy/40 backdrop-blur-sm grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) onToggle(); }}>
          <section role="dialog" aria-modal="true" aria-label="Worker actions" className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Worker actions</p>
                <h2 className="text-sm font-semibold text-bss-text-primary mt-0.5">Choose an action</h2>
              </div>
              <button onClick={onToggle} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-bss-bg text-bss-text-secondary"><X size={18}/></button>
            </header>
            <div className="p-2 space-y-1">
              {action(<UserRound size={18}/>, 'View Profile', 'Full identity and binding summary', onViewProfile)}
              {onEmploymentCard && action(<Briefcase size={18}/>, 'Employment Card', 'View / print site employment ID', onEmploymentCard)}
              {action(<FileText size={18}/>, 'Compliance Documents', 'Aadhaar, bank, UAN and ESIC checks', onViewDocs)}
              {onGatePass && action(<Eye size={18}/>, 'View Gate Pass', 'Worker\'s site access pass', onGatePass)}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

function parseCsv(line: string): string[] { const out: string[] = []; let cur = '', inQuotes = false; for (const char of line) { if (char === '"') { inQuotes = !inQuotes; continue; } if (char === ',' && !inQuotes) { out.push(cur); cur = ''; continue; } cur += char; } out.push(cur); return out; }
function Field({ name, label, pattern, placeholder }: { name:string; label:string; pattern?:string; placeholder?:string }) { return <label className="text-xs font-semibold text-bss-text-primary">{label}<input required name={name} pattern={pattern} placeholder={placeholder} className="mt-1 w-full h-10 border rounded-lg px-3 text-sm"/></label>; }
function Info({ label, value }: { label:string; value:string }) { return <div className="rounded-lg border border-bss-border p-2.5"><dt className="text-bss-text-muted text-[10px]">{label}</dt><dd className="font-semibold text-bss-text-primary mt-0.5">{value}</dd></div>; }

function EligibilityGrid({ eligibility }: { eligibility?: GatePassEligibility }) {
  const done = (v?: string) => v === 'Done';
  const categories: Array<{ label:string; ok:boolean; items:Array<[string, boolean]> }> = [
    { label:'Medical', ok:done(eligibility?.medical), items:[['Medical examination', done(eligibility?.medical)]] },
    { label:'Health & Safety', ok:done(eligibility?.healthSafety), items:[['Safety Kit', done(eligibility?.safetyKit)], ['Safety Training', done(eligibility?.safetyTraining)], ['Site Induction', done(eligibility?.siteInduction)]] },
    { label:'Compliance', ok:done(eligibility?.compliance), items:[['Aadhaar', done(eligibility?.aadhaar)], ['Bank account', done(eligibility?.bank)], ['UAN', done(eligibility?.uan)], ['ESIC', done(eligibility?.esi)]] },
  ];
  const tempOk = eligibility?.temporaryEligible ?? (done(eligibility?.medical) && done(eligibility?.healthSafety));
  const permOk = eligibility?.permanentEligible ?? (tempOk && done(eligibility?.compliance));
  return (
    <div className="rounded-xl border border-bss-border p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-3">Eligibility — 3 categories</p>
      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.label} className={`rounded-lg border px-2.5 py-2 ${cat.ok ? 'border-bss-border bg-bss-soft-green/50' : 'border-bss-border'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full grid place-items-center text-white text-[9px] flex-shrink-0 ${cat.ok ? 'bg-bss-green' : 'bg-bss-surface'}`}>{cat.ok ? '✓' : '✗'}</span>
              <span className="text-[11px] font-bold text-bss-text-primary">{cat.label}</span>
            </div>
            <div className="mt-1.5 pl-6 flex flex-wrap gap-1.5">
              {cat.items.map(([label, ok]) => <span key={label} className={`text-[10px] px-1.5 py-0.5 rounded ${ok ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-bg text-bss-text-muted'}`}>{label} {ok ? '✓' : '✗'}</span>)}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-bss-text-muted">Temporary: <strong className={tempOk ? 'text-bss-green' : 'text-bss-orange'}>{tempOk ? 'eligible' : 'not eligible'}</strong> · Permanent: <strong className={permOk ? 'text-bss-green' : 'text-bss-orange'}>{permOk ? 'eligible' : 'not eligible'}</strong></p>
    </div>
  );
}
