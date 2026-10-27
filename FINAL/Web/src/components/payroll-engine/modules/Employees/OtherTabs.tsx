"use client";

/**
 * Exit (BSS PUT employees/:id/exit), annual salary statement
 * (GET employee/:id/annualSalaryStatement?financialYear=) and portal preferences
 * (GET/PUT staffPortal/preferences/:employeeId).
 */

import { useState } from 'react';
import { LogOut, Printer } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps, PayrollEmployee } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, Confirm, DataTable, Empty, Field, FinancialYearPicker, FormGrid, Kpi, KpiGrid, Row, Section, Select, TextInput, Toggle, currentFinancialYear, fmtDate, fmtDateTime, isoDate, money, useAction, useLoad } from '../../ui';
import type { AnnualStatement } from './types';

export const EXIT_STATUSES = ['Absconding', 'AWOL', 'Contract Expiry', 'Deported', 'Expired (Death)', 'Resigned', 'Retired', 'Permanent Disability', 'Termination', 'Superannuation', 'Cessation', 'Abandonment', 'Misconduct', 'Poor Performance', 'Others'];

export function ExitTab({ employee, notify, navigate, onSaved }: { employee: PayrollEmployee; notify: ModuleProps['notify']; navigate: ModuleProps['navigate']; onSaved: (e: PayrollEmployee) => void }) {
  const x = employee.exitData ?? ({} as PayrollEmployee['exitData']);
  const [f, setF] = useState({ exitStatus: x.exitStatus ?? '', lastWorkingDay: isoDate(x.lastWorkingDay), date: isoDate(x.date), reason: x.reason ?? '' });
  const [clearing, setClearing] = useState(false);
  const { busy, run } = useAction(notify);
  const exited = !!x.exitStatus;

  const save = async () => {
    if (!f.exitStatus) { notify('Select an exit status', 'error'); return; }
    if (!f.lastWorkingDay) { notify('lastWorkingDay is required', 'error'); return; }
    if (f.date && f.date < f.lastWorkingDay) { notify('Exit date cannot be before the last working day', 'error'); return; }
    const out = await run(() => pe.put<PayrollEmployee>(`employees/${employee._id}/exit`, { exitStatus: f.exitStatus, lastWorkingDay: f.lastWorkingDay, date: f.date || undefined, reason: f.reason }), 'Employee exit updated');
    if (out) onSaved(out);
  };

  return <div className="space-y-4">
    {exited && <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-800 flex flex-wrap items-center justify-between gap-2">
      <span><b>{x.exitStatus}</b> · last working day {fmtDate(x.lastWorkingDay)}{(x as Record<string, unknown>).recordedAt ? ` · recorded ${fmtDateTime((x as Record<string, unknown>).recordedAt)}` : ''}</span>
      <Btn variant="secondary" onClick={() => navigate('fnf', { employeeId: employee._id })}><LogOut size={14} />Full &amp; Final settlement</Btn>
    </div>}
    <Section title={exited ? 'Update exit' : 'Record exit'} subtitle="Recording an exit marks the employee inactive and makes them eligible for Full & Final settlement.">
      <div className="p-5 space-y-3">
        <FormGrid cols={3}>
          <Field label="Exit status *"><Select value={f.exitStatus} onChange={exitStatus => setF(s => ({ ...s, exitStatus }))} options={EXIT_STATUSES} placeholder="Select…" /></Field>
          <Field label="Last working day *"><TextInput type="date" value={f.lastWorkingDay} onChange={lastWorkingDay => setF(s => ({ ...s, lastWorkingDay }))} /></Field>
          <Field label="Exit date" hint="Defaults to last working day"><TextInput type="date" value={f.date} onChange={date => setF(s => ({ ...s, date }))} /></Field>
        </FormGrid>
        <Field label="Reason"><textarea rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={f.reason} onChange={e => setF(s => ({ ...s, reason: e.target.value }))} /></Field>
      </div>
      <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap justify-end gap-2">
        {exited && <Btn variant="secondary" onClick={() => setClearing(true)}>Clear exit (reactivate)</Btn>}
        <Btn busy={busy} onClick={() => void save()}>{exited ? 'Update exit' : 'Record exit'}</Btn>
      </div>
    </Section>
    {clearing && <Confirm title="Clear exit" busy={busy} onClose={() => setClearing(false)} message="This removes the exit record and marks the employee active again. Any Full & Final settlement already created is not deleted."
      onConfirm={async () => { const out = await run(() => pe.put<PayrollEmployee>(`employees/${employee._id}/exit`, { exitStatus: '' }), 'Employee exit cleared'); if (out) { setClearing(false); setF({ exitStatus: '', lastWorkingDay: '', date: '', reason: '' }); onSaved(out); } }} />}
  </div>;
}

export function StatementTab({ employee, navigate }: { employee: PayrollEmployee; navigate: ModuleProps['navigate'] }) {
  const [fy, setFy] = useState(currentFinancialYear());
  const state = useLoad(() => pe.get<AnnualStatement>(`employee/${employee._id}/annualSalaryStatement`, { financialYear: fy }), [employee._id, fy]);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <FinancialYearPicker value={fy} onChange={setFy} />
      <Btn variant="secondary" onClick={() => window.print()}><Printer size={14} />Print</Btn>
    </div>
    <Async state={state}>{s => <div className="space-y-4">
      <div className="text-xs text-gray-600"><b className="text-gray-900">{s.employee.name}</b> · {s.employee.code} · {s.employee.designation || '—'} · {s.period.description}</div>
      <KpiGrid>
        <Kpi label="Total gross" value={money(s.annualSummary.totalGross)} sub={`Avg ${money(s.annualSummary.averageMonthlyGross)} / mo`} />
        <Kpi label="Total deductions" value={money(s.annualSummary.totalDeductions)} />
        <Kpi label="Total net pay" value={money(s.annualSummary.totalNetPay)} sub={`Avg ${money(s.annualSummary.averageMonthlyNetPay)} / mo`} tone="text-green-700" />
        <Kpi label="Months processed" value={`${s.annualSummary.monthsProcessed} / ${s.annualSummary.expectedMonths}`} />
      </KpiGrid>
      <Section title="Monthly breakdown">
        <DataTable rows={s.monthlyBreakdown} rowKey={r => String(r.payrollId)} empty={`No payroll processed in FY ${s.financialYear}`}
          onRowClick={() => navigate('payrun', { employeeId: employee._id })}
          columns={[
            { key: 'm', label: 'Month', render: r => `${r.month} ${r.year}` },
            { key: 'days', label: 'Paid / working days', render: r => `${r.paidDays} / ${r.workingDays}${r.lopDays ? ` (LOP ${r.lopDays})` : ''}` },
            { key: 'basic', label: 'Basic', align: 'right', render: r => money(r.basicSalary) },
            { key: 'gross', label: 'Gross', align: 'right', render: r => money(r.grossEarnings) },
            { key: 'ded', label: 'Deductions', align: 'right', render: r => money(r.totalDeductions) },
            { key: 'net', label: 'Net pay', align: 'right', render: r => <b>{money(r.netPay)}</b> },
            { key: 'st', label: 'Status', render: r => <Badge status={r.payStatus} /> },
          ]} />
      </Section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Earnings — year to date">
          <div className="p-4 space-y-2">{s.componentTotals.earnings.length ? s.componentTotals.earnings.map(e => <Row key={e.componentName} label={e.componentName} value={money(e.amount)} />) : <Empty title="No earnings" />}</div>
        </Section>
        <Section title="Deductions — year to date">
          <div className="p-4 space-y-2">{s.componentTotals.deductions.length ? s.componentTotals.deductions.map(e => <Row key={e.componentName} label={e.componentName} value={money(e.amount)} />) : <Empty title="No deductions" />}</div>
        </Section>
      </div>
    </div>}</Async>
  </div>;
}

type Prefs = { language?: string; dateFormat?: string; timeZone?: string; emailNotifications?: boolean; smsNotifications?: boolean; theme?: string; updatedAt?: string };

export function PreferencesTab({ employee, notify }: { employee: PayrollEmployee; notify: ModuleProps['notify'] }) {
  const state = useLoad(() => pe.get<Prefs>(`staffPortal/preferences/${employee._id}`), [employee._id]);
  return <Async state={state}>{p => <PrefsForm initial={p} employee={employee} notify={notify} />}</Async>;
}

function PrefsForm({ initial, employee, notify }: { initial: Prefs; employee: PayrollEmployee; notify: ModuleProps['notify'] }) {
  const [f, setF] = useState({ language: initial.language ?? 'en', dateFormat: initial.dateFormat ?? 'DD/MM/YYYY', timeZone: initial.timeZone ?? 'Asia/Kolkata', emailNotifications: initial.emailNotifications ?? true, smsNotifications: initial.smsNotifications ?? false, theme: initial.theme ?? 'light' });
  const { busy, run } = useAction(notify);
  return <Section title="Portal preferences" subtitle={initial.updatedAt ? `Last updated ${fmtDateTime(initial.updatedAt)}` : 'Defaults — not yet saved by the employee'}>
    <div className="p-5 space-y-3">
      <FormGrid cols={2}>
        <Field label="Language"><Select value={f.language} onChange={language => setF(s => ({ ...s, language }))} options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' }, { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' }, { value: 'de', label: 'German' }]} /></Field>
        <Field label="Date format"><Select value={f.dateFormat} onChange={dateFormat => setF(s => ({ ...s, dateFormat }))} options={['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} /></Field>
        <Field label="Time zone"><TextInput value={f.timeZone} onChange={timeZone => setF(s => ({ ...s, timeZone }))} placeholder="Asia/Kolkata" /></Field>
        <Field label="Theme"><Select value={f.theme} onChange={theme => setF(s => ({ ...s, theme }))} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'auto', label: 'Auto' }]} /></Field>
      </FormGrid>
      <div className="flex flex-wrap gap-6">
        <Toggle checked={f.emailNotifications} onChange={emailNotifications => setF(s => ({ ...s, emailNotifications }))} label="Email notifications" />
        <Toggle checked={f.smsNotifications} onChange={smsNotifications => setF(s => ({ ...s, smsNotifications }))} label="SMS notifications" />
      </div>
    </div>
    <div className="px-5 py-3 border-t border-gray-100 flex justify-end"><Btn busy={busy} onClick={() => void run(() => pe.put(`staffPortal/preferences/${employee._id}`, f), 'Employee preferences updated successfully')}>Save preferences</Btn></div>
  </Section>;
}
