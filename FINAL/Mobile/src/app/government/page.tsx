"use client";

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Download, Lock, MapPin, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { BarChart, Donut, HBar, Kpi } from '@/components/government/Charts';
import type { GovWorker } from '@/types/portal';
import { useGovernment } from '@/contexts/GovernmentContext';
import { exportMatrixToXlsx } from '@/lib/exportXlsx';

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function hashOf(id: string | number): number { return String(id ?? '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0); }
function joinedMeta(worker: GovWorker): { year: number; month: number } {
  const h = hashOf(worker.id);
  return { year: YEARS[h % YEARS.length], month: 1 + ((h >> 3) % 12) };
}

function money(v: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v); }

export default function GovernmentDashboard() {
  const portal = useGovernment();
  const allRows = portal.workers;

  // State scope — locked by default per official account; demo account may switch state.
  const [lockedState, setLockedState] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try { return window.localStorage.getItem('bss-gov-state') ?? ''; } catch { return ''; }
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [demoSwitch, setDemoSwitch] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [gender, setGender] = useState('all');
  const [category, setCategory] = useState('all');
  const [occupation, setOccupation] = useState('all');
  const [employer, setEmployer] = useState('all');
  const [contractor, setContractor] = useState('all');
  const [year, setYear] = useState(2026);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('bss-gov-state', lockedState); } catch { /* ignore */ }
  }, [lockedState]);

  function lockTo(stateName: string) {
    setLockedState(stateName);
    setPickerOpen(false);
    setDemoSwitch(false);
  }

  const stateRows = useMemo(() => (lockedState ? allRows.filter(worker => worker.state === lockedState) : allRows), [allRows, lockedState]);

  const filtered = useMemo(() => stateRows.filter(w =>
    (gender === 'all' || w.gender === gender) &&
    (category === 'all' || w.category === category) &&
    (occupation === 'all' || w.occupation === occupation) &&
    (employer === 'all' || w.employer === employer) &&
    (contractor === 'all' || w.contractor === contractor),
  ), [stateRows, gender, category, occupation, employer, contractor]);

  const total = filtered.length;

  // -------- Demography helpers
  const genderSlices = useMemo(() => { const g = (v: string) => filtered.filter(w => w.gender === v).length; return [{ label: 'Male', value: g('Male'), color: '#155E95' }, { label: 'Female', value: g('Female'), color: '#2F9E67' }, { label: 'Transgender', value: g('Transgender'), color: '#F47A32' }]; }, [filtered]);
  const distinct = (key: keyof GovWorker) => Array.from(new Set(filtered.map(w => String(w[key])))).sort();
  const occupationBars = useMemo(() => distinct('occupation').map(o => ({ label: o, value: filtered.filter(w => w.occupation === o).length })).sort((a, b) => b.value - a.value), [filtered]); // eslint-disable-line react-hooks/exhaustive-deps
  const categoryBars = useMemo(() => distinct('category').map(c => ({ label: c, value: filtered.filter(w => w.category === c).length })), [filtered]); // eslint-disable-line react-hooks/exhaustive-deps
  const ageHist = useMemo(() => { const bins = [18, 25, 35, 45, 55]; const counts = new Array<number>(bins.length).fill(0); filtered.forEach(w => { const idx = w.age < 55 ? Math.max(0, Math.floor((w.age - bins[0]) / 10)) : bins.length - 1; counts[Math.min(bins.length - 1, idx)] += 1; }); return bins.map((start, i) => ({ label: i === bins.length - 1 ? '55+' : `${start}-${bins[i + 1] - 1}`, value: counts[i] })); }, [filtered]);
  const avgWage = total ? Math.round(filtered.reduce((s, w) => s + w.wage, 0) / total) : 0;
  const avgAge = total ? Math.round(filtered.reduce((s, w) => s + w.age, 0) / total) : 0;

  // -------- Migration / birth mapping
  const migration = useMemo(() => {
    if (!lockedState) {
      const origin = new Map<string, number>();
      filtered.forEach(w => origin.set(w.stateOfOrigin, (origin.get(w.stateOfOrigin) ?? 0) + 1));
      return { local: filtered.length, inMig: 0, outMig: 0, origins: [...origin.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8) };
    }
    const inScope = filtered;
    const bornHereHere = inScope.filter(w => w.stateOfOrigin === lockedState).length;
    const bornElsewhere = inScope.filter(w => w.stateOfOrigin !== lockedState).length;
    const bornHereElsewhere = allRows.filter(w => w.stateOfOrigin === lockedState && w.state !== lockedState).length;
    const origins = new Map<string, number>();
    inScope.filter(w => w.stateOfOrigin !== lockedState).forEach(w => origins.set(w.stateOfOrigin, (origins.get(w.stateOfOrigin) ?? 0) + 1));
    return { local: bornHereHere, inMig: bornElsewhere, outMig: bornHereElsewhere, origins: [...origins.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8) };
  }, [filtered, allRows, lockedState]);

  const byStateBars = useMemo(() => portal.states.map(s => ({ label: s, value: allRows.filter(w => w.state === s).length })), [allRows, portal.states]);

  // -------- Social security (PF & ESIC only — no gratuity/bonus)
  const pfCount = filtered.filter(w => w.epfoLinked).length;
  const esicCount = filtered.filter(w => w.esicLinked).length;
  const both = filtered.filter(w => w.epfoLinked && w.esicLinked).length;
  const neither = filtered.filter(w => !w.epfoLinked && !w.esicLinked).length;
  const pfPct = total ? Math.round((pfCount / total) * 100) : 0;
  const esicPct = total ? Math.round((esicCount / total) * 100) : 0;
  const avgWagePf = pfCount ? Math.round(filtered.filter(w => w.epfoLinked).reduce((s, w) => s + w.wage, 0) / pfCount) : 0;
  const avgWageEsic = esicCount ? Math.round(filtered.filter(w => w.esicLinked).reduce((s, w) => s + w.wage, 0) / esicCount) : 0;
  const epfoCoverageByCategory = useMemo(() => distinct('category').map(c => { const set = filtered.filter(w => w.category === c); return { label: c, value: set.length ? Math.round((set.filter(w => w.epfoLinked).length / set.length) * 100) : 0 }; }).sort((a, b) => b.value - a.value), [filtered]); // eslint-disable-line react-hooks/exhaustive-deps
  const esicCoverageByOccupation = useMemo(() => occupationBars.slice(0, 8).map(o => { const set = filtered.filter(w => w.occupation === o.label); return { label: o.label, value: set.length ? Math.round((set.filter(w => w.esicLinked).length / set.length) * 100) : 0 }; }), [filtered, occupationBars]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------- Time analytics (year-by-year and within-year)
  const yearTrend = useMemo(() => YEARS.map(yearVal => ({ label: String(yearVal), value: filtered.filter(w => joinedMeta(w).year === yearVal).length })), [filtered]);
  const coverageTrend = useMemo(() => YEARS.map(yearVal => {
    const stock = filtered.filter(w => joinedMeta(w).year <= yearVal);
    return { label: String(yearVal), pf: stock.length ? Math.round((stock.filter(w => w.epfoLinked).length / stock.length) * 100) : 0, esic: stock.length ? Math.round((stock.filter(w => w.esicLinked).length / stock.length) * 100) : 0 };
  }), [filtered]);
  const monthRows = useMemo(() => filtered.filter(w => joinedMeta(w).year === year), [filtered, year]);
  const monthTrend = useMemo(() => MONTHS.map((label, idx) => ({ label, value: monthRows.filter(w => joinedMeta(w).month === idx + 1).length })), [monthRows]);
  const monthPf = useMemo(() => MONTHS.map((label, idx) => ({ label, value: monthRows.filter(w => joinedMeta(w).month === idx + 1 && w.epfoLinked).length })), [monthRows]);
  const monthEsic = useMemo(() => MONTHS.map((label, idx) => ({ label, value: monthRows.filter(w => joinedMeta(w).month === idx + 1 && w.esicLinked).length })), [monthRows]);
  const hasYearRows = yearTrend.some(item => item.value > 0);

  // -------- Employer & contractor landscape
  const topBy = (key: 'employer' | 'contractor') => distinct(key).map(k => ({ label: k, value: filtered.filter(w => w[key] === k).length, wage: (() => { const set = filtered.filter(w => w[key] === k); return set.length ? Math.round(set.reduce((s, w) => s + w.wage, 0) / set.length) : 0; })() })).sort((a, b) => b.value - a.value).slice(0, 8);
  const employerTop = useMemo(() => topBy('employer'), [filtered]); // eslint-disable-line react-hooks/exhaustive-deps
  const contractorTop = useMemo(() => topBy('contractor'), [filtered]); // eslint-disable-line react-hooks/exhaustive-deps
  const topMax = Math.max(1, ...employerTop.map(item => item.value), ...contractorTop.map(item => item.value));
  const employerCount = new Set(filtered.map(w => w.employer)).size;
  const contractorCount = new Set(filtered.map(w => w.contractor)).size;
  const siteCount = new Set(filtered.map(w => w.site)).size;

  function exportExcel() {
    const fields: Array<keyof GovWorker> = ['id', 'state', 'district', 'city', 'gender', 'age', 'category', 'occupation', 'site', 'siteType', 'employer', 'contractor', 'stateOfOrigin', 'epfoLinked', 'esicLinked', 'wage'];
    const head = fields.map(field => String(field));
    const rows = filtered.map(worker => fields.map(field => String(worker[field] ?? '')));
    exportMatrixToXlsx({ filename: `bss-gov-scope-${lockedState || 'india'}-${new Date().toISOString().slice(0, 10)}`, head, rows, sheetName: 'Scope' });
  }

  return <div className="space-y-6 pb-12">
    {/* header */}
    <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Government · Policy & analytics</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">{lockedState ? `${lockedState} Labour Dashboard` : 'India Labour Dashboard'}</h1>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">Government Portal</span>
        </div>
        <p className="text-sm text-gray-500 mt-1 max-w-3xl">State-locked, evidence-ready statistics on workers, social security (PF · ESIC), migration, employers, contractors and sites — for informed policy drafting.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => { setDemoSwitch(false); setPickerOpen(true); }} className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-gray-50"><MapPin size={15}/> {lockedState ? lockedState : 'All India'} <Lock size={13} className="text-gray-300"/></button>
        <button onClick={exportExcel} className="h-10 px-4 rounded-lg bg-[#0F172A] hover:bg-black text-white text-sm font-semibold inline-flex items-center gap-2"><Download size={15}/>Export Excel</button>
      </div>
    </header>

    {/* state lock banner + demo switch */}
    {lockedState ? (
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-900">
        <span className="inline-flex items-center gap-2"><Lock size={14}/>Scope locked to <strong>{lockedState}</strong> — the dashboard shows this state only, including its migrant flows and social-security statistics.</span>
        <button onClick={() => { setDemoSwitch(true); setPickerOpen(true); }} className="inline-flex items-center gap-1.5 font-bold text-[#073B67] hover:underline"><RefreshCw size={12}/>Demo account — switch state</button>
      </div>
    ) : (
      <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-800 inline-flex items-center gap-2"><ShieldCheck size={14}/>Unlocked (All-India). Select and lock a state to get the state-level 360° view.</div>
    )}

    {/* refine (optional filters) */}
    <details className="bg-white border border-gray-200 rounded-2xl" open={refineOpen} onToggle={event => setRefineOpen((event.target as HTMLDetailsElement).open)}>
      <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between text-xs font-semibold text-gray-500 select-none"><span>Refine by demography (gender · category · occupation · employer · contractor)</span><ChevronDown size={14} className="transition-transform group-open:rotate-180"/></summary>
      <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-5 gap-2">
        {([['gender', gender, setGender, ['Male', 'Female', 'Transgender']], ['category', category, setCategory, distinct('category')], ['occupation', occupation, setOccupation, distinct('occupation')], ['employer', employer, setEmployer, distinct('employer')], ['contractor', contractor, setContractor, distinct('contractor')]] as Array<[string, string, (v: string) => void, string[]]>).map(([label, value, setter, options]) => (
          <label key={label} className="text-[11px] font-semibold text-gray-500 capitalize">{label === 'gender' ? 'Gender' : label}<select value={value} onChange={event => setter(event.target.value)} className="mt-1 w-full h-10 rounded-lg border border-gray-200 px-2 text-xs bg-white normal-case"><option value="all">All</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select></label>
        ))}
      </div>
    </details>

    {/* KPI strip */}
    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-3">
      <Kpi label="Workers in scope" value={total} tone="bg-blue-600"/>
      <Kpi label="Employers" value={employerCount} tone="bg-emerald-600"/>
      <Kpi label="Contractors" value={contractorCount} tone="bg-teal-600"/>
      <Kpi label="Worksites" value={siteCount} tone="bg-purple-600"/>
      <Kpi label="Average wage" value={money(avgWage)} tone="bg-orange-500"/>
      <Kpi label="PF coverage" value={`${pfPct}%`} tone="bg-cyan-600"/>
      <Kpi label="ESIC coverage" value={`${esicPct}%`} tone="bg-indigo-600"/>
      <Kpi label="Average age" value={`${avgAge} yrs`} tone="bg-green-600"/>
    </section>

    {/* 1 — Demography */}
    <Section title={lockedState ? 'By Demography' : 'By State'} subtitle={lockedState ? 'Demographic profile of workers in this state' : 'Workers registered across states and UTs'}>
      {lockedState ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Gender" subtitle="Sex disaggregation"><Donut slices={genderSlices}/></Card>
          <Card title="Age bands" subtitle="Age distribution"><BarChart data={ageHist} color="#2F9E67" height={150}/></Card>
          <Card title="Category of work" subtitle="Sector / category"><HBar data={categoryBars} color="#7C3AED"/></Card>
          <Card title="Occupation / trade" subtitle="Occupation distribution"><HBar data={occupationBars} color="#0891B2"/></Card>
        </div>
      ) : (
        <Card title="By State" subtitle="Registered workers across states and UTs"><BarChart data={byStateBars} height={200}/></Card>
      )}
    </Section>

    {/* 2 — Migration & origin mapping (birth place → work state) */}
    <Section title="Migration & Origin Mapping" subtitle={lockedState ? `Workers mapped by declared place of birth vs. place of work — ${lockedState}` : 'Birth-state vs work-state mapping across India'}>
      {lockedState ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Within this state" subtitle="Local vs in-migrant workers">
            <Donut slices={[{ label: `Local (born in ${lockedState})`, value: migration.local, color: '#2F9E67' }, { label: 'In-migrant', value: migration.inMig, color: '#F47A32' }]}/>
          </Card>
          <Card title="Out-migration volume" subtitle={`Born in ${lockedState} but working in another state`}>
            <div className="flex items-center gap-6"><strong className="text-4xl text-gray-900">{migration.outMig}</strong><p className="text-xs text-gray-500 max-w-56">Workers whose declared place of birth is {lockedState} but who are registered at worksites in other states — for emigrant-labour policy.</p></div>
            <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Top states where {lockedState} workers work</p><p className="text-xs text-gray-500">Requires full inter-state work records (available after the mandatory place-of-birth capture reaches registration coverage).</p></div>
          </Card>
        </div>
      ) : (
        <Card title="By Birth State" subtitle="Where the registered workforce was born"><HBar data={migration.origins} color="#F47A32"/></Card>
      )}
      {lockedState && <Card title="Where this state's in-migrants come from" subtitle="Top origin states of workers currently working in this state"><HBar data={migration.origins} color="#155E95"/></Card>}
    </Section>

    {/* 3 — Social security (PF & ESIC only) */}
    <Section title="Social Security — PF & ESIC" subtitle="Workers covered by EPFO (PF/UAN) and ESIC; gratuity and bonus are intentionally excluded from this view">
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <MiniStat label="PF / UAN linked" value={`${pfPct}%`} detail={`${pfCount} workers · avg wage ${money(avgWagePf)}`} tone="text-cyan-700 bg-cyan-50 border-cyan-100"/>
        <MiniStat label="ESIC covered" value={`${esicPct}%`} detail={`${esicCount} workers · avg wage ${money(avgWageEsic)}`} tone="text-indigo-700 bg-indigo-50 border-indigo-100"/>
        <MiniStat label="Coverage mix" value={`${both} both / ${neither} none`} detail="PF & ESIC overlap vs unprotected" tone="text-gray-700 bg-gray-50 border-gray-200"/>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="EPFO coverage" subtitle="UAN-linked share"><Donut slices={[{ label: 'PF linked', value: pfCount, color: '#155E95' }, { label: 'Not linked', value: total - pfCount, color: '#E5E7EB' }]}/></Card>
        <Card title="ESIC coverage" subtitle="ESIC-insured share"><Donut slices={[{ label: 'ESIC covered', value: esicCount, color: '#2F9E67' }, { label: 'Not covered', value: total - esicCount, color: '#E5E7EB' }]}/></Card>
        <Card title="PF coverage by category" subtitle="UAN-linked % per work category"><HBar data={epfoCoverageByCategory} color="#155E95"/></Card>
        <Card title="ESIC coverage by occupation" subtitle="ESIC-insured % per occupation"><HBar data={esicCoverageByOccupation} color="#2F9E67"/></Card>
      </div>
    </Section>

    {/* 4 — Time analytics */}
    <Section title="Time Analytics" subtitle="Year-by-year trends and within-year monthly comparisons">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="New registrations by year" subtitle="Year-by-year trend of the scoped cohort">
          <BarChart data={yearTrend} color="#155E95" height={150}/>
          <p className="text-[10px] text-gray-400 mt-2">{hasYearRows ? 'Illustrative cohort registration years.' : 'No rows for the selected criteria.'}</p>
        </Card>
        <Card title="Coverage trend (cumulative %)" subtitle="PF & ESIC stock coverage by year">
          <GroupBar pf={coverageTrend.map(item => ({ label: item.label, value: item.pf }))} esic={coverageTrend.map(item => ({ label: item.label, value: item.esic }))}/>
        </Card>
        <div className="lg:col-span-2">
          <Card title="Within-year comparison" subtitle={`Monthly registrations for the selected year`}>
            <div className="flex flex-wrap items-center gap-2 mb-4"><span className="text-xs font-semibold text-gray-600">Year</span><select value={year} onChange={event => setYear(Number(event.target.value))} className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white">{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select><span className="text-xs text-gray-400 ml-2">Registrations by month</span></div>
            <BarChart data={monthTrend} color="#7C3AED" height={150}/>
            <div className="mt-6"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">PF & ESIC joins by month ({year})</p><GroupBar pf={monthPf} esic={monthEsic}/></div>
          </Card>
        </div>
      </div>
    </Section>

    {/* 5 — Employer & contractor landscape */}
    <Section title="Employer & Contractor Landscape" subtitle={`${employerCount} employers and ${contractorCount} contractors active in the scope — shown together for a 360° view`}>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Top employers" subtitle="Worker concentration and average wage">
          <div className="space-y-2">{employerTop.map(entry => <TopRow key={entry.label} label={entry.label} value={entry.value} detail={money(entry.wage)} width={Math.round((entry.value / topMax) * 100)}/>)}</div>
        </Card>
        <Card title="Top contractors" subtitle="Worker concentration and average wage">
          <div className="space-y-2">{contractorTop.map(entry => <TopRow key={entry.label} label={entry.label} value={entry.value} detail={money(entry.wage)} width={Math.round((entry.value / topMax) * 100)}/>)}</div>
        </Card>
      </div>
    </Section>

    {/* 6 — Notes */}
    <section className="rounded-xl border border-gray-200 bg-white p-4 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-gray-500">
      <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-green-600"/>Place-of-birth capture powers migration mapping</span>
      <span className="inline-flex items-center gap-1.5"><Users size={13}/>Workers ↔ Employer ↔ Contractor ↔ Site relations included</span>
      <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13}/>Compliance status intentionally not shown</span>
    </section>

    {pickerOpen && (
      <div className="fixed inset-0 z-[120] bg-black/50 grid place-items-center p-4" role="presentation">
        <section role="dialog" aria-modal="true" className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden max-h-[85vh]">
          <header className="px-5 py-4 border-b border-gray-100 flex items-start justify-between"><div><h2 className="font-semibold">{lockedState ? 'Switch state scope' : 'Lock state scope'}</h2><p className="text-xs text-gray-500 mt-1">State government officials view only their own state. {demoSwitch ? 'Demo account — state switching is enabled for demonstration.' : 'This control is available to the demo government account.'}</p></div><button onClick={() => setPickerOpen(false)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-100"><ChevronDown size={16} className="rotate-180"/></button></header>
          <div className="p-4 overflow-y-auto max-h-[60vh] grid grid-cols-2 md:grid-cols-3 gap-2">
            {portal.states.map(stateName => <button key={stateName} onClick={() => lockTo(stateName)} className={`px-3 py-2.5 rounded-xl border text-left text-xs font-semibold ${lockedState === stateName ? 'border-[#073B67] bg-blue-50 text-[#073B67]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>{stateName}</button>)}
          </div>
          {lockedState && <footer className="px-5 py-3 border-t border-gray-100"><button onClick={() => lockTo('')} className="text-xs font-semibold text-blue-700">Show All India</button></footer>}
        </section>
      </div>
    )}
  </div>;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="space-y-4"><header><h2 className="text-lg font-semibold tracking-tight text-gray-950 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#073B67]"/>{title}</h2>{subtitle && <p className="text-xs text-gray-400 mt-0.5 ml-4">{subtitle}</p>}</header><div className="bg-white border border-gray-200 rounded-2xl p-5">{children}</div></section>;
}
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-100 p-4"><h3 className="text-sm font-semibold text-gray-900">{title}</h3>{subtitle && <p className="text-[11px] text-gray-400 mt-0.5 mb-3">{subtitle}</p>}<div className="mt-3">{children}</div></div>;
}
function MiniStat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <div className={`rounded-xl border p-4 ${tone}`}><p className="text-[11px] font-bold uppercase tracking-wider">{label}</p><strong className="block text-2xl mt-1">{value}</strong><p className="text-[11px] opacity-80 mt-1">{detail}</p></div>;
}
function TopRow({ label, value, detail, width }: { label: string; value: number; detail: string; width: number }) {
  return <div className="flex items-center justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-gray-800 truncate">{label}</p><p className="text-[10px] text-gray-400 mt-0.5">{value} workers · avg {detail}</p><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-[#073B67] rounded-full" style={{ width: `${Math.max(4, width)}%` }}/></div></div><strong className="text-sm text-gray-900 shrink-0">{value}</strong></div>;
}

function GroupBar({ pf, esic }: { pf: Array<{ label: string; value: number }>; esic: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...pf.map(d => d.value), ...esic.map(d => d.value));
  return <div className="flex items-end gap-1" style={{ height: 150 }}>{pf.map((item, index) => <div key={item.label} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${item.label} · PF ${item.value}% · ESIC ${esic[index]?.value ?? 0}%`}><div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '120px' }}><div className="w-1/2 bg-[#155E95] rounded-t" style={{ height: `${Math.max(2, item.value / max * 100)}%`}}/><div className="w-1/2 bg-[#2F9E67] rounded-t" style={{ height: `${Math.max(2, (esic[index]?.value ?? 0) / max * 100)}%`}}/></div><span className="text-[10px] text-gray-500">{item.label}</span></div>)}</div>;
}
