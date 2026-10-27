"use client";

/**
 * Voluntary Provident Fund — legacy employee/vpf (GET), employee/vpf/start
 * ({ contributionType, contributionValue, acknowledged }) and employee/vpf/stop.
 */

import { useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, Confirm, Field, NumberInput, Row, Section, Toggle, fmtDate, fmtDateTime, money, useAction, useLoad } from '../ui';

type Vpf = { enabled: boolean; contributionType: 'percentage' | 'fixed'; percentage: number; fixedAmount: number; status: 'none' | 'pending' | 'active' | 'stopped' | string; acknowledged: boolean; requestedAt: string | null; effectiveFrom: string | null };
type VpfData = { vpf: Vpf; basicSalary: number; estimatedMonthlyVpf: number };

export default function MyVpf({ notify }: ModuleProps) {
  const state = useLoad(() => pe.get<VpfData>('employee/vpf'), []);
  return <Async state={state}>{d => <VpfView key={`${d.vpf.status}:${d.vpf.requestedAt}`} d={d} notify={notify} onChange={state.reload} />}</Async>;
}

function VpfView({ d, notify, onChange }: { d: VpfData; notify: ModuleProps['notify']; onChange: () => void }) {
  const v = d.vpf;
  const running = v.status === 'active' || v.status === 'pending';
  const [type, setType] = useState<'percentage' | 'fixed'>(v.contributionType || 'percentage');
  const [value, setValue] = useState<number>(v.contributionType === 'fixed' ? v.fixedAmount || 0 : v.percentage || 0);
  const [ack, setAck] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const { busy, run } = useAction(notify);
  const estimate = type === 'fixed' ? value : Math.round(((d.basicSalary * value) / 100) * 100) / 100;

  const start = async () => {
    const out = await run(async () => { const env = await pe.raw('POST', 'employee/vpf/start', { body: { contributionType: type, contributionValue: value, acknowledged: ack } }); notify(env.message || 'VPF activated', 'success'); return env; });
    if (out) onChange();
  };
  const stop = async () => {
    const out = await run(async () => { const env = await pe.raw('POST', 'employee/vpf/stop', { body: {} }); notify(env.message || 'VPF stopped', 'success'); return env; });
    setConfirmStop(false);
    if (out) onChange();
  };

  return <div className="space-y-4">
    <Section title="Voluntary Provident Fund (VPF)" subtitle="Save more in your PF account, over and above the mandatory 12% employee contribution." right={<Badge status={v.status}>{v.status === 'none' ? 'Not enrolled' : v.status}</Badge>}>
      <div className="p-4 space-y-3">
        <div className="rounded-xl bg-blue-50 px-4 py-3 flex items-center gap-3">
          <PiggyBank size={22} className="text-[var(--color-bss-interactive-blue)] shrink-0" />
          <div>
            <p className="text-xs text-gray-600">Estimated monthly VPF</p>
            <p className="text-xl font-extrabold text-gray-900">{money(d.estimatedMonthlyVpf)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Row label="Basic salary (monthly)" value={money(d.basicSalary)} />
          <Row label="Contribution" value={v.status === 'none' ? '—' : v.contributionType === 'fixed' ? `${money(v.fixedAmount)} fixed` : `${v.percentage}% of basic`} />
          <Row label={v.status === 'stopped' ? 'Stops from' : 'Effective from'} value={fmtDate(v.effectiveFrom)} />
          <Row label="Requested on" value={fmtDateTime(v.requestedAt)} />
        </div>
        {running && <Btn variant="danger" className="w-full sm:w-auto h-11" onClick={() => setConfirmStop(true)}>Stop VPF</Btn>}
      </div>
    </Section>

    {!running && <Section title={v.status === 'stopped' ? 'Restart VPF' : 'Start VPF'} subtitle="Your deduction starts from next month's payroll.">
      <div className="p-4 space-y-4">
        <fieldset>
          <legend className="text-xs font-medium text-gray-600 mb-2">Contribution type</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['percentage', 'fixed'] as const).map(t => <label key={t} className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-semibold cursor-pointer ${type === t ? 'border-[var(--color-bss-interactive-blue)] bg-blue-50 text-[var(--color-bss-interactive-blue)]' : 'border-gray-300 text-gray-700'}`}>
              <input type="radio" name="vpf-type" className="sr-only" checked={type === t} onChange={() => { setType(t); setValue(0); }} />
              {t === 'percentage' ? '% of basic' : 'Fixed amount'}
            </label>)}
          </div>
        </fieldset>
        <Field label={type === 'percentage' ? 'Percentage of basic (1–100)' : 'Fixed amount per month (₹)'} hint={value > 0 ? `≈ ${money(estimate)} per month` : undefined}>
          <NumberInput inputMode="decimal" min={type === 'percentage' ? 1 : 1} max={type === 'percentage' ? 100 : undefined} step={type === 'percentage' ? 0.5 : 100} value={value || ''} onChange={setValue} />
        </Field>
        <Toggle checked={ack} onChange={setAck} label="I understand this will be processed in the next payroll cycle and deducted from my salary every month." />
        <Btn className="w-full sm:w-auto h-11" busy={busy} disabled={!ack || !(value > 0)} onClick={() => void start()}>Start VPF</Btn>
      </div>
    </Section>}

    {confirmStop && <Confirm danger busy={busy} title="Stop VPF?" message="Your VPF deduction will stop from next month's payroll. You can start it again later." onClose={() => setConfirmStop(false)} onConfirm={() => void stop()} />}
  </div>;
}
