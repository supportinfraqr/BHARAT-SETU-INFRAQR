"use client";

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileCheck2, FileUp, ShieldCheck, Upload, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorPortalData } from '@/types/portal';

type DocumentRow = ContractorPortalData['submissions']['documents'][number] & { fileName?: string; checksum?: string };
type CheckpointResult = { key:string; label:string; type:string; required:boolean; passed:boolean; detail:string };
type EvidenceUpload = { id?: number; accuracy: number; status: 'Validating' | 'Validated' | 'Errors found'; findings?: string[]; noOcr?: boolean; checkpoints?: CheckpointResult[] };
type Tab = 'submissions' | 'create';

const FYS = ['FY 2026-27', 'FY 2025-26'];
const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October'];

const FREQUENCIES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'] as const;
type Frequency = (typeof FREQUENCIES)[number];
const FY_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
const QUARTER_PERIODS = ['Q1 (Apr–Jun)', 'Q2 (Jul–Sep)', 'Q3 (Oct–Dec)', 'Q4 (Jan–Mar)'];
const HALF_PERIODS = ['H1 (Apr–Sep)', 'H2 (Oct–Mar)'];
const FINANCIAL_PERIODS = ['Full Year (Apr–Mar)'];

function periodsFor(freq: Frequency): string[] {
  if (freq === 'Quarterly') return QUARTER_PERIODS;
  if (freq === 'Half Yearly') return HALF_PERIODS;
  if (freq === 'Yearly') return FINANCIAL_PERIODS;
  return MONTHS;
}
// Which period (month/quarter/half/full-year) a given calendar month belongs to.
function periodOf(month: string, freq: Frequency): string {
  if (freq === 'Monthly') return month;
  const i = FY_MONTHS.indexOf(month);
  if (i < 0) return '';
  if (freq === 'Quarterly') return QUARTER_PERIODS[Math.floor(i / 3)];
  if (freq === 'Half Yearly') return HALF_PERIODS[Math.floor(i / 6)];
  return FINANCIAL_PERIODS[0];
}
// Representative calendar month for a period label (used when submitting/uploading).
function periodMonth(period: string): string {
  if (FY_MONTHS.includes(period)) return period;
  const qi = QUARTER_PERIODS.indexOf(period);
  if (qi >= 0) return FY_MONTHS[qi * 3 + 2];
  const hi = HALF_PERIODS.indexOf(period);
  if (hi >= 0) return FY_MONTHS[hi * 6 + 5];
  if (FINANCIAL_PERIODS.includes(period)) return 'March';
  return period;
}

export default function ComplianceSubmissionPage() {
  const { contractor, replaceContractor, refresh, employerScope, scoped } = useContractor();
  const [tab, setTab] = useState<Tab>('submissions');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Create-compliance filter is Financial Year + Frequency + Period (same as generation).
  const [createOpen, setCreateOpen] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [fy, setFy] = useState(FYS[0]);
  const [createFreq, setCreateFreq] = useState<Frequency>('Monthly');
  const [createPeriod, setCreatePeriod] = useState<string>(MONTHS[6]);
  const [viewErrors, setViewErrors] = useState<{ name: string; findings: string[] } | null>(null);
  // Additional documents the principal employer requires (adopted extra forms).
  const [uploads, setUploads] = useState<Record<string, EvidenceUpload>>({});
  const [additionalDocs, setAdditionalDocs] = useState<Array<{ name: string; frequency: string; mandatory: boolean; requiresDocument: boolean }>>([]);
  const [docsBusy, setDocsBusy] = useState(false);

  const [selectedYear, setSelectedYear] = useState<string>(FYS[0]);
  const [freq, setFreq] = useState<Frequency>('Monthly');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(MONTHS[6]);

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
    return yearFilteredDocuments.filter(doc => periodOf(doc.month || doc.period?.split(' ')[0] || '', freq) === selectedPeriod);
  }, [yearFilteredDocuments, freq, selectedPeriod]);

  const documentsByPeriod = useMemo(() => {
    const map: Record<string, DocumentRow[]> = {};
    yearFilteredDocuments.forEach(doc => {
      const p = periodOf(doc.month || doc.period?.split(' ')[0] || '', freq) || 'Unassigned';
      if (!map[p]) map[p] = [];
      map[p].push(doc);
    });
    return map;
  }, [yearFilteredDocuments, freq]);

  // Generated CLRA registers from the batches (what the system produced).
  const fyKey = selectedYear.replace('FY ', '');
  const generatedBatches = useMemo(
    () => contractor.complianceBatches.filter(b => (b.financialYear || '') === fyKey),
    [contractor.complianceBatches, fyKey]);
  const periodBatches = generatedBatches.filter(b => periodOf(b.month, freq) === selectedPeriod);

  // Generated-register counts for the Year/Period badges (submissions + generated registers).
  const batchCountByFy = useMemo(() => {
    const map: Record<string, number> = {};
    contractor.complianceBatches.forEach(b => { const k = b.financialYear || ''; map[k] = (map[k] || 0) + 1; });
    return map;
  }, [contractor.complianceBatches]);
  const batchCountByPeriod = useMemo(() => {
    const map: Record<string, number> = {};
    generatedBatches.forEach(b => { const p = periodOf(b.month, freq); map[p] = (map[p] || 0) + 1; });
    return map;
  }, [generatedBatches, freq]);

  // Submission context (derived from the selected site — no per-submission site picker elsewhere).
  const activeSiteObj = contractor.sites.find(s => s.name === siteName) ?? contractor.sites[0];
  const ctxSite = activeSiteObj?.name || '';
  const ctxEmployer = activeSiteObj?.employer || contractor.employers[0]?.name || '';
  const ctxState = activeSiteObj?.state || '';

  // Generated registers for the Create-tab filter: Financial Year + Period (mirrors generation).
  const month = periodMonth(createPeriod);
  const createFyKey = fy.replace('FY ', '');
  const generatedForCreate = useMemo(
    () => contractor.complianceBatches.filter(b => (b.financialYear || '') === createFyKey && b.month === month
      && (!activeSiteObj || !b.site || b.site === activeSiteObj.name)),
    [contractor.complianceBatches, createFyKey, month, activeSiteObj]);
  // Registers already submitted are no longer submittable.
  const pendingBatches = generatedForCreate.filter(b => b.status !== 'Submitted');
  const uploadedEvidenceCount = additionalDocs.filter(d => uploads[d.name]?.id).length;

  // The employer's additional (adopted) documents required for the site — listed
  // independent of generated registers so they can be uploaded anytime.
  const firstBatch = generatedForCreate[0];
  const firstBatchSite = firstBatch?.site || '';
  const docsSiteId = String(activeSiteObj?.id ?? '');
  useEffect(() => {
    let active = true;
    setDocsBusy(true);
    void fetch(`/api/contractor/clra/site-documents${docsSiteId ? `?siteId=${encodeURIComponent(docsSiteId)}` : ''}`, { cache:'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: { documents?: Array<{ form:string; purpose:string; frequency:string; mandatory:boolean; requiresDocument?:boolean; custom?:boolean; templateId?:number|null }> } } | null) => {
        if (!active) return;
        const docs = (body?.data?.documents || [])
          // Documents with no generated register (custom/additional forms, or
          // statutory forms without a template) must be uploaded as evidence.
          .filter(doc => doc.custom || !doc.templateId)
          .map(doc => ({ name: doc.form || doc.purpose, frequency: doc.custom ? (doc.frequency || '') : '', mandatory: !!doc.mandatory, requiresDocument: doc.custom ? doc.requiresDocument !== false : true }));
        setAdditionalDocs(docs);
      })
      .catch(() => { if (active) setAdditionalDocs([]); })
      .finally(() => { if (active) setDocsBusy(false); });
    return () => { active = false; };
  }, [docsSiteId, firstBatchSite]);

  const missingEvidence = additionalDocs.filter(doc => doc.mandatory && doc.requiresDocument && !(uploads[doc.name]?.status === 'Validated' && uploads[doc.name]?.id));

  async function uploadEvidence(doc: { name: string; frequency: string; mandatory: boolean }, next?: File) {
    if (!next) return;
    setError('');
    const acceptable = ['application/pdf', 'image/jpeg', 'image/png'].includes(next.type) && next.size <= 10 * 1024 * 1024;
    if (!acceptable) {
      setUploads(current => ({ ...current, [doc.name]: { accuracy: 0, status: 'Errors found', findings: ['Choose a PDF, JPEG or PNG document up to 10 MB.'] } }));
      return;
    }
    setUploads(current => ({ ...current, [doc.name]: { accuracy: 0, status: 'Validating' } }));
    const form = new FormData();
    form.set('file', next); form.set('type', doc.name);
    form.set('site', firstBatch?.site || ctxSite); form.set('employer', ctxEmployer);
    form.set('state', firstBatch?.state || ctxState); form.set('financialYear', fy); form.set('month', month);
    form.set('documentType', doc.name); form.set('frequency', doc.frequency);
    form.set('mandatory', doc.mandatory ? 'true' : 'false');
    form.set('period', `${createPeriod} ${fy.replace('FY ', '')}`);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch('/api/portal/uploads', { method: 'POST', body: form, signal: controller.signal });
      const result = await response.json().catch(() => ({})) as { data?: { id:number; accuracy:number | null; validated:boolean; noOcr?:boolean; findings:string[]; checkpoints?:CheckpointResult[] }; error?:string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Document could not be validated.');
      const data = result.data;
      setUploads(current => ({ ...current, [doc.name]: { id: data.id, accuracy: data.accuracy ?? 0, status: data.validated ? 'Validated' : 'Errors found', noOcr: data.noOcr, findings: data.findings, checkpoints: data.checkpoints } }));
    } catch (reason) {
      setUploads(current => ({ ...current, [doc.name]: { accuracy: 0, status: 'Errors found', findings: [reason instanceof Error ? reason.message : 'Document could not be validated.'] } }));
    } finally {
      window.clearTimeout(timer);
    }
  }

  const batchCols: DataColumn<ContractorPortalData['complianceBatches'][number]>[] = [
    { id:'period', header:'Period', value:b => `${b.month} ${b.year}`, render:b => <span>{b.month} {b.year}{periodOf(b.month, freq) === selectedPeriod && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">This period</span>}</span> },
    { id:'state', header:'State', value:b => b.state },
    { id:'registers', header:'Registers generated', value:b => b.notes || '—' },
    { id:'generatedOn', header:'Generated On', value:b => b.generatedOn },
    { id:'generatedBy', header:'Generated By', value:b => b.generatedBy },
    { id:'status', header:'Status', value:b => b.status, render:b => <span className={b.status === 'Generated' ? 'text-green-700' : b.status === 'Failed' ? 'text-red-700' : 'text-orange-700'}>{b.status}</span> },
    { id:'action', header:'Document', filterable:false, value:b => b.id, render:b => b.hasFile ? <a href={`/api/portal/compliance-batches/${b.id}`} download className="text-blue-700 font-semibold text-xs inline-flex items-center gap-1 hover:underline"><Download size={12}/>Download registers</a> : <span className="text-gray-400 text-xs">No file</span> },
  ];

  const verified = documents.filter(row => row.status === 'Verified').length;
  const pending = documents.filter(row => row.status !== 'Verified' && row.status !== 'Returned').length;

  async function submitAll() {
    if (missingEvidence.length) { setError(`Upload the mandatory additional documents before submitting: ${missingEvidence.map(d => d.name).join(', ')}.`); return; }
    if (!pendingBatches.length && !uploadedEvidenceCount) return;
    await performSubmit(pendingBatches.map(b => b.id));
  }

  async function performSubmit(batchIds: string[]) {
    setBusy(true); setError(''); setNotice('');
    // Submission context follows the generated batch selected for this period
    // (falls back to the selected site).
    const uploadIds = additionalDocs.map(d => uploads[d.name]?.id).filter((id): id is number => typeof id === 'number');
    const ctxBatch = contractor.complianceBatches.find(b => batchIds.includes(b.id));
    const siteObj = contractor.sites.find(s => s.name === (ctxBatch?.site || '')) ?? activeSiteObj;
    const empName = siteObj?.employer || ctxEmployer;
    const subSiteName = ctxBatch?.site || siteObj?.name || ctxSite;
    const stName = ctxBatch?.state || siteObj?.state || ctxState;
    try {
      const response = await fetch('/api/portal/compliances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'submit', employer: empName, site: subSiteName, period: `${createPeriod} ${fy.replace('FY ', '')}`, financialYear: fy, state: stName, month, location: '', complianceType: '', docName: '', uploadIds, batchIds }),
      });
      const result = await response.json().catch(() => ({})) as { data?: ContractorPortalData['auditReports'][number]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Compliance could not be submitted.');
      replaceContractor({ ...contractor, auditReports: [result.data, ...contractor.auditReports] });
      setCreateOpen(false); setUploads({});
      setNotice(`Compliance submitted. Audit report ${result.data.uniqueNo} generated — score ${result.data.scorePercent}%.`);
      void refresh();
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
    <header className="bss-page-header flex-col sm:flex-row"><div><p className="bss-eyebrow">Contractor data exchange</p><h1 className="bss-page-title mt-1">Compliance Submission Centre</h1><p className="bss-page-description">Create period-based (Financial Year + Frequency + Period) compliance packages from your generated CLRA registers, submit them, and generate the Compliance Audit Report.</p></div>
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
      <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs leading-5">Showing submissions for <strong>{employerScope === 'all' ? 'all bound principal employers' : employerScope}</strong>. Submissions are segregated by Financial Year, Frequency and Period below.</div>

      {/* Financial Year Filter Tabs */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 space-y-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-shrink-0">Financial Year:</span>
          <div className="flex flex-wrap gap-1.5">
            {availableYears.map(yr => {
              const yrCount = documents.filter(doc => {
                const fyStr = doc.financialYear || (doc.period?.includes('FY') ? doc.period.slice(doc.period.indexOf('FY')) : '');
                return (fyStr || FYS[0]) === yr;
              }).length + (batchCountByFy[yr.replace('FY ', '')] || 0);
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

        {/* Frequency Filter */}
        <div className="flex items-center gap-3 pt-2.5 border-t border-gray-100">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-shrink-0">Frequency:</span>
          <div className="flex flex-wrap gap-1.5">
            {FREQUENCIES.map(f => (
              <button key={f} onClick={() => { setFreq(f); setSelectedPeriod(periodsFor(f)[0]); }} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${freq === f ? 'bg-[#073B67] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{f}</button>
            ))}
          </div>
        </div>

        {/* Period Filter Tabs (adapts to the selected Frequency) */}
        <div className="flex items-center gap-3 pt-2.5 border-t border-gray-100 overflow-x-auto">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-shrink-0">Period:</span>
          <div className="flex items-center gap-1.5">
            {periodsFor(freq).map(p => {
              const count = (documentsByPeriod[p]?.length || 0) + (batchCountByPeriod[p] || 0);
              return (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${selectedPeriod === p ? 'bg-blue-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {p} <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedPeriod === p ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-[10px] text-gray-400 pt-2.5 border-t border-gray-100">Counts include submitted documents and generated CLRA registers for that Year / Period.</p>
      </div>

      {/* Generated CLRA registers (what the system produced) */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {periodBatches.length
          ? <>
              <EnterpriseDataTable title={`Generated CLRA Registers (${selectedYear} · ${selectedPeriod})`} rows={periodBatches} columns={batchCols} rowKey={b => b.id} filename={`clra-generated-${fyKey}`} />
              <p className="px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400">Monthly forms generate every month; Quarterly / Half-Yearly / Yearly forms generate once their period ends — download the generated register pack.</p>
            </>
          : <div className="px-5 py-4"><h3 className="flex items-center gap-2 text-sm font-bold text-[#062D4F]"><FileCheck2 size={16} className="text-[#073B67]"/>Generated CLRA Registers ({selectedYear})</h3><p className="mt-2 text-xs text-gray-400">No CLRA registers generated for {selectedPeriod} ({selectedYear}) yet. Use <strong>Master File &amp; CLRA Generation</strong> to upload a master file and generate.</p></div>}
      </section>

      {/* Segregated Submission Table */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <EnterpriseDataTable title={`${selectedPeriod} Submissions (${selectedYear})`} rows={filteredDocuments} columns={documentColumns} rowKey={row => row.id} filename={`compliance-documents-${selectedPeriod.toLowerCase().replace(/[^a-z0-9]/g, '')}-${selectedYear.toLowerCase().replace(/[^a-z0-9]/g, '')}`} />
      </section>
    </div>}

    {tab === 'create' && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Create Compliance Document</h2><p className="text-xs text-gray-400 mt-0.5">Pick the Financial Year and Month of the submission, include the CLRA registers generated for that period, and upload the evidence documents. OCR-style validation records accuracy per document.</p></header>
      <div className="p-5 grid lg:grid-cols-[340px_1fr] gap-6">
        <div className="space-y-3">
          <div className="rounded-xl bg-blue-50 border border-blue-100 text-blue-900 px-3.5 py-3 text-[11px] leading-5">
            You are submitting for <strong>{createPeriod} {fy.replace('FY ', '')}</strong> ({createFreq}). Monthly forms are included every month; Quarterly / Half-Yearly / Yearly forms are included once their period has ended (based on today&apos;s date).
          </div>
          <label className="text-xs font-semibold">Site<select value={activeSiteObj?.name || ''} onChange={e => setSiteName(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name}{s.state ? ` — ${s.state}` : ''}</option>)}</select></label>
          <label className="text-xs font-semibold">Financial Year<select value={fy} onChange={e => setFy(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{FYS.map(f => <option key={f}>{f}</option>)}</select></label>
          <label className="text-xs font-semibold">Frequency<select value={createFreq} onChange={e => { const f = e.target.value as Frequency; setCreateFreq(f); setCreatePeriod(periodsFor(f)[0]); }} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{FREQUENCIES.map(f => <option key={f}>{f}</option>)}</select></label>
          <label className="text-xs font-semibold">Period<select value={createPeriod} onChange={e => setCreatePeriod(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{periodsFor(createFreq).map(p => <option key={p}>{p}</option>)}</select></label>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Generated CLRA registers for {createPeriod} {fy.replace('FY ', '')} — no OCR needed (system-generated)</p>
          {generatedForCreate.length
            ? <div className="space-y-2 mb-5">{generatedForCreate.map(b => (
                <div key={b.id} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 flex items-center gap-3">
                  <span className="flex-1 min-w-0"><strong className="block text-xs text-gray-900">{b.state} · {b.site || b.siteCode}</strong><span className="block text-[10px] text-gray-400 mt-0.5">{b.month} {b.year} · {b.notes}</span></span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${b.status === 'Submitted' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{b.status === 'Submitted' ? 'Submitted' : 'Generated · no OCR'}</span>
                  {b.hasFile && <a href={`/api/portal/compliance-batches/${b.id}`} download className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold flex items-center gap-1.5 flex-shrink-0 hover:bg-white"><Download size={12}/>Download</a>}
                </div>
              ))}</div>
            : <p className="text-[11px] text-gray-400 mb-5">No CLRA registers generated for {createPeriod} {fy.replace('FY ', '')}. Generate them from <strong>Master File &amp; CLRA Generation</strong> first.</p>}

          {(docsBusy || additionalDocs.length > 0) && <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Additional documents required by the principal employer — upload before submitting</p>
            {docsBusy
              ? <p className="text-[11px] text-gray-400">Loading required documents…</p>
              : <div className="space-y-2.5">{additionalDocs.map(doc => {
                  const up = uploads[doc.name];
                  return <div key={doc.name} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className="flex-1 min-w-0"><strong className="block text-xs text-gray-900">{doc.name}</strong><span className="block text-[10px] text-gray-400 mt-0.5">{doc.frequency}{doc.mandatory ? ' · Mandatory' : ''}{doc.requiresDocument ? ' · Document required' : ''}</span></span>
                    {up ? <span title={up.findings?.join(' ')} className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${up.status === 'Validated' ? 'bg-green-50 text-green-700' : up.status === 'Validating' ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-700'}`}>{up.status === 'Validated' ? (up.noOcr ? 'Recorded' : '100% Accuracy') : up.status === 'Validating' ? 'Validating…' : `${up.accuracy}% · Errors found`}</span> : <span className="text-[10px] text-gray-300 flex-shrink-0">Not uploaded</span>}
                    <label className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 flex-shrink-0"><Upload size={12}/>Upload<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => uploadEvidence(doc, e.target.files?.[0])}/></label>
                    {up?.findings?.length ? <button type="button" onClick={() => setViewErrors({ name: doc.name, findings: up.findings ?? [] })} className="text-[10px] text-blue-700 font-semibold flex-shrink-0 hover:underline">View errors</button> : null}
                    {up && <button onClick={() => setUploads(current => { const next = { ...current }; delete next[doc.name]; return next; })} className="text-[10px] text-red-600 flex-shrink-0">Remove</button>}
                    </div>
                    {up?.checkpoints?.length ? <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] border-t border-gray-100 pt-2">
                      {up.checkpoints.map(c => <li key={c.key} className={c.passed ? 'text-green-700' : c.required ? 'text-red-600' : 'text-amber-600'}>{c.passed ? '✓' : '✗'} {c.label}{!c.passed && c.detail ? <span className="text-gray-400"> — {c.detail}</span> : null}</li>)}
                    </ul> : null}
                  </div>;
                })}</div>}
          </div>}

          <div className="mt-4 flex flex-wrap items-center gap-3 justify-between border-t border-gray-100 pt-4">
            <p className={`text-xs flex items-center gap-1.5 ${missingEvidence.length ? 'text-orange-700' : 'text-green-700'}`}><FileCheck2 size={14}/>{missingEvidence.length ? `${missingEvidence.length} mandatory additional document${missingEvidence.length === 1 ? '' : 's'} not uploaded — upload to submit.` : (pendingBatches.length || uploadedEvidenceCount) ? `Ready to submit ${pendingBatches.length ? `${pendingBatches.length} register batch${pendingBatches.length === 1 ? '' : 'es'}` : ''}${pendingBatches.length && uploadedEvidenceCount ? ' + ' : ''}${uploadedEvidenceCount ? `${uploadedEvidenceCount} additional document${uploadedEvidenceCount === 1 ? '' : 's'}` : ''}.` : 'Nothing to submit for this period yet — generate registers or upload an additional document.'}</p>
            <button type="button" onClick={() => void submitAll()} disabled={busy || missingEvidence.length > 0 || (!pendingBatches.length && !uploadedEvidenceCount)} className="h-10 px-5 rounded-lg bg-[#073B67] text-white text-sm font-bold flex items-center gap-2 hover:bg-[#062D4F] disabled:opacity-40">{busy ? 'Submitting…' : (pendingBatches.length || uploadedEvidenceCount) ? 'Submit' : 'Nothing to submit'}</button>
          </div>
          {error && tab === 'create' && <p role="alert" className="bss-alert bss-alert-error mt-3">{error}</p>}
        </div>
      </div>
    </section>}

    {viewErrors && <div className="fixed inset-0 z-[85] bg-black/50 grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setViewErrors(null); }}>
      <section role="dialog" aria-modal="true" className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
        <header className="p-5 border-b border-gray-100 flex justify-between items-start gap-3"><div><h2 className="font-semibold text-gray-950">Validation findings</h2><p className="text-xs text-gray-500 mt-1">{viewErrors.name}</p></div><button type="button" onClick={() => setViewErrors(null)} className="w-11 h-11 -mr-2 -mt-2 grid place-items-center rounded-lg hover:bg-gray-50" aria-label="Close"><X/></button></header>
        <ul className="p-5 space-y-2 text-sm text-gray-700">{viewErrors.findings.map((f, i) => <li key={i} className="flex gap-2"><span className="text-orange-500">•</span>{f}</li>)}</ul>
      </section>
    </div>}
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof FileUp; tone:string }) {
  return <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{label}</span><span className={`bss-kpi-icon ${tone}`}><Icon size={16}/></span></div><strong>{value}</strong></article>;
}
