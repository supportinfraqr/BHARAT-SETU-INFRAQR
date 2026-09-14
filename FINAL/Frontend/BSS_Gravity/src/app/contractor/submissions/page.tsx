"use client";

import { useMemo, useState } from 'react';
import { Award, CalendarDays, CheckCircle2, FileCheck2, FileUp, Plus, ShieldCheck, Upload, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorPortalData } from '@/types/portal';
import { INDIA_STATES } from '@/data/indiaStates';

type DocumentRow = ContractorPortalData['submissions']['documents'][number] & { fileName?: string; checksum?: string };
type Tab = 'submissions' | 'create' | 'audit';

const documentTypes = ['PF Challan', 'ESIC Return', 'Wage Register', 'Attendance Register', 'Safety Audit', 'Medical & Insurance'] as const;
const STATES = INDIA_STATES;
const FYS = ['FY 2026-27', 'FY 2025-26'];
const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October'];

// Admin document master + client mapping (CSV rows 256-259): documents are configured per employer mapping
const documentMaster = [
  { name:'Form XII — Register of Contract Workers', type:'Register', frequency:'Monthly', mandatory:true, format:'PDF' },
  { name:'Form XVI — Muster Roll', type:'Register', frequency:'Monthly', mandatory:true, format:'PDF' },
  { name:'Form XVII — Wages Register', type:'Register', frequency:'Monthly-Annual', mandatory:true, format:'PDF' },
  { name:'PF Challan — Form V', type:'Challan', frequency:'Monthly', mandatory:true, format:'PDF' },
  { name:'ESIC Contribution Challan', type:'Challan', frequency:'Monthly', mandatory:true, format:'PDF' },
  { name:'Register of Fines', type:'Register', frequency:'Monthly', mandatory:false, format:'PDF' },
];

type UploadRow = { file: File; id?: number; accuracy: number; status: 'Validating' | 'Validated' | 'Errors found'; findings?: string[] };

export default function ComplianceSubmissionPage() {
  const { contractor, replaceContractor, employerScope, scoped } = useContractor();
  const [tab, setTab] = useState<Tab>('submissions');
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedEmployer, setSelectedEmployer] = useState(employerScope === 'all' ? '' : employerScope);
  const [file, setFile] = useState<File | null>(null);

  // Create-compliance wizard state
  const [createOpen, setCreateOpen] = useState(false);
  const [client, setClient] = useState('');
  const [state, setState] = useState(STATES[0]);
  const [fy, setFy] = useState(FYS[0]);
  const [month, setMonth] = useState(MONTHS[6]);
  const [site, setSite] = useState('');
  const [location, setLocation] = useState('');
  const [uploads, setUploads] = useState<Record<string, UploadRow>>({});

  const documents = scoped(contractor.submissions.documents as DocumentRow[], row => row.employer);
  const availableSites = useMemo(() => contractor.sites.filter(s => !selectedEmployer || s.employer === selectedEmployer), [contractor.sites, selectedEmployer]);
  const verified = documents.filter(row => row.status === 'Verified').length;
  const pending = documents.filter(row => row.status !== 'Verified' && row.status !== 'Returned').length;

  const audit = contractor.auditReports[0];
  const clientSites = useMemo(() => contractor.sites.filter(s => !client || s.employer === client), [contractor.sites, client]);

  function chooseFile(next?: File) {
    setError('');
    if (!next) return setFile(null);
    if (next.size > 10 * 1024 * 1024) { setFile(null); return setError('Document must be 10 MB or smaller.'); }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(next.type)) { setFile(null); return setError('Choose a PDF, JPEG or PNG document.'); }
    setFile(next);
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setError('Choose a document to upload.');
    setBusy(true); setError(''); setNotice('');
    const form = new FormData(event.currentTarget);
    form.set('file', file);
    try {
      const response = await fetch('/api/portal/uploads', { method: 'POST', body: form });
      const result = await response.json().catch(() => ({})) as { data?: DocumentRow; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Document could not be uploaded.');
      replaceContractor({ ...contractor, submissions: { ...contractor.submissions, documents: [result.data, ...contractor.submissions.documents] } });
      setNotice(`${result.data.type} uploaded for verification. Reference ${result.data.id}.`);
      setFile(null); setModal(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Document could not be uploaded.'); }
    finally { setBusy(false); }
  }

  async function chooseDocDocument(name: string, next?: File) {
    if (!next) return;
    setError('');
    const acceptable = ['application/pdf', 'image/jpeg', 'image/png'].includes(next.type) && next.size <= 10 * 1024 * 1024;
    if (!acceptable) {
      setUploads(current => ({ ...current, [name]: { file: next, accuracy: 0, status: 'Errors found', findings: ['Choose a PDF, JPEG or PNG document up to 10 MB.'] } }));
      return;
    }
    setUploads(current => ({ ...current, [name]: { file: next, accuracy: 0, status: 'Validating' } }));
    const form = new FormData();
    form.set('file', next); form.set('type', name);
    form.set('site', site); form.set('employer', client);
    form.set('period', `${month} ${fy.replace('FY ', '')}`);
    try {
      const response = await fetch('/api/portal/uploads', { method: 'POST', body: form });
      const result = await response.json().catch(() => ({})) as { data?: { id: number; accuracy: number | null; validated: boolean; findings: string[] }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Document could not be validated.');
      const data = result.data;
      setUploads(current => ({ ...current, [name]: { file: next, id: data.id, accuracy: data.accuracy ?? 0, status: data.validated ? 'Validated' : 'Errors found', findings: data.findings } }));
    } catch (reason) {
      setUploads(current => ({ ...current, [name]: { file: next, accuracy: 0, status: 'Errors found', findings: [reason instanceof Error ? reason.message : 'Document could not be validated.'] } }));
    }
  }

  const mandatoryDone = documentMaster.filter(d => d.mandatory).every(d => uploads[d.name] && uploads[d.name].status === 'Validated' && uploads[d.name].id);

  async function finalSubmit() {
    if (!mandatoryDone) { setError('All mandatory documents must be uploaded and validated (100% accuracy) before final submission.'); return; }
    if (!client || !site) { setError('Select a client and site before final submission.'); return; }
    setBusy(true); setError(''); setNotice('');
    const uploadIds = documentMaster.map(d => uploads[d.name]?.id).filter((id): id is number => typeof id === 'number');
    try {
      const response = await fetch('/api/portal/compliances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'submit', employer: client, site, period: `${month} ${fy.replace('FY ', '')}`, financialYear: fy, state, uploadIds }),
      });
      const result = await response.json().catch(() => ({})) as { data?: ContractorPortalData['auditReports'][number]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Compliance could not be submitted.');
      replaceContractor({ ...contractor, auditReports: [result.data, ...contractor.auditReports] });
      setCreateOpen(false); setUploads({}); setClient(''); setSite(''); setLocation('');
      setNotice(`Compliance submitted. Audit report ${result.data.uniqueNo} generated — score ${result.data.scorePercent}%.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Compliance could not be submitted.');
    } finally { setBusy(false); }
  }

  const documentColumns: DataColumn<DocumentRow>[] = [
    { id:'type', header: 'Document', value: row => row.type, render: row => <div><strong className="text-gray-900">{row.type}</strong>{row.fileName && <p className="text-[10px] text-gray-400 mt-0.5">{row.fileName}</p>}{row.id && <a href={`/api/portal/uploads/${row.id}`} target="_blank" rel="noreferrer" className="block text-[10px] text-blue-600 hover:underline mt-0.5">View evidence</a>}</div> },
    { id:'uniqueNo', header: 'Unique No.', value: row => row.uniqueNo ?? '—', render: row => row.uniqueNo ? <span className="font-mono text-blue-700 font-semibold">{row.uniqueNo}</span> : <span className="text-gray-300">—</span> },
    { id:'employer', header: 'Client / Employer', value: row => row.employer },
    { id:'site', header: 'Site', value: row => row.site },
    { id:'period', header: 'Period / FY', value: row => `${row.period}${row.financialYear ? ` · ${row.financialYear}` : ''}` },
    { id:'created', header: 'Created', value: row => row.submittedAt, render: row => new Date(row.submittedAt).toLocaleDateString('en-IN') },
    { id:'updated', header: 'Updated', value: row => row.updatedAt ?? row.submittedAt, render: row => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('en-IN') : '—') },
    { id:'daysLeft', header: 'Days Left', value: row => row.daysLeft ?? '—', render: row => row.daysLeft != null ? <span className={row.daysLeft <= 3 ? 'text-red-600 font-bold' : 'text-gray-700'}>{row.daysLeft}</span> : '—' },
    { id:'status', header: 'Status', value: row => row.status, render: row => <span className={row.status === 'Verified' ? 'text-green-700' : row.status === 'Returned' ? 'text-red-700' : 'text-orange-700'}>{row.status}</span> },
    { id:'submitted', header: 'Submitted', value: row => row.submittedAt, render: row => new Date(row.submittedAt).toLocaleString('en-IN') },
  ];

  return <div className="space-y-6 pb-12">
    <header className="bss-page-header flex-col sm:flex-row"><div><p className="bss-eyebrow">Contractor data exchange</p><h1 className="bss-page-title mt-1">Compliance Submission Centre</h1><p className="bss-page-description">Create client-scoped compliance packages, upload evidence with OCR-style accuracy validation, and generate the Compliance Audit Report.</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setCreateOpen(true); setError(''); setNotice(''); setUploads({}); }} className="bss-primary-action"><Plus size={16}/>Create Compliance Document</button>
        <button type="button" onClick={() => { setModal(true); setSelectedEmployer(employerScope === 'all' ? '' : employerScope); setFile(null); setError(''); }} className="bss-secondary-action"><Upload size={16}/>Upload compliance data</button>
      </div>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && !modal && !createOpen && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      <Metric label="Submitted" value={documents.length} icon={FileUp} tone="bg-blue-50 text-blue-700"/>
      <Metric label="Verified" value={verified} icon={CheckCircle2} tone="bg-green-50 text-green-700"/>
      <Metric label="Pending review" value={pending} icon={FileCheck2} tone="bg-orange-50 text-orange-700"/>
      <Metric label="Employer scope" value={employerScope === 'all' ? contractor.employers.length : 1} icon={ShieldCheck} tone="bg-indigo-50 text-indigo-700"/>
    </section>

    <div className="flex border-b overflow-x-auto">
      {([['submissions', 'Submission Listing'], ['create', 'Create Compliance & Documents'], ['audit', 'Compliance Audit Report']] as Array<[Tab, string]>).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap ${tab === id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>)}
    </div>

    {tab === 'submissions' && <>
      <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs leading-5">Showing submissions for <strong>{employerScope === 'all' ? 'all bound principal employers' : employerScope}</strong>. Uploaded evidence is quarantined for verification and is not treated as approved compliance until an authorised reviewer accepts it. Unique No. and Days Left support deadline tracking.</div>
      <EnterpriseDataTable title="Submitted compliance documents" rows={documents} columns={documentColumns} rowKey={row => row.id} filename="compliance-documents"/>
    </>}

    {tab === 'create' && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Create Compliance Document</h2><p className="text-xs text-gray-400 mt-0.5">Client → State → Financial Year → Month → Site → Location, then upload documents from the client-mapped master. OCR-style validation records accuracy per document.</p></header>
      <div className="p-5 grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-3">
          <label className="text-xs font-semibold">Client (Principal Employer)<select value={client} onChange={e => { setClient(e.target.value); setSite(''); }} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white"><option value="">Select client</option>{contractor.employers.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}</select></label>
          <label className="text-xs font-semibold">State<select value={state} onChange={e => setState(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{STATES.map(s => <option key={s}>{s}</option>)}</select></label>
          <label className="text-xs font-semibold">Financial Year<select value={fy} onChange={e => setFy(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{FYS.map(f => <option key={f}>{f}</option>)}</select></label>
          <label className="text-xs font-semibold">Month<select value={month} onChange={e => setMonth(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{MONTHS.map(m => <option key={m}>{m}</option>)}</select></label>
          <label className="text-xs font-semibold">Site<select value={site} onChange={e => setSite(e.target.value)} disabled={!client} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white"><option value="">Select site</option>{clientSites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></label>
          <label className="text-xs font-semibold">Location<input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Block 3 Labour Camp" className="mt-1 w-full h-10 border rounded-lg px-3 text-sm"/></label>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Client-mapped documents (Admin Document Master · dynamic list)</p>
          <div className="space-y-2.5">
            {documentMaster.map(doc => {
              const up = uploads[doc.name];
              return <div key={doc.name} className="rounded-xl border border-gray-100 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="flex-1 min-w-0"><strong className="block text-xs text-gray-900">{doc.name}</strong><span className="block text-[10px] text-gray-400 mt-0.5">{doc.type} · {doc.frequency} · {doc.format} {doc.mandatory && <span className="text-red-600 font-bold"> · Mandatory</span>}</span></span>
                {up ? <span title={up.findings?.join(' ')} className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${up.status === 'Validated' ? 'bg-green-50 text-green-700' : up.status === 'Validating' ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-700'}`}>{up.status === 'Validated' ? '100% Accuracy' : up.status === 'Validating' ? 'Validating…' : `${up.accuracy}% · Errors found`}</span> : <span className="text-[10px] text-gray-300 flex-shrink-0">Not uploaded</span>}
                <label className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 flex-shrink-0"><Upload size={12}/>Upload<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => chooseDocDocument(doc.name, e.target.files?.[0])}/></label>
                {up && <button onClick={() => setUploads(current => { const next = { ...current }; delete next[doc.name]; return next; })} className="text-[10px] text-red-600 flex-shrink-0">Remove</button>}
              </div>;
            })}
          </div>
          {error && tab === 'create' && <p role="alert" className="bss-alert bss-alert-error mt-3">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3 justify-between">
            <p className={`text-xs flex items-center gap-1.5 ${mandatoryDone ? 'text-green-700' : 'text-orange-700'}`}><FileCheck2 size={14}/>{mandatoryDone ? 'All mandatory documents validated — final submit enabled.' : 'Mandatory documents completion check is in progress.'}</p>
            <button onClick={finalSubmit} disabled={busy} className="h-10 px-5 rounded-lg bg-[#073B67] text-white text-sm font-bold flex items-center gap-2 hover:bg-[#062D4F] disabled:opacity-50">{busy ? 'Submitting…' : 'Final Submit'}</button>
          </div>
        </div>
      </div>
    </section>}

    {tab === 'audit' && audit && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3">
        <div><h2 className="text-sm font-semibold text-gray-950">Compliance Audit Report · {audit.uniqueNo}</h2><p className="text-xs text-gray-400 mt-0.5">{audit.site} · {audit.employer} · Period {audit.period} · Report date {audit.reportDate}</p></div>
        <div className="flex items-center gap-4">
          <div className="text-center"><p className="text-2xl font-bold text-blue-700">{audit.scorePercent}%</p><p className="text-[10px] uppercase tracking-wider text-gray-400">Compliance Score</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-gray-900">{audit.score}</p><p className="text-[10px] uppercase tracking-wider text-gray-400">Score Obtained</p></div>
        </div>
      </header>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100"><tr><th className="px-5 py-3">Act</th><th className="px-5 py-3">Forms / Description</th><th className="px-5 py-3">Nature of Compliance</th><th className="px-5 py-3">Score</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Auditor Remarks</th><th className="px-5 py-3">Vendor Remarks</th></tr></thead>
        <tbody className="divide-y divide-gray-100">{audit.actWise.map((item, i) => <tr key={i} className="hover:bg-gray-50"><td className="px-5 py-3 font-semibold text-gray-900">{item.act}</td><td className="px-5 py-3 text-gray-600">{item.form}</td><td className="px-5 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{item.nature}</span></td><td className="px-5 py-3 font-semibold">{item.score}</td><td className="px-5 py-3"><span className={item.status === 'Compliant' ? 'text-green-700' : 'text-orange-700'}>{item.status}</span></td><td className="px-5 py-3 text-gray-500">{item.auditorRemarks}</td><td className="px-5 py-3 text-gray-500">{item.vendorRemarks || '—'}</td></tr>)}</tbody></table></div>
      <footer className="px-5 py-4 border-t border-gray-100 text-xs text-gray-500 flex flex-wrap gap-4 items-center"><span className="inline-flex items-center gap-1.5"><Award size={14} className="text-blue-700"/>Compliance Score Achieved is computed per item by the authorised reviewer.</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={14}/>Date of audit report: {audit.reportDate}</span></footer>
    </section>}

    {/* Single upload modal (existing behaviour preserved) */}
    {modal && <div className="fixed inset-0 z-[80] bg-black/50 grid place-items-center p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setModal(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="upload-title" className="w-full max-w-xl bg-white rounded-2xl shadow-xl">
        <header className="p-5 border-b border-gray-100 flex justify-between items-start gap-3"><div><h2 id="upload-title" className="font-semibold text-gray-950">Upload compliance data</h2><p className="text-xs text-gray-500 mt-1">PDF, JPEG or PNG · maximum 10 MB</p></div><button type="button" onClick={() => setModal(false)} disabled={busy} className="w-11 h-11 -mr-2 -mt-2 grid place-items-center rounded-lg hover:bg-gray-50" aria-label="Close"><X/></button></header>
        <form onSubmit={upload} className="p-5 grid sm:grid-cols-2 gap-4">
          <label className="text-xs font-semibold text-gray-700">Employer<select required name="employer" value={selectedEmployer} onChange={event => setSelectedEmployer(event.target.value)} className="bss-select mt-1"><option value="">Select employer</option>{contractor.employers.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-gray-700">Site<select required name="site" className="bss-select mt-1" disabled={!selectedEmployer}><option value="">Select site</option>{availableSites.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-gray-700">Document type<select required name="type" className="bss-select mt-1"><option value="">Select document</option>{documentTypes.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="text-xs font-semibold text-gray-700">Compliance period<input required name="period" type="month" max={new Date().toISOString().slice(0, 7)} className="bss-input mt-1"/></label>
          <label onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }} className="sm:col-span-2 min-h-36 border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40"><FileUp size={28} className="text-blue-700"/><strong className="text-sm text-gray-800 mt-2">{file ? file.name : 'Choose or drop evidence here'}</strong><span className="text-xs text-gray-500 mt-1">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ready to upload` : 'File contents are checked against the declared format'}</span><input name="file-picker" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" className="sr-only" onChange={event => chooseFile(event.target.files?.[0])}/></label>
          {error && <p role="alert" className="sm:col-span-2 bss-alert bss-alert-error">{error}</p>}
          <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-2"><button type="button" onClick={() => setModal(false)} disabled={busy} className="bss-secondary-action">Cancel</button><button disabled={busy || !file} className="bss-primary-action"><Upload size={15}/>{busy ? 'Uploading securely…' : 'Submit for verification'}</button></div>
        </form>
      </section>
    </div>}
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof FileUp; tone:string }) {
  return <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{label}</span><span className={`bss-kpi-icon ${tone}`}><Icon size={16}/></span></div><strong>{value}</strong></article>;
}
