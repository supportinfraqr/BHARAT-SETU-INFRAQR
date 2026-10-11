"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileCheck2, FileUp, Info, Lock, Search, ShieldCheck, TriangleAlert, Upload, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import BatchDrilldown from '@/components/compliance/BatchDrilldown';
import VersionHistory from '@/components/compliance/VersionHistory';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorPortalData } from '@/types/portal';
import { openPrintHtml } from '@/lib/documentEngine/render';

type DocumentRow = ContractorPortalData['submissions']['documents'][number] & { fileName?: string; checksum?: string };
type AiCheckResult = { key?:string; type?:string; label?:string; required?:boolean; passed?:boolean; detail?:string };
type AiCheck = { key?: string; type: string; label: string; value?: string; required?: boolean };
type DocRowUI = { name: string; frequency: string; mandatory: boolean; requiresDocument: boolean; type: string; requiredFormat: string; note: string; aiChecks?: AiCheck[]; docKind?: 'register' | 'form'; templateId?: number; columns?: string[]; outputFormat?: string; fieldMappings?: Array<{ column: string; fieldKey: string }> };
type AiAudit = { status: 'passed' | 'failed' | 'review' | 'unavailable' | 'error'; valid?: boolean | null; templateConformant?: boolean | null; confidence?: number | null; summary?: string; findings?: string[]; missing?: string[]; issues?: string[]; matchedColumns?: string[]; checkpointResults?: Array<{ label?: string; passed?: boolean; detail?: string }>; provider?: string; providerLabel?: string; model?: string; message?: string };
type EvidenceUpload = { id?: number; accuracy: number; status: 'Validating' | 'Validated' | 'Errors found'; findings?: string[]; noOcr?: boolean; checkpoints?: AiCheckResult[]; format?: string; formatOk?: boolean; allowedFormats?: string[]; chars?: number; ai?: AiAudit };
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

/** True when a month of the given FY is still in the future — those aren't due
 *  yet, so the tracker shows "Upcoming" instead of "Pending". */
function isFutureMonth(fy: string, monthName: string): boolean {
  const match = fy.match(/FY\s*(\d{4})/);
  const idx = MONTHS.indexOf(monthName);
  if (!match || idx < 0) return false;
  const fyStart = Number(match[1]);
  const calMonth = ((idx + 3) % 12) + 1;            // Apr→4 … Dec→12, Jan→1 … Mar→3
  const calYear = idx >= 9 ? fyStart + 1 : fyStart;
  const now = new Date();
  return calYear * 12 + calMonth > now.getFullYear() * 12 + (now.getMonth() + 1);
}

export default function ComplianceSubmissions({ embedded = false, onSubmitted }: { embedded?: boolean; onSubmitted?: (ctx: { site:string; month:string; financialYear:string }) => void }) {
  const { contractor, replaceContractor, refresh, employerScope, scoped } = useContractor();
  const [tab, setTab] = useState<Tab>(embedded ? 'create' : 'submissions');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [siteFilter, setSiteFilter] = useState(contractor.sites[0]?.name || '');
  // Keep a valid site selected — the page is always scoped to one site.
  useEffect(() => {
    if (contractor.sites.length && !contractor.sites.some(s => s.name === siteFilter)) {
      setSiteFilter(contractor.sites[0].name);
    }
  }, [contractor.sites, siteFilter]);
  const [batchView, setBatchView] = useState<string | null>(null);

  // Past data can always be submitted, so years are never restricted to the
  // site binding date — the last 6 financial years (or back to incorporation,
  // whichever is earlier) are always selectable.
  const availableYears = useMemo(() => {
    const now = new Date();
    const earliest = new Date(now.getFullYear() - 6, 0, 1).toISOString().slice(0, 10);
    const base = [contractor.identity?.incorpDate, earliest].filter(Boolean).sort()[0];
    const regYears = getFinancialYearsFromDate(base);
    const docYears: string[] = [];
    (contractor.submissions.documents as DocumentRow[]).forEach(doc => {
      let fyStr = doc.financialYear || (doc.period?.includes('FY') ? doc.period.slice(doc.period.indexOf('FY')) : '');
      if (fyStr) {
        fyStr = fyStr.trim();
        if (!fyStr.startsWith('FY ')) {
          fyStr = `FY ${fyStr.replace(/^FY\s*/, '')}`;
        }
        if (!docYears.includes(fyStr)) docYears.push(fyStr);
      }
    });
    (contractor.complianceBatches || []).forEach(b => {
      let fyStr = b.financialYear || '';
      if (fyStr) {
        fyStr = fyStr.trim();
        if (!fyStr.startsWith('FY ')) {
          fyStr = `FY ${fyStr.replace(/^FY\s*/, '')}`;
        }
        if (!docYears.includes(fyStr)) docYears.push(fyStr);
      }
    });
    const merged = Array.from(new Set([...regYears, ...docYears]));
    return merged.sort().reverse();
  }, [contractor.identity?.incorpDate, contractor.submissions.documents, contractor.complianceBatches]);

  // Default state filters
  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] || 'FY 2026-27');
  const [freq, setFreq] = useState<Frequency>('Monthly');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(MONTHS[5]); // Default September

  // Show every period of the chosen frequency — the full Apr–Mar month set for
  // Monthly — so all months are visible and selectable in Compliance Records.
  const visiblePeriods = useMemo(() => periodsFor(freq), [freq]);

  // Create-submission states
  const [siteName, setSiteName] = useState('');
  const [fy, setFy] = useState(availableYears[0] || 'FY 2026-27');
  const [createFreq, setCreateFreq] = useState<Frequency>('Monthly');
  const [createPeriod, setCreatePeriod] = useState<string>(MONTHS[5]);
  const [viewErrors, setViewErrors] = useState<{ name: string; findings: string[]; uploadId?: number } | null>(null);

  const visibleCreatePeriods = useMemo(() => periodsFor(createFreq), [createFreq]);

  const [uploads, setUploads] = useState<Record<string, EvidenceUpload>>({});
  const [additionalDocs, setAdditionalDocs] = useState<DocRowUI[]>([]);
  const [docsBusy, setDocsBusy] = useState(false);
  // CLRA registers: use the auto-generated batch, or upload the state's register
  // forms manually.
  const [clraMode, setClraMode] = useState<'generated' | 'manual'>('generated');
  const [registerForms, setRegisterForms] = useState<DocRowUI[]>([]);
  const [registersBusy, setRegistersBusy] = useState(false);
  const [regQuery, setRegQuery] = useState('');
  const [regFreqFilter, setRegFreqFilter] = useState('');
  const [regOnlyMandatory, setRegOnlyMandatory] = useState(false);
  const [templateView, setTemplateView] = useState<DocRowUI | null>(null);
  const [optimisticSubmitted, setOptimisticSubmitted] = useState<string[]>([]);
  const [confirmReupload, setConfirmReupload] = useState<{ doc: DocRowUI; file: File } | null>(null);

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

  // Keep the create form's year valid too (it narrows again when the past-docs
  // toggle is turned back off).
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(fy)) {
      setFy(availableYears[0]);
    }
  }, [availableYears, fy]);

  // When the site / year / frequency changes, drop a period the contractor can
  // no longer file for (e.g. a month before they joined the site).
  useEffect(() => {
    if (visiblePeriods.length > 0 && !visiblePeriods.includes(selectedPeriod)) {
      setSelectedPeriod(visiblePeriods[0]);
    }
  }, [visiblePeriods, selectedPeriod]);

  useEffect(() => {
    if (visibleCreatePeriods.length > 0 && !visibleCreatePeriods.includes(createPeriod)) {
      setCreatePeriod(visibleCreatePeriods[0]);
    }
  }, [visibleCreatePeriods, createPeriod]);

  // Documents filtered by selected Year
  const yearFilteredDocuments = useMemo(() => {
    return submittedDocuments.filter(doc => {
      let fyStr = doc.financialYear || (doc.period?.includes('FY') ? doc.period.slice(doc.period.indexOf('FY')) : '');
      if (fyStr) {
        fyStr = fyStr.trim();
        if (!fyStr.startsWith('FY ')) fyStr = `FY ${fyStr.replace(/^FY\s*/, '')}`;
      }
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
    const targetSite = activeSiteObj?.name || ctxSite;
    const names = new Set<string>();
    documents.forEach(doc => {
      if (doc.source !== 'evidence' || !doc.uniqueNo) return;
      if (doc.period !== periodStr && doc.month !== month) return;
      // Scope to the site being created — a form submitted at another site must
      // not appear as submitted here.
      if (targetSite && (doc.site || '') !== targetSite) return;
      names.add(doc.type);
      if (doc.documentType) names.add(doc.documentType);
    });
    optimisticSubmitted.forEach(name => names.add(name));
    return names;
  }, [documents, createPeriod, fy, month, optimisticSubmitted, activeSiteObj, ctxSite]);

  const submittedEvidenceCount = additionalDocs.filter(d => submittedNames.has(d.name)).length;

  const docsSiteId = String(activeSiteObj?.id ?? '');
  useEffect(() => {
    let active = true;
    setDocsBusy(true);
    void fetch(`/api/contractor/clra/site-documents${docsSiteId ? `?siteId=${encodeURIComponent(docsSiteId)}` : ''}`, { cache:'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: { documents?: Array<{ form:string; purpose:string; frequency:string; mandatory:boolean; requiresDocument?:boolean; custom?:boolean; templateId?:number|null; type?:string; requiredFormat?:string; note?:string; aiChecks?: AiCheck[] }> } } | null) => {
        if (!active) return;
        const docs = (body?.data?.documents || [])
          .filter(doc => doc.custom || !doc.templateId)
          .map(doc => ({ name: doc.form || doc.purpose, frequency: doc.custom ? (doc.frequency || '') : '', mandatory: !!doc.mandatory, requiresDocument: doc.custom ? doc.requiresDocument !== false : true, type: doc.type || '', requiredFormat: doc.requiredFormat || '', note: doc.note || '', aiChecks: doc.aiChecks || [], docKind: 'form' as const }));
        setAdditionalDocs(docs);
      })
      .catch(() => { if (active) setAdditionalDocs([]); })
      .finally(() => { if (active) setDocsBusy(false); });
    return () => { active = false; };
  }, [docsSiteId]);

  // The site's adopted CLRA register forms, for the "Upload manually" option.
  useEffect(() => {
    if (clraMode !== 'manual') return;
    let active = true;
    setRegistersBusy(true);
    void fetch(`/api/contractor/clra/templates${docsSiteId ? `?siteId=${encodeURIComponent(docsSiteId)}` : ''}`, { cache:'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { rows?: Array<{ id?:number; formCode:string; title:string; frequency?:string; isMandatory?:boolean; aiChecks?: AiCheck[]; columns?:string[]; outputFormat?:string; fieldMappings?:Array<{column:string;fieldKey:string}> }> } | null) => {
        if (!active) return;
        setRegisterForms((body?.rows || []).map(r => {
          const fmt = (r.outputFormat || '').toLowerCase();
          return {
            name: `${r.formCode || 'Register'}${r.title ? ` — ${r.title}` : ''}`,
            frequency: r.frequency || 'Monthly',
            mandatory: !!r.isMandatory,
            requiresDocument: true,
            type: 'CLRA Register',
            requiredFormat: fmt === 'xlsx' ? 'Excel (XLSX)' : 'PDF',
            note: r.columns?.length ? `${r.columns.length} template column(s)` : '',
            aiChecks: r.aiChecks || [],
            docKind: 'register' as const,
            templateId: r.id,
            columns: r.columns || [],
            outputFormat: r.outputFormat,
            fieldMappings: r.fieldMappings || [],
          };
        }));
      })
      .catch(() => { if (active) setRegisterForms([]); })
      .finally(() => { if (active) setRegistersBusy(false); });
    return () => { active = false; };
  }, [clraMode, docsSiteId]);

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
    setOptimisticSubmitted([]);
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
  // The single Final Submit is enabled only once every mandatory document is uploaded.
  const mandatoryDocs = additionalDocs.filter(doc => doc.mandatory && doc.requiresDocument);
  // Vacuously true when nothing is mandatory, so the common Submit is enabled
  // as soon as no mandatory document is outstanding.
  const allMandatoryUploaded = mandatoryDocs.every(doc => uploads[doc.name]?.id != null);
  // Hide the Submit control once there is nothing left to submit for this
  // context (all registers already submitted and no pending uploads).
  const openBatchCount = generatedForCreate.filter(b => b.status !== 'Submitted' && b.status !== 'Verified').length;
  const pendingUploadCount = [...additionalDocs, ...registerForms]
    .filter(d => uploads[d.name]?.id != null && !submittedNames.has(d.name)).length;
  const hasSomethingToSubmit = openBatchCount > 0 || pendingUploadCount > 0;
  const periodSubmitted = !hasSomethingToSubmit
    && generatedForCreate.some(b => b.status === 'Submitted' || b.status === 'Verified');

  async function uploadEvidence(doc: DocRowUI, next?: File, forceOverwrite: boolean = false) {
    if (!next) return;
    // Validation: if a file is already uploaded for this doc/filter context, ask user before replacing.
    if (!forceOverwrite && uploads[doc.name]?.id != null) {
      setConfirmReupload({ doc, file: next });
      return;
    }
    setRemovedKeys(prev => prev.filter(k => k !== doc.name));
    setError('');
    if (next.size > 10 * 1024 * 1024) {
      setUploads(current => ({ ...current, [doc.name]: { accuracy: 0, status: 'Errors found', findings: ['Choose a document up to 10 MB.'] } }));
      return;
    }
    setUploads(current => ({ ...current, [doc.name]: { accuracy: 0, status: 'Validating' } }));
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 120_000);
    try {
      // 1) Persist the file (no OCR — validation is done by AI below).
      const form = new FormData();
      form.set('file', next); form.set('type', doc.name);
      form.set('site', ctxSite); form.set('employer', ctxEmployer);
      form.set('state', ctxState); form.set('financialYear', fy); form.set('month', month);
      form.set('documentType', doc.name); form.set('frequency', doc.frequency);
      form.set('mandatory', doc.mandatory ? 'true' : 'false');
      form.set('period', `${createPeriod} ${fy.replace('FY ', '')}`);
      form.set('noOcr', '1');
      const response = await fetch('/api/portal/uploads', { method: 'POST', body: form, signal: controller.signal });
      const result = await response.json().catch(() => ({})) as { data?: { id:number }; error?:string };
      if (!response.ok || !result.data?.id) throw new Error(result.error ?? 'Document could not be saved.');
      const id = result.data.id;

      // 2) Run the AI audit (format check + content validation).
      const auditForm = new FormData();
      auditForm.set('file', next); auditForm.set('formName', doc.name);
      auditForm.set('requiredFormat', doc.requiredFormat || '');
      auditForm.set('site', ctxSite);
      auditForm.set('docKind', doc.docKind || 'form');
      auditForm.set('templateTitle', doc.name);
      auditForm.set('templateColumns', JSON.stringify(doc.columns || []));
      auditForm.set('fieldMappings', JSON.stringify(doc.fieldMappings || []));
      auditForm.set('aiChecks', JSON.stringify(doc.aiChecks || []));
      auditForm.set('period', `${createPeriod} ${fy.replace('FY ', '')}`);
      auditForm.set('state', ctxState);
      const auditResponse = await fetch('/api/portal/audit-document', { method: 'POST', body: auditForm, signal: controller.signal });
      const auditResult = await auditResponse.json().catch(() => ({})) as { data?: { format:string; formatOk:boolean; allowedFormats:string[]; chars:number; extractError?:string; ai?: AiAudit }; error?:string };
      if (!auditResponse.ok || !auditResult.data) throw new Error(auditResult.error ?? 'AI audit failed.');
      const d = auditResult.data;
      const ai: AiAudit = d.ai ?? { status: 'error', message: 'No audit result.' };
      const formatOk = d.formatOk !== false;
      const findings = [
        ...(formatOk ? [] : [`Format not allowed — required: ${(d.allowedFormats?.length ? d.allowedFormats.join(', ') : doc.requiredFormat) || 'PDF / DOC / Excel'}.`]),
        ...(d.extractError ? [`Could not read the document text: ${d.extractError}`] : []),
        ...(ai.message ? [ai.message] : []),
        ...(ai.summary ? [ai.summary] : []),
        ...(ai.findings ?? []), ...(ai.issues ?? []), ...(ai.missing ?? []),
      ];
      const ok = formatOk && ai.status !== 'failed' && ai.status !== 'error';
      setUploads(current => ({ ...current, [doc.name]: {
        id, accuracy: 0, status: ok ? 'Validated' : 'Errors found',
        format: d.format, formatOk, allowedFormats: d.allowedFormats, chars: d.chars, ai,
        checkpoints: ai.checkpointResults ?? [], findings,
      } }));
    } catch (reason) {
      setUploads(current => ({ ...current, [doc.name]: { accuracy: 0, status: 'Errors found', findings: [reason instanceof Error ? reason.message : 'Document could not be audited.'] } }));
    } finally {
      window.clearTimeout(timer);
    }
  }

  // Level-1 AI audit status pill + the gate: a batch may only be submitted once
  // every register has passed the audit (or when no AI provider is configured).
  const auditPill = (status?: string) => {
    const s = status || 'pending';
    const tone = s === 'passed' ? 'bg-bss-soft-green text-bss-green border-bss-border'
      : s === 'failed' ? 'bg-bss-soft-orange text-bss-error border-bss-border'
      : s === 'unavailable' ? 'bg-bss-bg text-bss-text-muted border-bss-border'
      : 'bg-bss-soft-orange text-bss-orange border-bss-border';
    const label = s === 'passed' ? 'AI · Passed' : s === 'failed' ? 'AI · Issues' : s === 'unavailable' ? 'AI · N/A' : s === 'review' ? 'AI · Review' : 'AI · Auditing…';
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tone}`} title={s === 'pending' ? 'AI audit is running — submission opens once every register is audited.' : s === 'failed' ? 'AI audit flagged issues — fix them and re-run the audit.' : undefined}>{s === 'passed' ? <CheckCircle2 size={11}/> : s === 'failed' ? <TriangleAlert size={11}/> : null}{label}</span>;
  };

  const batchCols: DataColumn<ContractorPortalData['complianceBatches'][number]>[] = [
    { id:'period', header:'Period', value:b => `${b.month} ${b.year}`, render:b => <span>{b.month} {b.year}{periodOf(b.month, freq) === selectedPeriod && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-blue-tint text-bss-interactive-blue">This period</span>}</span> },
    { id:'state', header:'State', value:b => b.state },
    { id:'version', header:'Ver', filterable:false, value:b => b.version ?? 1, render:b => <VersionHistory versions={(b.versions || []).map(v => ({ version:v.version, isCurrent:v.isCurrent, status:v.status, date:v.generatedOn }))} /> },
    { id:'registers', header:'Registers generated', value:b => b.registerCount ?? 0, render:b => <span title={b.notes || ''} className="font-bold text-bss-navy cursor-help">{b.registerCount ?? 0}</span> },
    { id:'generatedOn', header:'Generated On', value:b => b.generatedOn },
    { id:'generatedBy', header:'Generated By', value:b => b.generatedBy },
    { id:'master', header:'Master File', filterable:false, value:b => b.id, render:b => <a href={`/api/contractor/compliance-batches/${b.id}/master`} download title={`Master file: ${b.employeeCount} worker row(s) · ${b.locationCount} location(s) · ${b.state || '—'} · ${b.month} ${b.year}`} className="text-bss-interactive-blue font-semibold text-xs inline-flex items-center gap-1 hover:underline cursor-help"><Download size={12}/>Download</a> },
    { id:'audit', header:'AI Audit', value:b => b.auditStatus || '', render:b => auditPill(b.auditStatus) },
    { 
      id:'status', 
      header:'Status', 
      value:b => b.status, 
      render:b => <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${b.status === 'Submitted' ? 'bg-bss-soft-green text-bss-green border-bss-border' : b.status === 'Failed' ? 'bg-bss-soft-orange text-bss-error border-bss-border' : 'bg-bss-soft-orange text-bss-orange border-bss-border'}`}>{b.status === 'Generated' ? 'Pending Submission' : b.status}</span> 
    },
    { id:'action', header:'Document', filterable:false, value:b => b.id, render:b => b.hasFile ? <a href={`/api/portal/compliance-batches/zip?batchId=${b.id}`} className="text-bss-interactive-blue font-semibold text-xs inline-flex items-center gap-1 hover:underline"><Download size={12}/>Download ZIP</a> : <span className="text-bss-text-muted text-xs">No file</span> },
  ];

  // Full-width, horizontally scrollable header row for the "Fetch generated"
  // view: every batch field is a column (site, state, month/year, counts,
  // generated on/by) plus the Documents drill-down and Download/Submit actions.
  const generatedBatchCols: DataColumn<ContractorPortalData['complianceBatches'][number]>[] = [
    { id:'site', header:'Site', value:b => `${b.site || ''}${b.siteCode ? ` (${b.siteCode})` : ''}`, render:b => <div><p className="font-semibold text-bss-text-primary">{b.site || b.siteCode || '—'}</p>{b.siteCode && <p className="font-mono text-[10px] text-bss-text-muted">{b.siteCode}</p>}</div> },
    { id:'state', header:'State', value:b => b.state || '—' },
    { id:'month', header:'Month', value:b => b.month || '—' },
    { id:'year', header:'Year', value:b => b.year || '—' },
    { id:'fy', header:'Financial Year', value:b => b.financialYear || '—' },
    { id:'version', header:'Ver', filterable:false, value:b => b.version ?? 1, render:b => <VersionHistory versions={(b.versions || []).map(v => ({ version:v.version, isCurrent:v.isCurrent, status:v.status, date:v.generatedOn }))} /> },
    { id:'registers', header:'Registers', value:b => b.registerCount ?? 0, render:b => <span title={b.notes || ''} className="font-bold text-bss-navy cursor-help">{b.registerCount ?? 0}</span> },
    { id:'generatedOn', header:'Generated On', value:b => b.generatedOn || '—' },
    { id:'generatedBy', header:'Generated By', value:b => b.generatedBy || '—' },
    { id:'master', header:'Master File', filterable:false, value:b => b.id, render:b => <a href={`/api/contractor/compliance-batches/${b.id}/master`} download title={`Master file: ${b.employeeCount} worker row(s) · ${b.locationCount} location(s) · ${b.state || '—'} · ${b.month} ${b.year} · generated ${b.generatedOn}${b.generatedBy ? ` by ${b.generatedBy}` : ''}`} className="h-8 px-3 rounded-lg border border-bss-border bg-white text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-bss-bg cursor-help"><Download size={12}/>Master file</a> },
    { id:'audit', header:'AI Audit', value:b => b.auditStatus || '', render:b => auditPill(b.auditStatus) },
    { id:'status', header:'Status', value:b => b.status, render:b => <div><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${b.status === 'Verified' ? 'bg-bss-soft-green text-bss-green border-bss-border' : b.status === 'Submitted' ? 'bg-bss-blue-tint text-bss-interactive-blue border-bss-border' : (b.status === 'Returned' || b.status === 'Rejected') ? 'bg-bss-soft-orange text-bss-error border-bss-border' : 'bg-bss-soft-green text-bss-green border-bss-border'}`}>{b.status === 'Verified' ? 'Verified' : (b.status === 'Returned' || b.status === 'Rejected') ? 'Returned' : b.status === 'Submitted' ? 'Submitted' : 'Generated · Ready'}</span>{b.reviewNote && <p className="text-[9px] text-bss-error mt-0.5 max-w-[160px]" title={b.reviewNote}>Note: {b.reviewNote}</p>}</div> },
    { id:'documents', header:'Documents', filterable:false, value:b => b.id, render:b => <button type="button" onClick={() => setBatchView(String(b.id))} className="h-8 px-3 rounded-lg border border-bss-border bg-white text-[11px] font-semibold hover:bg-bss-bg">Documents</button> },
    { id:'action', header:'Action', filterable:false, value:b => b.id, render:b => <div className="flex items-center gap-2">{b.hasFile && <a href={`/api/portal/compliance-batches/zip?batchId=${b.id}`} className="h-8 px-3 rounded-lg border border-bss-border bg-white text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-bss-bg"><Download size={12}/>Download ZIP</a>}</div> },
  ];

  const verified = submittedDocuments.filter(row => row.status === 'Verified').length;
  const pending = submittedDocuments.filter(row => row.status !== 'Verified' && row.status !== 'Returned').length;

  // One common submit for the whole package: the generated CLRA registers for
  // this context plus every uploaded additional form, in a single request.
  async function submitAll() {
    setError(''); setNotice('');
    if (isFutureMonth(fy, month)) { setError('This is a future period — compliance can only be submitted for months that have already started.'); return; }
    const siteObj = activeSiteObj;
    const empName = siteObj?.employer || ctxEmployer;
    const subSiteName = siteObj?.name || ctxSite;
    const stName = siteObj?.state || ctxState;
    const pendingUploads = [...additionalDocs, ...registerForms]
      .filter(d => uploads[d.name]?.id != null && !submittedNames.has(d.name))
      .map(d => uploads[d.name]?.id as number);
    const openBatches = generatedForCreate.filter(b => b.status !== 'Submitted' && b.status !== 'Verified');
    const batchIds = openBatches.map(b => b.id);
    if (!pendingUploads.length && !batchIds.length) {
      setNotice('Nothing ready to submit — upload documents or generate registers first.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/portal/compliances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'submit', employer: empName, site: subSiteName, period: `${createPeriod} ${fy.replace('FY ', '')}`, financialYear: fy, state: stName, month, location: '', complianceType: '', docName: '', uploadIds: pendingUploads, batchIds }),
      });
      const result = await response.json().catch(() => ({})) as { data?: ContractorPortalData['auditReports'][number]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'The submission could not be completed.');
      replaceContractor({ ...contractor, auditReports: [result.data, ...contractor.auditReports] });
      setOptimisticSubmitted(prev => Array.from(new Set([...prev, ...[...additionalDocs, ...registerForms].filter(d => uploads[d.name]?.id != null).map(d => d.name)])));
      setUploads({});
      setNotice(`Submitted! Ref No: ${result.data.uniqueNo}. The detailed audit report is ready in the Contractor Report tab.`);
      onSubmitted?.({ site: subSiteName, month, financialYear: fy });
      void refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The submission could not be completed.');
    } finally { setBusy(false); }
  }

  async function submitSingleForm(docName: string, uploadId?: number, force = false) {
    if (!uploadId) return;
    setBusy(true); setError(''); setNotice('');
    if (isFutureMonth(fy, month)) { setBusy(false); setError('This is a future period — compliance can only be submitted for months that have already started.'); return; }
    const siteObj = activeSiteObj;
    const empName = siteObj?.employer || ctxEmployer;
    const subSiteName = siteObj?.name || ctxSite;
    const stName = siteObj?.state || ctxState;
    try {
      const response = await fetch('/api/portal/compliances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'submit', employer: empName, site: subSiteName, period: `${createPeriod} ${fy.replace('FY ', '')}`, financialYear: fy, state: stName, month, location: '', complianceType: docName, docName, uploadIds: [uploadId], batchIds: [], force }),
      });
      const result = await response.json().catch(() => ({})) as { data?: ContractorPortalData['auditReports'][number]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Document could not be submitted.');
      replaceContractor({ ...contractor, auditReports: [result.data, ...contractor.auditReports] });
      // Flip the row to Submitted immediately; the full portal refresh runs in the background.
      setOptimisticSubmitted(prev => (prev.includes(docName) ? prev : [...prev, docName]));
      setUploads(current => { const next = { ...current }; delete next[docName]; return next; });
      setNotice(`Submitted successfully! Ref No: ${result.data.uniqueNo} (${docName})${force ? ' — submitted despite OCR issues' : ''}.`);
      void refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Document could not be submitted.');
    } finally { setBusy(false); }
  }

  async function viewAuditReport(submissionId: string | number, label: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/contractor/submissions/${submissionId}/ai-report`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: { html?: string }; error?: string };
      if (!response.ok || !body.data?.html) throw new Error(body.error ?? 'The audit report could not be generated.');
      openPrintHtml(body.data.html, `${label} — BSS AI Audit Report`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The audit report could not be generated.');
    } finally { setBusy(false); }
  }

  const documentColumns: DataColumn<DocumentRow>[] = [
    { id:'type', header: 'Document / Package', value: row => row.type, render: row => <div><strong className="text-bss-text-primary font-semibold">{row.type}</strong>{row.fileName && <p className="text-[10px] text-bss-text-muted mt-0.5">{row.fileName}</p>}{row.source === 'evidence' && row.id && <a href={`/api/contractor/submissions/${row.id}/file`} target="_blank" rel="noreferrer" className="block text-[10px] text-bss-interactive-blue hover:underline mt-0.5">View evidence</a>}{row.findings && row.findings.length > 0 && <button type="button" onClick={() => setViewErrors({ name: row.type, findings: row.findings ?? [] })} className="block text-[10px] text-bss-error font-semibold hover:underline mt-0.5">View errors ({row.findings.length})</button>}</div> },
    { id:'uniqueNo', header: 'Package Ref No.', value: row => row.uniqueNo ?? '—', render: row => row.uniqueNo ? <span className="font-mono text-bss-interactive-blue font-bold bg-bss-blue-tint px-2 py-0.5 rounded border border-bss-border">{row.uniqueNo}</span> : <span className="text-bss-text-muted">—</span> },
    { id:'employer', header: 'Principal Employer', value: row => row.employer },
    { id:'site', header: 'Site / Location', value: row => `${row.site}${row.state ? ` (${row.state})` : ''}` },
    { id:'period', header: 'Period / FY', value: row => `${row.period}${row.financialYear ? ` · ${row.financialYear}` : ''}` },
    { id:'ai', header: 'AI Audit', value: row => row.aiStatus ?? '', render: row => { const s = row.aiStatus || ''; const tone = s === 'passed' ? 'bg-bss-soft-green text-bss-green border-bss-border' : s === 'failed' ? 'bg-bss-soft-orange text-bss-error border-bss-border' : s === 'unavailable' ? 'bg-bss-bg text-bss-text-muted border-slate-200' : s === 'review' ? 'bg-bss-soft-orange text-bss-orange border-bss-border' : 'bg-bss-bg text-bss-text-muted border-slate-200'; const label = s === 'passed' ? 'Passed' : s === 'failed' ? 'Issues' : s === 'review' ? 'Review' : s === 'unavailable' ? 'Not audited' : (s || '—'); const cps = row.checkpoints || []; const canDownload = row.source === 'evidence' && /^\d+$/.test(String(row.id)); return <div><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${tone}`}>{label}</span>{cps.length > 0 && <p className="text-[9px] text-bss-text-muted mt-0.5">{cps.filter(c => c.passed).length}/{cps.length} checks</p>}{canDownload && <a href={`/api/contractor/submissions/${row.id}/issues`} download className="block text-[10px] text-bss-error font-semibold hover:underline mt-0.5">Issues (Excel)</a>}</div>; } },
    { id:'created', header: 'Submitted On', value: row => row.submittedAt, render: row => new Date(row.submittedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) },
    { 
      id:'status', 
      header: 'Status', 
      value: row => row.status, 
      render: row => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
          row.status === 'Verified' ? 'bg-bss-soft-green text-bss-green border border-bss-border' :
          row.status === 'Returned' ? 'bg-bss-soft-orange text-bss-error border border-bss-border' :
          'bg-bss-soft-orange text-bss-orange border border-bss-border'
        }`}>
          {row.status === 'Verified' ? 'Verified' : row.status === 'Returned' ? 'Returned' : 'Pending Review'}
        </span>
      ) 
    },
  ];

  // Shared table for "additional forms" and, in manual mode, the CLRA register
  // forms the contractor uploads themselves.
  const registerFrequencies = useMemo(() => Array.from(new Set(registerForms.map(r => r.frequency).filter(Boolean))), [registerForms]);
  const filteredRegisterForms = useMemo(() => {
    const q = regQuery.trim().toLowerCase();
    return registerForms.filter(r =>
      (!q || r.name.toLowerCase().includes(q) || (r.columns || []).some(c => c.toLowerCase().includes(q))) &&
      (!regFreqFilter || r.frequency === regFreqFilter) &&
      (!regOnlyMandatory || r.mandatory));
  }, [registerForms, regQuery, regFreqFilter, regOnlyMandatory]);

  const renderDocsTable = (docs: DocRowUI[], opts: { showColumns?: boolean } = {}) => (
    <div className="border border-bss-border rounded-xl overflow-hidden bg-white">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-bss-bg border-b border-bss-border text-[11px] font-semibold text-bss-text-secondary">
            <th className="py-2 px-3 text-left">Document Name</th>
            <th className="py-2 px-3 text-left">Type</th>
            <th className="py-2 px-3 text-left">Frequency</th>
            <th className="py-2 px-3 text-left">Mandatory</th>
            <th className="py-2 px-3 text-left">Required Format</th>
            <th className="py-2 px-3 text-left">Note</th>
            {opts.showColumns && <th className="py-2 px-3 text-left">Template Columns</th>}
            <th className="py-2 px-3 text-left">AI Audit</th>
            <th className="py-2 px-3 text-left">Submit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bss-border text-xs">
          {docs.map(doc => {
            const up = uploads[doc.name];
            const isSubmitted = submittedNames.has(doc.name);
            const submittedRow = isSubmitted
              ? submittedDocuments.find(d => d.type?.toLowerCase() === doc.name.toLowerCase() || d.type?.toLowerCase().includes(doc.name.toLowerCase()))
              : undefined;
            const isReturned = isSubmitted && submittedRow?.status === 'Returned';
            const locked = isSubmitted && !isReturned;
            return (
              <tr key={doc.name} className={`align-top hover:bg-bss-bg/60 transition-colors ${up?.status === 'Validated' ? 'bg-bss-soft-green/40' : doc.mandatory ? 'bg-bss-soft-orange/20' : ''}`}>
                <td className="py-2 px-3 font-semibold text-bss-text-primary">{doc.name}</td>
                <td className="py-2 px-3"><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-bss-blue-tint text-bss-interactive-blue">{doc.type || '—'}</span></td>
                <td className="py-2 px-3 text-bss-text-secondary text-[11px]">{doc.frequency || 'Monthly'}</td>
                <td className="py-2 px-3">
                  {doc.mandatory ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-bss-soft-orange text-bss-orange">Mandatory</span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-bss-bg text-bss-text-muted">Optional</span>
                  )}
                </td>
                <td className="py-2 px-3 text-bss-text-secondary text-[11px] whitespace-nowrap">{doc.requiredFormat || '—'}</td>
                <td className="py-2 px-3 text-bss-text-muted text-[11px] max-w-[200px]" title={doc.note || ''}>{doc.note || '—'}</td>
                {opts.showColumns && (
                  <td className="py-2 px-3 text-[11px]">
                    {(doc.columns?.length ?? 0) === 0 ? (
                      <span className="text-bss-text-muted">—</span>
                    ) : (
                      <button type="button" onClick={() => setTemplateView(doc)} className="text-bss-interactive-blue font-semibold hover:underline">{doc.columns!.length} column{doc.columns!.length === 1 ? '' : 's'}</button>
                    )}
                  </td>
                )}
                <td className="py-2.5 px-4 whitespace-nowrap">
                  {locked ? (
                    <span className="text-[11px] font-bold text-bss-green inline-flex items-center gap-1"><CheckCircle2 size={12}/> Submitted</span>
                  ) : !up ? (
                    <span className="text-bss-text-muted text-[11px]">Upload to run the AI audit</span>
                  ) : up.status === 'Validating' ? (
                    <span className="text-[11px] font-bold text-bss-interactive-blue">Auditing…</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                      <span className={`font-bold ${up.formatOk ? 'text-bss-green' : 'text-bss-error'}`}>
                        {up.formatOk ? '✓' : '✗'} Format{up.format ? ` · ${up.format.toUpperCase()}` : ''}
                      </span>
                      {up.ai && (
                        <span className={`font-bold ${up.ai.status === 'passed' ? 'text-bss-green' : up.ai.status === 'failed' || up.ai.status === 'error' ? 'text-bss-error' : 'text-bss-orange'}`}>
                          {up.ai.status === 'passed' ? 'AI passed' : up.ai.status === 'failed' ? 'AI failed' : up.ai.status === 'unavailable' ? 'AI n/a' : up.ai.status === 'error' ? 'AI error' : 'AI review'}{up.ai.confidence != null ? ` · ${up.ai.confidence}%` : ''}
                        </span>
                      )}
                      {up.findings?.length ? (
                        <button type="button" onClick={() => setViewErrors({ name: doc.name, findings: up.findings ?? [], uploadId: up.id })} className="font-semibold text-bss-error hover:underline">
                          {up.findings.length} finding{up.findings.length === 1 ? '' : 's'}
                        </button>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-4 whitespace-nowrap">
                  {locked ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-[11px] font-semibold inline-flex items-center gap-1 text-bss-green">
                        <Lock size={12}/> {submittedRow?.status === 'Verified' ? 'Verified' : 'Submitted'}
                      </span>
                      {submittedRow?.id && <a href={`/api/contractor/submissions/${submittedRow.id}/file`} className="text-[11px] text-bss-interactive-blue font-semibold hover:underline inline-flex items-center gap-1"><Download size={11}/>Download</a>}
                      {submittedRow?.id && <button type="button" onClick={() => void viewAuditReport(submittedRow.id, doc.name)} className="text-[11px] text-bss-navy font-semibold hover:underline">AI report</button>}
                      {submittedRow?.id && <a href={`/api/contractor/submissions/${submittedRow.id}/ai-report?format=pdf`} className="text-[11px] text-bss-interactive-blue font-semibold hover:underline inline-flex items-center gap-1"><Download size={11}/>PDF</a>}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {isReturned && <span className="text-[11px] font-bold text-bss-error">Returned</span>}
                      <label className="h-6 px-2.5 rounded-md border border-bss-border text-[11px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-bss-bg bg-white">
                        <Upload size={11} className="text-bss-text-secondary"/>
                        {up?.id != null ? 'Re-upload' : 'Upload'}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls,.csv" className="hidden" onChange={e => uploadEvidence(doc, e.target.files?.[0])}/>
                      </label>
                      {up?.id != null && (
                        <button type="button" onClick={() => handleRemoveEvidence(doc.name)} className="text-[11px] text-bss-error font-semibold hover:underline">Remove</button>
                      )}
                      {up?.id != null && (
                        <a href={`/api/contractor/submissions/${up.id}/file`} className="text-[11px] text-bss-interactive-blue font-semibold hover:underline inline-flex items-center gap-1"><Download size={11}/>Download</a>
                      )}
                      {up?.status === 'Validating' ? (
                        <span className="text-[11px] font-bold text-bss-interactive-blue">Auditing…</span>
                      ) : up?.status === 'Errors found' ? (
                        <span className="text-[11px] font-bold text-bss-error">AI flagged — re-upload</span>
                      ) : up?.status === 'Validated' ? (
                        <span className="text-[11px] font-semibold text-bss-green">Ready to submit</span>
                      ) : (
                        <span className="text-[11px] font-medium text-bss-text-muted">Upload a document</span>
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
  );

  return <div className={embedded ? 'space-y-4' : 'space-y-6 pb-12'}>
    {!embedded && <header className="bss-page-header flex-col sm:flex-row justify-between items-start sm:items-center">
      <div>
        <p className="bss-eyebrow">Contractor Data Exchange</p>
        <h1 className="bss-page-title mt-1">Compliance Submissions</h1>
        <p className="bss-page-description">Manage and upload periodic statutory packages, CLRA registers, and evidence documents for principal employers.</p>
      </div>
      {contractor.identity?.incorpDate && (
        <div className="bg-bss-bg/80 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-bss-text-primary flex items-center gap-2 mt-3 sm:mt-0">
          <Info size={15} className="text-bss-interactive-blue" />
          <span>Registered: <strong>{new Date(contractor.identity.incorpDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</strong></span>
        </div>
      )}
    </header>}

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error flex items-center gap-2"><AlertCircle size={15}/>{error}</p>}

    {!embedded && <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      <Metric label="Total Submissions" value={submittedDocuments.length} icon={FileUp} tone="bg-bss-blue-tint text-bss-interactive-blue"/>
      <Metric label="Verified Packages" value={verified} icon={CheckCircle2} tone="bg-bss-soft-green text-bss-green"/>
      <Metric label="Pending Review" value={pending} icon={FileCheck2} tone="bg-bss-soft-orange text-bss-orange"/>
      <Metric label="Employer Scope" value={employerScope === 'all' ? contractor.employers.length : 1} icon={ShieldCheck} tone="bg-bss-blue-tint text-bss-interactive-blue"/>
    </section>}

    {!embedded && <div className="flex border-b border-bss-border overflow-x-auto">
      <button 
        onClick={() => setTab('submissions')} 
        className={`px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${tab === 'submissions' ? 'border-bss-orange text-bss-navy' : 'border-transparent text-bss-text-secondary hover:text-bss-navy'}`}
      >
        📋 Submissions Log &amp; Records
      </button>
      <button 
        onClick={() => setTab('create')} 
        className={`px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${tab === 'create' ? 'border-bss-orange text-bss-navy' : 'border-transparent text-bss-text-secondary hover:text-bss-navy'}`}
      >
        📤 Submit Compliance Package
      </button>
    </div>}

    {tab === 'submissions' && <div className="space-y-4">
      {/* Filters Card */}
      <div className="bg-white p-4 rounded-2xl border border-bss-border space-y-3.5 shadow-sm">
        {/* Site Filter & Employer Info */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-extrabold text-bss-text-muted uppercase tracking-wider flex-shrink-0">Site:</span>
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="h-9 rounded-lg border border-bss-border px-3 text-xs bg-white font-semibold">
            {contractor.sites.map(s => (
              <option key={s.id} value={s.name}>
                {s.name}{s.employer ? ` (${s.employer})` : ''}{s.state ? ` — ${s.state}` : ''}
              </option>
            ))}
          </select>
          {(() => {
            const currentSiteObj = contractor.sites.find(s => s.name === siteFilter);
            const empName = currentSiteObj?.employer || contractor.employers[0]?.name;
            return empName ? (
              <span className="text-xs font-semibold text-bss-text-primary bg-bss-bg border border-slate-200 px-3 py-1 rounded-lg inline-flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-bss-interactive-blue" />
                Principal Employer: <strong className="text-bss-text-primary">{empName}</strong>
              </span>
            ) : null;
          })()}
        </div>

        {/* Registration-Based Financial Year Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-bss-border">
          <span className="text-xs font-extrabold text-bss-text-muted uppercase tracking-wider flex-shrink-0">Financial Year:</span>
          <div className="flex flex-wrap gap-1.5">
            {availableYears.map(yr => {
              const yrCount = submittedDocuments.filter(doc => {
                let fyStr = doc.financialYear || (doc.period?.includes('FY') ? doc.period.slice(doc.period.indexOf('FY')) : '');
                if (fyStr) {
                  fyStr = fyStr.trim();
                  if (!fyStr.startsWith('FY ')) fyStr = `FY ${fyStr.replace(/^FY\s*/, '')}`;
                }
                return (fyStr || availableYears[0]) === yr;
              }).length + (batchCountByFy[yr.replace('FY ', '')] || 0);
              return (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${selectedYear === yr ? 'bg-bss-interactive-blue text-white shadow-sm' : 'bg-bss-bg text-bss-text-secondary hover:bg-bss-blue-tint'}`}
                >
                  {yr} <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${selectedYear === yr ? 'bg-white/20 text-white' : 'bg-bss-blue-tint text-bss-text-secondary'}`}>{yrCount}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Frequency Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-bss-border">
          <span className="text-xs font-semibold text-bss-text-muted uppercase tracking-wider flex-shrink-0">Frequency:</span>
          <div className="flex flex-wrap gap-1.5">
            {FREQUENCIES.map(f => (
              <button 
                key={f} 
                onClick={() => { setFreq(f); setSelectedPeriod(periodsFor(f)[0]); }} 
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${freq === f ? 'bg-bss-interactive-blue text-white shadow-sm' : 'bg-bss-bg text-bss-text-secondary hover:bg-bss-blue-tint'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Period Filter Tabs */}
        <div className="flex items-center gap-3 pt-3 border-t border-bss-border overflow-x-auto">
          <span className="text-xs font-extrabold text-bss-text-muted uppercase tracking-wider flex-shrink-0">Period:</span>
          <div className="flex items-center gap-1.5">
            {visiblePeriods.map(p => {
              const count = (documentsByPeriod[p]?.length || 0) + (batchCountByPeriod[p] || 0);
              return (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${selectedPeriod === p ? 'bg-bss-interactive-blue text-white shadow-sm' : 'bg-bss-bg text-bss-text-secondary hover:bg-bss-surface'}`}
                >
                  {p} <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedPeriod === p ? 'bg-white/20 text-white' : 'bg-bss-surface text-bss-text-primary'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Month-by-Month Compliance Matrix & Pending Overview */}
      <section className="bg-white rounded-2xl border border-bss-border overflow-hidden shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-bss-text-primary flex items-center gap-1.5">
              📅 {selectedYear} Monthly Compliance Tracker (Registers + Itemized Forms)
            </h3>
            <p className="text-[11px] text-bss-text-muted mt-0.5">Registers Batch (1 Unit) + Each Required Statutory Evidence Form counted as a separate item.</p>
          </div>
          <span className="text-[11px] font-bold text-bss-interactive-blue bg-bss-blue-tint border border-bss-border px-2.5 py-1 rounded-lg">
            {(() => {
              // Every month that has already arrived counts toward the progress
              // figure — past months are always eligible for filing.
              const eligible = MONTHS.filter(m => !isFutureMonth(selectedYear, m));
              const done = eligible.filter(m => {
                const p = periodOf(m, freq);
                const mDocs = documentsByPeriod[p] || [];
                const hasRegs = (batchCountByPeriod[p] || 0) > 0;
                const expectedFormsCount = additionalDocs.length || 1;
                return hasRegs && mDocs.length >= expectedFormsCount;
              }).length;
              return `${done} / ${eligible.length} Months Fully Submitted`;
            })()}
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
            const future = isFutureMonth(selectedYear, m);
            const inactive = future;

            return (
              <button
                key={m}
                type="button"
                disabled={inactive}
                onClick={() => setSelectedPeriod(p)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  inactive ? 'border-bss-border bg-bss-bg opacity-60 cursor-not-allowed' :
                  isSelected ? 'border-bss-interactive-blue bg-bss-blue-tint ring-2 ring-bss-interactive-blue/20 shadow-xs' :
                  isFull ? 'border-bss-border bg-bss-soft-green hover:border-bss-green' :
                  isPartial ? 'border-bss-border bg-bss-blue-tint hover:border-bss-interactive-blue' :
                  'border-bss-border bg-bss-soft-orange hover:border-bss-orange'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-bss-text-primary">{m}</span>
                  {future ? (
                    <span className="text-[10px] font-medium text-bss-text-muted">Upcoming</span>
                  ) : isFull ? (
                    <span className="text-[10px] font-bold text-bss-green bg-bss-soft-green px-1.5 py-0.5 rounded">
                      {completedUnits}/{totalUnits} Complete
                    </span>
                  ) : isPartial ? (
                    <span className="text-[10px] font-bold text-bss-text-primary bg-bss-blue-tint px-1.5 py-0.5 rounded">
                      {completedUnits}/{totalUnits} Submitted
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-bss-orange bg-bss-soft-orange px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <AlertCircle size={10}/> 0/{totalUnits} Pending
                    </span>
                  )}
                </div>
                
                {!inactive && <div className="mt-2 space-y-0.5 text-[10px]">
                  <p className={`font-semibold flex items-center gap-1 ${hasRegs ? 'text-bss-green' : 'text-bss-orange'}`}>
                    <span>{hasRegs ? '✓' : '•'}</span> Registers: {hasRegs ? 'Submitted' : 'Pending'}
                  </p>
                  <p className={`font-semibold flex items-center gap-1 ${submittedFormsCount > 0 ? (totalConfiguredForms && submittedFormsCount < totalConfiguredForms ? 'text-bss-interactive-blue' : 'text-bss-green') : 'text-bss-orange'}`}>
                    <span>{submittedFormsCount > 0 ? '✓' : '•'}</span> Forms: {submittedFormsCount}{totalConfiguredForms ? `/${totalConfiguredForms}` : ''} Submitted
                  </p>
                </div>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Generated CLRA Registers */}
      <section className="bg-white rounded-2xl border border-bss-border overflow-hidden shadow-sm">
        {periodBatches.length
          ? <>
              <EnterpriseDataTable title={`Generated CLRA Registers (${selectedYear} · ${selectedPeriod})`} rows={periodBatches} columns={batchCols} rowKey={b => b.id} filename={`clra-generated-${fyKey}`} />
            </>
          : <div className="px-5 py-4"><h3 className="flex items-center gap-2 text-xs font-semibold text-bss-navy"><FileCheck2 size={16} className="text-bss-interactive-blue"/>Generated CLRA Registers ({selectedYear})</h3><p className="mt-1 text-xs text-bss-text-muted">No CLRA registers generated for {selectedPeriod} ({selectedYear}) yet.</p></div>}
      </section>

      {/* Submissions Listing Table */}
      <section className="bg-white rounded-2xl border border-bss-border overflow-hidden shadow-sm">
        <EnterpriseDataTable title={`${selectedPeriod} Submissions (${selectedYear})`} rows={filteredDocuments} columns={documentColumns} rowKey={row => row.id} filename={`compliance-documents-${selectedPeriod.toLowerCase().replace(/[^a-z0-9]/g, '')}-${selectedYear.toLowerCase().replace(/[^a-z0-9]/g, '')}`} />
      </section>
    </div>}

    {tab === 'create' && <section className="bg-white border border-bss-border rounded-2xl overflow-hidden shadow-sm">
      <header className="px-5 py-4 border-b border-bss-border bg-bss-bg/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2">
            <FileUp size={16} className="text-bss-interactive-blue" />
            Submit Compliance &amp; Evidence Package
          </h2>
          <p className="text-xs text-bss-text-muted mt-0.5">Select site, financial year, and period. Upload statutory evidence documents — part submissions are fully supported with real-time pending badges.</p>
        </div>
        <div className="flex-shrink-0">
          <span className="text-[11px] font-semibold text-bss-text-secondary bg-bss-bg border border-slate-200 px-3 py-1 rounded-lg">
            Part Submissions Allowed
          </span>
        </div>
      </header>

      <div className="p-5 space-y-5">
        <div className="space-y-4">
          {/* Gradient context hero — distinct look for the Compliance Records tab */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bss-navy via-bss-deep-navy to-[#022B5E] text-white p-4">
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/5" />
            <div className="absolute -right-2 top-10 w-16 h-16 rounded-full bg-white/5" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Submitting for</p>
                <p className="text-xl font-extrabold leading-tight mt-0.5">{createPeriod} {fy.replace('FY ', '')}</p>
                <p className="text-[11px] text-white/75 mt-0.5">{createFreq} · {activeSiteObj?.state || '—'}</p>
              </div>
              <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 grid place-items-center flex-shrink-0"><FileUp size={22}/></span>
            </div>
            <div className="relative mt-3 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 truncate max-w-full">{activeSiteObj?.name || 'No site'}</span>
              {activeSiteObj?.employer && <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 truncate max-w-full">{activeSiteObj.employer}</span>}
            </div>
            <p className="relative mt-3 text-[11px] text-white/70 leading-5">Full or part submissions supported. Each upload runs the <strong className="text-white">AI audit</strong> before you save.</p>
          </div>

          {/* Selectors — unified filter toolbar */}
          <div className="rounded-2xl border border-bss-border bg-white p-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-[11px] font-semibold text-bss-text-secondary">Site</span>
                <select value={activeSiteObj?.name || ''} onChange={e => setSiteName(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-xs bg-white font-medium text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue">
                  {contractor.sites.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name}{s.employer ? ` (${s.employer})` : ''}{s.state ? ` — ${s.state}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-bss-text-secondary">Financial Year</span>
                <select value={fy} onChange={e => setFy(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-xs bg-white font-medium text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue">{availableYears.map(f => <option key={f}>{f}</option>)}</select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-bss-text-secondary">Frequency</span>
                <select value={createFreq} onChange={e => { const f = e.target.value as Frequency; setCreateFreq(f); setCreatePeriod(periodsFor(f)[0]); }} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-xs bg-white font-medium text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue">{FREQUENCIES.map(f => <option key={f}>{f}</option>)}</select>
              </label>
            </div>

            <div className="mt-3">
              <span className="text-[11px] font-semibold text-bss-text-secondary">Period</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {visibleCreatePeriods.map(p => {
                  const future = isFutureMonth(fy, periodMonth(p));
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={future}
                      title={future ? 'Future period — not available yet' : undefined}
                      onClick={() => { if (!future) setCreatePeriod(p); }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${future ? 'bg-bss-bg text-bss-text-muted border-bss-border cursor-not-allowed opacity-60' : createPeriod === p ? 'bg-bss-interactive-blue text-white border-bss-interactive-blue shadow-sm' : 'bg-bss-bg text-bss-text-secondary border-bss-border hover:bg-bss-blue-tint'}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 text-[11px] text-bss-text-muted">Past periods are always selectable — pick the year and period the documents belong to.</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <p className="text-xs font-semibold text-bss-text-secondary">1 · CLRA Registers</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg border border-bss-border overflow-hidden">
                <button type="button" onClick={() => setClraMode('generated')} className={`h-7 px-3 text-[11px] font-semibold ${clraMode === 'generated' ? 'bg-bss-navy text-white' : 'bg-white text-bss-text-secondary hover:bg-bss-bg'}`}>Fetch generated</button>
                <button type="button" onClick={() => setClraMode('manual')} className={`h-7 px-3 text-[11px] font-semibold border-l border-bss-border ${clraMode === 'manual' ? 'bg-bss-navy text-white' : 'bg-white text-bss-text-secondary hover:bg-bss-bg'}`}>Upload manually</button>
              </div>
            </div>
          </div>

          {clraMode === 'generated' ? (
            generatedForCreate.length
              ? <div className="mb-6"><EnterpriseDataTable title={`Generated CLRA registers — ${createPeriod} ${createFyKey}`} rows={generatedForCreate} columns={generatedBatchCols} rowKey={b => b.id} filename={`generated-clra-${createFyKey}-${month.toLowerCase()}`} /></div>
              : <p className="text-xs text-bss-text-muted mb-6">No CLRA registers generated for {createPeriod} {fy.replace('FY ', '')} yet.</p>
          ) : registersBusy ? (
            <p className="text-xs text-bss-text-muted py-3 mb-6">Loading CLRA forms…</p>
          ) : registerForms.length === 0 ? (
            <p className="text-xs text-bss-text-muted py-3 mb-6">No CLRA register forms configured for this site.</p>
          ) : (
            <div className="mb-6 space-y-3">
              <div className="rounded-xl border border-bss-border bg-bss-bg p-2.5 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-bss-text-muted" />
                  <input value={regQuery} onChange={e => setRegQuery(e.target.value)} placeholder="Search register or template column…" className="w-full h-9 rounded-lg border border-bss-border pl-8 pr-3 text-xs bg-white" />
                </div>
                <select value={regFreqFilter} onChange={e => setRegFreqFilter(e.target.value)} className="h-9 rounded-lg border border-bss-border px-2 text-xs bg-white"><option value="">All frequencies</option>{registerFrequencies.map(f => <option key={f} value={f}>{f}</option>)}</select>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-bss-text-secondary cursor-pointer"><input type="checkbox" checked={regOnlyMandatory} onChange={e => setRegOnlyMandatory(e.target.checked)} className="w-4 h-4" />Mandatory only</label>
                <span className="text-[11px] text-bss-text-muted ml-auto">{filteredRegisterForms.length} of {registerForms.length} registers</span>
              </div>
              {filteredRegisterForms.length === 0
                ? <p className="text-xs text-bss-text-muted py-3">No registers match these filters.</p>
                : renderDocsTable(filteredRegisterForms, { showColumns: true })}
            </div>
          )}

          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold text-bss-text-secondary">
                2 · Additional Forms ({submittedEvidenceCount}/{additionalDocs.length} Submitted
                {totalMandatoryDocsCount > 0 ? ` · ${uploadedMandatoryCount}/${totalMandatoryDocsCount} Mandatory` : ''})
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API file download */}
                <a
                  href={`/api/portal/submissions/zip?site=${encodeURIComponent(ctxSite)}&year=${encodeURIComponent(fy)}&period=${encodeURIComponent(createPeriod)}`}
                  className="h-7 px-3 rounded-lg border border-bss-border bg-white text-[11px] font-semibold text-bss-text-primary flex items-center gap-1 hover:bg-bss-bg"
                  title="Download all uploaded evidence documents for this site and period as a ZIP"
                >
                  <Download size={12}/>Download Additional Forms (ZIP)
                </a>
                {!allMandatoryUploaded && (
                  <span className="text-[10px] font-semibold text-bss-orange bg-bss-soft-orange border border-bss-border px-2.5 py-1 rounded-full">
                    {mandatoryDocs.filter(doc => uploads[doc.name]?.id == null).length} mandatory pending
                  </span>
                )}
                {allMandatoryUploaded && isPartialSubmission && (
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-bss-soft-orange text-bss-orange border border-bss-border">
                    Part Submissions Allowed ({missingEvidence.length} pending)
                  </span>
                )}
              </div>
            </div>

            {docsBusy ? (
              <p className="text-xs text-bss-text-muted py-3">Loading required documents…</p>
            ) : additionalDocs.length === 0 ? (
              <p className="text-xs text-bss-text-muted py-3">No specific evidence documents configured for this site.</p>
            ) : renderDocsTable(additionalDocs)}
          </div>
          {error && <p role="alert" className="bss-alert bss-alert-error mt-3">{error}</p>}
          <div className="mt-4 pt-4 border-t border-bss-border flex flex-wrap items-center justify-end gap-3">
            {hasSomethingToSubmit && <button type="button" onClick={() => void submitAll()} disabled={busy || !allMandatoryUploaded} title={allMandatoryUploaded ? 'Submit all generated registers and uploaded forms in one package' : 'Upload all mandatory documents to enable'} className="h-9 px-4 rounded-lg bg-bss-navy text-white text-xs font-bold flex items-center gap-1.5 hover:bg-bss-deep-navy disabled:opacity-50"><FileUp size={14}/>{busy ? 'Submitting…' : 'Submit All (Registers + Forms)'}</button>}
            {periodSubmitted && (
              <span className="text-xs font-bold text-bss-green bg-bss-soft-green border border-bss-border px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                <CheckCircle2 size={13} /> Submitted for this period
              </span>
            )}
          </div>
        </div>
      </div>
    </section>}

    {viewErrors && <div className="fixed inset-0 z-[115] bg-black/60 backdrop-blur-sm grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setViewErrors(null); }}>
      <section role="dialog" aria-modal="true" className="w-full max-w-lg max-h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <header className="p-5 border-b border-bss-border flex justify-between items-start gap-3 flex-shrink-0"><div><h2 className="font-semibold text-bss-text-primary">Why this upload failed</h2><p className="text-xs text-bss-text-muted mt-1">{viewErrors.name}</p></div><button type="button" onClick={() => setViewErrors(null)} className="w-11 h-11 -mr-2 -mt-2 grid place-items-center rounded-lg hover:bg-bss-bg" aria-label="Close"><X/></button></header>
        <div className="overflow-y-auto flex-1 p-5">
          {viewErrors.findings.length
            ? <ul className="space-y-2 text-sm text-bss-text-primary">{viewErrors.findings.map((f, i) => <li key={i} className="flex gap-2"><span className="text-bss-error">•</span>{f}</li>)}</ul>
            : <p className="text-sm text-bss-text-muted">No specific reason recorded.</p>}
        </div>
        {viewErrors.uploadId != null && (
          <footer className="px-5 py-4 border-t border-bss-border flex items-center justify-between gap-2 flex-shrink-0 bg-white">
            <p className="text-[11px] text-bss-text-muted">Overriding records the failed checks against this document.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setViewErrors(null)} className="h-9 px-4 rounded-lg border border-bss-border text-xs font-bold text-bss-text-secondary">Close</button>
              <button type="button" disabled={busy} onClick={() => { const id = viewErrors.uploadId; const name = viewErrors.name; setViewErrors(null); void submitSingleForm(name, id, true); }} className="h-9 px-4 rounded-lg bg-bss-error text-white text-xs font-bold hover:bg-bss-error disabled:opacity-40">Submit forcefully</button>
            </div>
          </footer>
        )}
      </section>
    </div>}

    {templateView && <div className="fixed inset-0 z-[90] bg-black/50 grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setTemplateView(null); }}>
      <section role="dialog" aria-modal="true" className="w-full max-w-lg max-h-[85vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <header className="p-5 border-b border-bss-border flex justify-between items-start gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Register template</p><h2 className="font-semibold text-bss-text-primary mt-0.5">{templateView.name}</h2><p className="text-xs text-bss-text-muted mt-0.5">{templateView.requiredFormat} · {templateView.frequency}</p></div>
          <button onClick={() => setTemplateView(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-bss-bg"><X size={16}/></button>
        </header>
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Template columns ({templateView.columns?.length ?? 0})</p>
            {templateView.columns?.length
              ? <div className="flex flex-wrap gap-1.5">{templateView.columns.map(c => <span key={c} className="text-[11px] px-2 py-1 rounded-lg bg-bss-bg border border-slate-200 text-bss-text-primary">{c}</span>)}</div>
              : <p className="text-xs text-bss-text-muted">No column definitions.</p>}
          </div>
          {templateView.fieldMappings?.length ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Master-data mapping</p>
              <ul className="text-[11px] space-y-1">{templateView.fieldMappings.map(m => <li key={m.column} className="flex justify-between gap-3"><span className="text-bss-text-primary">{m.column}</span><span className="text-bss-text-muted font-mono">← {m.fieldKey}</span></li>)}</ul>
            </div>
          ) : null}
          <p className="text-[11px] text-bss-text-muted">Upload this register in <strong>{templateView.requiredFormat}</strong>. The AI audit compares your file against these columns and the master data before you save.</p>
        </div>
      </section>
    </div>}

    {batchView && <BatchDrilldown batchId={batchView} role="contractor" onClose={() => setBatchView(null)} />}

    {confirmReupload && (
      <div className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Confirm File Re-upload" onClick={() => setConfirmReupload(null)}>
        <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-bss-border animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-2xl bg-bss-soft-orange text-bss-orange border border-bss-border flex items-center justify-center mx-auto mb-4">
            <Upload size={24} />
          </div>
          <h3 className="text-base font-bold text-bss-text-primary text-center">Replace Existing File?</h3>
          <p className="mt-2 text-xs text-bss-text-secondary text-center leading-relaxed">
            File is already uploaded for <strong>{confirmReupload.doc.name}</strong> under this filter ({activeSiteObj?.name} · {createPeriod} {fy}). Do you want to upload again?
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmReupload(null)}
              className="flex-1 h-10 rounded-xl border border-bss-border bg-white text-xs font-bold text-bss-text-primary hover:bg-bss-bg transition-colors"
            >
              No, Keep Current
            </button>
            <button
              type="button"
              onClick={() => {
                const { doc, file } = confirmReupload;
                setConfirmReupload(null);
                void uploadEvidence(doc, file, true);
              }}
              className="flex-1 h-10 rounded-xl bg-bss-navy text-white text-xs font-bold hover:bg-bss-deep-navy transition-colors shadow-sm"
            >
              Yes, Replace File
            </button>
          </div>
        </div>
      </div>
    )}
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof FileUp; tone:string }) {
  return <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-muted">{label}</span><span className={`bss-kpi-icon ${tone}`}><Icon size={16}/></span></div><strong>{value}</strong></article>;
}
