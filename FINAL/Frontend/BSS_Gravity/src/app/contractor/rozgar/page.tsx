"use client";
import { useMemo, useState } from 'react';
import { Briefcase, CheckCircle2, MapPin, Search, Send, UserRound, X, Eye, FileText, ArrowRight, ChevronLeft } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorJobPosting, ContractorPortalData } from '@/types/portal';

type Application = ContractorPortalData['applications'][number];
const money = new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 });

const STATES = ['Maharashtra', 'Gujarat', 'Karnataka', 'Uttar Pradesh', 'West Bengal', 'Bihar'];
const CITIES: Record<string, string[]> = { Maharashtra:['Mumbai','Pune','Navi Mumbai','Nagpur'], Gujarat:['Ahmedabad','Surat','Vadodara'], Karnataka:['Bengaluru','Hubli'], 'Uttar Pradesh':['Noida','Lucknow'], 'West Bengal':['Kolkata'], Bihar:['Patna'] };
const CATEGORIES = ['Skilled Construction', 'Semi-skilled Construction', 'Unskilled Construction', 'Electrical', 'Plumbing', 'Carpentry', 'Other'];
const WORKPLACE = ['On-site', 'Hybrid', 'Off-site'];
const SKILL_OPTIONS = ['Bar Bending (Rebar)', 'Masonry', 'Electric wiring', 'Plastering', 'Scaffolding', 'Welding', 'Reading drawings', 'Shuttering', 'Painting', 'Material handling'];
const VISIBILITY = ['Public', 'Private'];

type PostingDraft = {
  title:string; trade:string; category:string; workplaceType:string; state:string; city:string; site:string; vacancies:string; monthlyWage:string; closingDate:string;
  description:string; skills:string[]; experience:string; minSalary:string; maxSalary:string; salaryVisibility:string; visibility:string; duration:string;
};

export default function ContractorRozgarPage() {
  const { contractor, replaceContractor, mutate } = useContractor();
  const [tab, setTab] = useState<'jobs' | 'applicants' | 'available'>('jobs');
  const [selectedId, setSelectedId] = useState(contractor.applications[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [posting, setPosting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [jobFilter, setJobFilter] = useState<{ status:string; state:string; city:string; site:string }>({ status:'All', state:'All', city:'All', site:'All' });
  const [draft, setDraft] = useState<PostingDraft>({ title:'', trade:'', category:'', workplaceType:'On-site', state:'', city:'', site:'', vacancies:'', monthlyWage:'', closingDate:'', description:'', skills:[], experience:'', minSalary:'', maxSalary:'', salaryVisibility:'Visible to all', visibility:'Public', duration:'' });

  const apps = useMemo(() => contractor.applications.filter(a => [a.workerName, a.workerId, a.trade, a.location].some(value => value.toLowerCase().includes(query.toLowerCase()))), [contractor.applications, query]);
  const selected = contractor.applications.find(a => a.id === selectedId);
  const jobs = contractor.jobHistory;
  const jobStates = ['All', ...new Set(jobs.map(j => j.state))];
  const jobCities = ['All', ...new Set(jobs.filter(j => jobFilter.state === 'All' || j.state === jobFilter.state).map(j => j.city))];
  const jobSites = ['All', ...new Set(jobs.filter(j => jobFilter.city === 'All' || j.city === jobFilter.city).map(j => j.site))];
  const jobStatuses = ['All', ...new Set(jobs.map(j => j.status))];
  const filteredJobs = useMemo(() => jobs.filter(j => (jobFilter.status === 'All' || j.status === jobFilter.status) && (jobFilter.state === 'All' || j.state === jobFilter.state) && (jobFilter.city === 'All' || j.city === jobFilter.city) && (jobFilter.site === 'All' || j.site === jobFilter.site)), [jobs, jobFilter]);

  const totals = { jobs: jobs.length, applications: jobs.reduce((s, j) => s + j.applications, 0) + contractor.applications.length, hires: jobs.reduce((s, j) => s + j.hires, 0) };

  async function action(status: Application['status']) {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      await mutate('applications', 'PATCH', { id: selected.id, status });
      replaceContractor({ ...contractor, applications: contractor.applications.map(a => a.id === selected.id ? { ...a, status } : a) });
      setNotice(status === 'Hired' ? 'Binding workflow started for ' + selected.workerName + '.' : 'Application marked ' + status.toLowerCase() + '.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Application could not be updated.'); }
    finally { setBusy(false); }
  }

  async function submitPosting(asDraft: boolean) {
    setBusy(true); setError(''); setNotice('');
    const required = [draft.title, draft.trade, draft.state, draft.city, draft.site, draft.description, draft.experience, draft.monthlyWage];
    if (!asDraft && required.some(v => !v)) { setError('Complete the required fields (title, trade, state, city, site, description, experience, monthly wage) before publishing.'); setBusy(false); return; }
    try {
      const result = await mutate<{ data?: { id?: number } }>('job-postings', 'POST', { ...draft, status: asDraft ? 'Draft' : 'Submitted' });
      setPosting(false); setStep(1);
      const postingRecord: ContractorJobPosting = {
        id: String(result?.data?.id ?? `JOB-${Date.now()}`), title: draft.title, trade: draft.trade, category: draft.category, workplaceType: draft.workplaceType, state: draft.state, city: draft.city,
        site: draft.site, description: draft.description, skills: draft.skills, experience: draft.experience, minSalary: Number(draft.minSalary) || 0, maxSalary: Number(draft.maxSalary) || 0,
        salaryVisibility: draft.salaryVisibility, vacancies: Number(draft.vacancies) || 1, monthlyWage: Number(draft.monthlyWage) || 0, closingDate: draft.closingDate, duration: draft.duration,
        visibility: draft.visibility, status: asDraft ? 'Draft' : 'Submitted', postedOn: asDraft ? '' : new Date().toISOString().slice(0, 10), applications: 0, hires: 0,
      };
      replaceContractor({ ...contractor, jobHistory: [postingRecord, ...contractor.jobHistory] });
      setNotice(asDraft ? 'Posting saved as Draft — publish it from the job dashboard when ready.' : 'Job posting submitted for approval and applicant matching.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Posting could not be created.'); }
    finally { setBusy(false); }
  }

  async function inviteToBind(worker: ContractorPortalData['availableWorkers'][number]) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/bindings/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'BSS_WORKER', bssId: worker.workerId }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Binding request could not be sent.');
      setNotice(`Binding request sent to ${worker.workerName} — they approve it from their portal.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Binding request could not be sent.'); }
    finally { setBusy(false); }
  }

  const setD = (key: keyof PostingDraft, value: string | string[]) => setDraft(current => ({ ...current, [key]: value }));
  const toggleSkill = (skill: string) => setDraft(current => ({ ...current, skills: current.skills.includes(skill) ? current.skills.filter(s => s !== skill) : [...current.skills, skill] }));

  const input = 'mt-1 w-full h-10 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20';
  const stepHead = (n: 1 | 2 | 3, label: string) => <span className={`flex items-center gap-2 text-xs font-bold ${step === n ? 'text-blue-700' : step > n ? 'text-green-700' : 'text-gray-400'}`}><span className={`w-6 h-6 rounded-full grid place-items-center ${step === n ? 'bg-blue-700 text-white' : step > n ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{step > n ? '✓' : n}</span>{label}</span>;

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Master data</p><h1 className="text-2xl font-bold mt-1">Rozgar Setu — Job Management</h1><p className="text-sm text-gray-500 mt-1">Post jobs, track job history and analytics, and source matched applicants for hire & bind.</p></div>
      <button onClick={() => { setPosting(true); setStep(1); setError(''); }} className="h-10 px-4 rounded-lg bg-gray-950 text-white text-sm font-semibold flex items-center gap-2 self-start"><Send size={15}/>Post new job</button>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && !posting && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    {/* Job analytics */}
    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Total Job Posted</span><span className="bss-kpi-icon bg-blue-50 text-blue-700"><Briefcase size={16}/></span></div><strong>{totals.jobs}</strong><p>Across all sites</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Total Applications</span><span className="bss-kpi-icon bg-orange-50 text-orange-700"><UserRound size={16}/></span></div><strong>{totals.applications}</strong><p>Matched applicants</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Total Hires</span><span className="bss-kpi-icon bg-green-50 text-green-700"><CheckCircle2 size={16}/></span></div><strong>{totals.hires}</strong><p>Hired & bound</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Open vacancies</span><span className="bss-kpi-icon bg-indigo-50 text-indigo-700"><FileText size={16}/></span></div><strong>{jobs.filter(j => j.status !== 'Closed').reduce((s, j) => s + j.vacancies, 0)}</strong><p>From active postings</p></article>
    </section>

    <div className="flex border-b">
      <button onClick={() => setTab('jobs')} className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === 'jobs' ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500'}`}>Job Dashboard & History</button>
      <button onClick={() => setTab('applicants')} className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === 'applicants' ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500'}`}>Workforce Sourcing — Applicants</button>
      <button onClick={() => setTab('available')} className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === 'available' ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500'}`}>Available Workers ({contractor.availableWorkers.length})</button>
    </div>

    {tab === 'jobs' && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-gray-950">Job History</h2><p className="text-xs text-gray-400 mt-0.5">Posted jobs with state, city, designation, experience and application tracking.</p></div>
        <div className="flex flex-wrap gap-2">{(Object.entries({ status: jobStatuses, state: jobStates, city: jobCities, site: jobSites }) as Array<[keyof typeof jobFilter, string[]]>).map(([key, options]) => <select key={key} value={jobFilter[key]} onChange={e => setJobFilter(current => ({ ...current, [key]: e.target.value }))} aria-label={`Filter by ${key}`} className="h-9 rounded-lg border border-gray-200 px-2 pr-6 text-xs bg-white"><option value="All">{key === 'status' ? 'Status' : key === 'state' ? 'State' : key === 'city' ? 'City' : 'Site'}: All</option>{options.filter(option => option !== 'All').map(option => <option key={option}>{option}</option>)}</select>)}</div>
      </header>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100"><tr><th className="px-5 py-3">Job</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Experience</th><th className="px-5 py-3">Wage</th><th className="px-5 py-3">Applications</th><th className="px-5 py-3">Hires</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Posted</th></tr></thead>
        <tbody className="divide-y divide-gray-100">{filteredJobs.map(job => (
          <tr key={job.id} className="hover:bg-gray-50">
            <td className="px-5 py-3"><p className="font-semibold text-gray-900">{job.title}</p><p className="text-xs text-gray-500 mt-0.5">{job.trade} · {job.category} · {job.site}</p></td>
            <td className="px-5 py-3 text-gray-600"><span className="inline-flex items-center gap-1 text-xs"><MapPin size={12}/>{job.city}, {job.state}</span></td>
            <td className="px-5 py-3 text-gray-600">{job.experience}</td>
            <td className="px-5 py-3 font-medium text-gray-900">{money.format(job.monthlyWage)}/mo</td>
            <td className="px-5 py-3 font-medium text-gray-900">{job.applications}</td>
            <td className="px-5 py-3 font-medium text-green-700">{job.hires}</td>
            <td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${job.status === 'Approved' ? 'bg-green-50 text-green-700' : job.status === 'Submitted' ? 'bg-orange-50 text-orange-700' : job.status === 'Closed' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700'}`}>{job.status}</span></td>
            <td className="px-5 py-3 text-gray-500">{job.postedOn || '—'}</td>
          </tr>
        ))}</tbody></table></div>
      {filteredJobs.length === 0 && <p className="p-10 text-center text-sm text-gray-400">No jobs match the selected filters.</p>}
    </section>}

    {tab === 'applicants' && <div className="grid md:grid-cols-12 gap-6">
      <section className="md:col-span-5 space-y-3">
        <label className="relative block"><Search size={16} className="absolute left-3 top-3 text-gray-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search applications" className="w-full h-10 pl-9 pr-3 border rounded-lg"/></label>
        {apps.length ? apps.map(app => <button key={app.id} onClick={() => setSelectedId(app.id)} className={'w-full text-left p-4 rounded-xl border bg-white ' + (selectedId === app.id ? 'border-blue-700 ring-1 ring-blue-700' : 'border-gray-200')}>
          <div className="flex justify-between"><span className="text-xs font-semibold text-blue-700">{app.status}</span><span className="text-xs text-green-700">{app.matchScore}% match</span></div>
          <h2 className="font-semibold mt-2">{app.workerName}</h2><p className="text-xs text-gray-500 mt-1">{app.trade} · {app.location} · Applied {app.dateApplied}</p>
        </button>) : <p className="p-8 bg-white border rounded-xl text-center text-sm text-gray-500">No matching applications.</p>}
      </section>
      <section className="md:col-span-7">{selected ? <div className="bg-white border rounded-2xl overflow-hidden">
        <header className="bg-[#062D4F] text-white p-6"><h2 className="text-xl font-bold">{selected.workerName}</h2><p className="font-mono text-sm text-white/70">{selected.workerId}</p></header>
        <div className="p-6 grid grid-cols-2 gap-5">
          <Fact label="Trade" value={selected.trade} icon={UserRound}/><Fact label="Location" value={selected.location} icon={MapPin}/><Fact label="Experience" value={selected.experience}/><Fact label="Expected wage" value={money.format(selected.expectedWage)}/><Fact label="Applied" value={selected.dateApplied}/><Fact label="Match score" value={selected.matchScore + '%'}/>
          <div className="col-span-2 flex flex-wrap gap-2 pt-4 border-t">{selected.status === 'Pending' && <button disabled={busy} onClick={() => action('Shortlisted')} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold">Shortlist</button>}{['Pending', 'Shortlisted'].includes(selected.status) && <button disabled={busy} onClick={() => action('Hired')} className="px-4 py-2 rounded-lg bg-green-700 text-white font-semibold flex gap-2"><CheckCircle2 size={17}/>Hire & bind</button>}{!['Hired', 'Rejected'].includes(selected.status) && <button disabled={busy} onClick={() => action('Rejected')} className="px-4 py-2 rounded-lg border text-red-700 font-semibold">Reject</button>}</div>
        </div>
      </div> : <div className="bg-white border rounded-2xl p-10 text-center"><Briefcase className="mx-auto text-gray-300"/><p className="mt-3 text-sm text-gray-500">Select an application.</p></div>}</section>
    </div>}

    {tab === 'available' && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Workers available for work</h2><p className="text-xs text-gray-400 mt-0.5">Workers who turned on Rozgar Setu availability. Send a binding request to engage them at your default site.</p></header>
      <div className="divide-y divide-gray-100">
        {contractor.availableWorkers.length ? contractor.availableWorkers.map(worker => (
          <div key={worker.id} className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><h3 className="font-semibold text-gray-900">{worker.workerName}</h3><span className="text-[10px] font-bold uppercase text-green-700 bg-green-50 rounded px-1.5 py-0.5">Available</span></div>
              <p className="font-mono text-[11px] text-gray-400 mt-0.5">{worker.workerId}</p>
              <p className="text-xs text-gray-500 mt-1">{[worker.trade, worker.location].filter(Boolean).join(' · ') || '—'}{worker.skills.length ? ` · ${worker.skills.join(', ')}` : ''}</p>
            </div>
            <button disabled={busy} onClick={() => void inviteToBind(worker)} className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold hover:bg-[#062D4F] disabled:opacity-60">Invite to bind</button>
          </div>
        )) : <p className="p-10 text-center text-sm text-gray-400">No workers are currently available. They appear here when a worker turns on “Available for work”.</p>}
      </div>
    </section>}

    {/* Post new job — multi-step wizard */}
    {posting && <div className="fixed inset-0 z-[80] bg-black/50 grid place-items-center p-4"><section role="dialog" aria-modal="true" className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex justify-between items-center"><div><h2 className="font-semibold text-sm">Post new job</h2><p className="text-xs text-gray-500 mt-1">Capture full job specification with a review step before publishing.</p></div><button onClick={() => setPosting(false)} aria-label="Close"><X/></button></header>
      <div className="px-5 pt-4 flex gap-6">{stepHead(1, 'Basic Information')}{stepHead(2, 'Job Specification')}{stepHead(3, 'Final Review')}</div>
      <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
        {step === 1 && <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-xs font-semibold">Job Title<input value={draft.title} onChange={e => setD('title', e.target.value)} placeholder="e.g. Senior Bar Bender — Metro Depot" className={input}/></label>
          <label className="text-xs font-semibold">Job Category<select value={draft.category} onChange={e => setD('category', e.target.value)} className={input}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
          <label className="text-xs font-semibold">Trade<input value={draft.trade} onChange={e => setD('trade', e.target.value)} placeholder="e.g. Bar Bender (Rebar)" className={input}/></label>
          <label className="text-xs font-semibold">Workplace Type<select value={draft.workplaceType} onChange={e => setD('workplaceType', e.target.value)} className={input}>{WORKPLACE.map(w => <option key={w}>{w}</option>)}</select></label>
          <label className="text-xs font-semibold">State<select value={draft.state} onChange={e => { setD('state', e.target.value); setD('city', ''); }} className={input}><option value="">Select state</option>{STATES.map(s => <option key={s}>{s}</option>)}</select></label>
          <label className="text-xs font-semibold">City<select value={draft.city} onChange={e => setD('city', e.target.value)} disabled={!draft.state} className={input}><option value="">Select city</option>{(CITIES[draft.state] ?? []).map(c => <option key={c}>{c}</option>)}</select></label>
          <label className="text-xs font-semibold">Site<select value={draft.site} onChange={e => setD('site', e.target.value)} className={input}><option value="">Select site</option>{contractor.sites.map(s => <option key={s.id}>{s.name}</option>)}</select></label>
          <label className="text-xs font-semibold">Vacancies<input value={draft.vacancies} onChange={e => setD('vacancies', e.target.value.replace(/\D/g, ''))} type="number" min="1" className={input}/></label>
          <label className="text-xs font-semibold">Monthly Wage (₹)<input value={draft.monthlyWage} onChange={e => setD('monthlyWage', e.target.value.replace(/\D/g, ''))} type="number" min="0" className={input}/></label>
          <label className="text-xs font-semibold">Closing Date<input value={draft.closingDate} onChange={e => setD('closingDate', e.target.value)} type="date" className={input}/></label>
        </div>}
        {step === 2 && <div className="grid sm:grid-cols-2 gap-4">
          <label className="sm:col-span-2 text-xs font-semibold">Job Description<textarea value={draft.description} onChange={e => setD('description', e.target.value)} rows={4} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"/></label>
          <label className="text-xs font-semibold">Required Experience<input value={draft.experience} onChange={e => setD('experience', e.target.value)} placeholder="e.g. 2–8 years" className={input}/></label>
          <label className="text-xs font-semibold">Posting Duration<input value={draft.duration} onChange={e => setD('duration', e.target.value)} placeholder="e.g. 6 months" className={input}/></label>
          <div className="sm:col-span-2"><p className="text-xs font-semibold">Required Skills</p><div className="mt-2 flex flex-wrap gap-2">{SKILL_OPTIONS.map(skill => <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${draft.skills.includes(skill) ? 'bg-blue-700 text-white border-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{skill}</button>)}</div></div>
          <label className="text-xs font-semibold">Annual Salary Range — Min (₹)<input value={draft.minSalary} onChange={e => setD('minSalary', e.target.value.replace(/\D/g, ''))} type="number" min="0" className={input}/></label>
          <label className="text-xs font-semibold">Annual Salary Range — Max (₹)<input value={draft.maxSalary} onChange={e => setD('maxSalary', e.target.value.replace(/\D/g, ''))} type="number" min="0" className={input}/></label>
          <label className="text-xs font-semibold">Salary Visibility<select value={draft.salaryVisibility} onChange={e => setD('salaryVisibility', e.target.value)} className={input}><option>Visible to all</option><option>Visible to matched only</option><option>Hidden</option></select></label>
          <label className="text-xs font-semibold">Posting Visibility<select value={draft.visibility} onChange={e => setD('visibility', e.target.value)} className={input}>{VISIBILITY.map(v => <option key={v}>{v}</option>)}</select></label>
        </div>}
        {step === 3 && <div className="rounded-xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-start justify-between"><div><h3 className="text-base font-bold text-gray-950">{draft.title || 'Untitled job'}</h3><p className="text-xs text-gray-500 mt-1">{draft.trade} · {draft.category} · {draft.workplaceType}</p></div><span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">Review before publish</span></div>
          <dl className="grid grid-cols-2 gap-3 text-xs"><Fact label="Location" value={`${draft.city || '—'}, ${draft.state || '—'}`}/><Fact label="Site" value={draft.site || '—'}/><Fact label="Vacancies" value={draft.vacancies || '—'}/><Fact label="Monthly wage" value={draft.monthlyWage ? money.format(Number(draft.monthlyWage)) : '—'}/><Fact label="Experience" value={draft.experience || '—'}/><Fact label="Closing date" value={draft.closingDate || '—'}/><Fact label="Salary range" value={draft.minSalary || draft.maxSalary ? `${draft.minSalary ? money.format(Number(draft.minSalary)) : '—'} – ${draft.maxSalary ? money.format(Number(draft.maxSalary)) : '—'}` : '—'}/><Fact label="Duration" value={draft.duration || '—'}/></dl>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Description</p><p className="text-xs text-gray-700 leading-5">{draft.description || '—'}</p></div>
          {draft.skills.length > 0 && <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Required skills</p><div className="flex flex-wrap gap-1.5">{draft.skills.map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">{s}</span>)}</div></div>}
          <p className="text-[11px] text-gray-400 flex items-center gap-1.5"><Eye size={13}/>Salary visibility: {draft.salaryVisibility} · Posting visibility: {draft.visibility}. Submission sends the job for approval and applicant matching.</p>
        </div>}
        {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
      </div>
      <footer className="p-5 border-t border-gray-100 flex flex-wrap justify-between gap-2">
        <button onClick={() => setPosting(false)} className="px-4 py-2 text-sm">Cancel</button>
        <div className="flex gap-2">
          {step > 1 && <button onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)} className="px-4 py-2 rounded-lg border text-sm font-semibold flex items-center gap-1"><ChevronLeft size={15}/>Back</button>}
          {step < 3 && <button onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold flex items-center gap-1">Next<ArrowRight size={15}/></button>}
          {step === 3 && <><button onClick={() => submitPosting(true)} disabled={busy} className="px-4 py-2 rounded-lg border text-sm font-semibold">Save Draft</button><button onClick={() => submitPosting(false)} disabled={busy} className="px-4 py-2 rounded-lg bg-gray-950 text-white text-sm font-semibold flex items-center gap-1"><Send size={14}/>{busy ? 'Submitting…' : 'Submit for Approval'}</button></>}
        </div>
      </footer>
    </section></div>}
  </div>;
}

function Fact({ label, value, icon:Icon }: { label:string; value:string; icon?:typeof UserRound }) { return <div><p className="text-[10px] uppercase text-gray-400 font-bold">{label}</p><p className="mt-1 text-sm font-semibold flex gap-1 items-center">{Icon && <Icon size={14}/>} {value}</p></div>; }
