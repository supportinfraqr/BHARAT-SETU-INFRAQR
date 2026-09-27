"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileCheck2, FileUp, Info, Lock, ShieldCheck, Upload, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import BatchDrilldown from '@/components/compliance/BatchDrilldown';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorPortalData } from '@/types/portal';

type DocumentRow = ContractorPortalData['submissions']['documents'][number] & { fileName?: string; checksum?: string };
type CheckpointResult = { key:string; label:string; type:string; required:boolean; passed:boolean; detail:string };
type EvidenceUpload = { id?: number; accuracy: number; status: 'Validating' | 'Validated' | 'Errors found'; findings?: string[]; noOcr?: boolean; checkpoints?: CheckpointResult[] };
type Tab = 'submissions' | 'create';

const FREQUENCIES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'] as const;
type Frequency = (typeof FREQUENCIES)[number];
const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
const QUARTER_PERIODS = ['Q1 (Apr–Jun)', 'Q2 (Jul–Sep)', 'Q3 (Oct–Dec)', 'Q4 (Jan–Mar)'];
const HALF_PERIODS = ['H1 (Apr–Sep)', 'H2 (Oct–Mar)'];
const FINANCIAL_PERIODS = ['Full Year (Apr–Mar)'];

// Generate Financial Years starting strictly from contractor registration date up to current date.
function getFinancialYearsFromDate(incorpDateStr?: string): string[] {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed (0=Jan, 3=Apr)
  const currentYear = now.getFullYear();
  const latestEndYear = currentMonth >= 3 ? currentYear + 1 : currentYear;

  let startEndYear = latestEndYear;
  if (incorpDateStr) {
    const regDate = new Date(incorpDateStr);
    if (!isNaN(regDate.getTime())) {
      const regMonth = regDate.getMonth();
      const regYear = regDate.getFullYear();
      startEndYear = regMonth >= 3 ? regYear + 1 : regYear;
    }
  }

  const list: string[] = [];
  for (let endYr = latestEndYear; endYr >= Math.min(startEndYear, latestEndYear); endYr--) {
    const startYr = endYr - 1;
    const shortEnd = String(endYr).slice(-2);
    list.push(`FY ${startYr}-${shortEnd}`);
  }

  // Fallback default if range is empty
  if (list.length === 0) list.push('FY 2026-27', 'FY 2025-26');
  return list;
}

function periodsFor(freq: Frequency): string[] {
  if (freq === 'Quarterly') return QUARTER_PERIODS;
  if (freq === 'Half Yearly') return HALF_PERIODS;
  if (freq === 'Yearly') return FINANCIAL_PERIODS;
  return MONTHS;
}

function periodOf(month: string, freq: Frequency): string {
  if (freq === 'Monthly') return month;
  const i = MONTHS.indexOf(month);
  if (i < 0) return '';
  if (freq === 'Quarterly') return QUARTER_PERIODS[Math.floor(i / 3)];
  if (freq === 'Half Yearly') return HALF_PERIODS[Math.floor(i / 6)];
  return FINANCIAL_PERIODS[0];
}

function periodMonth(period: string): string {
  if (MONTHS.includes(period)) return period;
  const qi = QUARTER_PERIODS.indexOf(period);
  if (qi >= 0) return MONTHS[qi * 3 + 2];
  const hi = HALF_PERIODS.indexOf(period);
  if (hi >= 0) return MONTHS[hi * 6 + 5];
  if (FINANCIAL_PERIODS.includes(period)) return 'March';
  return period;
}

export default function ComplianceSubmissionPage() {
  const { contractor, replaceContractor, refresh, employerScope, scoped } = useContractor();
  const [tab, setTab] = useState<Tab>('submissions');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [batchView, setBatchView] = useState<string | null>(null);

  // Earliest binding the contractor has with the selected site's employer (or with
  // any employer when showing all sites). The year list starts here so years
  // before the contractor joined the site are never offered.
  const bindingSince = useMemo(() => {
    if (siteFilter !== 'all') {
      const site = contractor.sites.find(s => s.name === siteFilter);
      if (site?.boundSince) return site.boundSince.slice(0, 10);
    }
    const names = siteFilter === 'all'
      ? contractor.employers.map(e => e.name)
      : contractor.sites.filter(s => s.name === siteFilter).map(s => s.employer);
    const dates = contractor.employers
      .filter(e => names.includes(e.name))
      .map(e => (e.boundSince || '').slice(0, 10))
      .filter(Boolean);
    return dates.length ? dates.sort()[0] : '';
  }, [siteFilter, contractor.employers, contractor.sites]);

  // Financial Years run from the binding date (not incorporation), so a
  // contractor only sees the years they have actually been on the site.
  const availableYears = useMemo(() => {
    const regYears = getFinancialYearsFromDate(bindingSince || contractor.identity?.incorpDate);
    const docYears: string[] = [];
    (contractor.submissions.documents as DocumentRow[]).forEach(doc => {
      const fyStr = doc.financialYear || (doc.period?.includes('FY') ? doc.period.slice(doc.period.indexOf('FY')) : '');
      if (fyStr && !docYears.includes(fyStr)) docYears.push(fyStr);
    });
    const merged = Array.from(new Set([...regYears, ...docYears]));
    return merged.sort().reverse();
  }, [bindingSince, contractor.identity?.incorpDate, contractor.submissions.documents]);

  // Default state filters
  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] || 'FY 2026-27');
  const [freq, setFreq] = useState<Frequency>('Monthly');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(MONTHS[5]); // Default September

  // Create-submission states
  const [siteName, setSiteName] = useState('');
  const [fy, setFy] = useState(availableYears[0] || 'FY 2026-27');
  const [createFreq, setCreateFreq] = useState<Frequency>('Monthly');
  const [createPeriod, setCreatePeriod] = useState<string>(MONTHS[5]);
  const [viewErrors, setViewErrors] = useState<{ name: string; findings: string[] } | null>(null);

  const [uploads, setUploads] = useState<Record<string, EvidenceUpload>>({});
  const [additionalDocs, setAdditionalDocs] = useState<Array<{ name: string; frequency: string; mandatory: boolean; requiresDocument: boolean; type: string; requiredFormat: string; note: string }>>([]);
  const [docsBusy, setDocsBusy] = useState(false);

  const rawDocuments = contractor.submissions.documents as DocumentRow[];
  const documents = useMemo(() => scoped(rawDocuments, row => row.employer), [scoped, rawDocuments]);
  // Only evidence rows stamped with a package Unique No. count as actually submitted —
  // a bare upload (draft) stays out of the Submissions Log until "Submit Form" is pressed.
  const submittedDocuments = useMemo(() => documents.filter(doc => doc.uniqueNo && (siteFilter === 'all' || (doc.site || '') === siteFilter)), [documents, siteFilter]);

  // Sync default selected year if availableYears changes
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Documents filtered by selected Year
  const yearFilteredDocuments = useMemo(() => {
    return submittedDocuments.filter(doc => {
      const fyStr = doc.financialYear || (doc.period?.includes('FY') ? doc.period.slice(doc.period.indexOf('FY')) : '');
      return (fyStr || availableYears[0]) === selectedYear;
    });
  }, [submittedDocuments, selectedYear, availableYears]);

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

  // Generated CLRA registers from batches
  const fyKey = selectedYear.replace('FY ', '');
  const generatedBatches = useMemo(
    () => contractor.complianceBatches.filter(b => (b.financialYear || '') === fyKey && (siteFilter === 'all' || (b.site || '') === siteFilter)),
    [contractor.complianceBatches, fyKey, siteFilter]);
  const periodBatches = generatedBatches.filter(b => periodOf(b.month, freq) === selectedPeriod);

  // Counts reflect only items that were actually submitted (not merely generated/uploaded).
  const batchCountByFy = useMemo(() => {
    const map: Record<string, number> = {};
    contractor.complianceBatches.filter(b => b.status === 'Submitted' && (siteFilter === 'all' || (b.site || '') === siteFilter))
      .forEach(b => { const k = b.financialYear || ''; map[k] = (map[k] || 0) + 1; });
    return map;
  }, [contractor.complianceBatches, siteFilter]);

  const batchCountByPeriod = useMemo(() => {
    const map: Record<string, number> = {};
    generatedBatches.filter(b => b.status === 'Submitted')
      .forEach(b => { const p = periodOf(b.month, freq); map[p] = (map[p] || 0) + 1; });
    return map;
  }, [generatedBatches, freq]);

  // Active site & submission context
  const activeSiteObj = contractor.sites.find(s => s.name === siteName) ?? contractor.sites[0];
  const ctxSite = activeSiteObj?.name || '';
  const ctxEmployer = activeSiteObj?.employer || contractor.employers[0]?.name || '';
  const ctxState = activeSiteObj?.state || '';

  const month = periodMonth(createPeriod);
  const createFyKey = fy.replace('FY ', '');
  const generatedForCreate = useMemo(
    () => contractor.complianceBatches.filter(b => (b.financialYear || '') === createFyKey && b.month === month
      && (!activeSiteObj || !b.site || b.site === activeSiteObj.name)),
    [contractor.complianceBatches, createFyKey, month, activeSiteObj]);

  // Names of evidence forms that already carry a submitted package ref for the current create context.
  const submittedNames = useMemo(() => {
    const periodStr = `${createPeriod} ${fy.replace('FY ', '')}`;
    const names = new Set<string>();
    documents.forEach(doc => {
      if (doc.source !== 'evidence' || !doc.uniqueNo) return;
      if (doc.period !== periodStr && doc.month !== month) return;
      names.add(doc.type);
      if (doc.documentType) names.add(doc.documentType);
    });
    return names;
  }, [documents, createPeriod, fy, month]);

  const submittedEvidenceCount = additionalDocs.filter(d => submittedNames.has(d.name)).length;

  const docsSiteId = String(activeSiteObj?.id ?? '');
  useEffect(() => {
    let active = true;
    setDocsBusy(true);
    void fetch(`/api/contractor/clra/site-documents${docsSiteId ? `?siteId=${encodeURIComponent(docsSiteId)}` : ''}`, { cache:'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: { documents?: Array<{ form:string; purpose:string; frequency:string; mandatory:boolean; requiresDocument?:boolean; custom?:boolean; templateId?:number|null; type?:string; requiredFormat?:string; note?:string }> } } | null) => {
        if (!active) return;
        const docs = (body?.data?.documents || [])
          .filter(doc => doc.custom || !doc.templateId)
          .map(doc => ({ name: doc.form || doc.purpose, frequency: doc.custom ? (doc.frequency || '') : '', mandatory: !!doc.mandatory, requiresDocument: doc.custom ? doc.requiresDocument !== false : true, type: doc.type || '', requiredFormat: doc.requiredFormat || '', note: doc.note || '' }));
        setAdditionalDocs(docs);
      })
      .catch(() => { if (active) setAdditionalDocs([]); })
      .finally(() => { if (active) setDocsBusy(false); });
    return () => { active = false; };
  }, [docsSiteId]);

  const [removedKeys, setRemovedKeys] = useState<string[]>([]);

  // Reset local uploads/removals whenever the submission context (site · period · FY) changes,
  // so switching site/period starts from a clean slate without leaking entries across contexts.
  const uploadContextKey = `${docsSiteId}|${createPeriod}|${fy}`;
  const lastContextKey = useRef(uploadContextKey);
  useEffect(() => {
    if (lastContextKey.current === uploadContextKey) return;
    lastContextKey.current = uploadContextKey;
    setUploads({});
    setRemovedKeys([]);
  }, [uploadContextKey]);

  // Merge already-submitted evidence for the current period into uploads, without clobbering a
  // local (not-yet-submitted) upload, and honouring removals.
  useEffect(() => {
    const periodStr = `${createPeriod} ${fy.replace('FY ', '')}`;
    const periodSubmissions = documents.filter(doc => (doc.period === periodStr || doc.month === month) && doc.source === 'evidence');
    setUploads(current => {
      const next: Record<string, EvidenceUpload> = { ...current };
      periodSubmissions.forEach(doc => {
        const matched = additionalDocs.find(d => d.name.toLowerCase() === doc.type.toLowerCase() || doc.type.toLowerCase().includes(d.name.toLowerCase()))?.name;
        const key = matched || doc.type;
        if (removedKeys.includes(key) || removedKeys.includes(doc.type)) return;
        if (next[key]?.id != null) return; // keep the live local entry (its numeric upload id) as-is
        const serverId = Number(doc.id);
        next[key] = {
          id: Number.isFinite(serverId) ? serverId : undefined,
          accuracy: doc.accuracy ?? 100,
          status: doc.status === 'Returned' ? 'Errors found' : 'Validated',
          findings: doc.findings,
        };
      });
      return next;
    });
  }, [documents, createPeriod, fy, month, additionalDocs, removedKeys]);

  function handleRemoveEvidence(docName: string) {
    setRemovedKeys(prev => [...prev, docName]);
    setUploads(current => {
      const next = { ...current };
      delete next[docName];
      return next;
    });
  }

  // PARTIAL SUBMISSION COMPUTATION:
  // Total expected mandatory items = mandatory additional docs + required register batches
  const uploadedMandatoryCount = additionalDocs.filter(doc => doc.mandatory && uploads[doc.name]?.status === 'Validated' && uploads[doc.name]?.id).length;
  const totalMandatoryDocsCount = additionalDocs.filter(doc => doc.mandatory && doc.requiresDocument).length;
  const missingEvidence = additionalDocs.filter(doc => doc.mandatory && doc.requiresDocument && uploads[doc.name]?.status !== 'Validated');
  const isPartialSubmission = missingEvidence.length > 0;

  async function uploadEvidence(doc: { name: string; frequency: string; mandatory: boolean }, next?: File) {
    if (!next) return;
    setRemovedKeys(prev => prev.filter(k => k !== doc.name));
    setError('');
    const acceptable = ['application/pdf', 'image/jpeg', 'image/png'].includes(next.type) && next.size <= 10 * 1024 * 1024;
    if (!acceptable) {
      setUploads(current => ({ ...current, [doc.name]: { accuracy: 0, status: 'Errors found', findings: ['Choose a PDF, JPEG or PNG document up to 10 MB.'] } }));
      return;
    }
    setUploads(current => ({ ...current, [doc.name]: { accuracy: 0, status: 'Validating' } }));
    const form = new FormData();
    form.set('file', next); form.set('type', doc.name);
    form.set('site', ctxSite); form.set('employer', ctxEmployer);
    form.set('state', ctxState); form.set('financialYear', fy); form.set('month', month);
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
    { 
      id:'status', 
      header:'Status', 
      value:b => b.status, 
      render:b => <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${b.status === 'Submitted' ? 'bg-green-50 text-green-700 border border-green-200' : b.status === 'Failed' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{b.status === 'Generated' ? 'Pending Submission' : b.status}</span> 
    },
    { id:'action', header:'Document', filterable:false, value:b => b.id, render:b => b.hasFile ? <a href={`/api/portal/compliance-batches/${b.id}`} download className="text-blue-700 font-semibold text-xs inline-flex items-center gap-1 hover:underline"><Download size={12}/>Download registers</a> : <span className="text-gray-400 text-xs">No file</span> },
  ];

  const verified = submittedDocuments.filter(row => row.status === 'Verified').length;
  const pending = submittedDocuments.filter(row => row.status !== 'Verified' && row.status !== 'Returned').length;

  async function submitBatch(batchId: string) {
    setBusy(true); setError(''); setNotice('');
    const ctxBatch = contractor.complianceBatches.find(b => b.id === batchId);
    const siteObj = contractor.sites.find(s => s.name === (ctxBatch?.site || '')) ?? activeSiteObj;
    const empName = siteObj?.employer || ctxEmployer;
    const subSiteName = ctxBatch?.site || siteObj?.name || ctxSite;
    const stName = ctxBatch?.state || siteObj?.state || ctxState;
    try {
      const response = await fetch('/api/portal/compliances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'submit', employer: empName, site: subSiteName, period: `${createPeriod} ${fy.replace('FY ', '')}`, financialYear: fy, state: stName, month, location: '', complianceType: '', docName: '', uploadIds: [], batchIds: [batchId] }),
      });
      const result = await response.json().catch(() => ({})) as { data?: ContractorPortalData['auditReports'][number]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Registers could not be submitted.');
      replaceContractor({ ...contractor, auditReports: [result.data, ...contractor.auditReports] });
      setNotice(`Registers submitted! Ref No: ${result.data.uniqueNo}.`);
      void refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registers could not be submitted.');
    } finally { setBusy(false); }
  }

  async function submitSingleForm(docName: string, uploadId?: number) {
    if (!uploadId) return;
    setBusy(true); setError(''); setNotice('');
    const siteObj = activeSiteObj;
    const empName = siteObj?.employer || ctxEmployer;
    const subSiteName = siteObj?.name || ctxSite;
    const stName = siteObj?.state || ctxState;
    try {
      const response = await fetch('/api/portal/compliances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'submit', employer: empName, site: subSiteName, period: `${createPeriod} ${fy.replace('FY ', '')}`, financialYear: fy, state: stName, month, location: '', complianceType: docName, docName, uploadIds: [uploadId], batchIds: [] }),
      });
      const result = await response.json().catch(() => ({})) as { data?: ContractorPortalData['auditReports'][number]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Document could not be submitted.');
      replaceContractor({ ...contractor, auditReports: [result.data, ...contractor.auditReports] });
      setNotice(`Submitted successfully! Ref No: ${result.data.uniqueNo} (${docName}).`);
      void refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Document could not be submitted.');
    } finally { setBusy(false); }
  }

  const documentColumns: DataColumn<DocumentRow>[] = [
    { id:'type', header: 'Document / Package', value: row => row.type, render: row => <div><strong className="text-gray-900 font-semibold">{row.type}</strong>{row.fileName && <p className="text-[10px] text-gray-400 mt-0.5">{row.fileName}</p>}{row.source === 'evidence' && row.id && <a href={`/api/contractor/submissions/${row.id}/file`} target="_blank" rel="noreferrer" className="block text-[10px] text-blue-600 hover:underline mt-0.5">View evidence</a>}{row.findings && row.findings.length > 0 && <button type="button" onClick={() => setViewErrors({ name: row.type, findings: row.findings ?? [] })} className="block text-[10px] text-red-600 font-semibold hover:underline mt-0.5">View errors ({row.findings.length})</button>}</div> },
    { id:'uniqueNo', header: 'Package Ref No.', value: row => row.uniqueNo ?? '—', render: row => row.uniqueNo ? <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{row.uniqueNo}</span> : <span className="text-gray-300">—</span> },
    { id:'employer', header: 'Principal Employer', value: row => row.employer },
    { id:'site', header: 'Site / Location', value: row => `${row.site}${row.state ? ` (${row.state})` : ''}` },
    { id:'period', header: 'Period / FY', value: row => `${row.period}${row.financialYear ? ` · ${row.financialYear}` : ''}` },
    { id:'accuracy', header: 'OCR Accuracy', value: row => row.accuracy ?? '—', render: row => row.accuracy != null ? <span className={`font-bold ${row.accuracy >= 100 ? 'text-green-700' : 'text-amber-700'}`}>{row.accuracy}%</span> : '—' },
    { id:'created', header: 'Submitted On', value: row => row.submittedAt, render: row => new Date(row.submittedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) },
    { 
      id:'status', 
      header: 'Status', 
      value: row => row.status, 
      render: row => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
          row.status === 'Verified' ? 'bg-green-100 text-green-800 border border-green-200' :
          row.status === 'Returned' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-amber-100 text-amber-800 border border-amber-200'
        }`}>
          {row.status === 'Verified' ? 'Verified' : row.status === 'Returned' ? 'Returned' : 'Pending Review'}
        </span>
      ) 
    },
  ];

  return <div className="space-y-6 pb-12">
    {/* Clean Top Header */}
    <header className="bss-page-header flex-col sm:flex-row justify-between items-start sm:items-center">
      <div>
        <p className="bss-eyebrow">Contractor Data Exchange</p>
        <h1 className="bss-page-title mt-1">Compliance Submissions</h1>
        <p className="bss-page-description">Manage and upload periodic statutory packages, CLRA registers, and evidence documents for principal employers.</p>
      </div>
      {contractor.identity?.incorpDate && (
        <div className="bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 flex items-center gap-2 mt-3 sm:mt-0">
          <Info size={15} className="text-blue-700" />
          <span>Registered: <strong>{new Date(contractor.identity.incorpDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</strong></span>
        </div>
      )}
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error flex items-center gap-2"><AlertCircle size={15}/>{error}</p>}

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      <Metric label="Total Submissions" value={submittedDocuments.length} icon={FileUp} tone="bg-blue-50 text-blue-700"/>
      <Metric label="Verified Packages" value={verified} icon={CheckCircle2} tone="bg-green-50 text-green-700"/>
      <Metric label="Pending Review" value={pending} icon={FileCheck2} tone="bg-amber-50 text-amber-700"/>
      <Metric label="Employer Scope" value={employerScope === 'all' ? contractor.employers.length : 1} icon={ShieldCheck} tone="bg-indigo-50 text-indigo-700"/>
    </section>

    {/* Tab Selector */}
    <div className="flex border-b border-gray-200 overflow-x-auto">
      <button 
        onClick={() => setTab('submissions')} 
        className={`px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${tab === 'submissions' ? 'border-[#073B67] text-[#073B67]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
      >
        📋 Submissions Log &amp; Records
      </button>
      <button 
        onClick={() => setTab('create')} 
        className={`px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${tab === 'create' ? 'border-[#073B67] text-[#073B67]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
      >
        📤 Submit Compliance Package
      </button>
    </div>

    {tab === 'submissions' && <div className="space-y-4">
      {/* Filters Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3.5 shadow-sm">
        {/* Site Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex-shrink-0">Site:</span>
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white font-semibold">
            <option value="all">All Sites</option>
            {contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name}{s.state ? ` — ${s.state}` : ''}</option>)}
          </select>
        </div>

        {/* Registration-Based Financial Year Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex-shrink-0">Financial Year:</span>
          <div className="flex flex-wrap gap-1.5">
            {availableYears.map(yr => {
              const yrCount = submittedDocuments.filter(doc => {
                const fyStr = doc.financialYear || (doc.period?.includes('FY') ? doc.period.slice(doc.period.indexOf('FY')) : '');
                return (fyStr || availableYears[0]) === yr;
              }).length + (batchCountByFy[yr.replace('FY ', '')] || 0);
              return (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedYear === yr ? 'bg-[#073B67] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {yr} <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${selectedYear === yr ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>{yrCount}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Frequency Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex-shrink-0">Frequency:</span>
          <div className="flex flex-wrap gap-1.5">
            {FREQUENCIES.map(f => (
              <button 
                key={f} 
                onClick={() => { setFreq(f); setSelectedPeriod(periodsFor(f)[0]); }} 
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${freq === f ? 'bg-[#073B67] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Period Filter Tabs */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-100 overflow-x-auto">
          <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex-shrink-0">Period:</span>
          <div className="flex items-center gap-1.5">
            {periodsFor(freq).map(p => {
              const count = (documentsByPeriod[p]?.length || 0) + (batchCountByPeriod[p] || 0);
              return (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${selectedPeriod === p ? 'bg-blue-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {p} <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedPeriod === p ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Month-by-Month Compliance Matrix & Pending Overview */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              📅 {selectedYear} Monthly Compliance Tracker (Registers + Itemized Forms)
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Registers Batch (1 Unit) + Each Required Statutory Evidence Form counted as a separate item.</p>
          </div>
          <span className="text-[11px] font-bold text-[#073B67] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
            {MONTHS.filter(m => {
              const p = periodOf(m, freq);
              const mDocs = documentsByPeriod[p] || [];
              const hasRegs = (batchCountByPeriod[p] || 0) > 0;
              const expectedFormsCount = additionalDocs.length || 1;
              return hasRegs && mDocs.length >= expectedFormsCount;
            }).length} / 12 Months Fully Submitted
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {MONTHS.map(m => {
            const p = periodOf(m, freq);
            const mDocs = documentsByPeriod[p] || [];
            const hasRegs = (batchCountByPeriod[p] || 0) > 0;
            const submittedFormsCount = mDocs.length;
            const totalConfiguredForms = additionalDocs.length;
            const totalUnits = 1 + (totalConfiguredForms > 0 ? totalConfiguredForms : 1);
            const completedUnits = (hasRegs ? 1 : 0) + submittedFormsCount;
            const isFull = completedUnits >= totalUnits;
            const isPartial = completedUnits > 0 && !isFull;
            const isSelected = selectedPeriod === p;

            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedPeriod(p)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isSelected ? 'border-[#073B67] bg-blue-50/60 ring-2 ring-[#073B67]/20 shadow-xs' :
                  isFull ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300' :
                  isPartial ? 'border-blue-200 bg-blue-50/30 hover:border-blue-300' :
                  'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">{m}</span>
                  {isFull ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {completedUnits}/{totalUnits} Complete
                    </span>
                  ) : isPartial ? (
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                      {completedUnits}/{totalUnits} Submitted
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <AlertCircle size={10}/> 0/{totalUnits} Pending
                    </span>
                  )}
                </div>
                
                <div className="mt-2 space-y-0.5 text-[10px]">
                  <p className={`font-semibold flex items-center gap-1 ${hasRegs ? 'text-emerald-700' : 'text-amber-700'}`}>
                    <span>{hasRegs ? '✓' : '•'}</span> Registers: {hasRegs ? 'Submitted' : 'Pending'}
                  </p>
                  <p className={`font-semibold flex items-center gap-1 ${submittedFormsCount > 0 ? (totalConfiguredForms && submittedFormsCount < totalConfiguredForms ? 'text-blue-700' : 'text-emerald-700') : 'text-amber-700'}`}>
                    <span>{submittedFormsCount > 0 ? '✓' : '•'}</span> Forms: {submittedFormsCount}{totalConfiguredForms ? `/${totalConfiguredForms}` : ''} Submitted
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Generated CLRA Registers */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {periodBatches.length
          ? <>
              <EnterpriseDataTable title={`Generated CLRA Registers (${selectedYear} · ${selectedPeriod})`} rows={periodBatches} columns={batchCols} rowKey={b => b.id} filename={`clra-generated-${fyKey}`} />
            </>
          : <div className="px-5 py-4"><h3 className="flex items-center gap-2 text-xs font-bold text-[#062D4F]"><FileCheck2 size={16} className="text-[#073B67]"/>Generated CLRA Registers ({selectedYear})</h3><p className="mt-1 text-xs text-gray-400">No CLRA registers generated for {selectedPeriod} ({selectedYear}) yet.</p></div>}
      </section>

      {/* Submissions Listing Table */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <EnterpriseDataTable title={`${selectedPeriod} Submissions (${selectedYear})`} rows={filteredDocuments} columns={documentColumns} rowKey={row => row.id} filename={`compliance-documents-${selectedPeriod.toLowerCase().replace(/[^a-z0-9]/g, '')}-${selectedYear.toLowerCase().replace(/[^a-z0-9]/g, '')}`} />
      </section>
    </div>}

    {tab === 'create' && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <header className="px-5 py-4 border-b border-gray-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-950 flex items-center gap-2">
            <FileUp size={16} className="text-[#073B67]" />
            Submit Compliance &amp; Evidence Package
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Select site, financial year, and period. Upload statutory evidence documents — part submissions are fully supported with real-time pending badges.</p>
        </div>
        <div className="flex-shrink-0">
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
            Part Submissions Allowed
          </span>
        </div>
      </header>

      <div className="p-5 grid lg:grid-cols-[340px_1fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-xl bg-blue-50/80 border border-blue-100 text-blue-900 px-3.5 py-3 text-xs leading-5">
            Submitting for <strong>{createPeriod} {fy.replace('FY ', '')}</strong> ({createFreq}). Supports full or part submissions.
          </div>

          <label className="text-xs font-bold text-gray-700 block">Site
            <select value={activeSiteObj?.name || ''} onChange={e => setSiteName(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-xl px-3 text-xs bg-white font-semibold">{contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name}{s.state ? ` — ${s.state}` : ''}</option>)}</select>
          </label>

          <label className="text-xs font-bold text-gray-700 block">Financial Year (From Registration)
            <select value={fy} onChange={e => setFy(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-xl px-3 text-xs bg-white font-semibold">{availableYears.map(f => <option key={f}>{f}</option>)}</select>
          </label>

          <label className="text-xs font-bold text-gray-700 block">Frequency
            <select value={createFreq} onChange={e => { const f = e.target.value as Frequency; setCreateFreq(f); setCreatePeriod(periodsFor(f)[0]); }} className="mt-1 w-full h-10 border border-gray-200 rounded-xl px-3 text-xs bg-white font-semibold">{FREQUENCIES.map(f => <option key={f}>{f}</option>)}</select>
          </label>

          <label className="text-xs font-bold text-gray-700 block">Period
            <select value={createPeriod} onChange={e => setCreatePeriod(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-xl px-3 text-xs bg-white font-semibold">{periodsFor(createFreq).map(p => <option key={p}>{p}</option>)}</select>
          </label>
        </div>

        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2">1 · CLRA Registers <span className="text-gray-400">(auto-generated)</span></p>
          {generatedForCreate.length
            ? <div className="space-y-2 mb-6">{generatedForCreate.map(b => (
                <div key={b.id} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 flex items-center gap-3">
                  <span className="flex-1 min-w-0"><strong className="block text-xs text-gray-900">{b.state} · {b.site || b.siteCode}</strong><span className="block text-[10px] text-gray-400 mt-0.5">{b.month} {b.year} · {b.notes}</span></span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${b.status === 'Verified' ? 'bg-green-50 text-green-700 border border-green-200' : b.status === 'Submitted' ? 'bg-blue-50 text-blue-700' : (b.status === 'Returned' || b.status === 'Rejected') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{b.status === 'Verified' ? 'Verified' : (b.status === 'Returned' || b.status === 'Rejected') ? 'Returned' : b.status === 'Submitted' ? 'Submitted' : 'Generated · Ready'}</span>
                  <button type="button" onClick={() => setBatchView(String(b.id))} className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold flex items-center gap-1.5 flex-shrink-0 hover:bg-white">View documents</button>
                  {b.status !== 'Submitted' && b.status !== 'Verified' && <button type="button" onClick={() => void submitBatch(b.id)} disabled={busy} className="h-8 px-3 rounded-lg bg-[#073B67] text-white text-[11px] font-bold flex items-center gap-1.5 flex-shrink-0 hover:bg-[#062D4F] disabled:opacity-40"><FileUp size={12}/>Submit</button>}
                </div>
              ))}</div>
            : <p className="text-xs text-gray-400 mb-6">No CLRA registers generated for {createPeriod} {fy.replace('FY ', '')} yet.</p>}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                2 · Additional Forms ({submittedEvidenceCount}/{additionalDocs.length} Submitted
                {totalMandatoryDocsCount > 0 ? ` · ${uploadedMandatoryCount}/${totalMandatoryDocsCount} Mandatory` : ''})
              </p>
              {isPartialSubmission && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Part Submissions Allowed ({missingEvidence.length} pending)
                </span>
              )}
            </div>

            {docsBusy ? (
              <p className="text-xs text-gray-400 py-3">Loading required documents…</p>
            ) : additionalDocs.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">No specific evidence documents configured for this site.</p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Document Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Mandatory</th>
                      <th className="py-2.5 px-3">Required Format</th>
                      <th className="py-2.5 px-3">Note</th>
                      <th className="py-2.5 px-3">Submit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {additionalDocs.map(doc => {
                      const up = uploads[doc.name];
                      const isSubmitted = submittedNames.has(doc.name);
                      const submittedRow = isSubmitted
                        ? submittedDocuments.find(d => d.type?.toLowerCase() === doc.name.toLowerCase() || d.type?.toLowerCase().includes(doc.name.toLowerCase()))
                        : undefined;
                      const viewHref = up?.id != null ? `/api/portal/uploads/${up.id}` : submittedRow?.id ? `/api/contractor/submissions/${submittedRow.id}/file` : '';
                      // A returned submission is editable again so the contractor can fix and resubmit.
                      const isReturned = isSubmitted && submittedRow?.status === 'Returned';
                      const locked = isSubmitted && !isReturned;
                      return (
                        <tr key={doc.name} className={`align-top hover:bg-slate-50/70 transition-colors ${up?.status === 'Validated' ? 'bg-green-50/20' : doc.mandatory ? 'bg-amber-50/15' : ''}`}>
                          <td className="py-3 px-3 font-semibold text-gray-900">{doc.name}</td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">{doc.type || '—'}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-600 text-[11px]">
                            {doc.frequency || 'Monthly'}
                          </td>
                          <td className="py-3 px-3">
                            {doc.mandatory ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">Mandatory</span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">Optional</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-gray-600 text-[11px]">{doc.requiredFormat || '—'}</td>
                          <td className="py-3 px-3 text-gray-500 text-[11px] max-w-[220px]" title={doc.note || ''}>{doc.note || '—'}</td>
                          <td className="py-3 px-3">
                            {locked ? (
                              <div className="flex flex-col gap-1">
                                <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${submittedRow?.status === 'Verified' ? 'text-green-700' : 'text-emerald-700'}`}>
                                  <Lock size={12}/> {submittedRow?.status === 'Verified' ? 'Verified' : 'Submitted'}
                                </span>
                                {viewHref && <a href={viewHref} target="_blank" rel="noreferrer" className="text-[11px] text-blue-700 font-semibold hover:underline">View</a>}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {isReturned && <span className="text-[10px] font-bold text-red-700">Returned — re-upload to resubmit</span>}
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="h-7 px-3 rounded-md border border-gray-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 bg-white shadow-xs">
                                    <Upload size={12} className="text-gray-600"/>
                                    {up?.id != null ? 'Re-upload' : 'Upload'}
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => uploadEvidence(doc, e.target.files?.[0])}/>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => up?.id != null && void submitSingleForm(doc.name, up.id)}
                                    disabled={busy || up?.id == null}
                                    className="h-7 px-3 rounded-md bg-[#073B67] text-white text-xs font-bold hover:bg-[#062D4F] disabled:opacity-40 shadow-xs"
                                  >Submit</button>
                                  {up?.id != null && (
                                    <button type="button" onClick={() => handleRemoveEvidence(doc.name)} className="text-[11px] text-red-600 font-semibold hover:underline">Remove</button>
                                  )}
                                </div>
                                {up?.status === 'Validating' ? (
                                  <span className="text-[10px] font-bold text-blue-700">Validating…</span>
                                ) : up?.status === 'Errors found' ? (
                                  <button type="button" onClick={() => setViewErrors({ name: doc.name, findings: up.findings ?? [] })} className="text-left text-[10px] font-bold text-red-700 hover:underline">Errors found — view findings</button>
                                ) : up?.status === 'Validated' ? (
                                  <span className="text-[10px] font-bold text-green-700">Validated — ready to submit</span>
                                ) : (
                                  <span className="text-[10px] font-medium text-amber-700">Pending submission</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {error && <p role="alert" className="bss-alert bss-alert-error mt-3">{error}</p>}
        </div>
      </div>
    </section>}

    {viewErrors && <div className="fixed inset-0 z-[85] bg-black/50 grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setViewErrors(null); }}>
      <section role="dialog" aria-modal="true" className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
        <header className="p-5 border-b border-gray-100 flex justify-between items-start gap-3"><div><h2 className="font-semibold text-gray-950">Validation findings</h2><p className="text-xs text-gray-500 mt-1">{viewErrors.name}</p></div><button type="button" onClick={() => setViewErrors(null)} className="w-11 h-11 -mr-2 -mt-2 grid place-items-center rounded-lg hover:bg-gray-50" aria-label="Close"><X/></button></header>
        <ul className="p-5 space-y-2 text-sm text-gray-700">{viewErrors.findings.map((f, i) => <li key={i} className="flex gap-2"><span className="text-orange-500">•</span>{f}</li>)}</ul>
      </section>
    </div>}

    {batchView && <BatchDrilldown batchId={batchView} role="contractor" onClose={() => setBatchView(null)} />}
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof FileUp; tone:string }) {
  return <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{label}</span><span className={`bss-kpi-icon ${tone}`}><Icon size={16}/></span></div><strong>{value}</strong></article>;
}
