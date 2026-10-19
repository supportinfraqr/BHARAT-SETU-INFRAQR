"use client";
import { useEffect, useMemo, useState } from 'react';
import { Activity, Calendar, CheckCircle2, ChevronDown, Clock3, Download, FileSpreadsheet, FileText, Info, Landmark, TriangleAlert } from 'lucide-react';
import ComplianceSubmissions from '@/components/contractor/ComplianceSubmissions';
import ContractorMonthlyAudit from '@/components/audit/ContractorMonthlyAudit';
import BatchDrilldown from '@/components/compliance/BatchDrilldown';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorPortalData } from '@/types/portal';

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

// The current period label for a frequency (fiscal year Apr–Mar), from today.
function currentPeriod(freq: Frequency, d: Date = new Date()): string {
  const fi = (d.getMonth() + 9) % 12;   // 0=April … 11=March
  if (freq === 'Quarterly') return QUARTER_PERIODS[Math.floor(fi / 3)];
  if (freq === 'Half Yearly') return HALF_PERIODS[Math.floor(fi / 6)];
  if (freq === 'Yearly') return FINANCIAL_PERIODS[0];
  return MONTHS[fi];
}

// The FY start year for today (Jan–Mar belong to the previous fiscal year).
function currentFyStartYear(d: Date = new Date()): number {
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}




export default function ContractorCompliancePage() {
  const { contractor, replaceContractor, refresh } = useContractor();
  const [tab, setTab] = useState<Tab>('master');
  // Open the requested tab from deep links, e.g. /contractor/compliance?tab=report.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const requested = new URLSearchParams(window.location.search).get('tab');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync deep-link tab once
    if (requested === 'report' || requested === 'records' || requested === 'master') setTab(requested);
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Master file & CLRA generation state
  const [yearChoice, setYearChoice] = useState<string>(() => String(currentFyStartYear()));
  const [freq, setFreq] = useState<Frequency>('Monthly');
  const [period, setPeriod] = useState<string>(() => currentPeriod('Monthly'));
  const month = periodMonth(period);
  const [siteName, setSiteName] = useState('');
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  // PAN-India register template library for the selected state.
  const [templates, setTemplates] = useState<Array<{ id:number; state:string; formCode:string; title:string; columns:string[]; fileName:string; hasFile:boolean }>>([]);

  const [adoption, setAdoption] = useState<Record<string, { adopted:boolean; adoptedCount:number; mandatoryCount:number; total:number }>>({});
  const [siteBoards, setSiteBoards] = useState<Array<{ siteId:number; gated:boolean; adoptedCount:number; total:number }>>([]);
  // Per-site adoption for *every* site the contractor has (the state fetch above
  // is scoped to the active state). Adoption is per site, so the jurisdiction
  // banner must reflect each site, not just the state.
  const [allSites, setAllSites] = useState<Array<{ siteId:number; siteName:string; siteCode:string; state:string; gated:boolean; adoptedCount:number; total:number }>>([]);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [batchView, setBatchView] = useState<string | null>(null);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);

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

  // Per-site generation status for the SELECTED frequency + period — every
  // allotted site marked Done (already generated) or Pending. Matches batches by
  // fiscal year + month + frequency.
  const fyKey = `${year}-${String((Number(year) + 1) % 100).padStart(2, '0')}`;
  const generatedForPeriod = useMemo(() => {
    const map = new Map<string, { version: number; status: string }>();
    (contractor.complianceBatches || [])
      .filter(b => (b.financialYear || '') === fyKey && b.month === month && (b.frequency || 'Monthly') === freq)
      .forEach(b => {
        const key = b.site || b.siteCode || '';
        if (!key) return;
        const version = b.version ?? 1;
        const prev = map.get(key);
        if (!prev || version > prev.version) map.set(key, { version, status: b.status });
      });
    return map;
  }, [contractor.complianceBatches, fyKey, month, freq]);
  const siteStatus = useMemo(() => (contractor.sites || [])
    .map(s => {
      const hit = generatedForPeriod.get(s.name) || generatedForPeriod.get(s.code);
      return { name: s.name, code: s.code, state: s.state || '', done: !!hit, version: hit?.version ?? 0, status: hit?.status || '' };
    })
    .sort((a, b) => (a.state || '').localeCompare(b.state || '') || a.name.localeCompare(b.name)),
    [contractor.sites, generatedForPeriod]);
  const doneCount = siteStatus.filter(s => s.done).length;

  useEffect(() => {
    let active = true;
    void fetch(`/api/contractor/clra/templates?state=${encodeURIComponent(activeState)}`, { cache:'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { rows?: typeof templates; adoption?: typeof adoption; sites?: typeof siteBoards } | null) => {
        if (!active || !body) return;
        if (body.rows) setTemplates(body.rows);
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
      if (freq !== 'Monthly') form.set('includeNonDue', '1');
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

  return <div className="space-y-6 pb-12">
    <header className="relative overflow-hidden rounded-3xl bss-anim-gradient bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue text-white p-5 sm:p-6 shadow-lg">
      <div aria-hidden className="absolute -right-8 -top-10 w-44 h-44 rounded-full bg-white/5 blur-2xl" />
      <div className="relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Statutory compliance · CLRA</p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Contractor Compliance</h1>
        <p className="text-sm text-white/75 mt-1 max-w-2xl">Statutory, site and worker-level evidence — registers, master-file CLRA generation and contractor reports, all in one place.</p>
      </div>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    {/* Registration eligibility + tab bar — one cohesive control zone */}
    <div className="rounded-2xl bg-white border border-bss-border overflow-hidden">
    <section className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Registration eligibility</p>
          <h2 className="text-sm font-semibold text-bss-text-primary mt-0.5">States you can register for</h2>
          <p className="text-xs text-bss-text-secondary mt-1">Derived from the sites allotted to you. A state becomes ready to generate once its principal employer adopts the CLRA forms.</p>
        </div>
        {allowedStates.length > 0 && <span className="text-xs font-semibold text-bss-text-secondary">{allowedStates.length} state{allowedStates.length === 1 ? '' : 's'}</span>}
      </div>
      {allowedStates.length
        ? <div className="mt-3 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 rounded-full border border-bss-border bg-bss-soft-green text-bss-green px-2.5 py-1"><CheckCircle2 size={12}/>{readyStateCount} ready</span>
              {pendingStateList.length > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-bss-border bg-bss-soft-orange text-bss-orange px-2.5 py-1"><TriangleAlert size={12}/>{pendingStateList.length} awaiting adoption</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {stateStats.map(({ st, ready, total, allReady }) => (
                <div key={st} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${allReady ? 'border-bss-border bg-bss-soft-green' : 'border-bss-border bg-bss-soft-orange'}`}>
                  <span className={`truncate font-semibold ${allReady ? 'text-bss-green' : 'text-bss-orange'}`}>{st}</span>
                  <span className={`flex-shrink-0 text-[10px] font-bold ${allReady ? 'text-bss-green' : 'text-bss-orange'}`}>{ready}/{total}</span>
                </div>
              ))}
            </div>
          </div>
        : <p className="mt-3 text-xs text-bss-orange bg-bss-soft-orange border border-bss-border rounded-lg px-3 py-2">None of your allotted sites have a state set — add/adopt a site with a state to enable CLRA register generation.</p>}
    </section>

    <div className="flex items-center gap-6 border-t border-bss-border bg-bss-bg/50 px-5 overflow-x-auto">
      {([['master', 'Master File & CLRA Generation'], ['records', 'Compliance Records'], ['report', 'Contractor Report']] as Array<[Tab, string]>).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`relative px-1 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${tab === id ? 'text-bss-navy' : 'text-bss-text-muted hover:text-bss-navy'}`}>{label}{tab === id && <span className="absolute left-0 right-0 bottom-0 h-0.5 rounded-full bg-bss-orange" />}</button>)}
    </div>
    </div>

    {tab === 'records' && <div className="space-y-6">
      <ComplianceSubmissions embedded onSubmitted={() => {
        setTab('report');
        setNotice('Package submitted for employer review. After approval, run the audit here — up to 2 runs per site per month.');
      }} />
    </div>}

    {tab === 'master' && <div className="space-y-6">
      {/* Allowed Site States Banner */}
      <div className="bg-gradient-to-r from-bss-navy to-bss-deep-navy rounded-2xl p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-bss-blue-tint px-2 py-0.5 rounded border border-white/15">Site Jurisdiction &amp; Compliance Scope</span>
          </div>
          <h3 className="text-sm font-bold">State Register Scope: {allowedStates.length ? `${allowedStates.length} state${allowedStates.length === 1 ? '' : 's'}` : 'No Allotted Sites'}</h3>
          <p className="text-xs text-white/70">
            {pendingSites.length === 0
              ? <>All {contractor.sites.length} allotted site{contractor.sites.length === 1 ? '' : 's'} are adopted — you can generate and register CLRA templates for {allowedStates.length ? `all ${allowedStates.length} state${allowedStates.length === 1 ? '' : 's'}` : 'your sites'}.</>
              : <>CLRA generation is enabled only for <strong>adopted</strong> sites. {pendingSites.length} of {contractor.sites.length} site{contractor.sites.length === 1 ? '' : 's'} still {pendingSites.length === 1 ? 'needs' : 'need'} the principal employer to adopt the CLRA forms: <strong>{pendingSites.map(s => s.name).join(', ')}</strong>.</>}
          </p>
        </div>
        {allowedStates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 shrink-0 max-w-full md:max-w-xs md:justify-end">
            <span className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs font-semibold border border-white/15 text-bss-soft-green inline-flex items-center gap-1"><CheckCircle2 size={12}/>{readyStateCount} state{readyStateCount === 1 ? '' : 's'} ready</span>
            {pendingStateList.map(({ st, ready, total }) => (
              <span key={st} className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs font-semibold border border-white/15 text-bss-soft-orange inline-flex items-center gap-1"><TriangleAlert size={12}/>{st} ({ready}/{total})</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6">
      <section className="bss-3d bss-scroll-rise bg-white rounded-2xl overflow-hidden border border-bss-border shadow-sm">
        <div className="relative overflow-hidden bg-gradient-to-br from-bss-navy via-bss-deep-navy to-[#022B5E] text-white p-5">
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
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Step 1 · Select period</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="block"><span className="text-[11px] font-semibold text-bss-text-secondary">Year</span><select value={year} onChange={e => { const y = e.target.value; setYearChoice(y); if (y === String(currentFyStartYear())) setPeriod(currentPeriod(freq)); else if (isFuturePeriod(period, Number(y))) setPeriod(periodsFor(freq)[0]); }} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-white font-medium text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue transition-shadow">{yearOptions.map(y => <option key={y}>{y}</option>)}</select></label>
              <label className="block"><span className="text-[11px] font-semibold text-bss-text-secondary">Frequency</span><select value={freq} onChange={e => { const f = e.target.value as Frequency; setFreq(f); setPeriod(currentPeriod(f)); }} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-white font-medium text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue transition-shadow">{FREQUENCIES.map(f => <option key={f}>{f}</option>)}</select></label>
              <label className="block"><span className="text-[11px] font-semibold text-bss-text-secondary">Period</span><select value={period} onChange={e => setPeriod(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-white font-medium text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue transition-shadow">{periodsFor(freq).map(p => { const future = isFuturePeriod(p, Number(year)); return <option key={p} value={p} disabled={future}>{p}{future ? ' — not yet due' : ''}</option>; })}</select></label>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Step 2 · Upload files</p>
            <div className="grid sm:grid-cols-2 gap-3">
            <label className="group flex items-center gap-3 border-2 border-dashed border-bss-border rounded-xl bg-bss-bg/60 px-4 py-3 cursor-pointer hover:border-bss-interactive-blue hover:bg-bss-blue-tint/40 transition-colors">
              <span className="w-10 h-10 rounded-lg bg-white border border-bss-border grid place-items-center flex-shrink-0 group-hover:border-bss-interactive-blue"><FileSpreadsheet size={18} className="text-bss-interactive-blue"/></span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-bss-text-primary truncate">{masterFile ? masterFile.name : 'Choose Master File'}</span>
                <span className="block text-[11px] text-bss-text-secondary mt-0.5">CSV / XLSX · required</span>
              </span>
              <input type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { setMasterFile(e.target.files?.[0] ?? null); setError(''); }}/>
            </label>
            <label className="group flex items-center gap-3 border-2 border-dashed border-bss-border rounded-xl bg-bss-bg/60 px-4 py-3 cursor-pointer hover:border-bss-interactive-blue hover:bg-bss-blue-tint/40 transition-colors">
              <span className="w-10 h-10 rounded-lg bg-white border border-bss-border grid place-items-center flex-shrink-0 group-hover:border-bss-interactive-blue"><FileText size={18} className="text-bss-interactive-blue"/></span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-bss-text-primary truncate">{signatureFile ? signatureFile.name : 'Choose Signature Upload'}</span>
                <span className="block text-[11px] text-bss-text-secondary mt-0.5">PNG / JPG / PDF · optional</span>
              </span>
              <input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={e => setSignatureFile(e.target.files?.[0] ?? null)}/>
            </label>
            </div>
          </div>
          {error && tab === 'master' && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button onClick={downloadMasterTemplate} className="h-9 px-3 rounded-lg border border-bss-border bg-white text-xs font-semibold text-bss-text-primary flex items-center gap-1.5 hover:bg-bss-bg hover:border-bss-interactive-blue transition-colors shadow-xs"><Download size={14}/>Download Master Template</button>
              <button onClick={validateMaster} disabled={busy || !masterFile} className="h-9 px-3 rounded-lg border border-bss-border bg-white text-xs font-semibold text-bss-text-primary flex items-center gap-1.5 disabled:opacity-50 hover:bg-bss-bg hover:border-bss-interactive-blue transition-colors shadow-xs"><CheckCircle2 size={14}/>Validate File</button>
              <button onClick={generateRegisters} disabled={busy} className="h-9 px-4 rounded-lg bg-bss-interactive-blue text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 hover:bg-bss-deep-navy shadow-sm transition-colors"><Landmark size={14}/>{busy ? 'Generating registers…' : 'Generate CLRA Registers'}</button>
            </div>
          </div>
          <p className="flex items-start gap-2 text-[11px] text-bss-text-secondary bg-bss-bg rounded-lg px-3 py-2 border border-bss-border"><Info size={14} className="text-bss-interactive-blue mt-0.5 flex-shrink-0"/><span>Pick a <strong className="text-bss-text-primary">Frequency</strong> and <strong className="text-bss-text-primary">Period</strong>. Monthly generates every month; choosing Quarterly / Half-Yearly / Yearly generates only those forms for the selected period (a not-yet-due period is forced).</span></p>
          {report && <div className="rounded-xl border border-bss-border overflow-hidden">
            <div className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 ${report.errors.length ? 'bg-bss-soft-orange text-bss-error' : 'bg-bss-soft-green text-bss-green'}`}>
              {report.errors.length ? <TriangleAlert size={14}/> : <CheckCircle2 size={14}/>}
              {report.errors.length ? `${report.errors.length} error(s) — generation is blocked` : 'Validation passed'}
              <span className="ml-auto font-semibold text-bss-text-secondary">{report.rowCount} rows · {report.validRows} valid · {report.siteCount} site(s) · {report.locationCount} location(s)</span>
              <button type="button" onClick={downloadValidationErrors} className="ml-3 shrink-0 inline-flex items-center gap-1 font-semibold text-bss-text-secondary hover:underline"><Download size={12}/>Errors (CSV)</button>
            </div>
            {report.errors.length > 0 && <ul className="divide-y divide-bss-border max-h-40 overflow-y-auto">{report.errors.map((issue, i) => <li key={i} className="px-4 py-2 text-[11px] text-bss-error"><strong>Row {issue.row || '—'}{issue.field ? ` · ${issue.field}` : ''}:</strong> {issue.message}</li>)}</ul>}
            {report.warnings.length > 0 && <ul className="divide-y divide-bss-border max-h-32 overflow-y-auto border-t border-bss-border">{report.warnings.map((issue, i) => <li key={i} className="px-4 py-2 text-[11px] text-bss-orange"><strong>Row {issue.row || '—'}{issue.field ? ` · ${issue.field}` : ''}:</strong> {issue.message}</li>)}</ul>}
            <div className="border-t border-bss-border px-4 py-3 space-y-2 text-[11px]">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-bss-text-secondary">
                <span>Detected state: <strong className="text-bss-text-primary">{report.state || '—'}</strong></span>
                {report.bss && <span>BSS IDs: <strong className="text-bss-green">{report.bss.known}</strong> registered · <strong className={report.bss.unknown ? 'text-bss-orange' : 'text-bss-text-secondary'}>{report.bss.unknown}</strong> unknown{report.bss.checked ? ` of ${report.bss.checked}` : ''}</span>}
                <span>Templates in flow: <strong className="text-bss-text-primary">{report.templates?.length ?? 0}</strong></span>
              </div>
              {(report.templates?.length ?? 0) > 0 && <div className="rounded-lg border border-bss-border overflow-hidden"><table className="w-full text-left"><thead className="bg-bss-bg text-bss-text-secondary"><tr><th className="px-3 py-1.5">Form</th><th className="px-3 py-1.5">Title</th><th className="px-3 py-1.5">Columns</th><th className="px-3 py-1.5">Mapped</th></tr></thead>
                <tbody className="divide-y divide-bss-border">{report.templates!.map(t => <tr key={t.formCode}><td className="px-3 py-1.5 font-mono text-bss-interactive-blue">{t.formCode}</td><td className="px-3 py-1.5 text-bss-text-secondary">{t.title || '—'}</td><td className="px-3 py-1.5 text-bss-text-muted">{t.columns}</td><td className="px-3 py-1.5">{t.columns === 0 ? <span className="text-bss-text-muted">—</span> : <><span className={t.coverage === 100 ? 'text-bss-green font-semibold' : 'text-bss-orange font-semibold'}>{t.coverage}%</span>{t.unmapped.length ? <span className="text-bss-text-muted"> · {t.unmapped.length} unmapped</span> : null}</>}</td></tr>)}</tbody></table></div>}
            </div>
          </div>}
          <p className="text-[11px] text-bss-text-muted pt-3 border-t border-bss-border">Registers are generated in bulk from the uploaded master data, keyed by State and Site/Location, and listed under the <strong className="text-bss-text-secondary">Generated Compliance Batches</strong> tab.</p>
        </div>
      </section>
      </div>

      {/* Generation status — per-site, for the selected period + frequency */}
      {siteStatus.length > 0 && (
        <section className="bss-3d bss-scroll-rise bg-white rounded-2xl overflow-hidden border border-bss-border">
          <header className="px-5 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2"><Activity size={16} className="text-bss-interactive-blue" />Generation Status</h2>
              <p className="text-xs text-bss-text-muted mt-0.5">Registers generated for each allotted site in the selected period.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bss-interactive-blue bg-bss-blue-tint border border-bss-border rounded-full px-2.5 py-1"><Calendar size={12} />{period}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bss-text-secondary bg-bss-bg border border-bss-border rounded-full px-2.5 py-1">{freq}</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bss-text-secondary ml-1"><CheckCircle2 size={13} className={doneCount === siteStatus.length ? 'text-bss-green' : 'text-bss-text-muted'} />{doneCount} of {siteStatus.length} generated</span>
            </div>
          </header>
          <ul className="divide-y divide-bss-border">
            {siteStatus.map(s => (
              <li key={`${s.state}-${s.name}-${s.code}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-bss-bg">
                <div className="min-w-0 flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 ${s.done ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-soft-orange text-bss-orange'}`}>
                    {s.done ? <CheckCircle2 size={16}/> : <Clock3 size={16}/>}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-bss-text-primary">{s.name}</p>
                    <p className="truncate text-[11px] text-bss-text-muted">{s.state}{s.code ? ` · ${s.code}` : ''}</p>
                  </div>
                </div>
                {s.done ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-bss-soft-green text-bss-green" title={s.status ? `Status: ${s.status}` : 'Already generated'}>Generated{s.version > 1 ? ` · V${s.version}` : ''}</span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-bss-soft-orange text-bss-orange">Pending</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* PAN-India register template library for the selected state */}
      <section className="bss-3d bss-scroll-rise bg-white rounded-2xl overflow-hidden border border-bss-border">
        <button type="button" onClick={() => setTemplateLibraryOpen(o => !o)} className="w-full px-5 py-4 flex flex-wrap justify-between gap-2 items-center text-left hover:bg-bss-bg/60 transition-colors">
          <div className="flex items-start gap-3 min-w-0">
            <ChevronDown size={18} className={`mt-0.5 flex-shrink-0 text-bss-text-muted transition-transform ${templateLibraryOpen ? 'rotate-180' : ''}`} />
            <div>
              <h2 className="text-sm font-semibold text-bss-text-primary">Register Template Library — {activeState}</h2>
              <p className="text-xs text-bss-text-muted mt-0.5">State-wise register templates used to render your registers (one sheet per form).</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-bss-text-secondary">{templates.length} template{templates.length === 1 ? '' : 's'}</span>
            {activeAdopted
              ? <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-bss-soft-green text-bss-green">Adopted</span>
              : <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-bss-soft-orange text-bss-orange">Not adopted</span>}
          </div>
        </button>

        {templateLibraryOpen && <>
          <div className="px-5 py-3 flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-bss-text-secondary">Site
              <select value={activeSite?.name || ''} onChange={e => setSiteName(e.target.value)} className="ml-2 h-9 rounded-lg border border-bss-border px-3 text-xs bg-white text-bss-text-primary">{contractor.sites.map(s => <option key={s.id} value={s.name}>{s.name}{s.state ? ` — ${s.state}` : ''}</option>)}</select>
            </label>
          </div>
          {templates.length
            ? <div className="overflow-x-auto border-t border-bss-border"><table className="w-full text-sm text-left"><thead className="bg-bss-bg text-xs text-bss-text-secondary font-semibold"><tr><th className="px-5 py-3">Form</th><th className="px-5 py-3">Title</th></tr></thead>
              <tbody className="divide-y divide-bss-border">{templates.map(t => <tr key={t.id} className="hover:bg-bss-bg"><td className="px-5 py-3 font-mono font-semibold text-bss-interactive-blue">{t.formCode}</td><td className="px-5 py-3 text-bss-text-secondary">{t.title || '—'}</td></tr>)}</tbody></table></div>
            : <p className="p-5 text-xs text-bss-text-muted border-t border-bss-border">{activeAdopted ? `No register templates configured for ${activeState} yet.` : `${activeState}: the principal employer hasn't adopted CLRA forms — nothing is available until they adopt on their CLRA Registers page.`}</p>}
        </>}
      </section>
    </div>}

    {tab === 'report' && <div className="space-y-6">
      <ContractorMonthlyAudit />
    </div>}

    {batchView && <BatchDrilldown batchId={batchView} role="contractor" onClose={() => setBatchView(null)} />}
  </div>;
}

