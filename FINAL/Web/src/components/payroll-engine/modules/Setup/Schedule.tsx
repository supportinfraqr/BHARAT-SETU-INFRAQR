"use client";

/**
 * Pay schedule (legacy controller/payroll/payrollSchedule.js):
 * POST createOrUpdateSchedule, GET getPayrollSchedule, GET getUpcomingPayrollDates, GET calculatePayPeriod?date=
 */

import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { PayrollApiError, pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, DataTable, Empty, Field, FormGrid, Row, Section, Select, TextInput, Toggle, fmtDate, fmtDateTime, isoDate, useAction, useLoad } from '../../ui';
import { WEEK_DAYS } from './constants';

type Schedule = {
  _id?: string; payFrequency: 'monthly' | 'bi-weekly' | 'weekly' | 'semi-monthly'; workingDays: string[]; payDay: string; firstPayPeriod: string | null;
  upcomingPayrolls?: Upcoming[]; status: 'active' | 'inactive'; autoProcessEnabled: boolean; autoProcessTime: string;
  lastAutoRunAt?: string | null; lastAutoRunKey?: string; lastAutoRunStatus?: string; lastAutoRunMessage?: string; updatedAt?: string;
};
type Upcoming = { _id?: string; period: string; payDate: string };
type PayPeriod = { periodStart: string; periodEnd: string; frequency: string; workingDays: number };

const FREQS = [{ value: 'monthly', label: 'Monthly' }, { value: 'semi-monthly', label: 'Semi-monthly (15th & month end)' }, { value: 'bi-weekly', label: 'Bi-weekly' }, { value: 'weekly', label: 'Weekly' }];

export default function Schedule({ notify, navigate }: Pick<ModuleProps, 'notify' | 'navigate'>) {
  const state = useLoad(() => pe.get<Partial<Schedule>>('getPayrollSchedule'), []);
  const upcoming = useLoad(() => pe.get<Upcoming[]>('getUpcomingPayrollDates').catch(err => {
    if (err instanceof PayrollApiError && err.status === 404) return [] as Upcoming[];
    throw err;
  }), []);
  return <div className="space-y-4">
    <Async state={state}>{data => <ScheduleForm key={data.updatedAt ?? "new"} initial={data} notify={notify} onSaved={() => { state.reload(); upcoming.reload(); }} />}</Async>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Section title="Upcoming payroll dates" subtitle="Next 12 cycles generated from the schedule" right={<Btn variant="ghost" onClick={() => navigate('payrun')}>Go to pay runs</Btn>}>
        <Async state={upcoming} empty={<Empty title="No schedule yet" text="Save a pay schedule to generate upcoming payroll dates." />}>
          {rows => <DataTable columns={[
            { key: 'n', label: '#', render: (_r, i) => i + 1 },
            { key: 'period', label: 'Period' },
            { key: 'payDate', label: 'Pay date', render: r => fmtDate(r.payDate) },
          ]} rows={rows} rowKey={(r, i) => r._id ?? `${r.period}-${i}`} />}
        </Async>
      </Section>
      <PayPeriodCalc notify={notify} />
    </div>
  </div>;
}

function ScheduleForm({ initial, notify, onSaved }: { initial: Partial<Schedule>; notify: ModuleProps['notify']; onSaved: () => void }) {
  const configured = !!initial._id;
  const [f, setF] = useState<Schedule>({
    payFrequency: initial.payFrequency ?? 'monthly', workingDays: initial.workingDays ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    payDay: String(initial.payDay ?? '7'), firstPayPeriod: isoDate(initial.firstPayPeriod), status: initial.status ?? 'active',
    autoProcessEnabled: initial.autoProcessEnabled ?? true, autoProcessTime: initial.autoProcessTime ?? '13:00',
  });
  const { busy, run } = useAction(notify);
  const set = (patch: Partial<Schedule>) => setF(prev => ({ ...prev, ...patch }));

  const submit = async () => {
    if (!f.payFrequency || !f.payDay || !f.firstPayPeriod) { notify('Pay frequency, pay day, and first pay period are required', 'error'); return; }
    const out = await run(() => pe.post('createOrUpdateSchedule', f), 'Payroll schedule saved successfully');
    if (out !== undefined) onSaved();
  };

  return <Section title="Pay schedule" subtitle="Pay frequency, pay day and automatic payroll processing."
    right={configured ? <Badge status={initial.status}>{initial.status === 'inactive' ? 'Inactive' : 'Active'}</Badge> : <Badge status="draft">Not configured</Badge>}>
    <div className="p-5 space-y-4">
      <FormGrid cols={3}>
        <Field label="Pay frequency *"><Select value={f.payFrequency} onChange={v => set({ payFrequency: v as Schedule['payFrequency'] })} options={FREQS} /></Field>
        <Field label="Pay day *" hint="Day of the month salary is paid (monthly)">
          <Select value={f.payDay} onChange={payDay => set({ payDay })} options={Array.from({ length: 31 }, (_, i) => String(i + 1))} />
        </Field>
        <Field label="First pay period / implementation date *" hint="TDS is computed from this date to 31 March"><TextInput type="date" value={f.firstPayPeriod} onChange={firstPayPeriod => set({ firstPayPeriod })} /></Field>
        <Field label="Status"><Select value={f.status} onChange={v => set({ status: v as Schedule['status'] })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></Field>
        <Field label="Auto-process time (24h)" hint="Payroll runs automatically on pay day at this time"><TextInput type="time" disabled={!f.autoProcessEnabled} value={f.autoProcessTime} onChange={autoProcessTime => set({ autoProcessTime })} /></Field>
        <div className="flex items-end pb-2"><Toggle checked={f.autoProcessEnabled} onChange={autoProcessEnabled => set({ autoProcessEnabled })} label="Auto-process payroll on pay day" /></div>
      </FormGrid>
      <fieldset>
        <legend className="text-xs font-medium text-gray-600 mb-1">Working days</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {WEEK_DAYS.map(d => <Toggle key={d} checked={f.workingDays.includes(d)} label={d.slice(0, 3)}
            onChange={on => set({ workingDays: on ? WEEK_DAYS.filter(x => x === d || f.workingDays.includes(x)) : f.workingDays.filter(x => x !== d) })} />)}
        </div>
      </fieldset>
      {configured && <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Row label="Last auto-run" value={initial.lastAutoRunAt ? fmtDateTime(initial.lastAutoRunAt) : 'Never'} />
        <Row label="Last auto-run period" value={initial.lastAutoRunKey || '—'} />
        <Row label="Last auto-run status" value={initial.lastAutoRunStatus ? <Badge status={initial.lastAutoRunStatus} /> : '—'} />
        <Row label="Message" value={initial.lastAutoRunMessage || '—'} />
      </div>}
    </div>
    <div className="px-5 py-3 border-t border-gray-100 flex justify-end"><Btn busy={busy} onClick={() => void submit()}>Save schedule</Btn></div>
  </Section>;
}

function PayPeriodCalc({ notify }: Pick<ModuleProps, 'notify'>) {
  const [date, setDate] = useState(() => isoDate(new Date()));
  const [result, setResult] = useState<PayPeriod | null>(null);
  const { busy, run } = useAction(notify);
  return <Section title="Pay period lookup" subtitle="Find the pay period (and working days) a date falls in">
    <form className="p-5 flex flex-wrap items-end gap-2" onSubmit={async e => {
      e.preventDefault();
      if (!date) { notify('Date is required', 'error'); return; }
      const out = await run(() => pe.get<PayPeriod>('calculatePayPeriod', { date }));
      if (out) setResult(out);
    }}>
      <Field label="Date" className="w-48"><TextInput type="date" value={date} onChange={setDate} /></Field>
      <Btn type="submit" busy={busy}><CalendarClock size={14} />Calculate</Btn>
    </form>
    {result && <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Row label="Period start" value={fmtDate(result.periodStart)} />
      <Row label="Period end" value={fmtDate(result.periodEnd)} />
      <Row label="Frequency" value={result.frequency} />
      <Row label="Working days (Mon–Fri)" value={result.workingDays} />
    </div>}
  </Section>;
}
