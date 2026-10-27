"use client";

/**
 * Settlement workspace: stepper over the legacy F&F endpoints for one settlement.
 *
 *   PUT  fullAndFinal/:id/salaryDues | leaveEncashment | bonusIncentives | gratuity | deductions
 *   POST fullAndFinal/:id/calculate | finalize | approval
 *   PUT  fullAndFinal/:id/payment
 *   GET  fullAndFinal/:id, fullAndFinal/preview/:employeeId, fullAndFinal/employee/:employeeId/leaveEncashmentDetails
 */

import { useCallback, useRef, useState } from 'react';
import { ArrowLeft, Calculator, Check, FileText, Lock, Sparkles } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps, PayrollEmployee } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, Confirm, DataTable, Field, FormGrid, NumberInput, Row, Section, Select, TextInput, Toggle,
  fmtDate, fmtDateTime, isoDate, money, num, useAction, useLoad,
} from '../../ui';
import { StatementModal } from './Statement';
import {
  GRATUITY_CAP, LEAVE_METHODS, empIdOf, empOf, fullName, isLocked, leaveRate, n, round2, settlementTotals,
  type BonusIncentives, type Deductions, type Gratuity, type LeaveEncashment, type LeaveEncashmentDetails,
  type SalaryDues, type Settlement, type SettlementPreview,
} from './types';

type Notify = ModuleProps['notify'];

const STEPS = [
  { key: 'salary', label: 'Salary dues' },
  { key: 'leave', label: 'Leave encashment' },
  { key: 'bonus', label: 'Bonus & incentives' },
  { key: 'gratuity', label: 'Gratuity' },
  { key: 'deductions', label: 'Deductions' },
  { key: 'calculate', label: 'Calculate' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'finalize', label: 'Finalize' },
  { key: 'payment', label: 'Payment' },
] as const;
type StepKey = (typeof STEPS)[number]['key'];

function stepDone(s: Settlement, key: StepKey): boolean {
  switch (key) {
    case 'salary': return n(s.salaryDues?.proratedSalary) + n(s.salaryDues?.unpaidSalary) + n(s.salaryDues?.workingDaysInLastMonth) > 0 || !!s.salaryDues?.formula;
    case 'leave': return !!s.leaveEncashment?.formula || n(s.leaveEncashment?.totalAmount) > 0;
    case 'bonus': return !!s.bonusIncentives?.method || !!s.bonusIncentives?.formula;
    case 'gratuity': return !!s.gratuity?.formula;
    case 'deductions': return s.deductions !== undefined && Object.values(s.deductions ?? {}).some(v => n(v) !== 0);
    case 'calculate': return n(s.totalPayables) !== 0 || n(s.netPayable) !== 0;
    case 'approvals': return (s.approvals ?? []).some(a => a.status === 'approved');
    case 'finalize': return s.status === 'finalized' || s.status === 'paid';
    case 'payment': return s.status === 'paid';
  }
}

export function SettlementWorkspace({ settlementId, employees, orgName, notify, onBack, onChanged }: { settlementId: string; employees: PayrollEmployee[]; orgName: string; notify: Notify; onBack: () => void; onChanged: () => void }) {
  const state = useLoad(() => pe.get<Settlement>(`fullAndFinal/${settlementId}`), [settlementId]);
  const [step, setStep] = useState<StepKey>('salary');
  const [printing, setPrinting] = useState(false);
  const previewCache = useRef<{ key: string; data: SettlementPreview } | null>(null);
  const { reload, data: settlement } = state;
  const saved = useCallback(() => { reload(); onChanged(); }, [reload, onChanged]);

  const getPreview = useCallback(async (s: Settlement) => {
    const key = `${empIdOf(s)}:${isoDate(s.lastWorkingDate)}`;
    if (previewCache.current?.key === key) return previewCache.current.data;
    const data = await pe.get<SettlementPreview>(`fullAndFinal/preview/${empIdOf(s)}`, { lastWorkingDate: isoDate(s.lastWorkingDate) });
    previewCache.current = { key, data };
    return data;
  }, []);

  const emp = settlement ? empOf(settlement) : null;
  const payrollEmp = settlement ? employees.find(e => e._id === empIdOf(settlement)) : undefined;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Btn variant="secondary" onClick={onBack}><ArrowLeft size={14} />All settlements</Btn>
      {settlement && <Btn variant="secondary" onClick={() => setPrinting(true)}><FileText size={14} />Statement</Btn>}
    </div>
    <Async state={state}>
      {s => {
        const locked = isLocked(s);
        const t = settlementTotals(s);
        const stale = Math.abs(n(s.netPayable) - t.net) > 0.009 || Math.abs(n(s.totalPayables) - t.payables) > 0.009;
        const props = { s, notify, onSaved: saved, locked, getPreview };
        return <>
          <Section title={fullName(emp) || 'Settlement'} subtitle={[emp?.uniqueId, emp?.jobTitle, emp?.exitData?.exitStatus].filter(Boolean).join(' · ')}
            right={<><Badge status={s.status} />{locked && <span className="inline-flex items-center gap-1 text-[11px] text-gray-500"><Lock size={12} />Locked</span>}</>}>
            <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <Row label="Joined" value={fmtDate(emp?.dateOfJoining)} />
              <Row label="Last working day" value={fmtDate(s.lastWorkingDate)} />
              <Row label="Initiated" value={fmtDate(s.createdAt)} />
              <Row label={s.status === 'paid' ? 'Settled' : 'Finalized'} value={fmtDate(s.status === 'paid' ? s.settlementDate : s.finalizedAt)} />
            </div>
          </Section>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
            <div className="space-y-3 min-w-0">
              <nav aria-label="Settlement steps" className="overflow-x-auto">
                <ol className="flex gap-1 min-w-max">
                  {STEPS.map((st, i) => {
                    const done = stepDone(s, st.key); const on = st.key === step;
                    return <li key={st.key}><button type="button" onClick={() => setStep(st.key)} aria-current={on ? 'step' : undefined}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold border ${on ? 'border-[var(--color-bss-interactive-blue)] bg-blue-50 text-[var(--color-bss-interactive-blue)]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                      <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${done ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{done ? <Check size={11} /> : i + 1}</span>{st.label}
                    </button></li>;
                  })}
                </ol>
              </nav>
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                {locked && step !== 'payment' && step !== 'finalize' && <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">This settlement is {s.status}; its components can no longer be changed.</p>}
                {step === 'salary' && <SalaryStep key={s.updatedAt} {...props} />}
                {step === 'leave' && <LeaveStep key={s.updatedAt} {...props} />}
                {step === 'bonus' && <BonusStep key={s.updatedAt} {...props} />}
                {step === 'gratuity' && <GratuityStep key={s.updatedAt} {...props} />}
                {step === 'deductions' && <DeductionsStep key={s.updatedAt} {...props} />}
                {step === 'calculate' && <CalculateStep {...props} />}
                {step === 'approvals' && <ApprovalsStep key={s.updatedAt} {...props} />}
                {step === 'finalize' && <FinalizeStep {...props} />}
                {step === 'payment' && <PaymentStep key={s.updatedAt} {...props} employee={payrollEmp} />}
                {(() => {
                  const idx = STEPS.findIndex(x => x.key === step);
                  return <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
                    <Btn variant="ghost" disabled={idx === 0} onClick={() => setStep(STEPS[idx - 1].key)}>← {idx > 0 ? STEPS[idx - 1].label : ''}</Btn>
                    <Btn variant="ghost" disabled={idx === STEPS.length - 1} onClick={() => setStep(STEPS[idx + 1].key)}>{idx < STEPS.length - 1 ? STEPS[idx + 1].label : ''} →</Btn>
                  </div>;
                })()}
              </div>
            </div>

            <aside className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2 xl:sticky xl:top-4" aria-label="Settlement summary">
              <p className="text-sm font-semibold text-gray-900">Settlement summary</p>
              <Row label="Salary dues" value={money(t.salary)} />
              <Row label="Leave encashment" value={money(t.leave)} />
              <Row label="Bonus & incentives" value={money(t.bonus)} />
              <Row label="Pending reimbursements" value={money(t.reimbursements)} />
              <Row label="Gratuity" value={money(t.gratuity)} />
              <Row label="Total earnings" value={money(t.payables)} tone="text-gray-950" />
              <Row label="Deductions" value={money(t.otherDeductions)} tone="text-red-600" />
              <Row label="Tax (TDS + PT)" value={money(t.tax)} tone="text-red-600" />
              <Row label="Total deductions" value={money(t.deductions)} tone="text-red-600" />
              <div className={`rounded-xl px-3 py-3 ${t.net >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-xs text-gray-600">{t.net >= 0 ? 'Net payable' : 'Net recoverable'}</p>
                <p className={`text-xl font-bold ${t.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{money(Math.abs(t.net))}</p>
              </div>
              {stale && !locked && <p className="text-[11px] text-orange-700">Saved totals ({money(s.netPayable)}) are out of date — run Calculate.</p>}
            </aside>
          </div>
          {printing && <StatementModal s={s} orgName={orgName} onClose={() => setPrinting(false)} />}
        </>;
      }}
    </Async>
  </div>;
}

type StepProps = { s: Settlement; notify: Notify; onSaved: () => void; locked: boolean; getPreview: (s: Settlement) => Promise<SettlementPreview> };

function StepHeader({ title, text, onPrefill, busy, locked }: { title: string; text: string; onPrefill?: () => void; busy?: boolean; locked: boolean }) {
  return <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
    <div><h3 className="text-sm font-semibold text-gray-900">{title}</h3><p className="text-xs text-gray-500 mt-0.5">{text}</p></div>
    {onPrefill && !locked && <Btn variant="secondary" busy={busy} onClick={onPrefill}><Sparkles size={14} />Fill from preview</Btn>}
  </div>;
}

function SaveBar({ busy, locked, onSave, children }: { busy: boolean; locked: boolean; onSave: () => void; children?: React.ReactNode }) {
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
    <div className="text-xs text-gray-600">{children}</div>
    <Btn busy={busy} disabled={locked} onClick={onSave}>Save</Btn>
  </div>;
}

function Formula({ text }: { text?: string }) {
  return text ? <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-600"><span className="font-semibold">Formula:</span> {text}</p> : null;
}

function usePrefill<T>(props: StepProps, pick: (p: SettlementPreview) => T, apply: (v: T) => void) {
  const { busy, run } = useAction(props.notify);
  const prefill = async () => {
    const p = await run(() => props.getPreview(props.s));
    if (p) { apply(pick(p)); props.notify('Filled from the system preview — review and save'); }
  };
  return { prefillBusy: busy, prefill };
}

// --- Salary dues -----------------------------------------------------------

function SalaryStep(props: StepProps) {
  const { s, locked } = props;
  const [f, setF] = useState<SalaryDues>({
    unpaidSalary: n(s.salaryDues?.unpaidSalary), workingDaysInLastMonth: n(s.salaryDues?.workingDaysInLastMonth), proratedSalary: n(s.salaryDues?.proratedSalary),
    basicSalary: n(s.salaryDues?.basicSalary), allowances: n(s.salaryDues?.allowances), formula: s.salaryDues?.formula ?? '',
  });
  const set = (k: keyof SalaryDues, v: number | string) => setF(x => ({ ...x, [k]: v }));
  const { busy, run } = useAction(props.notify);
  const { prefill, prefillBusy } = usePrefill(props, p => p.salaryDues, setF);
  const save = async () => { if (await run(() => pe.put(`fullAndFinal/${s._id}/salaryDues`, f), 'Salary dues updated successfully') !== undefined) props.onSaved(); };
  return <div>
    <StepHeader title="Salary dues" text="Unpaid salary for earlier months plus prorated salary for the last month. Basic and allowances are shown for reference — they are already inside the prorated gross." onPrefill={() => void prefill()} busy={prefillBusy} locked={locked} />
    <FormGrid cols={3}>
      <Field label="Unpaid salary (earlier months)"><NumberInput value={f.unpaidSalary} disabled={locked} onChange={v => set('unpaidSalary', v)} /></Field>
      <Field label="Working days in last month"><NumberInput value={f.workingDaysInLastMonth} disabled={locked} onChange={v => set('workingDaysInLastMonth', v)} /></Field>
      <Field label="Prorated salary (last month)"><NumberInput value={f.proratedSalary} disabled={locked} onChange={v => set('proratedSalary', v)} /></Field>
      <Field label="Monthly basic (reference)"><NumberInput value={f.basicSalary} disabled={locked} onChange={v => set('basicSalary', v)} /></Field>
      <Field label="Monthly allowances (reference)"><NumberInput value={f.allowances} disabled={locked} onChange={v => set('allowances', v)} /></Field>
      <Field label="Formula / note"><TextInput value={f.formula} disabled={locked} onChange={v => set('formula', v)} /></Field>
    </FormGrid>
    <SaveBar busy={busy} locked={locked} onSave={() => void save()}>Salary dues payable: <b>{money(f.unpaidSalary + f.proratedSalary)}</b></SaveBar>
  </div>;
}

// --- Leave encashment ------------------------------------------------------

function LeaveStep(props: StepProps) {
  const { s, locked } = props;
  const le = s.leaveEncashment ?? {};
  const [f, setF] = useState({
    availableLeaves: n(le.availableLeaves), encashableLeaves: n(le.encashableLeaves), method: le.method || 'basic_26',
    basicSalary: n(le.basicSalary), grossSalary: n(le.grossSalary), perDayRate: n(le.perDayRate), formula: '',
  });
  const set = (k: keyof typeof f, v: number | string) => setF(x => ({ ...x, [k]: v }));
  const { busy, run } = useAction(props.notify);
  const { prefill, prefillBusy } = usePrefill(props, p => p.leaveEncashment, (v: LeaveEncashment) => setF({ ...v, formula: '' }));
  const details = useLoad(() => pe.get<LeaveEncashmentDetails>(`fullAndFinal/employee/${empIdOf(s)}/leaveEncashmentDetails`, { asOfDate: isoDate(s.lastWorkingDate) }), [empIdOf(s), s.lastWorkingDate]);
  const rate = leaveRate(f.method, f.basicSalary, f.grossSalary);
  const perDay = rate.perDayRate || f.perDayRate;
  const total = round2(f.encashableLeaves * perDay);

  const save = async () => {
    const body = { availableLeaves: f.availableLeaves, encashableLeaves: f.encashableLeaves, method: f.method, basicSalary: f.basicSalary, grossSalary: f.grossSalary, perDayRate: f.perDayRate, ...(f.formula.trim() ? { formula: f.formula.trim() } : {}) };
    if (await run(() => pe.put(`fullAndFinal/${s._id}/leaveEncashment`, body), 'Leave encashment updated successfully') !== undefined) props.onSaved();
  };
  return <div>
    <StepHeader title="Leave encashment" text="Encashable leave days × per-day rate. The per-day rate is derived from the method (basic or gross ÷ 26 or 30)." onPrefill={() => void prefill()} busy={prefillBusy} locked={locked} />
    <FormGrid cols={3}>
      <Field label="Available leaves"><NumberInput value={f.availableLeaves} disabled={locked} onChange={v => set('availableLeaves', v)} /></Field>
      <Field label="Encashable leaves"><NumberInput value={f.encashableLeaves} disabled={locked} onChange={v => set('encashableLeaves', v)} /></Field>
      <Field label="Method"><Select value={f.method} disabled={locked} onChange={v => set('method', v)} options={LEAVE_METHODS} /></Field>
      <Field label="Monthly basic"><NumberInput value={f.basicSalary} disabled={locked} onChange={v => set('basicSalary', v)} /></Field>
      <Field label="Monthly gross"><NumberInput value={f.grossSalary} disabled={locked} onChange={v => set('grossSalary', v)} /></Field>
      <Field label="Per-day rate (manual)" hint="Used only when the method's base is 0"><NumberInput value={f.perDayRate} disabled={locked} onChange={v => set('perDayRate', v)} /></Field>
      <Field label="Formula / note (optional)" className="md:col-span-3" hint="Leave blank to let the engine describe the formula"><TextInput value={f.formula} disabled={locked} onChange={v => set('formula', v)} placeholder={le.formula || ''} /></Field>
    </FormGrid>
    <Formula text={le.formula} />
    <SaveBar busy={busy} locked={locked} onSave={() => void save()}>{num(f.encashableLeaves)} day(s) × {money(perDay)} ({rate.label}) = <b>{money(total)}</b></SaveBar>

    <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-700">Leave balances as of {fmtDate(s.lastWorkingDate)}</p>
        {details.data && !locked && <Btn variant="ghost" onClick={() => setF(x => ({ ...x, availableLeaves: details.data!.summary.availableLeaves, encashableLeaves: details.data!.summary.encashableLeaves, basicSalary: n(details.data!.salaryBases.baseSalary), grossSalary: n(details.data!.salaryBases.grossSalary) }))}>Use these balances</Btn>}
      </div>
      <Async state={details}>
        {d => <>
          <DataTable rows={d.leaves} rowKey={l => String(l.leaveTypeId)} empty="No leave types configured for this employee"
            columns={[
              { key: 'leaveName', label: 'Leave type', render: l => <span className="font-semibold">{l.leaveName}</span> },
              { key: 'monthlyAllowed', label: 'Per month', align: 'right', render: l => num(l.monthlyAllowed) },
              { key: 'carryForward', label: 'Carry fwd', align: 'right', render: l => num(l.carryForward) },
              { key: 'totalAllotted', label: 'Allotted', align: 'right', render: l => num(l.totalAllotted) },
              { key: 'usedDays', label: 'Used', align: 'right', render: l => num(l.usedDays) },
              { key: 'remainingBalance', label: 'Balance', align: 'right', render: l => num(l.remainingBalance) },
              { key: 'policy', label: 'Encashment policy', render: l => l.encashmentPolicy?.encashed ? `Yes${l.encashmentPolicy.encashedDaysLimit ? `, max ${l.encashmentPolicy.encashedDaysLimit} d` : ''}` : 'No' },
              { key: 'encashableLeaves', label: 'Encashable', align: 'right', render: l => <b>{num(l.encashableLeaves)}</b> },
            ]} />
          <p className="px-3 py-2 text-[11px] text-gray-500">Totals: {num(d.summary.availableLeaves)} available, {num(d.summary.encashableLeaves)} encashable · suggested rate {money(d.summary.perDayRate)}/day (basic ÷ 30) = {money(d.summary.totalAmount)}</p>
        </>}
      </Async>
    </div>
  </div>;
}

// --- Bonus -----------------------------------------------------------------

function BonusStep(props: StepProps) {
  const { s, locked } = props;
  const b = s.bonusIncentives ?? {};
  const [f, setF] = useState<BonusIncentives>({
    performanceBonus: n(b.performanceBonus), statutoryBonus: n(b.statutoryBonus), incentives: n(b.incentives), commission: n(b.commission),
    method: b.method ?? '', formula: b.formula ?? '', monthsCounted: n(b.monthsCounted), calcBase: n(b.calcBase), percentage: n(b.percentage), eligible: !!b.eligible,
  });
  const set = (k: keyof BonusIncentives, v: number | string | boolean) => setF(x => ({ ...x, [k]: v }));
  const { busy, run } = useAction(props.notify);
  const { prefill, prefillBusy } = usePrefill(props, p => p.bonusIncentives, setF);
  const save = async () => { if (await run(() => pe.put(`fullAndFinal/${s._id}/bonusIncentives`, f), 'Bonus and incentives updated successfully') !== undefined) props.onSaved(); };
  const total = f.performanceBonus + f.statutoryBonus + f.incentives + f.commission;
  return <div>
    <StepHeader title="Bonus & incentives" text="Pro-rata statutory bonus (Payment of Bonus Act) for the April–March year, plus performance pay, incentives and commission." onPrefill={() => void prefill()} busy={prefillBusy} locked={locked} />
    <FormGrid cols={4}>
      <Field label="Statutory bonus"><NumberInput value={f.statutoryBonus} disabled={locked} onChange={v => set('statutoryBonus', v)} /></Field>
      <Field label="Performance bonus"><NumberInput value={f.performanceBonus} disabled={locked} onChange={v => set('performanceBonus', v)} /></Field>
      <Field label="Incentives"><NumberInput value={f.incentives} disabled={locked} onChange={v => set('incentives', v)} /></Field>
      <Field label="Commission"><NumberInput value={f.commission} disabled={locked} onChange={v => set('commission', v)} /></Field>
      <Field label="Months counted"><NumberInput value={f.monthsCounted} disabled={locked} onChange={v => set('monthsCounted', v)} /></Field>
      <Field label="Bonus wage base / month"><NumberInput value={f.calcBase} disabled={locked} onChange={v => set('calcBase', v)} /></Field>
      <Field label="Bonus %"><NumberInput value={f.percentage} step="0.01" disabled={locked} onChange={v => set('percentage', v)} /></Field>
      <Field label="Method"><Select value={f.method} disabled={locked} onChange={v => set('method', v)} placeholder="—" options={[{ value: 'bonus_act', label: 'Bonus Act' }, { value: 'not_enabled', label: 'Statutory bonus not enabled' }, { value: 'manual', label: 'Manual' }]} /></Field>
      <Field label="Formula / note" className="md:col-span-3"><TextInput value={f.formula} disabled={locked} onChange={v => set('formula', v)} /></Field>
      <div className="flex items-end pb-2"><Toggle checked={f.eligible} disabled={locked} onChange={v => set('eligible', v)} label="Eligible for statutory bonus" /></div>
    </FormGrid>
    <SaveBar busy={busy} locked={locked} onSave={() => void save()}>Bonus & incentives payable: <b>{money(total)}</b></SaveBar>
  </div>;
}

// --- Gratuity --------------------------------------------------------------

function GratuityStep(props: StepProps) {
  const { s, locked } = props;
  const g = s.gratuity ?? {};
  const [f, setF] = useState<Omit<Gratuity, 'gratuityAmount' | 'formula' | 'capped'>>({
    isEligible: !!g.isEligible, yearsOfService: n(g.yearsOfService), completedYears: n(g.completedYears), lastDrawnSalary: n(g.lastDrawnSalary), reason: g.reason ?? '',
  });
  const set = (k: keyof typeof f, v: number | string | boolean) => setF(x => ({ ...x, [k]: v }));
  const { busy, run } = useAction(props.notify);
  const { prefill, prefillBusy } = usePrefill(props, p => p.gratuity, v => setF({ isEligible: v.isEligible, yearsOfService: v.yearsOfService, completedYears: v.completedYears, lastDrawnSalary: v.lastDrawnSalary, reason: v.reason }));
  const raw = f.isEligible ? (f.lastDrawnSalary * 15 * f.yearsOfService) / 26 : 0;
  const amount = round2(Math.min(GRATUITY_CAP, raw));
  const save = async () => { if (await run(() => pe.put(`fullAndFinal/${s._id}/gratuity`, f), 'Gratuity updated successfully') !== undefined) props.onSaved(); };
  return <div>
    <StepHeader title="Gratuity" text="Payment of Gratuity Act: (last drawn basic + DA) × 15 × years ÷ 26, capped at ₹20,00,000. Needs 5 years of continuous service (not on death / disability); 6+ months counts as a year." onPrefill={() => void prefill()} busy={prefillBusy} locked={locked} />
    <div className="mb-3"><Toggle checked={f.isEligible} disabled={locked} onChange={v => set('isEligible', v)} label="Eligible for gratuity" /></div>
    <FormGrid cols={3}>
      <Field label="Last drawn basic + DA / month"><NumberInput value={f.lastDrawnSalary} disabled={locked} onChange={v => set('lastDrawnSalary', v)} /></Field>
      <Field label="Completed years"><NumberInput value={f.completedYears} disabled={locked} onChange={v => set('completedYears', v)} /></Field>
      <Field label="Years for gratuity" hint="Completed years, +1 if the balance is 6 months or more"><NumberInput value={f.yearsOfService} disabled={locked} onChange={v => set('yearsOfService', v)} /></Field>
      <Field label="Eligibility note" className="md:col-span-3"><TextInput value={f.reason} disabled={locked} onChange={v => set('reason', v)} /></Field>
    </FormGrid>
    <Formula text={g.formula} />
    <SaveBar busy={busy} locked={locked} onSave={() => void save()}>Gratuity: <b>{money(amount)}</b>{raw > GRATUITY_CAP ? ' (capped)' : ''}</SaveBar>
  </div>;
}

// --- Deductions ------------------------------------------------------------

const DEDUCTION_FIELDS: Array<[keyof Omit<Deductions, 'totalDeductions'>, string]> = [
  ['noticePeriodShortfall', 'Notice period shortfall'], ['loansAdvances', 'Loans & advances'], ['companyAssetRecovery', 'Company asset recovery'],
  ['damageLoss', 'Damage / loss'], ['overtimeTaken', 'Overtime taken / excess paid'], ['otherDeductions', 'Other deductions'],
];

function DeductionsStep(props: StepProps) {
  const { s, locked } = props;
  const [f, setF] = useState(() => Object.fromEntries(DEDUCTION_FIELDS.map(([k]) => [k, n(s.deductions?.[k])])) as Record<(typeof DEDUCTION_FIELDS)[number][0], number>);
  const { busy, run } = useAction(props.notify);
  const loans = useLoad(() => pe.get<{ loans: Array<{ outstandingBalance: number; loanNumber: string }> }>('loan/get-loans', { employeeId: empIdOf(s), status: 'active' }), [empIdOf(s)]);
  const outstanding = (loans.data?.loans ?? []).reduce((sum, l) => sum + n(l.outstandingBalance), 0);
  const total = Object.values(f).reduce((a, b) => a + b, 0);
  const save = async () => { if (await run(() => pe.put(`fullAndFinal/${s._id}/deductions`, f), 'Deductions updated successfully') !== undefined) props.onSaved(); };
  return <div>
    <StepHeader title="Deductions" text="Recoveries from the final settlement. TDS and professional tax are shown separately in the summary." locked={locked} />
    {outstanding > 0 && <p className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">
      Active loans outstanding: <b>{money(outstanding)}</b> ({(loans.data?.loans ?? []).map(l => l.loanNumber).join(', ')}).
      {!locked && <button type="button" className="ml-2 font-semibold underline" onClick={() => setF(x => ({ ...x, loansAdvances: outstanding }))}>Recover in full</button>}
    </p>}
    <FormGrid cols={3}>
      {DEDUCTION_FIELDS.map(([k, label]) => <Field key={k} label={label}><NumberInput value={f[k]} disabled={locked} onChange={v => setF(x => ({ ...x, [k]: v }))} /></Field>)}
    </FormGrid>
    <SaveBar busy={busy} locked={locked} onSave={() => void save()}>Total deductions: <b>{money(total)}</b></SaveBar>
  </div>;
}

// --- Calculate -------------------------------------------------------------

function CalculateStep({ s, notify, onSaved, locked }: StepProps) {
  const { busy, run } = useAction(notify);
  const [result, setResult] = useState<{ totalPayables: number; totalDeductions: number; netPayable: number } | null>(null);
  const t = settlementTotals(s);
  const calc = async () => {
    const out = await run(() => pe.post<{ totalPayables: number; totalDeductions: number; netPayable: number }>(`fullAndFinal/${s._id}/calculate`), 'Final settlement calculated successfully');
    if (out) { setResult(out); onSaved(); }
  };
  return <div>
    <StepHeader title="Calculate settlement" text="Totals every component and stores total payables, total deductions and net payable on the settlement." locked={locked} />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Row label="Total payables (saved)" value={money(result?.totalPayables ?? s.totalPayables)} />
      <Row label="Total deductions (saved)" value={money(result?.totalDeductions ?? s.totalDeductions)} />
      <Row label="Net payable (saved)" value={money(result?.netPayable ?? s.netPayable)} tone="text-green-700" />
    </div>
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Row label="Pending reimbursements (travel / medical / other)" value={`${money(s.pendingReimbursements?.travel)} / ${money(s.pendingReimbursements?.medical)} / ${money(s.pendingReimbursements?.other)}`} />
      <Row label="Tax deductions (TDS / PT)" value={`${money(s.taxDeductions?.tds)} / ${money(s.taxDeductions?.professionalTax)}`} />
    </div>
    <p className="mt-2 text-[11px] text-gray-500">Reimbursements and tax lines are carried as stored on the settlement; the legacy API has no editor for them.</p>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-gray-600">Current components net to <b>{money(t.net)}</b>.</p>
      <Btn busy={busy} disabled={locked} onClick={() => void calc()}><Calculator size={14} />Calculate</Btn>
    </div>
  </div>;
}

// --- Approvals -------------------------------------------------------------

function ApprovalsStep({ s, notify, onSaved, locked }: StepProps) {
  const [f, setF] = useState({ approverName: '', approverRole: '', status: 'approved', comments: '' });
  const { busy, run } = useAction(notify);
  const add = async () => {
    if (!f.approverName.trim()) { notify('Approver name is required', 'error'); return; }
    if (await run(() => pe.post(`fullAndFinal/${s._id}/approval`, f), 'Approval added successfully') !== undefined) onSaved();
  };
  return <div>
    <StepHeader title="Approvals" text="Record each approver's decision (multi-level). An approved decision marks the settlement approved; a rejection marks it rejected." locked={locked} />
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <DataTable rows={s.approvals ?? []} rowKey={(a, i) => a._id ?? String(i)} empty="No approvals recorded yet"
        columns={[
          { key: 'level', label: 'Level', render: (_, i) => `L${i + 1}` },
          { key: 'approverName', label: 'Approver', render: a => <div><p className="font-semibold">{a.approverName || '—'}</p><p className="text-[11px] text-gray-400">{a.approverRole}</p></div> },
          { key: 'status', label: 'Decision', render: a => <Badge status={a.status} /> },
          { key: 'comments', label: 'Comments', render: a => a.comments || '—' },
          { key: 'approvedDate', label: 'Date', render: a => fmtDateTime(a.approvedDate) },
        ]} />
    </div>
    {!locked && <div className="mt-4 space-y-3">
      <FormGrid cols={3}>
        <Field label="Approver name *"><TextInput value={f.approverName} onChange={v => setF(x => ({ ...x, approverName: v }))} /></Field>
        <Field label="Approver role"><TextInput value={f.approverRole} onChange={v => setF(x => ({ ...x, approverRole: v }))} placeholder="e.g. HR Manager, Finance" /></Field>
        <Field label="Decision"><Select value={f.status} onChange={v => setF(x => ({ ...x, status: v }))} options={[{ value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'pending', label: 'Pending / noted' }]} /></Field>
      </FormGrid>
      <Field label="Comments"><TextInput value={f.comments} onChange={v => setF(x => ({ ...x, comments: v }))} /></Field>
      <div className="flex justify-end"><Btn busy={busy} onClick={() => void add()}>Add approval</Btn></div>
    </div>}
  </div>;
}

// --- Finalize --------------------------------------------------------------

function FinalizeStep({ s, notify, onSaved }: StepProps) {
  const [confirming, setConfirming] = useState(false);
  const { busy, run } = useAction(notify);
  const t = settlementTotals(s);
  const approved = (s.approvals ?? []).some(a => a.status === 'approved');
  const finalize = async () => {
    if (await run(() => pe.post(`fullAndFinal/${s._id}/finalize`), 'Full and final settlement finalized') !== undefined) { setConfirming(false); onSaved(); }
  };
  const blocked = s.status === 'paid' || s.status === 'rejected';
  return <div>
    <StepHeader title="Finalize" text="Recalculates the totals and locks the settlement. After this only payment details can be recorded." locked />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Row label="Total earnings" value={money(t.payables)} />
      <Row label="Total deductions" value={money(t.deductions)} />
      <Row label="Net payable" value={money(t.net)} tone="text-green-700" />
    </div>
    {s.finalizedAt && <p className="mt-3 text-xs text-gray-600">Finalized on {fmtDateTime(s.finalizedAt)}.</p>}
    {!approved && !blocked && s.status !== 'finalized' && <p className="mt-3 text-xs text-orange-700">No approval has been recorded yet.</p>}
    {s.status === 'rejected' && <p className="mt-3 text-xs text-red-600">Rejected settlements cannot be finalized. Add an approved decision to reopen it.</p>}
    <div className="mt-4 flex justify-end">
      <Btn busy={busy} disabled={blocked || s.status === 'finalized'} onClick={() => setConfirming(true)}><Lock size={14} />{s.status === 'finalized' ? 'Finalized' : 'Finalize settlement'}</Btn>
    </div>
    {confirming && <Confirm title="Finalize settlement" busy={busy} onClose={() => setConfirming(false)} onConfirm={() => void finalize()}
      message={<>Lock this settlement with a net payable of <b>{money(t.net)}</b>? Components can no longer be edited.</>} />}
  </div>;
}

// --- Payment ---------------------------------------------------------------

function PaymentStep({ s, notify, onSaved, employee }: StepProps & { employee?: PayrollEmployee }) {
  const pd = s.paymentDetails ?? {};
  const [f, setF] = useState({
    paymentMode: pd.paymentMode ?? 'bank_transfer', paymentDate: isoDate(pd.paymentDate) || isoDate(new Date()), transactionId: pd.transactionId ?? '',
    bankAccountNumber: pd.bankAccountNumber ?? employee?.bankInfo?.bankAccountNumber ?? '', ifscCode: pd.ifscCode ?? employee?.bankInfo?.ifscCode ?? '',
  });
  const set = (k: keyof typeof f, v: string) => setF(x => ({ ...x, [k]: v }));
  const { busy, run } = useAction(notify);
  const t = settlementTotals(s);
  const save = async () => { if (await run(() => pe.put(`fullAndFinal/${s._id}/payment`, f), 'Payment details updated successfully') !== undefined) onSaved(); };
  const ready = s.status === 'finalized' || s.status === 'paid';
  return <div>
    <StepHeader title="Payment" text="Record how the net amount was paid. Saving marks the settlement paid and stamps the settlement date." locked />
    {!ready && <p className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">Finalize the settlement before recording payment, so the amount paid matches the locked statement.</p>}
    <FormGrid cols={3}>
      <Field label="Payment mode"><Select value={f.paymentMode} onChange={v => set('paymentMode', v)} options={[{ value: 'bank_transfer', label: 'Bank transfer' }, { value: 'cheque', label: 'Cheque' }, { value: 'cash', label: 'Cash' }]} /></Field>
      <Field label="Payment date"><TextInput type="date" value={f.paymentDate} onChange={v => set('paymentDate', v)} /></Field>
      <Field label="Transaction / cheque ref."><TextInput value={f.transactionId} onChange={v => set('transactionId', v)} /></Field>
      <Field label="Bank account number"><TextInput value={f.bankAccountNumber} onChange={v => set('bankAccountNumber', v)} /></Field>
      <Field label="IFSC code"><TextInput value={f.ifscCode} onChange={v => set('ifscCode', v.toUpperCase())} /></Field>
    </FormGrid>
    <SaveBar busy={busy} locked={false} onSave={() => void save()}>Amount: <b>{money(t.net)}</b>{s.status === 'paid' ? ` · paid ${fmtDate(s.settlementDate)}` : ''}</SaveBar>
  </div>;
}

