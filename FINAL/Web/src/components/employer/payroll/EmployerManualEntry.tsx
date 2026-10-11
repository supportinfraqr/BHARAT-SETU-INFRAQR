"use client";

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, FilePen, Network, Send, UserRound, XCircle } from 'lucide-react';
import type { EmployerPortalData, PayrollWorkerRecord } from '@/types/portal';
import { activeDeductions, activeEarnings, computePayroll, defaultStatutoryBonus, formatInr, type PayrollEntryInput } from '@/components/contractor/payroll/PayrollCalculator';
import { SourceBadge } from '@/components/contractor/payroll/PayrollProvenance';

type Stage = 'draft' | 'review' | 'submitted';
const PERIODS = ['August 2026', 'July 2026', 'June 2026', 'May 2026'];

export default function EmployerManualEntry({ portal, onSave }: {
  portal: EmployerPortalData;
  onSave: (record: PayrollWorkerRecord) => void;
}) {
  const { payroll } = portal;
  const earnings = activeEarnings(payroll.config);
  const deductions = activeDeductions(payroll.config);

  const [workerId, setWorkerId] = useState('');
  const [period, setPeriod] = useState(PERIODS[0]);
  const [siteFilter, setSiteFilter] = useState('all');
  const [contractorFilter, setContractorFilter] = useState('all');
  const [attendanceDays, setAttendanceDays] = useState('26');
  const [lopDays, setLopDays] = useState('0');
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    earnings.forEach(e => { initial[e.name] = e.flatAmount != null ? String(e.flatAmount) : ''; });
    deductions.forEach(d => { initial[d.name] = ''; });
    return initial;
  });
  const [stage, setStage] = useState<Stage>('draft');
  const [notice, setNotice] = useState('');
  const [validation, setValidation] = useState<Array<{ level:'error'|'warning'; text:string }>>([]);

  const worker = useMemo(() => portal.workers.find(w => w.bssId === workerId), [portal.workers, workerId]);
  const basic = Number(amounts['Basic']) || 0;

  // Employer workforce scope filters — Site / Contractor / Worker / Period
  const sites = useMemo(() => Array.from(new Set(portal.workers.map(w => w.site))).sort(), [portal.workers]);
  const contractors = useMemo(() => Array.from(new Set(portal.workers.map(w => w.contractor))).sort(), [portal.workers]);
  const filteredWorkers = useMemo(() => portal.workers.filter(w =>
    (siteFilter === 'all' || w.site === siteFilter) &&
    (contractorFilter === 'all' || w.contractor === contractorFilter)
  ), [portal.workers, siteFilter, contractorFilter]);
  const pickWorker = (next: string) => { setWorkerId(next); setStage('draft'); };
  const resetScopeFilters = (key: 'site' | 'contractor', value: string) => {
    if (key === 'site') { setSiteFilter(value); } else { setContractorFilter(value); }
    setWorkerId('');
  };

  const entry: PayrollEntryInput = useMemo(() => {
    const earningsMap: Record<string, number> = {};
    earnings.forEach(e => { earningsMap[e.name] = Number(amounts[e.name]) || 0; });
    if (basic > 0 && !(earningsMap['Statutory Bonus'] ?? 0)) earningsMap['Statutory Bonus'] = defaultStatutoryBonus(basic);
    if (basic > 0 && !(earningsMap['Medical Allowance'] ?? 0)) earningsMap['Medical Allowance'] = 1250;
    const deductionsMap: Record<string, number> = {};
    deductions.forEach(d => { deductionsMap[d.name] = Number(amounts[d.name]) || 0; });
    return {
      workerId, workerName: worker?.name ?? '', employer: 'L&T Construction', site: worker?.site ?? '', period,
      attendanceDays: Number(attendanceDays) || 0, lopDays: Number(lopDays) || 0, earnings: earningsMap, deductions: deductionsMap,
    };
  }, [workerId, worker, period, attendanceDays, lopDays, amounts, earnings, deductions, basic]);

  const computed = useMemo(() => computePayroll(entry, payroll.config), [entry, payroll.config]);

  const setAmount = (name: string, value: string) => setAmounts(current => ({ ...current, [name]: value }));

  const runValidation = () => {
    const issues: Array<{ level:'error'|'warning'; text:string }> = [];
    if (!workerId) issues.push({ level:'error', text:'Select a bound worker before saving the record.' });
    if (computed.gross <= 0) issues.push({ level:'error', text:'Gross pay is ₹0 — add at least one earning amount.' });
    if (!(Number(attendanceDays) > 0)) issues.push({ level:'error', text:'Attendance days must be greater than 0.' });
    if (worker && !worker.verified) issues.push({ level:'warning', text:`${worker.name} is not fully verified — flag the record for review before submission.` });
    setValidation(issues);
    return issues.filter(i => i.level === 'error').length === 0;
  };

  const saveDraft = () => {
    if (!runValidation()) return;
    setStage('draft');
    setNotice(`Draft saved for ${worker?.name ?? workerId} · ${period}. The record will be distributed to ${worker?.contractor ?? 'the mapped contractor'} on submission.`);
  };

  const review = () => {
    if (!runValidation()) return;
    setStage('review');
    setNotice('');
  };

  const submit = () => {
    const record: PayrollWorkerRecord = {
      id: `PR-EM-${Date.now()}`,
      workerId: entry.workerId, workerName: entry.workerName, employer: 'L&T Construction', site: entry.site, period: entry.period,
      contractor: worker?.contractor,
      status: 'Submitted',
      source: 'Employer',
      matchState: 'Employer Provided',
      attendanceDays: entry.attendanceDays, lopDays: entry.lopDays, pfWage: computed.pfWage,
      earnings: earnings.map(e => ({ component: e.name, amount: entry.earnings[e.name] ?? 0 })),
      deductions: deductions.map(d => ({ component: d.name, amount: entry.deductions[d.name] ?? 0 })),
      contributions: computed.contributions,
      gross: computed.gross, totalDeductions: computed.totalDeductions, netPay: computed.netPay, employerCost: computed.employerCost,
      updatedAt: new Date().toISOString(), updatedBy: 'Ananya Mehta (Employer)',
    };
    onSave(record);
    setStage('submitted');
    setNotice('');
  };

  const inputClass = 'mt-1 w-full h-10 rounded-lg border border-bss-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20';

  return <div className="space-y-5">
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
      {/* Entry panel */}
      <section className="bss-card rounded-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-bss-border"><h2 className="text-sm font-semibold text-bss-text-primary">Manual worker payroll entry</h2><p className="text-xs text-bss-text-muted mt-0.5">Earnings and deductions follow the same Payroll salary structure used by Contractors. Records are auto-distributed to the worker&apos;s contractor.</p></header>
        <div className="p-5 space-y-5">
          {/* Step 1 — worker & period */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-bss-text-muted mb-3">1 · Worker & period</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-xs font-semibold text-bss-text-primary">Site filter
                <select value={siteFilter} onChange={e => resetScopeFilters('site', e.target.value)} className={inputClass}><option value="all">All Sites</option>{sites.map(s => <option key={s}>{s}</option>)}</select>
              </label>
              <label className="text-xs font-semibold text-bss-text-primary">Contractor filter
                <select value={contractorFilter} onChange={e => resetScopeFilters('contractor', e.target.value)} className={inputClass}><option value="all">All Contractors</option>{contractors.map(c => <option key={c}>{c}</option>)}</select>
              </label>
              <label className="text-xs font-semibold text-bss-text-primary">Worker selection / search
                <select value={workerId} onChange={e => pickWorker(e.target.value)} className={inputClass}>
                  <option value="">Select a bound worker</option>
                  {filteredWorkers.map(w => <option key={w.id} value={w.bssId}>{w.name} · {w.bssId} · {w.site}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-bss-text-primary">Payroll period
                <select value={period} onChange={e => setPeriod(e.target.value)} className={inputClass}>
                  {PERIODS.map(p => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-bss-text-primary">Attendance days (working days present)
                <input value={attendanceDays} onChange={e => setAttendanceDays(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputClass}/>
              </label>
              <label className="text-xs font-semibold text-bss-text-primary">LOP days (loss of pay)
                <input value={lopDays} onChange={e => setLopDays(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputClass}/>
              </label>
            </div>
            {worker && <div className="mt-3 rounded-lg bg-bss-blue-tint border border-bss-border px-3 py-2.5 text-xs text-bss-text-primary flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5 font-semibold"><UserRound size={13}/>{worker.name}</span>
              <span className="inline-flex items-center gap-1.5"><Network size={13}/><strong>{worker.contractor}</strong> <span className="text-bss-interactive-blue/60">· distribution destination</span></span>
              <span className="inline-flex items-center gap-1.5 text-bss-interactive-blue/80">{worker.site} · {worker.designation}</span>
            </div>}
          </div>

          {/* Step 2 — earnings */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-bss-text-muted mb-3">2 · Earnings (active salary components)</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {earnings.map(e => (
                <label key={e.name} className="text-xs font-semibold text-bss-text-primary flex items-center gap-2 border border-bss-border rounded-xl px-3 py-2">
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{e.name}</span>
                    <span className="block text-[10px] font-normal text-bss-text-muted mt-0.5">{e.type} · {e.calculation}{e.flatAmount != null ? ` · ₹${e.flatAmount.toLocaleString('en-IN')}` : ''}</span>
                  </span>
                  <span className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-bss-text-muted text-xs">₹</span><input value={amounts[e.name] ?? ''} onChange={ev => setAmount(e.name, ev.target.value)} inputMode="decimal" placeholder="0" className="w-28 h-9 rounded-lg border border-bss-border pl-6 pr-2 text-sm text-right"/></span>
                </label>
              ))}
            </div>
            {basic > 0 && <p className="mt-2 text-[11px] text-bss-text-muted">Statutory Bonus auto-filled at 8.33% of Basic (₹{formatInr(defaultStatutoryBonus(basic))}) and Medical Allowance at ₹1,250 when Basic is entered.</p>}
          </div>

          {/* Step 3 — deductions */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-bss-text-muted mb-3">3 · One-time deductions</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {deductions.map(d => (
                <label key={d.name} className="text-xs font-semibold text-bss-text-primary flex items-center gap-2 border border-bss-border rounded-xl px-3 py-2">
                  <span className="flex-1 min-w-0"><span className="block truncate">{d.name}</span><span className="block text-[10px] font-normal text-bss-text-muted mt-0.5">{d.type} · {d.frequency}</span></span>
                  <span className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-bss-text-muted text-xs">₹</span><input value={amounts[d.name] ?? ''} onChange={ev => setAmount(d.name, ev.target.value)} inputMode="decimal" placeholder="0" className="w-28 h-9 rounded-lg border border-bss-border pl-6 pr-2 text-sm text-right"/></span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Computation + distribution panel */}
      <section className="bss-card rounded-2xl overflow-hidden sticky top-20">
        <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between"><div><h2 className="text-sm font-semibold text-bss-text-primary">Payroll computation</h2><p className="text-xs text-bss-text-muted mt-0.5">{period} · live calculation</p></div><span className="text-[10px] font-bold text-bss-interactive-blue bg-bss-blue-tint border border-bss-border rounded-full px-2 py-0.5">PF Wage ₹{formatInr(computed.pfWage)}</span></header>
        <div className="p-5 space-y-4">
          <dl className="space-y-2">
            {computed.lines.map(line => <div key={line.label} className="flex items-center justify-between text-xs"><dt className="text-bss-text-muted flex items-center gap-1.5">{line.label}{line.note && <span title={line.note} className="text-bss-text-muted">ⓘ</span>}</dt><dd className="font-semibold text-bss-text-primary">{formatInr(line.amount)}</dd></div>)}
          </dl>
          <div className="pt-3 border-t border-bss-border space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-bss-text-muted">Gross pay</span><strong className="text-bss-text-primary">{formatInr(computed.gross)}</strong></div>
            <div className="flex justify-between text-sm"><span className="text-bss-text-muted">Total deductions</span><strong className="text-bss-error">− {formatInr(computed.totalDeductions)}</strong></div>
            <div className="flex justify-between text-base pt-1.5 border-t border-bss-border"><span className="font-semibold text-bss-text-primary">Net pay</span><strong className="text-bss-green text-lg">{formatInr(computed.netPay)}</strong></div>
            <div className="flex justify-between text-xs text-bss-text-muted"><span>Employer cost (incl. employer contributions)</span><span>{formatInr(computed.employerCost)}</span></div>
          </div>

          {/* Distribution destination preview */}
          <div className="rounded-xl bg-bss-blue-tint border border-bss-border p-3 text-xs text-bss-text-primary">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bss-interactive-blue/70 mb-1.5">Distribution preview · Employer → Site → Contractor</p>
            {worker
              ? <div className="space-y-1.5">
                  <p className="flex justify-between"><span className="text-bss-interactive-blue/70">Worker</span><strong>{worker.name}</strong></p>
                  <p className="flex justify-between"><span className="text-bss-interactive-blue/70">Site</span><strong>{worker.site}</strong></p>
                  <p className="flex justify-between"><span className="text-bss-interactive-blue/70">Contractor destination</span><strong>{worker.contractor}</strong></p>
                  <p className="flex justify-between"><span className="text-bss-interactive-blue/70">Payroll source</span><span><SourceBadge source="Employer"/></span></p>
                </div>
              : <p className="text-bss-interactive-blue/70">Select a worker — their Site and Contractor are mapped automatically.</p>}
          </div>

          {validation.length > 0 && <div className="space-y-1.5">{validation.map((issue, i) => <p key={i} role="alert" className={`text-xs flex gap-1.5 items-start rounded-lg px-3 py-2 ${issue.level === 'error' ? 'bg-bss-soft-orange text-bss-error' : 'bg-bss-soft-orange text-bss-orange'}`}>{issue.level === 'error' ? <XCircle size={13} className="mt-0.5 flex-shrink-0"/> : <AlertTriangle size={13} className="mt-0.5 flex-shrink-0"/>}{issue.text}</p>)}</div>}

          {stage === 'review' && <div className="p-3 rounded-xl bg-bss-blue-tint border border-bss-border text-xs text-bss-text-primary">Review the computed values and the contractor destination above. Submission routes this record to <strong>{worker?.contractor ?? 'the mapped contractor'}</strong> and flags it as Employer Provided.</div>}
          {stage === 'submitted' && <div className="p-3 rounded-xl bg-bss-soft-green border border-bss-border text-xs text-bss-green flex gap-1.5"><CheckCircle2 size={14} className="flex-shrink-0 mt-0.5"/>Record submitted with source <strong>Employer Provided</strong> — see Distribution for routing to {worker?.contractor ?? 'contractor'}.</div>}

          <div className="flex gap-2 pt-1">
            <button onClick={saveDraft} className="flex-1 h-10 rounded-lg border border-bss-border text-xs font-bold text-bss-text-primary flex items-center justify-center gap-1.5 hover:bg-bss-bg"><FilePen size={14}/>Save Draft</button>
            {stage === 'review'
              ? <button onClick={submit} className="flex-1 h-10 rounded-lg bg-bss-green text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-95"><Send size={14}/>Submit / Confirm</button>
              : <button onClick={review} className="flex-1 h-10 rounded-lg bg-[#01183A] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#022B5E]"><Eye size={14}/>Review</button>}
          </div>
        </div>
      </section>
    </div>
  </div>;
}
