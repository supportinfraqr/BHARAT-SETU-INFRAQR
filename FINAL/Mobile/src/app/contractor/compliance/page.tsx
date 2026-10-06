"use client";
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileCheck2, FileSpreadsheet, FileText, Landmark, Loader2, TriangleAlert } from 'lucide-react';
import ComplianceSubmissions from '@/components/contractor/ComplianceSubmissions';
import BatchDrilldown from '@/components/compliance/BatchDrilldown';
import VersionHistory from '@/components/compliance/VersionHistory';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorPortalData } from '@/types/portal';
import { openPrintHtml } from '@/lib/documentEngine/render';

type Tab = 'records' | 'master' | 'report';
type ValidationIssue = { row:number; field:string; message:string };
type ValidationReport = { errors:ValidationIssue[]; warnings:ValidationIssue[]; rowCount:number; validRows:number; siteCount:number; locationCount:number; sites:string[]; state?:string; templates?:Array<{ formCode:string; title:string; columns:number; unmapped:string[]; coverage:number }>; bss?:{ checked:number; known:number; unknown:number; unknownSample:string[] } };

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

// True when a period has not arrived yet — a future month/quarter/half/FY must
// not be generated. `year` is the FY start year (Jan–Mar fall in the next
// calendar year), matching the Year selector.
function isFuturePeriod(period: string, year: number): boolean {
  const idx = MONTHS.indexOf(periodMonth(period));   // 0=Apr … 11=Mar
  if (idx < 0) return false;
  const calYear = idx >= 9 ? year + 1 : year;
  const calMonth = ((idx + 3) % 12) + 1;
  const now = new Date();
  return calYear * 12 + calMonth > now.getFullYear() * 12 + (now.getMonth() + 1);
}




export default function ContractorCompliancePage() {
  const { contractor, replaceContractor, refresh } = useContractor();
  const [tab, setTab] = useState<Tab>('master');
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
  // Per-site adoption for *every* site the contractor has (the state fetch above
  // is scoped to the active state). Adoption is per site, so the jurisdiction
  // banner must reflect each site, not just the state.
  const [allSites, setAllSites] = useState<Array<{ siteId:number; siteName:string; siteCode:string; state:string; gated:boolean; adoptedCount:number; total:number }>>([]);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [batchView, setBatchView] = useState<string | null>(null);
  const [repBusy, setRepBusy] = useState(false);
  const [repError, setRepError] = useState('');

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
  // Past data can always be submitted, so years are not restricted to the
  // binding date — always offer the last 6 years (or back to incorporation).
  const yearOptions = useMemo(() => {
    const nowYear = new Date().getFullYear();
    let startYear = nowYear - 6;
    const base = contractor.identity?.incorpDate;
    if (base) {
      const parsed = new Date(base);
      if (!isNaN(parsed.getTime())) startYear = Math.min(startYear, parsed.getFullYear());
    }
    const list: string[] = [];
    for (let y = nowYear; y >= startYear; y--) list.push(String(y));
    return list.length ? list : [String(nowYear)];
  }, [contractor.identity?.incorpDate]);

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

  // Adoption across all of the contractor's states, so the jurisdiction banner
  // can show which states are actually approved for generation.
  const siteIdsKey = contractor.sites.map(s => s.id).join(',');
  useEffect(() => {
    let active = true;
    void fetch('/api/contractor/clra/templates', { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { sites?: typeof allSites } | null) => {
        if (active && body?.sites) setAllSites(body.sites);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [siteIdsKey]);
  const siteAdopted = (siteId: number | string) => !!allSites.find(b => String(b.siteId) === String(siteId))?.gated;
  const stateSiteStats = (st: string) => {
    const sites = sitesByState[st] ?? [];
    const ready = sites.filter(s => siteAdopted(s.id)).length;
    return { total: sites.length, ready, allReady: sites.length > 0 && ready === sites.length };
  };
  const pendingSites = contractor.sites.filter(s => !siteAdopted(s.id));
  // Per-state readiness, pending (needs adoption) first so it's seen immediately.
  const stateStats = allowedStates
    .map(st => ({ st, ...stateSiteStats(st) }))
    .sort((a, b) => Number(a.allReady) - Number(b.allReady) || a.st.localeCompare(b.st));
  const readyStateCount = stateStats.filter(s => s.allReady).length;
  const pendingStateList = stateStats.filter(s => !s.allReady);

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
    if (isFuturePeriod(period, Number(year))) { setError('This is a future period — CLRA registers can only be generated for months that have already started.'); return; }
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

  // Level-2: open the detailed AI audit report for a single submitted package.
  async function viewDetailedReport(reportId: string, label: string) {
    setRepBusy(true); setRepError('');
    try {
      const response = await fetch(`/api/contractor/compliance-report?reportId=${encodeURIComponent(reportId)}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: { html?: string }; error?: string };
      if (!response.ok || !body.data?.html) throw new Error(body.error ?? 'The detailed report could not be generated.');
      openPrintHtml(body.data.html, `${label} — BSS Detailed AI Audit Report`);
    } catch (reason) {
      setRepError(reason instanceof Error ? reason.message : 'The detailed report could not be generated.');
    } finally { setRepBusy(false); }
  }

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Master data</p><h1 className="text-2xl font-bold mt-1">Contractor Compliance</h1><p className="text-sm text-gray-500 mt-1">Statutory, site and worker-level evidence — registers, master file CLRA generation and contractor reports.</p></div>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    {/* Registration eligibility — the states the contractor's sites are in */}
    <section className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Registration eligibility</p>
          <h2 className="text-sm font-semibold text-gray-950 mt-0.5">States you can register for</h2>
          <p className="text-xs text-gray-500 mt-0.5">Derived from the sites allotted to you. A state becomes ready to generate once its principal employer adopts the CLRA forms.</p>
        </div>
        {allowedStates.length > 0 && <span className="text-xs font-semibold text-gray-500">{allowedStates.length} state{allowedStates.length === 1 ? '' : 's'}</span>}
      </div>
      {allowedStates.length
        ? <div className="mt-3 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 px-2.5 py-1"><CheckCircle2 size={12}/>{readyStateCount} ready</span>
              {pendingStateList.length > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 text-amber-700 px-2.5 py-1"><TriangleAlert size={12}/>{pendingStateList.length} awaiting adoption</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
              {stateStats.map(({ st, ready, total, allReady }) => (
                <div key={st} className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${allReady ? 'border-emerald-100 bg-emerald-50/60' : 'border-amber-100 bg-amber-50/60'}`}>
                  <span className={`truncate font-semibold ${allReady ? 'text-emerald-800' : 'text-amber-800'}`}>{st}</span>
                  <span className={`flex-shrink-0 text-[10px] font-bold ${allReady ? 'text-emerald-600' : 'text-amber-600'}`}>{ready}/{total}</span>
                </div>
              ))}
            </div>
          </div>
        : <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">None of your allotted sites have a state set — add/adopt a site with a state to enable CLRA register generation.</p>}
    </section>

    <div className="flex border-b overflow-x-auto">
      {([['master', 'Master File & CLRA Generation'], ['records', 'Compliance Records'], ['report', 'Contractor Report']] as Array<[Tab, string]>).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap ${tab === id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>)}
    </div>

    {tab === 'records' && <div className="space-y-5">
      <ComplianceSubmissions embedded onSubmitted={() => {
        setTab('report');
        setNotice('Registers submitted — the detailed audit report is ready in the Contractor Report tab.');
      }} />
    </div>}

    {tab === 'master' && <div className="space-y-5">
      {/* Allowed Site States Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#073B67] rounded-2xl p-4 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">Site Jurisdiction &amp; Compliance Scope</span>
          </div>
          <h3 className="text-sm font-bold">State Register Scope: {allowedStates.length ? `${allowedStates.length} state${allowedStates.length === 1 ? '' : 's'}` : 'No Allotted Sites'}</h3>
          <p className="text-xs text-slate-300">
            {pendingSites.length === 0
              ? <>All {contractor.sites.length} allotted site{contractor.sites.length === 1 ? '' : 's'} are adopted — you can generate and register CLRA templates for {allowedStates.length ? `all ${allowedStates.length} state${allowedStates.length === 1 ? '' : 's'}` : 'your sites'}.</>
              : <>CLRA generation is enabled only for <strong>adopted</strong> sites. {pendingSites.length} of {contractor.sites.length} site{contractor.sites.length === 1 ? '' : 's'} still {pendingSites.length === 1 ? 'needs' : 'need'} the principal employer to adopt the CLRA forms: <strong>{pendingSites.map(s => s.name).join(', ')}</strong>.</>}
          </p>
        </div>
        {allowedStates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 shrink-0 max-w-full md:max-w-xs md:justify-end">
            <span className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs font-semibold border border-emerald-400/30 text-emerald-300 inline-flex items-center gap-1"><CheckCircle2 size={12}/>{readyStateCount} state{readyStateCount === 1 ? '' : 's'} ready</span>
            {pendingStateList.map(({ st, ready, total }) => (
              <span key={st} className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs font-semibold border border-amber-400/30 text-amber-300 inline-flex items-center gap-1"><TriangleAlert size={12}/>{st} ({ready}/{total})</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5">
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#073B67] via-[#0b4c86] to-[#062D4F] text-white p-5">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Master file · CLRA engine</p>
              <h2 className="text-lg font-extrabold mt-0.5">Generate CLRA Registers</h2>
              <p className="text-[11px] text-white/75 mt-1 max-w-xl">Upload the master file — sites are read from the sheet and a separate register set is generated for each site.</p>
            </div>
            <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 grid place-items-center flex-shrink-0"><Landmark size={22}/></span>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Year</span><select value={year} onChange={e => { const y = e.target.value; setYearChoice(y); if (isFuturePeriod(period, Number(y))) setPeriod(periodsFor(freq)[0]); }} className="mt-1 w-full h-10 border border-gray-200 rounded-xl px-3 text-sm bg-slate-50 font-semibold">{yearOptions.map(y => <option key={y}>{y}</option>)}</select></label>
            <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Frequency</span><select value={freq} onChange={e => { const f = e.target.value as Frequency; setFreq(f); setPeriod(periodsFor(f)[0]); }} className="mt-1 w-full h-10 border border-gray-200 rounded-xl px-3 text-sm bg-slate-50 font-semibold">{FREQUENCIES.map(f => <option key={f}>{f}</option>)}</select></label>
            <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Period</span><select value={period} onChange={e => setPeriod(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-xl px-3 text-sm bg-slate-50 font-semibold">{periodsFor(freq).map(p => { const future = isFuturePeriod(p, Number(year)); return <option key={p} value={p} disabled={future}>{p}{future ? ' — not yet due' : ''}</option>; })}</select></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-2 border border-dashed border-gray-300 rounded-xl bg-slate-50 px-3 py-2.5 cursor-pointer hover:border-[#073B67]"><FileSpreadsheet size={16} className="text-[#073B67]"/>{masterFile ? masterFile.name : 'Choose Master File (CSV/XLSX)'}<input type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { setMasterFile(e.target.files?.[0] ?? null); setError(''); }}/></label>
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-2 border border-dashed border-gray-300 rounded-xl bg-slate-50 px-3 py-2.5 cursor-pointer hover:border-[#073B67]"><FileText size={16} className="text-[#073B67]"/>{signatureFile ? signatureFile.name : 'Choose Signature Upload (optional)'}<input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={e => setSignatureFile(e.target.files?.[0] ?? null)}/></label>
          </div>
          {error && tab === 'master' && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadMasterTemplate} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold flex items-center gap-1.5"><Download size={14}/>Download Master Template</button>
            <button onClick={validateMaster} disabled={busy || !masterFile} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 size={14}/>Validate File</button>
            <button onClick={generateRegisters} disabled={busy} className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"><Landmark size={14}/>{busy ? 'Generating registers…' : 'Generate CLRA Registers'}</button>
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
          <p className="text-[11px] text-gray-400">Registers are generated in bulk from the uploaded master data, keyed by State and Site/Location, and listed under the <strong>Generated Compliance Batches</strong> tab.</p>
        </div>
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

    {tab === 'report' && <div className="space-y-5">
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#073B67] via-[#0b4c86] to-[#062D4F] text-white p-5">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Per submission</p>
              <h2 className="text-lg font-extrabold mt-0.5">Detailed AI Audit Reports</h2>
              <p className="text-[11px] text-white/75 mt-1 max-w-xl">Every submitted package gets its own detailed AI audit report — triggered when you submit, ready to view or download as a branded PDF.</p>
            </div>
            <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 grid place-items-center flex-shrink-0"><FileCheck2 size={22}/></span>
          </div>
        </div>
        {repError && <p className="px-4 pt-4 text-sm text-red-700">{repError}</p>}
        {repBusy && <p className="px-4 pt-4 text-xs text-gray-400 inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Generating detailed report…</p>}
        <div className="p-4">
          {contractor.auditReports.length === 0
            ? <p className="text-sm text-gray-400 py-4 text-center">No submissions yet — submit a register package and its detailed report will appear here.</p>
            : <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Ref No.</th>
                    <th className="py-2.5 px-3">Site</th>
                     <th className="py-2.5 px-3">Period</th>
                     <th className="py-2.5 px-3">Ver</th>
                     <th className="py-2.5 px-3">Submitted</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Detailed AI Report</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {contractor.auditReports.map(r => <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-semibold text-blue-700">{r.uniqueNo || '—'}</td>
                      <td className="py-2.5 px-3 text-gray-700">{r.site || '—'}</td>
                      <td className="py-2.5 px-3 text-gray-600">{r.period || '—'}</td>
                      <td className="py-2.5 px-3"><VersionHistory versions={(r.versions || []).map(v => ({ version:v.version, isCurrent:v.isCurrent, status:v.uniqueNo, date:v.reportDate }))} /></td>
                      <td className="py-2.5 px-3 text-gray-500">{r.reportDate || '—'}</td>
                      <td className="py-2.5 px-3 font-bold text-[#073B67]">{r.scorePercent != null ? `${r.scorePercent}%` : (r.score || '—')}</td>
                      <td className="py-2.5 px-3"><div className="flex items-center gap-3">
                        <button type="button" disabled={repBusy} onClick={() => void viewDetailedReport(r.id, r.uniqueNo || r.site || 'Submission')} className="text-blue-700 font-semibold hover:underline disabled:opacity-50">View report</button>
                        <a href={`/api/contractor/compliance-report?reportId=${r.id}&download=pdf`} className="text-gray-600 font-semibold hover:underline inline-flex items-center gap-1"><Download size={12}/>PDF</a>
                      </div></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>}
        </div>
      </section>
    </div>}

    {batchView && <BatchDrilldown batchId={batchView} role="contractor" onClose={() => setBatchView(null)} />}
  </div>;
}

