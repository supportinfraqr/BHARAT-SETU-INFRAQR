"use client";

import { useState } from 'react';
import { BadgeCheck, CheckCircle2, Download, FileText, IdCard, MoreVertical, Plus, Trash2, Upload, UserRound, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorWorker } from '@/types/portal';
import WorkerQr from '@/components/qr/WorkerQr';
import { useContractorDocView } from '@/components/documentEngine/portalAdapters';
import { WorkerDocumentsDrawer } from '@/components/documentEngine/DocumentFlow';
import type { WorkerLike } from '@/lib/documentEngine/workerDataService';

const columns: DataColumn<ContractorWorker>[] = [
  { id:'name', header:'Worker', value:row => row.name, render:row => <div><strong className="text-gray-900">{row.name}</strong><p className="font-mono text-[11px] text-gray-500">{row.bssId}</p></div> },
  { id:'refCode', header:'Ref Worker Code', value:row => row.refCode ?? '—', render:row => <span className="font-mono text-xs text-gray-600">{row.refCode ?? '—'}</span> },
  { id:'mobile', header:'Mobile', value:row => row.mobile },
  { id:'designation', header:'Designation', value:row => row.designation },
  { id:'department', header:'Department', value:row => row.department ?? '—' },
  { id:'site', header:'Site', value:row => row.site },
  { id:'employer', header:'Employer', value:row => row.employer },
  { id:'doj', header:'Joined', value:row => row.doj },
  { id:'status', header:'Status', value:row => row.status, render:row => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.status === 'Accepted' ? 'bg-green-50 text-green-700' : row.status === 'Pending' ? 'bg-amber-50 text-amber-700' : row.status === 'Expired' ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-700'}`}>{row.status}</span> },
];

type RowDraft = { bssId:string; site:string };
const emptyRow = (): RowDraft => ({ bssId:'', site:'' });

export default function WorkerMasterPage() {
  const { contractor, mutate, scoped } = useContractor();
  const [modal, setModal] = useState<'single' | 'bulk' | null>(null);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openMenuFor, setOpenMenuFor] = useState('');
  const [profileView, setProfileView] = useState<ContractorWorker | null>(null);
  const [docsView, setDocsView] = useState<ContractorWorker | null>(null);
  const [idView, setIdView] = useState<ContractorWorker | null>(null);
  const [docsView2, setDocsView2] = useState<ContractorWorker | null>(null);
  const docCtx = useContractorDocView();
  const scopedRows = scoped(contractor.workers, w => w.employer);

  const active = scopedRows.filter(w => w.status === 'Accepted').length;
  const pending = scopedRows.filter(w => w.status === 'Pending').length;
  const inactive = scopedRows.filter(w => w.status === 'Rejected' || w.status === 'Cancelled' || w.status === 'Expired').length;

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
    try {
      const payload = valid.map(row => ({ bssId: row.bssId.trim().toUpperCase(), site: row.site }));
      await mutate<{ data: number[] }>('workers', 'POST', { bulk: payload });
      setNotice(`Binding requests sent for ${valid.length} worker${valid.length === 1 ? '' : 's'} — each worker must accept before their profile unlocks.`); setRows([]); setModal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Bulk binding could not be completed.'); }
    finally { setBusy(false); }
  }

  function addRow() { setRows(current => [...current, emptyRow()]); }
  function updateRow(index: number, key: keyof RowDraft, value: string) { setRows(current => current.map((row, i) => i === index ? { ...row, [key]: value } : row)); }
  function removeRow(index: number) { setRows(current => current.filter((_, i) => i !== index)); }

  function importCsv(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const lines = text.split(/\r?\n/).filter(line => line.trim()).slice(0, 500);
      const parsed = lines.map(line => {
        const [bssId, site] = parseCsv(line);
        return { bssId: bssId?.trim() ?? '', site: site?.trim() ?? '' };
      }).filter(r => r.bssId);
      setRows(current => [...current, ...parsed]); setError('');
      if (!parsed.length) setError('No valid rows. Expected: BSS ID, Site.');
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const escape = (v: unknown) => String(v ?? '');
    const rows2 = [['BSS ID', 'Site']];
    const html = `<html><head><meta charset="UTF-8"></head><body><table>${rows2.map(r => `<tr>${r.map(c => `<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
    const file = new File([html], 'worker-binding-template.xls', { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const workerDocs = (worker: ContractorWorker) => contractor.workerDocuments.filter(d => d.workerId === worker.bssId);

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Master data</p><h1 className="text-2xl font-bold mt-1">Worker Master</h1><p className="text-sm text-gray-500 mt-1">Bind existing workers to a site by BSS ID. A site already belongs to one principal employer, so the employer is taken from the site.</p></div>
      <div className="flex gap-2">
        <button onClick={() => { setModal('bulk'); setRows([emptyRow()]); setError(''); }} className="h-10 px-4 border border-gray-200 rounded-lg text-sm font-semibold flex gap-2 items-center bg-white"><Upload size={16}/>Bulk bind</button>
        <button onClick={() => { setModal('single'); setError(''); }} className="h-10 px-4 rounded-lg bg-gray-950 text-white text-sm font-semibold flex items-center gap-2"><UserRound size={16}/>Bind worker</button>
      </div>
    </header>

    <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs">Showing workers across all bound principal employers.</div>
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Total Workers</span><span className="bss-kpi-icon bg-blue-50 text-blue-700"><UserRound size={16}/></span></div><strong>{scopedRows.length}</strong><p>All bindings</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Active</span><span className="bss-kpi-icon bg-green-50 text-green-700"><CheckCircle2 size={16}/></span></div><strong>{active}</strong><p>Accepted</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Pending</span><span className="bss-kpi-icon bg-amber-50 text-amber-700"><BadgeCheck size={16}/></span></div><strong>{pending}</strong><p>Awaiting acceptance</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Inactive</span><span className="bss-kpi-icon bg-gray-100 text-gray-500"><X size={16}/></span></div><strong>{inactive}</strong><p>Rejected / cancelled</p></article>
    </section>

    <EnterpriseDataTable
      title="Workforce directory"
      rows={scopedRows}
      columns={[...columns, { id:'actions', header:'Actions', filterable:false, value:row => row.id, render:row => <ActionMenu open={openMenuFor === row.id} onToggle={() => setOpenMenuFor(openMenuFor === row.id ? '' : row.id)} onViewProfile={() => { setProfileView(row); setOpenMenuFor(''); }} onViewDocs={() => { setDocsView(row); setOpenMenuFor(''); }} onIdCard={() => { setIdView(row); setOpenMenuFor(''); }} onDocs={() => { setDocsView2(row); setOpenMenuFor(''); }} /> }]}
      rowKey={row => row.id}
      filename="contractor-workers"
    />

    {/* Single bind modal (BSS ID based) */}
    {modal === 'single' && <div className="fixed inset-0 z-50 bg-black/50 p-4 grid place-items-center" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="add-worker-title" className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
      <header className="p-5 border-b flex justify-between"><div><h2 id="add-worker-title" className="font-semibold">Bind an existing BSS worker</h2><p className="text-xs text-gray-500 mt-0.5">Enter the worker&apos;s BSS ID — the worker must accept before the profile unlocks. Workers register themselves; you cannot create one here.</p></div><button onClick={() => setModal(null)} aria-label="Close"><X/></button></header>
      <form onSubmit={submitSingle} className="p-5 grid sm:grid-cols-2 gap-4">
        <Field name="bssId" label="BSS ID" pattern="(?:BSS-W[A-Za-z0-9]{10}|BSS\d{12})" placeholder="BSS-W7KQ2M9X4RT"/>
        <label className="text-xs font-semibold text-gray-700">Site<select required name="site" className="mt-1 w-full h-10 border rounded-lg px-3 text-sm bg-white"><option value="">Select site</option>{contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name} — {s.employer}</option>)}</select></label>
        {error && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{error}</p>}
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">{busy ? 'Saving…' : 'Bind worker'}</button></div>
      </form>
    </section></div>}

    {/* Bulk bind modal */}
    {modal === 'bulk' && <div className="fixed inset-0 z-[80] bg-black/50 p-4 grid place-items-center"><section role="dialog" aria-modal="true" className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex justify-between items-center"><div><h2 className="font-semibold text-sm">Bulk bind workers</h2><p className="text-xs text-gray-500 mt-1">Download the template, import a CSV (BSS ID, Site) or add rows. Workers must already exist in BSS — you can only propose a binding by BSS ID.</p></div><button onClick={() => setModal(null)} aria-label="Close"><X/></button></header>
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadTemplate} className="text-xs font-semibold text-gray-700 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2"><Download size={14}/>Download template</button>
          <label className="text-xs font-semibold text-gray-600 flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer">Import CSV <input type="file" accept=".csv" className="hidden" onChange={e => importCsv(e.target.files?.[0])}/></label>
          <button type="button" onClick={addRow} className="h-9 px-3 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1"><Plus size={14}/>Add row</button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <form onSubmit={submitBulk} className="space-y-3">
          <div className="overflow-x-auto"><div className="grid grid-cols-[minmax(200px,1fr)_minmax(220px,1fr)_30px] gap-2 text-[11px] uppercase text-gray-500 font-bold px-1">{['BSS ID','Site',''].map((label, i) => <span key={i}>{label}</span>)}</div>
            {rows.map((row, index) => <div key={index} className="grid grid-cols-[minmax(200px,1fr)_minmax(220px,1fr)_30px] gap-2 items-center mt-2">
              <input value={row.bssId} onChange={e => updateRow(index, 'bssId', e.target.value)} placeholder="BSS-W7KQ2M9X4RT" className="h-9 border border-gray-200 rounded-lg px-2 text-xs font-mono"/>
              <select value={row.site} onChange={e => updateRow(index, 'site', e.target.value)} className="h-9 border border-gray-200 rounded-lg px-2 text-xs bg-white"><option value="">Site</option>{contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name} — {s.employer}</option>)}</select>
              <button type="button" onClick={() => removeRow(index)} className="w-8 h-9 grid place-items-center text-gray-400 hover:text-red-600" aria-label="Remove row"><Trash2 size={15}/></button>
            </div>)}
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">{busy ? 'Binding…' : `Bind ${rows.length} worker${rows.length === 1 ? '' : 's'}`}</button></div>
        </form>
      </div>
    </section></div>}

    {/* Worker profile drawer */}
    {profileView && <div className="fixed inset-0 z-[90] bg-black/50 flex justify-end" role="presentation"><section role="dialog" aria-modal="true" aria-label="Worker profile" className="bg-white w-full max-w-md h-full overflow-y-auto animate-in slide-in-from-right-4 duration-200">
      <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {profileView.photoUrl && profileView.photoUrl !== '/worker-profile.png' ? (
            <img src={profileView.photoUrl} alt={profileView.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center border border-gray-200">
              <UserRound size={24} />
            </div>
          )}
          <div><h2 className="font-semibold text-gray-950">{profileView.name}</h2><p className="text-xs text-gray-500 font-mono mt-0.5">{profileView.bssId}</p></div>
        </div>
        <button onClick={() => setProfileView(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
      </header>
      <div className="p-5 space-y-4 text-xs">
        <div className="flex flex-wrap gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profileView.status === 'Accepted' ? 'bg-green-50 text-green-700' : profileView.status === 'Pending' ? 'bg-amber-50 text-amber-700' : profileView.status === 'Expired' ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-700'}`}>{profileView.status}</span></div>
        <dl className="grid grid-cols-2 gap-3">
          <Info label="Ref Worker Code" value={profileView.refCode ?? '—'}/>
          <Info label="Designation" value={profileView.designation}/>
          <Info label="Department" value={profileView.department ?? '—'}/>
          <Info label="Category" value={profileView.category ?? '—'}/>
          <Info label="Gender / Age" value={`${profileView.gender ?? '—'} / ${profileView.age ?? '—'}`}/>
          <Info label="Mobile" value={profileView.mobile}/>
          <Info label="Site" value={profileView.site}/>
          <Info label="Employer" value={profileView.employer}/>
          <Info label="Date of Joining" value={profileView.doj}/>
        </dl>
        {profileView.skills && profileView.skills.length > 0 && <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Skills</p><div className="flex flex-wrap gap-1.5">{profileView.skills.map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">{s}</span>)}</div></div>}
        <p className="text-[11px] text-gray-400">Full worker profile is available after the worker accepts the binding request. Compliance documents and identity card are accessible from the actions menu.</p>
      </div>
    </section></div>}

    {/* Compliance documents drawer */}
    {docsView && <div className="fixed inset-0 z-[95] bg-black/50 flex justify-end" role="presentation"><section role="dialog" aria-modal="true" aria-label="Worker compliance documents" className="bg-white w-full max-w-md h-full overflow-y-auto animate-in slide-in-from-right-4 duration-200">
      <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Compliance Documents</p><h2 className="font-semibold text-gray-950 mt-0.5">{docsView.name}</h2><p className="text-xs text-gray-500 font-mono mt-0.5">{docsView.bssId}</p></div><button onClick={() => setDocsView(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button></header>
      <div className="p-5 space-y-2.5">{workerDocs(docsView).length ? workerDocs(docsView).map(doc => (
        <div key={doc.id} className="rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3"><span className="flex-1 min-w-0"><strong className="block text-xs text-gray-900">{doc.document}</strong><span className="block text-[10px] font-mono text-gray-400 mt-0.5">{doc.reference}</span></span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${doc.status === 'Verified' ? 'bg-green-50 text-green-700' : doc.status === 'Missing' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-700'}`}>{doc.status}</span></div>
      )) : <p className="text-xs text-gray-400 text-center py-8 rounded-xl border border-dashed border-gray-200">No compliance documents recorded for this worker.</p>}
      <div className="mt-4 flex gap-2"><button className="flex-1 h-9 rounded-lg border border-gray-200 text-xs font-semibold flex items-center justify-center gap-1.5"><Download size={13}/>Download all</button></div></div>
    </section></div>}

    {/* Identity card drawer — worker-level identity card from the actions menu */}
    {idView && <WorkerIdentityCardDrawer worker={idView} onClose={() => setIdView(null)}/>}
  {docsView2 && (() => { const row = docsView2; const like: WorkerLike = { id: row.id, name: row.name, bssId: row.bssId, mobile: row.mobile, site: row.site, siteId: row.site, employer: row.employer, designation: row.designation, department: row.department, doj: row.doj, category: row.category, gender: row.gender, age: row.age, photoUrl: row.photoUrl, status: row.status, skills: row.skills, refCode: row.refCode }; return <WorkerDocumentsDrawer owner={docCtx.owner} view={docCtx.view} worker={like} onClose={() => setDocsView2(null)} />; })()}
  </div>;
}

function WorkerIdentityCardDrawer({ worker, onClose }: { worker: ContractorWorker; onClose: () => void }) {
  const issued = new Date();
  const validTill = new Date();
  validTill.setFullYear(validTill.getFullYear() + 1);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });
  return <div className="fixed inset-0 z-[96] bg-black/50 flex justify-end" role="presentation">
    <section role="dialog" aria-modal="true" aria-label="Worker identity card" className="bg-white w-full max-w-md h-full overflow-y-auto animate-in slide-in-from-right-4 duration-200">
      <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Identity Card</p><h2 className="font-semibold text-gray-950 mt-0.5">{worker.name}</h2><p className="text-xs text-gray-500 font-mono mt-0.5">{worker.bssId}</p></div>
        <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
      </header>
      <div className="p-5 space-y-5">
        {/* Card preview — same navy identity-card language as the worker portal */}
        <div className="relative overflow-hidden rounded-xl bg-[#0A192F] text-white shadow-xl border border-slate-400" style={{ aspectRatio: '85.6 / 53.98' }}>
          <div aria-hidden="true" className="absolute left-0 inset-y-0 z-20 w-[3px] flex flex-col"><span className="flex-1 bg-[#FF9933]"/><span className="flex-1 bg-white"/><span className="flex-1 bg-[#138808]"/></div>
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/[0.07] via-transparent to-black/15"/>
          <div className="relative z-10 h-full px-4 py-3 flex items-stretch gap-3">
            <div className="w-[76px] h-[92px] bg-slate-100 rounded-md overflow-hidden border border-slate-300 flex-shrink-0 self-center flex items-center justify-center">
              {worker.photoUrl && worker.photoUrl !== '/worker-profile.png' ? (
                <img src={worker.photoUrl} alt={worker.name} className="w-full h-full object-cover" />
              ) : (
                <UserRound size={36} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-[6px] text-slate-300 uppercase tracking-[0.17em] font-bold">Worker Name</p>
              <p className="text-[14px] font-extrabold uppercase tracking-[0.02em] leading-tight truncate">{worker.name}</p>
              <p className="text-[6px] text-slate-300 uppercase tracking-[0.17em] font-bold mt-2">BSS ID</p>
              <p className="text-[9px] font-mono font-bold tracking-[0.08em]">{worker.bssId}</p>
              <div className="flex gap-5 mt-2">
                <div><p className="text-[5.5px] text-slate-300 uppercase tracking-[0.15em] font-bold">Designation</p><p className="text-[8px] font-semibold truncate max-w-28">{worker.designation}</p></div>
                <div><p className="text-[5.5px] text-slate-300 uppercase tracking-[0.15em] font-bold">Site</p><p className="text-[8px] font-semibold truncate max-w-28">{worker.site}</p></div>
              </div>
            </div>
            <div className="w-[48px] flex-shrink-0 flex flex-col items-center justify-center gap-1">
              <div className="relative bg-white p-1 rounded-[4px]"><WorkerQr bssId={worker.bssId}/><span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[13px] h-[13px] bg-white rounded-[2px] grid place-items-center"><img src="/bss-original-logo.png" alt="" className="w-[10px] h-[10px] object-contain"/></span></span></div>
              <p className="text-[4.5px] text-slate-300 uppercase font-bold tracking-[0.1em]">Scan to Verify</p>
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 z-10 h-[26px] px-4 flex items-center justify-between border-t border-white/[0.08] bg-black/[0.08]">
            <p className="text-[5.5px] text-slate-300 uppercase tracking-[0.14em] font-bold">Issue {fmt(issued)}</p>
            <p className="text-[5.5px] text-slate-300 uppercase tracking-[0.14em] font-bold">Valid Till <span className="text-[#FFD9A8]">{fmt(validTill)}</span></p>
            <p className="text-[5.5px] text-slate-200 font-bold tracking-[0.1em] uppercase">BSS Card · National ID</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Worker record</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <Info label="Ref Worker Code" value={worker.refCode ?? '—'}/>
            <Info label="Department" value={worker.department ?? '—'}/>
            <Info label="Category" value={worker.category ?? '—'}/>
            <Info label="Mobile" value={worker.mobile}/>
            <Info label="Employer" value={worker.employer}/>
            <Info label="Date of Joining" value={worker.doj}/>
          </dl>
        </div>
        <p className="text-[11px] text-gray-400 leading-5">The print-ready identity card is managed in the worker&apos;s own portal (QR carries the signed BSS credential payload). Issue/validity dates shown here are indicative for the current employment binding.</p>
      </div>
    </section>
  </div>;
}

function ActionMenu({ open, onToggle, onViewProfile, onViewDocs, onIdCard, onDocs }: { open: boolean; onToggle: () => void; onViewProfile: () => void; onViewDocs: () => void; onIdCard: () => void; onDocs?: () => void }) {
  return <div className="relative">
    <button onClick={onToggle} aria-label="Worker actions" aria-expanded={open} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-100 text-gray-400"><MoreVertical size={16}/></button>
    {open && <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-52 bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-900/5 p-1.5">
      <button role="menuitem" onClick={onViewProfile} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg hover:bg-gray-50 text-left"><UserRound size={14} className="text-gray-400"/>View Profile</button>
      <button role="menuitem" onClick={onIdCard} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg hover:bg-gray-50 text-left"><IdCard size={14} className="text-gray-400"/>Identity Card</button>
      <button role="menuitem" onClick={onViewDocs} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg hover:bg-gray-50 text-left"><FileText size={14} className="text-gray-400"/>Compliance Documents</button>
      <button role="menuitem" onClick={onDocs} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg hover:bg-gray-50 text-left"><FileText size={14} className="text-[#073B67]"/>Documents — Generate / Issue</button>
    </div>}
  </div>;
}

function parseCsv(line: string): string[] { const out: string[] = []; let cur = '', inQuotes = false; for (const char of line) { if (char === '"') { inQuotes = !inQuotes; continue; } if (char === ',' && !inQuotes) { out.push(cur); cur = ''; continue; } cur += char; } out.push(cur); return out; }
function Field({ name, label, pattern, placeholder }: { name:string; label:string; pattern?:string; placeholder?:string }) { return <label className="text-xs font-semibold text-gray-700">{label}<input required name={name} pattern={pattern} placeholder={placeholder} className="mt-1 w-full h-10 border rounded-lg px-3 text-sm"/></label>; }
function Info({ label, value }: { label:string; value:string }) { return <div className="rounded-lg border border-gray-100 p-2.5"><dt className="text-gray-400 text-[10px]">{label}</dt><dd className="font-semibold text-gray-800 mt-0.5">{value}</dd></div>; }
