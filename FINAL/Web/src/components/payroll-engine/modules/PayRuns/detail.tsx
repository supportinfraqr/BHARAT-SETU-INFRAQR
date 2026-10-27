"use client";

/** Payroll record detail (getPayroll/:id), recalculation (recalculatePayroll/:id) and deletion (deletePayrollRun/:id). */

import { useState } from 'react';
import { Calculator, Download, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import { Async, Badge, Btn, Confirm, Field, Kpi, Modal, NumberInput, Row, Section, fmtDate, fmtDateTime, money, num, useAction, useLoad, type Notify } from '../../ui';
import { PayslipModal, STATUS_LABEL, StatusModal, downloadPayslipPdf, paymentModeLabel } from './actions';
import type { BonusDetails, DayKind, EmployerContributions, EpfDetails, EsiDetails, LwfDetails, PaidDaysBreakdown, PayLine, PayrollRun, PtDetails, RecalcPayload, RunEmployee } from './types';

export function runEmployee(run: Pick<PayrollRun, 'employeeId'>): RunEmployee | null {
  return run.employeeId && typeof run.employeeId === 'object' ? run.employeeId : null;
}
export function runEmployeeName(run: Pick<PayrollRun, 'employeeId'>): string {
  const e = runEmployee(run);
  return e ? [e.firstName, e.lastName].filter(Boolean).join(' ') || '—' : '—';
}
export function runEmployeeCode(run: Pick<PayrollRun, 'employeeId'>): string {
  const e = runEmployee(run);
  return e?.customId || e?.uniqueId || e?.payrollInfo?.employeeCode || '';
}
export function runDepartment(run: Pick<PayrollRun, 'employeeId'>): string {
  const e = runEmployee(run);
  const dep = e?.departmentId;
  return (dep && typeof dep === 'object' ? dep.name : '') || e?.payrollInfo?.department || '';
}

const yesNo = (v: unknown) => (v ? 'Yes' : 'No');
const pct = (v: unknown) => (v === undefined || v === null ? '—' : `${num(v)}%`);

export function LineTable({ title, lines, compare }: { title: string; lines: PayLine[]; compare?: PayLine[] }) {
  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const before = (name: string) => compare?.find(c => c.componentName === name)?.amount;
  return <div className="rounded-xl border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 text-gray-500"><tr>
          <th className="text-left px-3 py-2">{title}</th>
          <th className="text-left px-3 py-2">Type</th>
          <th className="text-right px-3 py-2">Fixed / full month</th>
          {compare && <th className="text-right px-3 py-2">Current</th>}
          <th className="text-right px-3 py-2">{compare ? 'Recalculated' : 'Amount'}</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {lines.length === 0 && <tr><td colSpan={compare ? 5 : 4} className="px-3 py-3 text-center text-gray-400">None</td></tr>}
          {lines.map((l, i) => {
            const prev = before(l.componentName);
            const changed = compare && prev !== undefined && Math.abs(Number(prev) - Number(l.amount)) > 0.009;
            return <tr key={`${l.componentName}-${i}`}>
              <td className="px-3 py-1.5 text-gray-800">{l.componentName || '—'}{l.claimId ? <span className="ml-1 text-[10px] text-gray-400">claim</span> : null}{l.loanId ? <span className="ml-1 text-[10px] text-gray-400">loan</span> : null}</td>
              <td className="px-3 py-1.5 text-gray-500">{l.calculationType || '—'}</td>
              <td className="px-3 py-1.5 text-right text-gray-500">{l.fixedAmount !== undefined ? money(l.fixedAmount) : '—'}</td>
              {compare && <td className="px-3 py-1.5 text-right text-gray-500">{prev !== undefined ? money(prev) : <span className="text-[10px]">new</span>}</td>}
              <td className={`px-3 py-1.5 text-right font-medium ${changed ? 'text-[var(--color-bss-interactive-blue)]' : ''}`}>{money(l.amount)}</td>
            </tr>;
          })}
        </tbody>
        <tfoot className="bg-gray-50 font-semibold"><tr><td className="px-3 py-2" colSpan={compare ? 4 : 3}>Total</td><td className="px-3 py-2 text-right">{money(total)}</td></tr></tfoot>
      </table>
    </div>
  </div>;
}

function AuditCard({ title, applicable, rows }: { title: string; applicable?: boolean; rows: Array<[string, React.ReactNode]> }) {
  return <div className="rounded-xl border border-gray-200 p-3">
    <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold text-gray-900">{title}</p><Badge status={applicable ? 'active' : 'inactive'}>{applicable ? 'Applicable' : 'Not applicable'}</Badge></div>
    <dl className="space-y-1">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-2 text-[11px]"><dt className="text-gray-500">{k}</dt><dd className="font-medium text-gray-800 text-right">{v}</dd></div>)}</dl>
  </div>;
}

export function StatutoryAudit({ employer, epf, esi, pt, lwf, bonus }: { employer?: EmployerContributions; epf?: EpfDetails; esi?: EsiDetails; pt?: PtDetails; lwf?: LwfDetails; bonus?: BonusDetails }) {
  return <div className="space-y-3">
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <Kpi label="Employer EPF" value={money(employer?.epf ?? 0)} />
      <Kpi label="EDLI" value={money(employer?.edli ?? 0)} />
      <Kpi label="PF admin charges" value={money(employer?.adminCharges ?? 0)} />
      <Kpi label="Employer ESI" value={money(employer?.esi ?? 0)} />
      <Kpi label="Employer LWF" value={money(employer?.lwf ?? 0)} />
      <Kpi label="Employer total" value={money(employer?.total ?? 0)} tone="text-[var(--color-bss-interactive-blue)]" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      <AuditCard title="EPF" applicable={epf?.applicable} rows={[
        ['EPF wage', money(epf?.epfWage ?? 0)], ['Employee rate', pct(epf?.employeeRate)], ['Employer rate', pct(epf?.employerRate)],
        ['Ceiling applied', yesNo(epf?.ceilingApplied)], ['Effective ceiling', money(epf?.effectiveCeiling ?? 0)], ['ABRY applied', yesNo(epf?.abryApplied)], ['Employee override used', yesNo(epf?.overrideUsed)],
      ]} />
      <AuditCard title="ESI" applicable={esi?.applicable} rows={[
        ['Wage used', money(esi?.wageUsed ?? 0)], ['Employee rate', pct(esi?.employeeRate)], ['Employer rate', pct(esi?.employerRate)],
        ['Wage limit', money(esi?.wageLimit ?? 0)], ['Employer share in CTC', yesNo(esi?.includeEmployerInCtc)],
      ]} />
      <AuditCard title="Professional Tax" applicable={pt?.applicable} rows={[
        ['State', pt?.stateUsed || '—'], ['PT number', pt?.ptNumber || '—'], ['Cycle', pt?.cycle || '—'], ['Amount', money(pt?.amount ?? 0)],
      ]} />
      <AuditCard title="Labour Welfare Fund" applicable={lwf?.applicable} rows={[
        ['State', lwf?.stateUsed || '—'], ['Cycle', lwf?.cycle || '—'], ['Employee share', money(lwf?.employeeShare ?? 0)], ['Employer share', money(lwf?.employerShare ?? 0)],
      ]} />
      <AuditCard title="Statutory Bonus" applicable={bonus?.applicable} rows={[
        ['Amount', money(bonus?.amount ?? 0)], ['Cycle', bonus?.cycle || '—'], ['Payment month', bonus?.paymentMonth || '—'],
        ['Calculation base', money(bonus?.calcBase ?? 0)], ['Percentage', pct(bonus?.percentage)],
      ]} />
    </div>
  </div>;
}

const KIND_STYLE: Record<DayKind, { cls: string; label: string }> = {
  present: { cls: 'bg-green-100 text-green-800', label: 'Present' },
  half: { cls: 'bg-lime-100 text-lime-800', label: 'Half day' },
  leave: { cls: 'bg-blue-100 text-blue-800', label: 'Paid leave' },
  unpaidLeave: { cls: 'bg-orange-100 text-orange-800', label: 'Unpaid leave' },
  absent: { cls: 'bg-red-100 text-red-800', label: 'Absent / LWP' },
  holiday: { cls: 'bg-purple-100 text-purple-800', label: 'Holiday' },
  weekoff: { cls: 'bg-gray-100 text-gray-500', label: 'Week off' },
  unmarked: { cls: 'bg-white text-gray-400 border border-dashed border-gray-200', label: 'Unmarked' },
};

export function PaidDaysCalendar({ data }: { data: PaidDaysBreakdown }) {
  const counters: Array<[string, number]> = [
    ['Calendar days', data.calendarDays], ['Working days', data.workingDays], ['Paid days', data.paidDays], ['LOP days', data.lopDays],
    ['Present', data.presentDays], ['Half days', data.halfDays], ['Paid leave', data.paidLeaveDays], ['Unpaid leave', data.unpaidLeaveDays],
    ['Absent', data.absentDays], ['Week offs', data.weekOffDays], ['Holidays', data.holidayDays], ['Unmarked', data.unmarkedDays],
  ];
  return <div className="space-y-3">
    {data.shiftName && <p className="text-xs text-gray-500">Shift: <span className="font-semibold text-gray-700">{data.shiftName}</span></p>}
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
      {counters.map(([k, v]) => <div key={k} className="rounded-lg border border-gray-100 px-2 py-1.5"><p className="text-[10px] text-gray-500">{k}</p><p className="text-sm font-bold text-gray-900">{num(v)}</p></div>)}
    </div>
    <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Attendance calendar">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-[10px] font-semibold text-gray-400">{d}</div>)}
      {Array.from({ length: data.startWeekday || 0 }, (_, i) => <div key={`pad-${i}`} />)}
      {data.days.map(d => {
        const style = KIND_STYLE[d.kind] ?? KIND_STYLE.unmarked;
        return <div key={d.day} title={`${d.day} ${d.weekday}: ${d.title}`} className={`rounded-md px-1 py-1 min-h-11 ${style.cls}`}>
          <p className="text-xs font-bold">{d.day}</p>
          <p className="text-[9px] leading-tight truncate">{d.title}</p>
        </div>;
      })}
    </div>
    <div className="flex flex-wrap gap-2">{Object.values(KIND_STYLE).map(s => <span key={s.label} className={`text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>)}</div>
    {data.holidays.length > 0 && <div className="text-xs text-gray-600">
      <p className="font-semibold mb-1">Holidays</p>
      <ul className="space-y-0.5">{data.holidays.map(h => <li key={`${h.day}-${h.name}`}>{h.day} — {h.name} <span className="text-gray-400">({h.type})</span></li>)}</ul>
    </div>}
    <p className="text-[11px] text-gray-400">Paid days = calendar days − LOP; LOP = working days − (present + half days × 0.5 + paid leave).</p>
  </div>;
}

/** PUT recalculatePayroll/:id with { paidDays, preview } — preview first, then apply. */
export function RecalcModal({ payroll, notify, onClose, onDone }: { payroll: PayrollRun; notify: Notify; onClose: () => void; onDone: () => void }) {
  const calendarDays = payroll.paidDaysBreakdown?.calendarDays;
  const [paidDays, setPaidDays] = useState<number>(Number.isFinite(Number(payroll.presentDays)) ? Number(payroll.presentDays) : Number(payroll.workingDays) || 0);
  const [preview, setPreview] = useState<RecalcPayload | null>(null);
  const { busy, run } = useAction(notify);

  const doPreview = async () => {
    const out = await run(() => pe.put<RecalcPayload>(`recalculatePayroll/${payroll._id}`, { paidDays, preview: true }));
    if (out) setPreview(out);
  };
  const apply = async () => {
    const out = await run(() => pe.put<RecalcPayload>(`recalculatePayroll/${payroll._id}`, { paidDays, preview: false }), 'Payroll recalculated');
    if (out) onDone();
  };

  return <Modal title="Recalculate payroll" subtitle={`${runEmployeeName(payroll)} · ${payroll.month} ${payroll.year}`} onClose={onClose} width="max-w-4xl"
    footer={<>
      <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
      <Btn variant="secondary" busy={busy} onClick={doPreview}><Calculator size={14} />Preview</Btn>
      <Btn busy={busy} disabled={!preview || preview.paidDays !== paidDays} onClick={apply}><RefreshCw size={14} />Apply recalculation</Btn>
    </>}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Paid days" hint={`0 – ${calendarDays ?? 'calendar days of the month'}. Salary is pro-rated on calendar days.`} className="w-56">
          <NumberInput value={paidDays} min={0} max={calendarDays} step={0.5} onChange={v => { setPaidDays(v); setPreview(null); }} />
        </Field>
        {payroll.paidDaysBreakdown && <Btn variant="ghost" onClick={() => { setPaidDays(payroll.paidDaysBreakdown!.paidDays); setPreview(null); }}>Use attendance ({num(payroll.paidDaysBreakdown.paidDays)} days)</Btn>}
      </div>
      {payroll.payStatus === 'approved' && <p className="text-xs rounded-lg bg-orange-50 text-orange-700 px-3 py-2">This payroll is approved. Applying a recalculation moves it back to “processed” and it must be approved again.</p>}
      <p className="text-xs text-gray-500">Arrears, loan EMIs and reimbursements already on the payroll are kept. TDS ledgers are re-synced on apply.</p>
      {!preview && <p className="text-sm text-gray-500">Enter paid days and click <b>Preview</b> to see the recalculated payroll before saving.</p>}
      {preview && <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Kpi label="Calendar / working days" value={`${num(preview.calendarDays)} / ${num(preview.workingDays)}`} />
          <Kpi label="Paid days / LOP" value={`${num(preview.paidDays)} / ${num(preview.lopDays)}`} />
          <Kpi label="Gross" value={money(preview.grossEarnings)} sub={`was ${money(payroll.grossEarnings)}`} />
          <Kpi label="Net pay" value={money(preview.netPay)} sub={`was ${money(payroll.netPay)} · deductions ${money(preview.totalDeductions)}`} tone="text-[var(--color-bss-interactive-blue)]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <LineTable title="Earnings" lines={preview.earnings} compare={payroll.earnings} />
          <LineTable title="Deductions" lines={preview.deductions} compare={payroll.deductions} />
          <LineTable title="Benefits" lines={preview.benefits} compare={payroll.benefits} />
          <LineTable title="Reimbursements" lines={preview.reimbursements} compare={payroll.reimbursements} />
        </div>
        <StatutoryAudit employer={preview.employerContributions} epf={preview.epfDetails} esi={preview.esiDetails} pt={preview.ptDetails} lwf={preview.lwfDetails} bonus={preview.bonusDetails} />
      </div>}
    </div>
  </Modal>;
}

type Dialog = null | 'recalc' | 'status' | 'payslip' | 'delete';

/** Full payroll record (GET getPayroll/:payrollId) with every action available on it. */
export function PayrollDetailModal({ payrollId, notify, onClose, onChanged }: { payrollId: string; notify: Notify; onClose: () => void; onChanged: () => void }) {
  const state = useLoad(() => pe.get<PayrollRun>(`getPayroll/${payrollId}`), [payrollId]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const { busy, run } = useAction(notify);
  const p = state.data;
  const changed = () => { setDialog(null); state.reload(); onChanged(); };

  const del = async () => {
    const out = await run(() => pe.del(`deletePayrollRun/${payrollId}`), 'Payroll run deleted');
    if (out !== undefined) { setDialog(null); onChanged(); onClose(); }
  };

  return <Modal title={p ? `${runEmployeeName(p)} · ${p.month} ${p.year}` : 'Payroll detail'} subtitle={p ? [runEmployeeCode(p), runDepartment(p), runEmployee(p)?.payrollInfo?.designation, runEmployee(p)?.email].filter(Boolean).join(' · ') : undefined}
    onClose={onClose} width="max-w-5xl"
    footer={p ? <div className="flex flex-wrap justify-end gap-2 w-full">
      <Btn variant="danger" onClick={() => setDialog('delete')}><Trash2 size={14} />Delete run</Btn>
      <span className="flex-1" />
      <Btn variant="secondary" onClick={() => setDialog('payslip')}><FileText size={14} />Payslip</Btn>
      <Btn variant="secondary" busy={busy} onClick={() => run(() => downloadPayslipPdf(p._id, `Payslip_${runEmployeeCode(p) || 'employee'}_${p.month}_${p.year}.pdf`), 'Payslip downloaded')}><Download size={14} />PDF</Btn>
      <Btn variant="secondary" disabled={p.payStatus === 'paid'} title={p.payStatus === 'paid' ? 'Paid payroll cannot be edited. Reverse payment first.' : undefined} onClick={() => setDialog('recalc')}><RefreshCw size={14} />Recalculate</Btn>
      <Btn onClick={() => setDialog('status')}>Change status</Btn>
    </div> : undefined}>
    <Async state={state}>{data => <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge status={data.payStatus}>{STATUS_LABEL[data.payStatus] ?? data.payStatus}</Badge>
        {data.remarks && <span className="text-xs text-gray-500">Remarks: {data.remarks}</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Gross earnings" value={money(data.grossEarnings)} />
        <Kpi label="Total deductions" value={money(data.totalDeductions)} tone="text-red-700" />
        <Kpi label="Net pay" value={money(data.netPay)} tone="text-green-700" />
        <Kpi label="Cost to company" value={money((data.grossEarnings || 0) + (data.employerContributions?.total || 0))} sub="gross + employer contributions" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Row label="Working days" value={num(data.workingDays)} />
        <Row label="Paid / present days" value={num(data.presentDays)} />
        <Row label="Absent days" value={num(data.absentDays)} />
        <Row label="LOP days" value={num(data.lopDays)} />
        <Row label="Processed" value={fmtDateTime(data.processedDate)} />
        <Row label="Approved" value={fmtDateTime(data.approvedDate)} />
        <Row label="Paid on" value={fmtDate(data.paidDate)} />
        <Row label="Payment mode" value={paymentModeLabel(data.paymentMode)} />
        {data.transactionId && <Row label="Transaction ID" value={data.transactionId} />}
        <Row label="Created" value={fmtDateTime(data.createdAt)} />
        <Row label="Last updated" value={fmtDateTime(data.updatedAt)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <LineTable title="Earnings" lines={data.earnings ?? []} />
        <LineTable title="Deductions" lines={data.deductions ?? []} />
        <LineTable title="Benefits" lines={data.benefits ?? []} />
        <LineTable title="Reimbursements" lines={data.reimbursements ?? []} />
      </div>
      <Section title="Employer contributions & statutory audit trail" subtitle="EPF / ESI / PT / LWF / Bonus values used for this month (for returns and reconciliation)">
        <div className="p-4"><StatutoryAudit employer={data.employerContributions} epf={data.epfDetails} esi={data.esiDetails} pt={data.ptDetails} lwf={data.lwfDetails} bonus={data.bonusDetails} /></div>
      </Section>
      <Section title="Paid days breakdown" subtitle="Attendance, leave, holidays and week-offs for the month">
        <div className="p-4">{data.paidDaysBreakdown ? <PaidDaysCalendar data={data.paidDaysBreakdown} /> : <p className="text-sm text-gray-500">No attendance breakdown available for this employee/month.</p>}</div>
      </Section>
    </div>}</Async>
    {p && dialog === 'recalc' && <RecalcModal payroll={p} notify={notify} onClose={() => setDialog(null)} onDone={changed} />}
    {p && dialog === 'status' && <StatusModal payrollIds={[p._id]} initialStatus={p.payStatus === 'processed' ? 'approved' : p.payStatus === 'approved' ? 'paid' : 'processed'} label={`${runEmployeeName(p)} · ${p.month} ${p.year}`} notify={notify} onClose={() => setDialog(null)} onDone={changed} />}
    {p && dialog === 'payslip' && <PayslipModal payrollId={p._id} notify={notify} onClose={() => setDialog(null)} />}
    {p && dialog === 'delete' && <Confirm danger busy={busy} title="Delete payroll run?" onClose={() => setDialog(null)} onConfirm={del}
      message={<>This removes the {p.month} {p.year} payroll of <b>{runEmployeeName(p)}</b> and reverses its loan repayments. You can process the employee again afterwards.</>} />}
  </Modal>;
}
