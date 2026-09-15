"use client";

import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, FileCheck2, FileUp, Plus, ShieldCheck, Upload, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorPortalData } from '@/types/portal';
import { INDIA_STATES } from '@/data/indiaStates';

type DocumentRow = ContractorPortalData['submissions']['documents'][number] & { fileName?: string; checksum?: string };
type Tab = 'submissions' | 'create';

const documentTypes = [
  'Register',
  'Challan',
  'Return',
  'Wage & Payroll',
  'Attendance & Muster Roll',
  'Safety Audit',
  'Medical & Insurance',
  'CLRA Licence & Consent',
  'LWF & Tax Deposit',
] as const;
const STATES = INDIA_STATES;
const FYS = ['FY 2026-27', 'FY 2025-26'];
const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October'];

// Fallback if the Admin Document Master hasn't been seeded yet.
const FALLBACK_DOCUMENTS = [
  { name:'Form XII — Register of Contract Workers', type:'Register', frequency:'Monthly', mandatory:true, format:'PDF' },
  { name:'Form XVI — Muster Roll', type:'Register', frequency:'Monthly', mandatory:true, format:'PDF' },
  { name:'Form XVII — Wages Register', type:'Register', frequency:'Monthly-Annual', mandatory:true, format:'PDF' },
  { name:'Form XIX — Wage Slip', type:'Wage & Payroll', frequency:'Monthly', mandatory:true, format:'PDF' },
  { name:'PF Challan — Form V / ECR', type:'Challan', frequency:'Monthly', mandatory:true, format:'PDF' },
  { name:'ESIC Contribution Challan & Monthly Return', type:'Challan', frequency:'Monthly', mandatory:true, format:'PDF' },
  { name:'Labour Welfare Fund (LWF) Deposit Receipt', type:'LWF & Tax Deposit', frequency:'Half-Yearly', mandatory:true, format:'PDF' },
  { name:'Professional Tax (PT) Assessment & Challan', type:'LWF & Tax Deposit', frequency:'Monthly', mandatory:true, format:'PDF' },
  { name:'Register of Fines & Deductions (Form XXI / XXII)', type:'Register', frequency:'Monthly', mandatory:false, format:'PDF' },
  { name:'CLRA Contract Labour Licence (Form VI)', type:'CLRA Licence & Consent', frequency:'Annual', mandatory:true, format:'PDF' },
  { name:'Site Safety Audit & Inspection Certificate', type:'Safety Audit', frequency:'Quarterly', mandatory:false, format:'PDF' },
  { name:'BOCW Registration Certificate', type:'Registration Certificate', frequency:'Annual', mandatory:true, format:'PDF' },
  { name:'Workmen Injury Medical & Group Insurance Policy', type:'Medical & Insurance', frequency:'Annual', mandatory:true, format:'PDF' },
];

type UploadRow = { file: File; id?: number; accuracy: number; status: 'Validating' | 'Validated' | 'Errors found'; findings?: string[] };

export default function ComplianceSubmissionPage() {
  const { contractor, replaceContractor, employerScope, scoped } = useContractor();
  const [tab, setTab] = useState<Tab>('submissions');
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
  const [complianceType, setComplianceType] = useState<string>(documentTypes[0]);
  const [docNameInput, setDocNameInput] = useState('');
  const [uploads, setUploads] = useState<Record<string, UploadRow>>({});
  const [viewErrors, setViewErrors] = useState<{ name: string; findings: string[] } | null>(null);
  const [warnSubmit, setWarnSubmit] = useState(false);

  const [selectedYear, setSelectedYear] = useState<string>(FYS[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[6]);

  const documentMaster = (contractor.submissionDocuments?.length ? contractor.submissionDocuments : FALLBACK_DOCUMENTS);
  const documents = scoped(contractor.submissions.documents as DocumentRow[], row => row.employer);

  // Available Years
  const availableYears = useMemo(() => {
    const list: string[] = [];
    documents.forEach(doc => {
      const fyStr = doc.financialYear || (doc.period?.includes('FY') ? doc.period.slice(doc.period.indexOf('FY')) : '');
      const yr = fyStr || FYS[0];
      if (yr && !list.includes(yr)) list.push(yr);
    });
    FYS.forEach(f => { if (!list.includes(f)) list.push(f); });
    return list;
  }, [documents]);

  // Documents filtered by selected Year and Month
  const yearFilteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const fyStr = doc.financialYear || (doc.period?.includes('FY') ? doc.period.slice(doc.period.indexOf('FY')) : '');
      return (fyStr || FYS[0]) === selectedYear;
    });
  }, [documents, selectedYear]);

  const filteredDocuments = useMemo(() => {
    return yearFilteredDocuments.filter(doc => (doc.month || doc.period?.split(' ')[0]) === selectedMonth);
  }, [yearFilteredDocuments, selectedMonth]);

  const documentsByMonth = useMemo(() => {
    const map: Record<string, DocumentRow[]> = {};
    yearFilteredDocuments.forEach(doc => {
      const m = doc.month || doc.period?.split(' ')[0] || 'Unassigned';
      if (!map[m]) map[m] = [];
      map[m].push(doc);
    });
    return map;
  }, [yearFilteredDocuments]);

  const availableSites = useMemo(() => contractor.sites.filter(s => !selectedEmployer || s.employer === selectedEmployer), [contractor.sites, selectedEmployer]);
  const verified = documents.filter(row => row.status === 'Verified').length;
  const pending = documents.filter(row => row.status !== 'Verified' && row.status !== 'Returned').length;

  const clientSites = useMemo(() => contractor.sites.filter(s => !client || s.employer === client), [contractor.sites, client]);

  function chooseFile(next?: File) {
    setError('');
    if (!next) return setFile(null);
    if (next.size > 10 * 1024 * 1024) { setFile(null); return setError('Document must be 10 MB or smaller.'); }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(next.type)) { setFile(null); return setError('Choose a PDF, JPEG or PNG document.'); }
    setFile(next);
  }

  async function chooseDocDocument(doc: { name: string; type?: string; frequency?: string; mandatory?: boolean }, next?: File) {
    if (!next) return;
    const name = doc.name;
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
    form.set('state', state); form.set('financialYear', fy); form.set('month', month);
    form.set('location', location);
    form.set('documentType', doc.type ?? complianceType ?? ''); form.set('frequency', doc.frequency ?? '');
    form.set('mandatory', doc.mandatory ? 'true' : 'false');
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
  const mandatoryGaps = documentMaster.filter(d => d.mandatory && !(uploads[d.name] && uploads[d.name].status === 'Validated' && uploads[d.name].id));

  function finalSubmit() {
    if (!client || !site) { setError('Select a client and site before final submission.'); return; }
    if (!mandatoryDone) { setError(''); setWarnSubmit(true); return; }
    void performSubmit();
  }

  async function performSubmit() {
    setBusy(true); setError(''); setNotice('');
    const uploadIds = documentMaster.map(d => uploads[d.name]?.id).filter((id): id is number => typeof id === 'number');
    try {
      const response = await fetch('/api/portal/compliances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'submit', employer: client, site, period: `${month} ${fy.replace('FY ', '')}`, financialYear: fy, state, month, location, complianceType, docName: docNameInput, uploadIds }),
      });
      const result = await response.json().catch(() => ({})) as { data?: ContractorPortalData['auditReports'][number]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Compliance could not be submitted.');
      replaceContractor({ ...contractor, auditReports: [result.data, ...contractor.auditReports] });
      setCreateOpen(false); setUploads({}); setClient(''); setSite(''); setLocation(''); setDocNameInput(''); setWarnSubmit(false);
      setNotice(`Compliance submitted. Audit report ${result.data.uniqueNo} generated — score ${result.data.scorePercent}%.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Compliance could not be submitted.');
    } finally { setBusy(false); }
  }

  const documentColumns: DataColumn<DocumentRow>[] = [
    { id:'type', header: 'Document', value: row => row.type, render: row => <div><strong className="text-gray-900">{row.type}</strong>{row.fileName && <p className="text-[10px] text-gray-400 mt-0.5">{row.fileName}</p>}{row.source === 'evidence' && row.id && <a href={`/api/contractor/submissions/${row.id}/file`} target="_blank" rel="noreferrer" className="block text-[10px] text-blue-600 hover:underline mt-0.5">View evidence</a>}{row.findings && row.findings.length > 0 && <button type="button" onClick={() => setViewErrors({ name: row.type, findings: row.findings ?? [] })} className="block text-[10px] text-blue-700 font-semibold hover:underline mt-0.5">View errors ({row.findings.length})</button>}</div> },
    { id:'uniqueNo', header: 'Unique No.', value: row => row.uniqueNo ?? '—', render: row => row.uniqueNo ? <span className="font-mono text-blue-700 font-semibold">{row.uniqueNo}</span> : <span className="text-gray-300">—</span> },
    { id:'employer', header: 'Client / Employer', value: row => row.employer },
    { id:'state', header: 'State', value: row => row.state ?? '—', render: row => row.state || '—' },
    { id:'site', header: 'Site', value: row => row.site },
    { id:'month', header: 'Month', value: row => row.month ?? '—', render: row => row.month || '—' },
    { id:'location', header: 'Location', value: row => row.location ?? '—', render: row => row.location || '—' },
    { id:'period', header: 'Period / FY', value: row => `${row.period}${row.financialYear ? ` · ${row.financialYear}` : ''}` },
    { id:'accuracy', header: 'Accuracy', value: row => row.accuracy ?? '—', render: row => row.accuracy != null ? <span className={row.accuracy >= 100 ? 'text-green-700' : 'text-orange-700'}>{row.accuracy}%</span> : '—' },
    { id:'created', header: 'Created', value: row => row.submittedAt, render: row => new Date(row.submittedAt).toLocaleDateString('en-IN') },
    { id:'updated', header: 'Updated', value: row => row.updatedAt ?? row.submittedAt, render: row => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('en-IN') : '—') },
    { id:'daysLeft', header: 'Days Left', value: row => row.daysLeft ?? '—', render: row => row.daysLeft != null ? <span className={row.daysLeft <= 3 ? 'text-red-600 font-bold' : 'text-gray-700'}>{row.daysLeft}</span> : '—' },
    { id:'status', header: 'Status', value: row => row.status, render: row => <span className={row.status === 'Verified' ? 'text-green-700' : row.status === 'Returned' ? 'text-red-700' : 'text-orange-700'}>{row.status}</span> },
  ];

  return <div className="space-y-6 pb-12">
    <header className="bss-page-header flex-col sm:flex-row"><div><p className="bss-eyebrow">Contractor data exchange</p><h1 className="bss-page-title mt-1">Compliance Submission Centre</h1><p className="bss-page-description">Create client-scoped compliance packages, upload evidence with OCR-style accuracy validation, and generate the Compliance Audit Report.</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setTab('create'); setCreateOpen(true); setError(''); setNotice(''); setUploads({}); }} className="bss-primary-action"><Plus size={16}/>Create Compliance Document</button>
      </div>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && !createOpen && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      <Metric label="Submitted" value={documents.length} icon={FileUp} tone="bg-blue-50 text-blue-700"/>
      <Metric label="Verified" value={verified} icon={CheckCircle2} tone="bg-green-50 text-green-700"/>
      <Metric label="Pending review" value={pending} icon={FileCheck2} tone="bg-orange-50 text-orange-700"/>
      <Metric label="Employer scope" value={employerScope === 'all' ? contractor.employers.length : 1} icon={ShieldCheck} tone="bg-indigo-50 text-indigo-700"/>
    </section>

    <div className="flex border-b overflow-x-auto">
      {([['submissions', 'Submission Listing'], ['create', 'Create Compliance & Documents']] as Array<[Tab, string]>).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap ${tab === id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>)}
    </div>

    {tab === 'submissions' && <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs leading-5">Showing submissions for <strong>{employerScope === 'all' ? 'all bound principal employers' : employerScope}</strong>. Submissions are segregated by Financial Year and Month below.</div>

      {/* Financial Year Filter Tabs */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 space-y-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-shrink-0">Financial Year:</span>
          <div className="flex flex-wrap gap-1.5">
            {availableYears.map(yr => {
              const yrCount = documents.filter(doc => {
                const fyStr = doc.financialYear || (doc.period?.includes('FY') ? doc.period.slice(doc.period.indexOf('FY')) : '');
                return (fyStr || FYS[0]) === yr;
              }).length;
              return (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${selectedYear === yr ? 'bg-[#073B67] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {yr} <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${selectedYear === yr ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>{yrCount}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Month Filter Tabs */}
        <div className="flex items-center gap-3 pt-2.5 border-t border-gray-100 overflow-x-auto">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-shrink-0">Month:</span>
          <div className="flex items-center gap-1.5">
            {MONTHS.map(m => {
              const count = documentsByMonth[m]?.length || 0;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${selectedMonth === m ? 'bg-blue-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {m} <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedMonth === m ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Segregated Submission Table */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <header className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-[#073B67]" />
            <h3 className="text-sm font-bold text-[#062D4F]">{selectedMonth} Submissions ({selectedYear})</h3>
            <span className="text-xs text-gray-400 font-medium">({filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''})</span>
          </div>
        </header>
        <EnterpriseDataTable title={`${selectedMonth} Compliance Submissions (${selectedYear})`} rows={filteredDocuments} columns={documentColumns} rowKey={row => row.id} filename={`compliance-documents-${selectedMonth.toLowerCase()}-${selectedYear.toLowerCase().replace(/[^a-z0-9]/g, '')}`} />
      </section>
    </div>}

    {tab === 'create' && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Create Compliance Document</h2><p className="text-xs text-gray-400 mt-0.5">Client → State → Financial Year → Month → Site → Location, then upload documents from the client-mapped master. OCR-style validation records accuracy per document.</p></header>
      <div className="p-5 grid lg:grid-cols-[340px_1fr] gap-6">
        <div className="space-y-3">
          <label className="text-xs font-semibold">Client (Principal Employer)<select value={client} onChange={e => { setClient(e.target.value); setSite(''); }} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white"><option value="">Select client</option>{contractor.employers.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}</select></label>
          <label className="text-xs font-semibold">State<select value={state} onChange={e => setState(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{STATES.map(s => <option key={s}>{s}</option>)}</select></label>
          <label className="text-xs font-semibold">Financial Year<select value={fy} onChange={e => setFy(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{FYS.map(f => <option key={f}>{f}</option>)}</select></label>
          <label className="text-xs font-semibold">Month<select value={month} onChange={e => setMonth(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{MONTHS.map(m => <option key={m}>{m}</option>)}</select></label>
          <label className="text-xs font-semibold">Site<select value={site} onChange={e => setSite(e.target.value)} disabled={!client} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white"><option value="">Select site</option>{clientSites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></label>
          <label className="text-xs font-semibold">Location / Establishment<input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Block 3 Labour Camp" className="mt-1 w-full h-10 border rounded-lg px-3 text-sm"/></label>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Client-mapped statutory documents (Admin Document Master · dynamic list)</p>
          <div className="space-y-2.5">
            {documentMaster.map(doc => {
              const up = uploads[doc.name];
              return <div key={doc.name} className="rounded-xl border border-gray-100 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="flex-1 min-w-0"><strong className="block text-xs text-gray-900">{doc.name}</strong><span className="block text-[10px] text-gray-400 mt-0.5">{doc.type} · {doc.frequency} · {doc.format} {doc.mandatory && <span className="text-red-600 font-bold"> · Mandatory</span>}</span></span>
                {up ? <span title={up.findings?.join(' ')} className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${up.status === 'Validated' ? 'bg-green-50 text-green-700' : up.status === 'Validating' ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-700'}`}>{up.status === 'Validated' ? '100% Accuracy' : up.status === 'Validating' ? 'Validating…' : `${up.accuracy}% · Errors found`}</span> : <span className="text-[10px] text-gray-300 flex-shrink-0">Not uploaded</span>}
                <label className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 flex-shrink-0"><Upload size={12}/>Upload<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => chooseDocDocument(doc, e.target.files?.[0])}/></label>
                {up?.findings?.length ? <button type="button" onClick={() => setViewErrors({ name: doc.name, findings: up.findings ?? [] })} className="text-[10px] text-blue-700 font-semibold flex-shrink-0 hover:underline">View errors</button> : null}
                {up && <button onClick={() => setUploads(current => { const next = { ...current }; delete next[doc.name]; return next; })} className="text-[10px] text-red-600 flex-shrink-0">Remove</button>}
              </div>;
            })}
          </div>
          {error && tab === 'create' && <p role="alert" className="bss-alert bss-alert-error mt-3">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3 justify-between">
            <p className={`text-xs flex items-center gap-1.5 ${mandatoryDone ? 'text-green-700' : 'text-orange-700'}`}><FileCheck2 size={14}/>{mandatoryDone ? 'All mandatory documents validated — final submit enabled.' : 'Some mandatory documents are not fully validated — submission is allowed with a warning.'}</p>
            <button onClick={finalSubmit} disabled={busy} className="h-10 px-5 rounded-lg bg-[#073B67] text-white text-sm font-bold flex items-center gap-2 hover:bg-[#062D4F] disabled:opacity-50">{busy ? 'Submitting…' : 'Final Submit'}</button>
          </div>
        </div>
      </div>
    </section>}

    {viewErrors && <div className="fixed inset-0 z-[85] bg-black/50 grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setViewErrors(null); }}>
      <section role="dialog" aria-modal="true" className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
        <header className="p-5 border-b border-gray-100 flex justify-between items-start gap-3"><div><h2 className="font-semibold text-gray-950">Validation findings</h2><p className="text-xs text-gray-500 mt-1">{viewErrors.name}</p></div><button type="button" onClick={() => setViewErrors(null)} className="w-11 h-11 -mr-2 -mt-2 grid place-items-center rounded-lg hover:bg-gray-50" aria-label="Close"><X/></button></header>
        <ul className="p-5 space-y-2 text-sm text-gray-700">{viewErrors.findings.map((f, i) => <li key={i} className="flex gap-2"><span className="text-orange-500">•</span>{f}</li>)}</ul>
      </section>
    </div>}

    {warnSubmit && <div className="fixed inset-0 z-[85] bg-black/50 grid place-items-center p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setWarnSubmit(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="warn-title" className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        <header className="p-5 border-b border-gray-100 flex justify-between items-start gap-3"><div><h2 id="warn-title" className="font-semibold text-gray-950">Submit with warning?</h2><p className="text-xs text-gray-500 mt-1">Some mandatory documents are not fully validated.</p></div><button type="button" onClick={() => setWarnSubmit(false)} disabled={busy} className="w-11 h-11 -mr-2 -mt-2 grid place-items-center rounded-lg hover:bg-gray-50" aria-label="Close"><X/></button></header>
        <div className="p-5 text-sm text-gray-700 space-y-3">
          <p>Mandatory documents still missing or below 100% accuracy:</p>
          <ul className="space-y-1.5">{mandatoryGaps.map(d => <li key={d.name} className="flex gap-2 items-start"><span className="text-orange-500 mt-px">•</span><span>{d.name} — {uploads[d.name] ? `${uploads[d.name].accuracy}%` : 'Not uploaded'}</span></li>)}</ul>
          <p className="text-xs text-gray-500 bg-orange-50 border border-orange-100 rounded-lg p-2.5">The submission will proceed, but only fully validated (100% accuracy) evidence counts toward the compliance score. These items will be scored as non-compliant and flagged for the reviewer.</p>
        </div>
        <div className="p-5 pt-0 flex flex-col-reverse sm:flex-row justify-end gap-2"><button type="button" onClick={() => setWarnSubmit(false)} disabled={busy} className="bss-secondary-action">Cancel</button><button type="button" disabled={busy} onClick={() => { setWarnSubmit(false); void performSubmit(); }} className="bss-primary-action">{busy ? 'Submitting…' : 'Yes, submit with warning'}</button></div>
      </section>
    </div>}
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof FileUp; tone:string }) {
  return <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{label}</span><span className={`bss-kpi-icon ${tone}`}><Icon size={16}/></span></div><strong>{value}</strong></article>;
}
