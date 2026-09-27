"use client";
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileClock, FileSpreadsheet, FileText, Landmark, Plus, ShieldCheck, Trash2, TriangleAlert, Upload, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorPortalData } from '@/types/portal';
import { exportMatrixToXlsx } from '@/lib/exportXlsx';
import { openPrintHtml } from '@/lib/documentEngine/render';
type Row = ContractorPortalData['compliances'][number];
type RowDraft = { item:string; category:string; reference:string; employer:string; site:string; worker:string; issue:string; expiry:string };
const emptyRow = (site = ''): RowDraft => ({ item:'', category:'', reference:'', employer:'', site, worker:'', issue:'', expiry:'' });

type Tab = 'records' | 'registers' | 'master' | 'report';
type ValidationIssue = { row:number; field:string; message:string };
type ValidationReport = { errors:ValidationIssue[]; warnings:ValidationIssue[]; rowCount:number; validRows:number; siteCount:number; locationCount:number; sites:string[]; state?:string; templates?:Array<{ formCode:string; title:string; columns:number; unmapped:string[]; coverage:number }>; bss?:{ checked:number; known:number; unknown:number; unknownSample:string[] } };
type RegRow = { id:number; state:string; formCode:string; title:string; frequency?:string; criticality?:string; columns:string[]; isMandatory?:boolean; outputFormat?:string };

function daysLeft(expiry: string): number | null {
  if (!expiry) return null;
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

const MONTHS_FY = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
const CAL_MONTH: Record<string, number> = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
// Due is decided by the current date: monthly always; quarterly/half-yearly/
// yearly only once their period has ended (yearly = after the FY closes in March).
function periodInfo(month: string, year: string, frequency?: string): { label: string; due: boolean; periodEnd?: string } {
  const f = (frequency || '').toLowerCase();
  const y = Number(year);
  const idx = MONTHS_FY.indexOf(month);
  if (idx < 0 || !Number.isFinite(y)) return { label: `${month} ${year}`.trim(), due: true };
  const fyStart = idx >= 9 ? y - 1 : y;
  const fyLabel = `${fyStart}-${String(fyStart + 1).slice(-2)}`;
  let endIdx: number; let label: string;
  if (f.startsWith('quarter')) { endIdx = (Math.floor(idx / 3) + 1) * 3 - 1; label = `Q${Math.floor(idx / 3) + 1} ${fyLabel}`; }
  else if (f.startsWith('half')) { endIdx = idx < 6 ? 5 : 11; label = `H${idx < 6 ? 1 : 2} ${fyLabel}`; }
  else if (f.startsWith('year') || f.startsWith('annual')) { endIdx = 11; label = `FY ${fyLabel}`; }
  else return { label: `${month} ${y}`, due: true };
  const endYear = fyStart + (endIdx >= 9 ? 1 : 0);
  const end = new Date(endYear, CAL_MONTH[MONTHS_FY[endIdx]], 0); // last day of the end month
  return { label, due: Date.now() >= end.getTime(), periodEnd: end.toISOString().slice(0, 10) };
}
const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

const FREQUENCIES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'] as const;
type Frequency = (typeof FREQUENCIES)[number];
const QUARTER_PERIODS = ['Q1 (Apr–Jun)', 'Q2 (Jul–Sep)', 'Q3 (Oct–Dec)', 'Q4 (Jan–Mar)'];
const HALF_PERIODS = ['H1 (Apr–Sep)', 'H2 (Oct–Mar)'];
const FINANCIAL_PERIODS = ['Full Year (Apr–Mar)'];
function periodsFor(freq: Frequency): string[] {
  if (freq === 'Quarterly') return QUARTER_PERIODS;
  if (freq === 'Half Yearly') return HALF_PERIODS;
  if (freq === 'Yearly') return FINANCIAL_PERIODS;
  return MONTHS;
}
// Representative calendar month for a period label (the period's end month).
function periodMonth(period: string): string {
  if (MONTHS.includes(period)) return period;
  const qi = QUARTER_PERIODS.indexOf(period);
  if (qi >= 0) return MONTHS[qi * 3 + 2];
  const hi = HALF_PERIODS.indexOf(period);
  if (hi >= 0) return MONTHS[hi * 6 + 5];
  if (FINANCIAL_PERIODS.includes(period)) return 'March';
  return period;
}




const batchColumns: DataColumn<ContractorPortalData['complianceBatches'][number]>[] = [
  { id:'fy', header:'Financial Year', value:r => r.financialYear },
  { id:'month', header:'Month', value:r => `${r.month} ${r.year}` },
  { id:'state', header:'State', value:r => r.state },
  { id:'site', header:'Site', value:r => r.site, render:r => <div><p className="text-gray-900">{r.site}</p><p className="font-mono text-[10px] text-gray-400">{r.siteCode}</p></div> },
  { id:'counts', header:'Counts', value:r => `${r.employeeCount}/${r.locationCount}`, render:r => <span>{r.employeeCount} emp · {r.locationCount} loc</span> },
  { id:'generatedOn', header:'Generated On', value:r => r.generatedOn },
  { id:'generatedBy', header:'Generated By', value:r => r.generatedBy },
  { id:'status', header:'Status', value:r => r.status, render:r => <span className={r.status === 'Generated' ? 'text-green-700' : r.status === 'Failed' ? 'text-red-700' : 'text-orange-700'}>{r.status}</span> },
  { id:'actions', header:'Action', filterable:false, value:r => r.id, render:r => r.hasFile ? <a href={`/api/portal/compliance-batches/${r.id}`} className="text-blue-700 font-semibold text-xs inline-flex items-center gap-1 hover:underline"><Download size={12}/>Download</a> : <span className="text-gray-400 text-xs">No file</span> },
];

export default function ContractorCompliancePage() {
  const { contractor, replaceContractor, refresh, mutate, employerScope, scoped } = useContractor();
  const [tab, setTab] = useState<Tab>('master');
  const [modal, setModal] = useState<'single' | 'bulk' | null>(null);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Master file & CLRA generation state
  const [yearChoice, setYearChoice] = useState<string>('');
  const [freq, setFreq] = useState<Frequency>('Monthly');
  const [period, setPeriod] = useState<string>(MONTHS[6]);
  const month = periodMonth(period);
  const [siteName, setSiteName] = useState('');
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [includeNonDue, setIncludeNonDue] = useState(false);
  // PAN-India register template library for the selected state.
  const [templates, setTemplates] = useState<Array<{ id:number; state:string; formCode:string; title:string; columns:string[]; fileName:string; hasFile:boolean }>>([]);
  const [strength, setStrength] = useState<{ rcPe?:string; licence?:string; lwf?:string; hra?:string; nhFh?:string; ptFrequency?:string }>({});
  const [adoption, setAdoption] = useState<Record<string, { adopted:boolean; adoptedCount:number; mandatoryCount:number; total:number }>>({});
  const [siteBoards, setSiteBoards] = useState<Array<{ siteId:number; gated:boolean; adoptedCount:number; total:number }>>([]);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [batchView, setBatchView] = useState<string | null>(null);
  const [registerRows, setRegisterRows] = useState<RegRow[]>([]);

  // States the contractor is allowed to register for — derived from allotted sites.
  const allowedStates = Array.from(new Set(
    contractor.sites.map(s => (s.state || '').trim()).filter((v): v is string => !!v),
  )).sort();
  const sitesByState = contractor.sites.reduce<Record<string, typeof contractor.sites>>((acc, s) => {
    const key = (s.state || '').trim();
    if (key) (acc[key] ||= []).push(s);
    return acc;
  }, {});
  // The selected site (generation + library are scoped to its state).
  const activeSite = contractor.sites.find(s => s.name === siteName) ?? contractor.sites[0];
  // Years run from the selected site's binding date — a contractor files only
  // for the years they have been on the site (which differs per employer).
  const yearOptions = useMemo(() => {
    const base = activeSite?.boundSince || contractor.identity?.incorpDate;
    const nowYear = new Date().getFullYear();
    let startYear = nowYear;
    if (base) {
      const parsed = new Date(base);
      if (!isNaN(parsed.getTime())) startYear = parsed.getFullYear();
    }
    const list: string[] = [];
    for (let y = nowYear; y >= Math.min(startYear, nowYear); y--) list.push(String(y));
    return list.length ? list : [String(nowYear)];
  }, [activeSite?.boundSince, contractor.identity?.incorpDate]);

  // Derive the effective year in render (never sync state in an effect), so a
  // year outside the selected site's range falls back to its latest.
  const year = yearOptions.includes(yearChoice) ? yearChoice : (yearOptions[0] ?? String(new Date().getFullYear()));
  const activeState = activeSite?.state || allowedStates[0] || '';
  const activeAdoption = adoption[activeState];
  const activeSiteBoard = siteBoards.find(b => String(b.siteId) === String(activeSite?.id));
  const activeAdopted = activeSiteBoard ? activeSiteBoard.gated : !!activeAdoption?.adopted;

  useEffect(() => {
    let active = true;
    void fetch(`/api/contractor/clra/templates?state=${encodeURIComponent(activeState)}`, { cache:'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { rows?: typeof templates; strength?: typeof strength; adoption?: typeof adoption; sites?: typeof siteBoards } | null) => {
        if (!active || !body) return;
        if (body.rows) setTemplates(body.rows);
        if (body.strength) setStrength(body.strength);
        if (body.adoption) setAdoption(body.adoption);
        if (body.sites) setSiteBoards(body.sites);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [activeState]);

  // Full register library for Register-wise Listing (all states).
  useEffect(() => {
    let active = true;
    void fetch('/api/contractor/clra/templates?library=1', { cache:'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { rows?: RegRow[] } | null) => { if (active && body?.rows) setRegisterRows(body.rows); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const rowsData = scoped(contractor.compliances, c => c.employer);
  const active = rowsData.filter(r => r.status === 'Active').length;
  const expiring = rowsData.filter(r => r.status === 'Expiring').length;
  const pending = rowsData.filter(r => r.verification === 'Pending').length;

  async function submitSingle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const site = contractor.sites.find(s => s.name === form.site);
    const payload = { ...form, employer: site?.employer ?? (employerScope !== 'all' ? employerScope : null), worker: form.worker || null };
    try { const result = await mutate<{ data: Row }>('compliances', 'POST', payload); replaceContractor({ ...contractor, compliances: [result.data, ...contractor.compliances] }); setModal(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Compliance could not be created.'); }
    finally { setBusy(false); }
  }
  async function submitBulk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    const valid = rows.filter(r => r.item && r.site && r.issue && r.expiry);
    if (!valid.length) { setError('Add at least one complete row.'); setBusy(false); return; }
    try {
      const payload = valid.map(r => { const site = contractor.sites.find(s => s.name === r.site); return { ...r, employer: r.employer || site?.employer || (employerScope !== 'all' ? employerScope : null), worker: r.worker || null }; });
      const result = await mutate<{ data: Row[] }>('compliances', 'POST', { bulk: payload });
      replaceContractor({ ...contractor, compliances: [...result.data, ...contractor.compliances] });
      setNotice(`Added ${result.data.length} compliance records.`); setRows([]); setModal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Bulk compliance could not be saved.'); }
    finally { setBusy(false); }
  }
  function addRow() { setRows(current => [...current, emptyRow(employerScope !== 'all' ? employerScope : '')]); }
  function updateRow(i: number, key: keyof RowDraft, value: string) { setRows(current => current.map((row, idx) => idx === i ? { ...row, [key]: value } : row)); }
  function removeRow(i: number) { setRows(current => current.filter((_, idx) => idx !== i)); }
  function importCsv(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const lines = text.split(/\r?\n/).filter(line => line.trim()).slice(0, 500);
      const parsed = lines.map(line => { const [item, category, reference, employer, site, worker, issue, expiry] = parseCsv(line); return { ...emptyRow(), item: item?.trim() ?? '', category: category?.trim() ?? '', reference: reference?.trim() ?? '', employer: employer?.trim() ?? '', site: site?.trim() ?? '', worker: worker?.trim() ?? '', issue: issue?.trim() ?? '', expiry: expiry?.trim() ?? '' }; }).filter(r => r.item && r.site);
      setRows(current => [...current, ...parsed]); setError('');
      if (!parsed.length) setError('No valid rows. Expected: Item, Category, Reference, Employer, Site, Worker, Issue, Expiry.');
    };
    reader.readAsText(file);
  }

  const bulkDownload = () => {
    const headers = ['Compliance item', 'Category', 'Reference', 'Employer', 'Site', 'Site Code', 'Worker', 'Issued', 'Expires', 'Verification', 'Status'];
    const body = rowsData.map(r => { const site = contractor.sites.find(s => s.name === r.site); return [r.item, r.category, r.reference, r.employer, r.site, site?.code ?? '', r.worker ?? 'Organisation level', r.issue, r.expiry, r.verification, r.status]; });
    exportMatrixToXlsx({ filename: 'contractor-compliance', head: headers, rows: body, sheetName: 'Compliance' });
    setNotice('Bulk compliance register exported (XLSX).');
  };

  const downloadMasterTemplate = () => {
    window.open('/api/contractor/clra/master-template', '_blank');
    setNotice('Master file template downloaded — fill the monthly employee/site/wage/attendance data and upload it back.');
  };

  const validateMaster = async () => {
    if (!masterFile) { setError('Choose a Master File before validating.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.set('master', masterFile);
      if (activeSite?.name) form.set('site', activeSite.name);
      form.set('month', month); form.set('year', year);
      const response = await fetch('/api/contractor/clra/validate', { method: 'POST', body: form });
      const result = await response.json().catch(() => ({})) as { data?: ValidationReport; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'The file could not be validated.');
      setReport(result.data);
      setNotice(result.data.errors.length
        ? `Validation found ${result.data.errors.length} error(s) — fix the file and re-upload.`
        : `Validation passed — ${result.data.validRows} valid row(s), ${result.data.siteCount} site(s). Ready to generate.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The file could not be validated.'); }
    finally { setBusy(false); }
  };

  const downloadValidationErrors = () => {
    if (!report) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows: string[][] = [
      ['Type', 'Row', 'Field', 'Message'],
      ...report.errors.map(i => ['Error', String(i.row ?? ''), i.field ?? '', i.message]),
      ...report.warnings.map(i => ['Warning', String(i.row ?? ''), i.field ?? '', i.message]),
    ];
    const csv = rows.map(r => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `clra-validation-${month}-${activeState}.csv`.replace(/\s+/g, '_');
    a.click(); URL.revokeObjectURL(url);
  };

  const generateRegisters = async () => {
    if (!masterFile) { setError('Choose a Master File before generating registers.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.set('master', masterFile);
      if (signatureFile) form.set('signature', signatureFile);
      // Months Jan–Mar belong to the FY that started in the previous calendar year.
      const sendYear = ['January', 'February', 'March'].includes(month) ? String(Number(year) + 1) : year;
      form.set('month', month); form.set('year', sendYear); form.set('frequency', freq);
      if (includeNonDue || freq !== 'Monthly') form.set('includeNonDue', '1');
      const response = await fetch('/api/portal/compliance-batches', { method: 'POST', body: form });
      const result = await response.json().catch(() => ({})) as { data?: ContractorPortalData['complianceBatches']; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Registers could not be generated.');
      const created = result.data;
      replaceContractor({ ...contractor, complianceBatches: [...created, ...contractor.complianceBatches] });
      const sites = created.map(b => b.site || b.siteCode).filter(Boolean);
      setNotice(`Generated ${created.length} register set${created.length === 1 ? '' : 's'} for ${sites.length} site${sites.length === 1 ? '' : 's'} (${sites.join(', ')}) from ${masterFile.name}${signatureFile ? ' with digital signature' : ''}.`);
      setMasterFile(null); setSignatureFile(null);
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Registers could not be generated.'); }
    finally { setBusy(false); }
  };

  const columns: DataColumn<Row>[] = [
    { id:'item', header:'Compliance item', value:r => r.item },
    { id:'category', header:'Category', value:r => r.category },
    { id:'reference', header:'Reference', value:r => r.reference },
    { id:'employer', header:'Employer', value:r => r.employer },
    { id:'site', header:'Site', value:r => r.site, render:r => { const site = contractor.sites.find(s => s.name === r.site); return <div><p className="text-gray-900">{r.site}</p>{site && <p className="font-mono text-[10px] text-gray-400">{site.code}</p>}</div>; } },
    { id:'worker', header:'Worker', value:r => r.worker ?? 'Organisation level' },
    { id:'issue', header:'Issued', value:r => r.issue },
    { id:'expiry', header:'Expires', value:r => r.expiry },
    { id:'daysLeft', header:'Days left', value:r => r.expiry, render:r => { const n = daysLeft(r.expiry); return n === null ? <span className="text-gray-300">—</span> : <span className={n < 0 ? 'text-red-700 font-semibold' : n <= 30 ? 'text-orange-700 font-semibold' : 'text-gray-700'}>{n < 0 ? `${-n}d overdue` : `${n}d`}</span>; } },
    { id:'verification', header:'Verification', value:r => r.verification },
    { id:'status', header:'Status', value:r => r.status, render:r => <span className={r.status === 'Active' ? 'text-green-700' : r.status === 'Expiring' ? 'text-orange-700' : 'text-red-700'}>{r.status}</span> },
    { id:'evidence', header:'Evidence', filterable:false, value:r => r.id, render:() => <a href="/contractor/submissions" className="text-blue-700 font-semibold hover:underline text-xs">Submissions</a> },
  ];

  const batchByState = contractor.complianceBatches.reduce<Record<string, ContractorPortalData['complianceBatches'][number]>>((acc, b) => {
    const key = b.state;
    if (!acc[key] || `${b.year}${b.month}` > `${acc[key].year}${acc[key].month}`) acc[key] = b;
    return acc;
  }, {});

  // State + period rollup (sites · employees) over every batch, newest first.
  const stateSummary = useMemo(() => {
    const rows = contractor.complianceStateSummary ?? [];
    return [...rows].sort((a, b) => {
      const ay = Number(a.year) || 0, by = Number(b.year) || 0;
      if (ay !== by) return by - ay;
      const am = MONTHS.indexOf(a.month), bm = MONTHS.indexOf(b.month);
      if (am !== bm) return bm - am;
      return a.state.localeCompare(b.state);
    });
  }, [contractor.complianceStateSummary]);

  const registerLibColumns: DataColumn<RegRow>[] = [
    { id:'state', header:'State', value:r => r.state },
    { id:'form', header:'Form No.', value:r => r.formCode, render:r => <span className="font-mono text-blue-700 font-semibold">{r.formCode}</span> },
    { id:'title', header:'Register / Form', value:r => r.title || '—' },
    { id:'type', header:'Type', value:r => (r.columns.length ? 'Register' : 'Form') },
    { id:'criticality', header:'Criticality', value:r => r.criticality || '—', render:r => r.criticality ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.criticality === 'High' ? 'bg-red-50 text-red-700' : r.criticality === 'Medium' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{r.criticality}</span> : <span className="text-gray-300">—</span> },
    { id:'frequency', header:'Frequency', value:r => r.frequency || '—' },
    { id:'due', header:'Due', value:r => r.frequency || '', render:r => { const p = periodInfo(month, year, r.frequency); return p.due ? <span className="text-green-700 font-semibold text-[11px]">Due · {p.label}</span> : <span className="text-gray-400 text-[11px]">Auto later · {p.label} (from {p.periodEnd})</span>; } },
    { id:'columns', header:'Columns', value:r => r.columns.length },
    { id:'mandatory', header:'Mandatory', value:r => (r.isMandatory ? 'Yes' : 'No'), render:r => r.isMandatory ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-700">Yes</span> : <span className="text-gray-300 text-xs">—</span> },
    { id:'generated', header:'Generated', value:r => r.state, render:r => { const b = batchByState[r.state]; return b ? <span className="text-green-700 font-semibold text-[11px]">Generated · {b.month} {b.year}</span> : <span className="text-gray-400 text-[11px]">Not generated</span>; } },
    { id:'action', header:'Action', filterable:false, value:r => r.id, render:r => { const b = batchByState[r.state]; return b?.hasFile ? <a href={`/api/portal/compliance-batches/${b.id}`} download className="text-blue-700 font-semibold text-xs inline-flex items-center gap-1 hover:underline"><Download size={12}/>Download</a> : <span className="text-gray-300 text-xs">—</span>; } },
  ];

  const batchCols: DataColumn<ContractorPortalData['complianceBatches'][number]>[] = [
    ...batchColumns.filter(col => col.id !== 'actions'),
    { id:'actions', header:'Action', filterable:false, value:r => r.id, render:r => (
      <div className="flex items-center gap-3">
        {r.hasFile && <a href={`/api/portal/compliance-batches/${r.id}`} download className="text-blue-700 font-semibold text-xs inline-flex items-center gap-1 hover:underline"><Download size={12}/>Download</a>}
        <button onClick={() => setBatchView(r.id)} className="text-xs font-semibold text-gray-600 hover:text-[#073B67]">View</button>
      </div>
    ) },
  ];

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Master data</p><h1 className="text-2xl font-bold mt-1">Contractor Compliance</h1><p className="text-sm text-gray-500 mt-1">Statutory, site and worker-level evidence — registers, master file CLRA generation and contractor reports.</p></div>
      <div className="flex gap-2">
        <button onClick={bulkDownload} className="h-10 px-4 border border-gray-200 rounded-lg text-sm font-semibold flex gap-2 items-center bg-white"><Download size={15}/>Bulk Download</button>
        <button onClick={() => { setModal('bulk'); setRows([emptyRow(employerScope !== 'all' ? employerScope : '')]); setError(''); }} className="h-10 px-4 border border-gray-200 rounded-lg text-sm font-semibold flex gap-2 items-center bg-white"><Upload size={16}/>Bulk add</button>
        <button onClick={() => { setModal('single'); setError(''); }} className="h-10 px-4 rounded-lg bg-gray-950 text-white text-sm font-semibold flex gap-2 items-center"><Plus size={16}/>Add compliance</button>
      </div>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && !modal && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <div className="grid sm:grid-cols-3 gap-3">
      <Metric label="Active" value={active} icon={ShieldCheck} tone="text-green-700 bg-green-50"/>
      <Metric label="Expiring soon" value={expiring} icon={TriangleAlert} tone="text-orange-700 bg-orange-50"/>
      <Metric label="Pending verification" value={pending} icon={FileClock} tone="text-blue-700 bg-blue-50"/>
    </div>

    {/* Registration eligibility — the states the contractor's sites are in */}
    <section className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Registration eligibility</p>
          <h2 className="text-sm font-semibold text-gray-950 mt-0.5">States you can register for</h2>
          <p className="text-xs text-gray-500 mt-0.5">Derived from the sites allotted to you — CLRA registers can only be generated for these states.</p>
        </div>
        {allowedStates.length > 0 && <span className="text-xs font-semibold text-gray-500">{allowedStates.length} state{allowedStates.length === 1 ? '' : 's'}</span>}
      </div>
      {allowedStates.length
        ? <div className="flex flex-wrap gap-2 mt-3">
            {allowedStates.map(st => (
              <span key={st} className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
                {st}
                <span className="text-blue-400 font-normal">{sitesByState[st].length} site{sitesByState[st].length === 1 ? '' : 's'}</span>
              </span>
            ))}
          </div>
        : <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">None of your allotted sites have a state set — add/adopt a site with a state to enable CLRA register generation.</p>}
    </section>

    <div className="flex border-b overflow-x-auto">
      {([['master', 'Master File & CLRA Generation'], ['records', 'Compliance Records'], ['registers', 'Register-wise Listing'], ['report', 'Contractor Report']] as Array<[Tab, string]>).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap ${tab === id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>)}
    </div>

    {tab === 'records' && <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs">Site codes, verification state and expiry tracking are shown per record.</div>
      {rowsData.length
        ? <EnterpriseDataTable title="Compliance register" rows={rowsData} columns={columns} rowKey={r => r.id} filename="contractor-compliance"/>
        : <p className="py-6 text-center text-sm text-gray-400">No manual compliance records yet — add a record or import a CSV to track licence / registration expiry.</p>}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Generated CLRA Register Records</h2><p className="text-xs text-gray-400 mt-0.5">Every generated batch — download the register workbook or view the master file used.</p></header>
        {contractor.complianceBatches.length
          ? <EnterpriseDataTable title="Generated batches" rows={contractor.complianceBatches} columns={batchCols} rowKey={r => r.id} filename="generated-compliance-batches"/>
          : <p className="p-5 text-sm text-gray-400">No registers generated yet — use the <strong>Master File &amp; CLRA Generation</strong> tab.</p>}
      </section>
    </div>}

    {tab === 'registers' && <section className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs">Statutory registers and forms applicable to your sites — per <strong>State + Form</strong>, with criticality, frequency, and whether a register has been generated (download the generated batch).</div>
      <EnterpriseDataTable title="Register-wise listing" rows={registerRows} columns={registerLibColumns} rowKey={r => String(r.id)} filename="statutory-registers"/>
    </section>}

    {tab === 'master' && <div className="space-y-5">
      {/* Allowed Site States Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#073B67] rounded-2xl p-4 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">Site Jurisdiction &amp; Compliance Scope</span>
          </div>
          <h3 className="text-sm font-bold">State Register Scope: {allowedStates.length ? allowedStates.join(', ') : 'No Allotted Sites'}</h3>
          <p className="text-xs text-slate-300">
            You are authorized to generate and register CLRA templates for sites located in <strong>{allowedStates.length ? allowedStates.join(', ') : 'your allotted site states'}</strong> ({contractor.sites.length} site{contractor.sites.length === 1 ? '' : 's'} assigned).
          </p>
        </div>
        {allowedStates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {allowedStates.map(s => (
              <span key={s} className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs font-semibold text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <CheckCircle2 size={12}/> {s} ({sitesByState[s]?.length ?? 0} site{(sitesByState[s]?.length ?? 0) === 1 ? '' : 's'})
              </span>
            ))}
          </div>
        )}
      </div>

      {stateSummary.length > 0 && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">State-wise Summary</h2><p className="text-xs text-gray-400 mt-0.5">Sites and employees per state, for each period.</p></header>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-4">State</th>
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4">Sites</th>
                <th className="py-2.5 px-4">Employees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {stateSummary.map((row, i) => (
                <tr key={`${row.state}-${row.month}-${row.year}-${i}`} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-semibold text-gray-900">{row.state || '—'}</td>
                  <td className="py-2.5 px-4 text-gray-600">{row.month} {row.year}</td>
                  <td className="py-2.5 px-4 font-bold text-[#073B67]">{row.sites}</td>
                  <td className="py-2.5 px-4 text-gray-700">{row.employees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}

      <div className="grid lg:grid-cols-2 gap-5">
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">CLRA Register Generation</h2><p className="text-xs text-gray-400 mt-0.5">Upload the master file — sites are read from the sheet and a separate register set is generated for each site.</p></header>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold">Year<select value={year} onChange={e => setYearChoice(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{yearOptions.map(y => <option key={y}>{y}</option>)}</select></label>
            <label className="text-xs font-semibold">Frequency<select value={freq} onChange={e => { const f = e.target.value as Frequency; setFreq(f); setPeriod(periodsFor(f)[0]); }} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{FREQUENCIES.map(f => <option key={f}>{f}</option>)}</select></label>
            <label className="text-xs font-semibold">Period<select value={period} onChange={e => setPeriod(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white">{periodsFor(freq).map(p => <option key={p}>{p}</option>)}</select></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 cursor-pointer"><FileSpreadsheet size={16}/>{masterFile ? masterFile.name : 'Choose Master File (CSV/XLSX)'}<input type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { setMasterFile(e.target.files?.[0] ?? null); setError(''); }}/></label>
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 cursor-pointer"><FileText size={16}/>{signatureFile ? signatureFile.name : 'Choose Signature Upload (optional)'}<input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={e => setSignatureFile(e.target.files?.[0] ?? null)}/></label>
          </div>
          {!activeAdopted
            ? <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800"><strong>{activeSite?.name || activeState}</strong>: the principal employer has not adopted CLRA register forms for this site yet — uploading/generating is disabled until they adopt the forms on their CLRA Registers page.</div>
            : <p className="text-[11px] text-emerald-700">{activeSite?.name || activeState}: employer adopted <strong>{activeSiteBoard?.adoptedCount ?? activeAdoption?.adoptedCount ?? 0}</strong> of {activeSiteBoard?.total ?? activeAdoption?.total ?? 0} form(s).</p>}
          {error && tab === 'master' && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadMasterTemplate} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold flex items-center gap-1.5"><Download size={14}/>Download Master Template</button>
            <button onClick={validateMaster} disabled={busy || !masterFile || !activeAdopted} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 size={14}/>Validate File</button>
            <button onClick={generateRegisters} disabled={busy || !activeAdopted} className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"><Landmark size={14}/>{busy ? 'Generating registers…' : 'Generate CLRA Registers'}</button>
            <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 ml-1"><input type="checkbox" checked={includeNonDue} onChange={e => setIncludeNonDue(e.target.checked)} className="accent-[#073B67] w-4 h-4"/>Include forms not due this period</label>
          </div>
          <p className="text-[11px] text-gray-400">Pick a <strong>Frequency</strong> and <strong>Period</strong>. Monthly generates every month; choosing Quarterly / Half-Yearly / Yearly generates only those forms for the selected period (a not-yet-due period is forced). Tick below to also include other forms not due this period.</p>
          {report && <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 ${report.errors.length ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {report.errors.length ? <TriangleAlert size={14}/> : <CheckCircle2 size={14}/>}
              {report.errors.length ? `${report.errors.length} error(s) — generation is blocked` : 'Validation passed'}
              <span className="ml-auto font-semibold text-gray-500">{report.rowCount} rows · {report.validRows} valid · {report.siteCount} site(s) · {report.locationCount} location(s)</span>
              <button type="button" onClick={downloadValidationErrors} className="ml-3 shrink-0 inline-flex items-center gap-1 font-semibold text-gray-700 hover:underline"><Download size={12}/>Errors (CSV)</button>
            </div>
            {report.errors.length > 0 && <ul className="divide-y divide-gray-100 max-h-40 overflow-y-auto">{report.errors.map((issue, i) => <li key={i} className="px-4 py-2 text-[11px] text-red-700"><strong>Row {issue.row || '—'}{issue.field ? ` · ${issue.field}` : ''}:</strong> {issue.message}</li>)}</ul>}
            {report.warnings.length > 0 && <ul className="divide-y divide-gray-100 max-h-32 overflow-y-auto border-t border-gray-100">{report.warnings.map((issue, i) => <li key={i} className="px-4 py-2 text-[11px] text-amber-700"><strong>Row {issue.row || '—'}{issue.field ? ` · ${issue.field}` : ''}:</strong> {issue.message}</li>)}</ul>}
            <div className="border-t border-gray-100 px-4 py-3 space-y-2 text-[11px]">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-600">
                <span>Detected state: <strong className="text-gray-900">{report.state || '—'}</strong></span>
                {report.bss && <span>BSS IDs: <strong className="text-green-700">{report.bss.known}</strong> registered · <strong className={report.bss.unknown ? 'text-amber-700' : 'text-gray-500'}>{report.bss.unknown}</strong> unknown{report.bss.checked ? ` of ${report.bss.checked}` : ''}</span>}
                <span>Templates in flow: <strong className="text-gray-900">{report.templates?.length ?? 0}</strong></span>
              </div>
              {(report.templates?.length ?? 0) > 0 && <div className="rounded-lg border border-gray-100 overflow-hidden"><table className="w-full text-left"><thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-1.5">Form</th><th className="px-3 py-1.5">Title</th><th className="px-3 py-1.5">Columns</th><th className="px-3 py-1.5">Mapped</th></tr></thead>
                <tbody className="divide-y divide-gray-100">{report.templates!.map(t => <tr key={t.formCode}><td className="px-3 py-1.5 font-mono text-[#073B67]">{t.formCode}</td><td className="px-3 py-1.5 text-gray-700">{t.title || '—'}</td><td className="px-3 py-1.5 text-gray-500">{t.columns}</td><td className="px-3 py-1.5">{t.columns === 0 ? <span className="text-gray-400">—</span> : <><span className={t.coverage === 100 ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>{t.coverage}%</span>{t.unmapped.length ? <span className="text-gray-400"> · {t.unmapped.length} unmapped</span> : null}</>}</td></tr>)}</tbody></table></div>}
            </div>
          </div>}
          <p className="text-[11px] text-gray-400">Registers are generated in bulk from the uploaded master data, keyed by State and Site/Location, and listed in the generated batches below.</p>
        </div>
      </section>
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Generated Compliance Batches</h2><p className="text-xs text-gray-400 mt-0.5">Month, Year, State, Site, Site Code, employee & location counts, Generated On/By.</p></header>
        <EnterpriseDataTable title="Generated batches" rows={contractor.complianceBatches} columns={batchCols} rowKey={r => r.id} filename="generated-compliance-batches"/>
      </section>
      </div>

      {/* PAN-India register template library for the selected state */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap justify-between gap-2 items-center">
          <div><h2 className="text-sm font-semibold text-gray-950">Register Template Library — {activeState}</h2><p className="text-xs text-gray-400 mt-0.5">State-wise register templates used to render your registers (one sheet per form).</p></div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600">Site
              <select value={activeSite?.name || ''} onChange={e => setSiteName(e.target.value)} className="ml-2 h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white">{contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name}{s.state ? ` — ${s.state}` : ''}</option>)}</select>
            </label>
            <span className="text-xs font-semibold text-gray-500">{templates.length} template{templates.length === 1 ? '' : 's'}</span>
            {activeAdopted
              ? <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">Adopted</span>
              : <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">Not adopted</span>}
          </div>
        </header>
        {(strength.rcPe || strength.licence || strength.ptFrequency || strength.lwf || strength.nhFh) && <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-gray-600 bg-blue-50/40">
          {strength.rcPe && <span>CLRA RC / PE required at <strong>{strength.rcPe}</strong> workers</span>}
          {strength.licence && <span>Labour licence at <strong>{strength.licence}</strong> workers</span>}
          {strength.ptFrequency && strength.ptFrequency !== 'N/A' && <span>Professional Tax: <strong>{strength.ptFrequency}</strong></span>}
          {strength.lwf && strength.lwf !== 'N/A' && <span>LWF: <strong>{strength.lwf}</strong></span>}
          {strength.nhFh && <span>NH / FH: <strong>{strength.nhFh}</strong></span>}
        </div>}
        {templates.length
          ? <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100"><tr><th className="px-5 py-3">Form</th><th className="px-5 py-3">Title</th><th className="px-5 py-3">Columns</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{templates.map(t => <tr key={t.id} className="hover:bg-gray-50"><td className="px-5 py-3 font-mono font-semibold text-[#073B67]">{t.formCode}</td><td className="px-5 py-3 text-gray-700">{t.title || '—'}</td><td className="px-5 py-3 text-gray-500">{t.columns.length} field{t.columns.length === 1 ? '' : 's'}</td></tr>)}</tbody></table></div>
          : <p className="p-5 text-xs text-gray-400">{activeAdopted ? `No register templates configured for ${activeState} yet.` : `${activeState}: the principal employer hasn't adopted CLRA forms — nothing is available until they adopt on their CLRA Registers page.`}</p>}
      </section>
    </div>}

    {tab === 'report' && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap justify-between gap-2 items-center">
        <div><h2 className="text-sm font-semibold text-gray-950">Contractor Report</h2><p className="text-xs text-gray-400 mt-0.5">Month, Year, State, Site and Site Code — compliance report for your contractor profile.</p></div>
        <button onClick={() => { const head = ['FY', 'Month', 'Year', 'State', 'Site', 'Site Code', 'Employee Count', 'Location Count', 'Generated On', 'Generated By', 'Status']; const body = contractor.complianceBatches.map(b => [b.financialYear, b.month, b.year, b.state, b.site, b.siteCode, b.employeeCount, b.locationCount, b.generatedOn, b.generatedBy, b.status]); exportMatrixToXlsx({ filename: 'contractor-report', head, rows: body, sheetName: 'Report' }); setNotice('Contractor Report exported (XLSX).'); }} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold flex items-center gap-1.5"><Download size={14}/>Download Report (Excel)</button>
      </header>
      {contractor.complianceBatches.length
        ? <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100"><tr><th className="px-5 py-3">Financial Year</th><th className="px-5 py-3">Month</th><th className="px-5 py-3">Year</th><th className="px-5 py-3">State</th><th className="px-5 py-3">Site</th><th className="px-5 py-3">Site Code</th><th className="px-5 py-3">Employee Count</th><th className="px-5 py-3">Location Count</th><th className="px-5 py-3">Generated On</th><th className="px-5 py-3">Generated By</th><th className="px-5 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-100">{contractor.complianceBatches.map(b => <tr key={b.id} className="hover:bg-gray-50"><td className="px-5 py-3 font-semibold text-gray-900">{b.financialYear}</td><td className="px-5 py-3">{b.month}</td><td className="px-5 py-3">{b.year}</td><td className="px-5 py-3">{b.state}</td><td className="px-5 py-3">{b.site}</td><td className="px-5 py-3 font-mono text-blue-700">{b.siteCode}</td><td className="px-5 py-3">{b.employeeCount}</td><td className="px-5 py-3">{b.locationCount}</td><td className="px-5 py-3">{b.generatedOn}</td><td className="px-5 py-3">{b.generatedBy}</td><td className="px-5 py-3"><span className={b.status === 'Generated' ? 'text-green-700' : 'text-red-700'}>{b.status}</span></td></tr>)}</tbody></table></div>
        : <p className="p-5 text-sm text-gray-400">No batches generated yet — generate registers from the <strong>Master File &amp; CLRA Generation</strong> tab to see report rows here.</p>}
    </section>}

    {modal === 'single' && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"><section role="dialog" aria-modal="true" className="bg-white rounded-2xl w-full max-w-xl">
      <header className="p-5 border-b flex justify-between"><h2 className="font-semibold">Add compliance record</h2><button onClick={() => setModal(null)} aria-label="Close"><X/></button></header>
      <form onSubmit={submitSingle} className="p-5 grid sm:grid-cols-2 gap-4">
        {[['item', 'Compliance item'], ['category', 'Category'], ['reference', 'Reference'], ['worker', 'Worker (optional)']].map(([name, label]) => <label key={name} className="text-xs font-semibold">{label}<input required={name !== 'worker'} name={name} className="mt-1 w-full h-10 border rounded-lg px-3"/></label>)}
        <label className="text-xs font-semibold">Site<select required name="site" className="mt-1 w-full h-10 border rounded-lg px-3 bg-white"><option value="">Select</option>{contractor.sites.map(s => <option key={s.id}>{s.name}</option>)}</select></label>
        <label className="text-xs font-semibold">Issue date<input required name="issue" type="date" className="mt-1 w-full h-10 border rounded-lg px-3"/></label>
        <label className="text-xs font-semibold">Expiry date<input required name="expiry" type="date" className="mt-1 w-full h-10 border rounded-lg px-3"/></label>
        {error && <p role="alert" className="sm:col-span-2 text-red-700 text-sm">{error}</p>}
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2">Cancel</button><button disabled={busy} className="bg-blue-700 text-white rounded-lg px-4 py-2 font-semibold">{busy ? 'Saving…' : 'Save'}</button></div>
      </form>
    </section></div>}

    {modal === 'bulk' && <div className="fixed inset-0 z-[80] bg-black/50 p-4 grid place-items-center"><section role="dialog" aria-modal="true" className="w-full max-w-6xl max-h-[90vh] flex flex-col bg-white rounded-2xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex justify-between items-center"><div><h2 className="font-semibold text-sm">Bulk add compliance records</h2><p className="text-xs text-gray-500 mt-1">Add rows or import a CSV (Item, Category, Reference, Employer, Site, Worker, Issue, Expiry).</p></div><button onClick={() => setModal(null)} aria-label="Close"><X/></button></header>
      <div className="p-5 space-y-4 overflow-y-auto">
        <div className="flex flex-wrap gap-2"><label className="text-xs font-semibold text-gray-600 flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer">Import CSV <input type="file" accept=".csv" className="hidden" onChange={e => importCsv(e.target.files?.[0])}/></label><button type="button" onClick={addRow} className="h-9 px-3 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1"><Plus size={14}/>Add row</button></div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <form onSubmit={submitBulk} className="space-y-3">
          <div className="overflow-x-auto pb-2"><div className="min-w-[1000px]"><div className="grid grid-cols-[minmax(130px,1.1fr)_110px_120px_150px_130px_110px_130px_130px_30px] gap-2 text-[11px] uppercase text-gray-500 font-bold px-1">{['Compliance item','Category','Reference','Employer','Site','Worker','Issue','Expiry',''].map((label, i) => <span key={i}>{label}</span>)}</div>
            {rows.map((row, index) => <div key={index} className="grid grid-cols-[minmax(130px,1.1fr)_110px_120px_150px_130px_110px_130px_130px_30px] gap-2 items-center mt-2">
              <input value={row.item} onChange={e => updateRow(index, 'item', e.target.value)} placeholder="Compliance item" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
              <input value={row.category} onChange={e => updateRow(index, 'category', e.target.value)} placeholder="Category" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
              <input value={row.reference} onChange={e => updateRow(index, 'reference', e.target.value)} placeholder="Reference" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
              <select value={row.employer} onChange={e => updateRow(index, 'employer', e.target.value)} className="h-9 border border-gray-200 rounded-lg px-2 text-xs bg-white"><option value="">Employer</option>{contractor.employers.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}</select>
              <select value={row.site} onChange={e => { updateRow(index, 'site', e.target.value); const site = contractor.sites.find(s => s.name === e.target.value); if (site?.employer) updateRow(index, 'employer', site.employer); }} className="h-9 border border-gray-200 rounded-lg px-2 text-xs bg-white"><option value="">Site</option>{contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
              <input value={row.worker} onChange={e => updateRow(index, 'worker', e.target.value)} placeholder="Worker" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
              <input value={row.issue} onChange={e => updateRow(index, 'issue', e.target.value)} type="date" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
              <input value={row.expiry} onChange={e => updateRow(index, 'expiry', e.target.value)} type="date" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
              <button type="button" onClick={() => removeRow(index)} className="w-8 h-9 grid place-items-center text-gray-400 hover:text-red-600" aria-label="Remove row"><Trash2 size={15}/></button>
            </div>)}
          </div></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">{busy ? 'Saving…' : `Save ${rows.length} record${rows.length === 1 ? '' : 's'}`}</button></div>
        </form>
      </div>
    </section></div>}

    {batchView && <BatchDrilldown batchId={batchView} onClose={() => setBatchView(null)} />}
  </div>;
}
function parseCsv(line: string): string[] { const out: string[] = []; let cur = '', inQuotes = false; for (const char of line) { if (char === '"') { inQuotes = !inQuotes; continue; } if (char === ',' && !inQuotes) { out.push(cur); cur = ''; continue; } cur += char; } out.push(cur); return out; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof ShieldCheck; tone:string }) { return <div className="bg-white border rounded-xl p-4 flex justify-between"><div><p className="text-sm text-gray-500">{label}</p><strong className="text-2xl">{value}</strong></div><span className={'w-10 h-10 grid place-items-center rounded-full ' + tone}><Icon size={20}/></span></div>; }

type BatchSummary = { state:string; month:string; year:string; employees:number; sites:Array<{ site:string; location:string; employees:number }> };
type SiteDocs = { site:string; siteCode:string; state:string; documents:Array<{ purpose:string; form:string; frequency:string; mandatory:boolean; templateId:number | null; outputFormat?:string }>; templates:Array<{ id:number; formCode:string; title:string; columns:number; hasFile:boolean; outputFormat?:string }>; strength?:{ rcPe?:string; licence?:string; lwf?:string; hra?:string; nhFh?:string; ptFrequency?:string } };

function BatchDrilldown({ batchId, onClose }: { batchId:string; onClose:() => void }) {
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [site, setSite] = useState<SiteDocs | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void fetch(`/api/contractor/compliance-batches/${batchId}`, { cache:'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: BatchSummary } | null) => { if (active && body?.data) setSummary(body.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [batchId]);

  async function openSite(name: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/contractor/compliance-batches/${batchId}?site=${encodeURIComponent(name)}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: SiteDocs; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Site documents could not be loaded.');
      setSite(body.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Site documents could not be loaded.'); }
    finally { setBusy(false); }
  }

  async function openRegister(templateId: number, label: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/contractor/compliance-batches/${batchId}/register/${templateId}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: { html?:string; title?:string }; error?:string };
      if (!response.ok || !body.data?.html) throw new Error(body.error ?? 'The register could not be rendered.');
      openPrintHtml(body.data.html, body.data.title ?? label);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The register could not be rendered.'); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[95] bg-black/50 flex justify-end" role="presentation"><section role="dialog" aria-modal="true" aria-label="Batch drill-down" className="bg-white w-full max-w-2xl h-full overflow-y-auto">
    <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Generated batch · State / Site</p><h2 className="font-semibold text-gray-950 mt-0.5">{summary ? `${summary.state} · ${summary.month} ${summary.year}` : 'Loading…'}</h2>{summary && <p className="text-xs text-gray-500 mt-0.5">{summary.employees} employee row(s) · {summary.sites.length} site(s)</p>}</div>
      <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
    </header>
    <div className="p-5 space-y-5">
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Sites</p>
        {summary?.sites.length
          ? <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">{summary.sites.map(row => <div key={`${row.site}-${row.location}`} className="flex items-center justify-between px-4 py-2.5"><div><p className="text-sm font-semibold text-gray-800">{row.site || '—'}</p><p className="text-[11px] text-gray-400">{row.location || '—'} · {row.employees} employee(s)</p></div><button disabled={busy} onClick={() => void openSite(row.site)} className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50">View documents</button></div>)}</div>
          : <p className="text-xs text-gray-400">{summary ? 'No site rows in the master file.' : 'Loading…'}</p>}
      </div>

      {site && <div className="space-y-4">
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Applicable documents — {site.site}{site.siteCode ? ` (${site.siteCode})` : ''} · {site.state}</p>
          {site.documents.length
            ? <ul className="space-y-1.5">{site.documents.map((doc, i) => <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-xs"><span className="text-gray-700">{doc.purpose}</span><span className="flex items-center gap-2 text-gray-400">{doc.form}{doc.mandatory ? ' · mandatory' : ''}{doc.templateId ? <><button disabled={busy} onClick={() => void openRegister(doc.templateId as number, doc.purpose)} className="text-blue-700 font-semibold hover:underline disabled:opacity-50">View register</button>{doc.outputFormat === 'xlsx' ? <a href={`/api/contractor/compliance-batches/${batchId}/register/${doc.templateId}/xlsx`} className="text-gray-500 font-semibold hover:underline">Excel</a> : <span className="text-gray-400">PDF</span>}</> : <span className="text-gray-300">no template</span>}</span></li>)}</ul>
            : <p className="text-xs text-gray-400">The applicability matrix has no form rows for {site.state}.</p>}
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Register templates ({site.templates.length})</p>
          {site.templates.length
            ? <div className="flex flex-wrap gap-2">{site.templates.map(t => <span key={t.id} className="inline-flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-1.5 text-xs"><strong className="font-mono text-[#073B67]">{t.formCode}</strong><span className="text-gray-400">{t.columns} field(s)</span><button disabled={busy} onClick={() => void openRegister(t.id, t.formCode)} className="text-blue-700 font-semibold hover:underline disabled:opacity-50">View register</button>{t.outputFormat === 'xlsx' ? <a href={`/api/contractor/compliance-batches/${batchId}/register/${t.id}/xlsx`} className="text-gray-500 font-semibold hover:underline">Excel</a> : <span className="text-gray-400">PDF</span>}</span>)}</div>
            : <p className="text-xs text-gray-400">No templates configured for {site.state}.</p>}
        </div>
      </div>}
    </div>
  </section></div>;
}
