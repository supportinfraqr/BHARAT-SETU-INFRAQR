"use client";

/**
 * VPF Requests — legacy controller/payroll/vpfManagement.js
 *
 *   GET vpf/all?status=pending|active|all   HR list of employees contributing (or asking to contribute) VPF.
 *
 * VPF is employee self-service: an employee starts / stops it from "My Payroll" (employee/vpf/start|stop)
 * and it is active immediately, effective from the next payroll month. The legacy API has no HR
 * approve / activate / stop endpoint, so this screen is a read-only register.
 */

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, DataTable, Field, Kpi, KpiGrid, Section, Select, TextInput, fmtDate, fmtDateTime, money, num, useLoad } from '../ui';

type VpfListItem = {
  employeeId: string;
  employeeName: string;
  email: string;
  employeeCode: string;
  basicSalary: number;
  status: 'pending' | 'active';
  contributionType: 'percentage' | 'fixed';
  percentage: number | null;
  fixedAmount: number | null;
  requestedAt: string | null;
  effectiveFrom: string | null;
  monthlyDeduction: number;
};

export default function Vpf({ navigate, params }: ModuleProps) {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const state = useLoad(() => pe.get<{ list: VpfListItem[] }>('vpf/all', { status }), [status]);
  const list = useMemo(() => state.data?.list ?? [], [state.data]);
  const term = search.trim().toLowerCase();
  const rows = list.filter(r => (!params.employeeId || String(r.employeeId) === params.employeeId)
    && (!term || [r.employeeName, r.email, r.employeeCode].some(v => String(v ?? '').toLowerCase().includes(term))));

  const active = list.filter(r => r.status === 'active');
  const pending = list.filter(r => r.status === 'pending');
  const monthly = active.reduce((s, r) => s + (Number(r.monthlyDeduction) || 0), 0);

  return <div className="space-y-4">
    <KpiGrid>
      <Kpi label="Active contributors" value={num(active.length, 0)} tone="text-green-700" />
      <Kpi label="Pending requests" value={num(pending.length, 0)} tone="text-orange-700" />
      <Kpi label="Monthly VPF (active)" value={money(monthly)} sub="Deducted from salary, credited to PF" />
      <Kpi label="Annual VPF (active)" value={money(monthly * 12)} />
    </KpiGrid>
    <Section title="VPF requests" subtitle="Voluntary PF is started and stopped by employees in My Payroll. It applies from the next payroll month; HR approval is not required."
      right={<Btn variant="secondary" onClick={state.reload}>Refresh</Btn>}>
      <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Status"><Select value={status} onChange={setStatus} options={[{ value: 'all', label: 'Pending + active' }, { value: 'pending', label: 'Pending' }, { value: 'active', label: 'Active' }]} /></Field>
        <Field label="Search">
          <div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400" aria-hidden />
            <TextInput value={search} onChange={setSearch} placeholder="Name, email or code" className="pl-8" aria-label="Search VPF requests" /></div>
        </Field>
      </div>
      {params.employeeId && <p className="px-5 pb-2 text-xs text-gray-500">Showing one employee. <button type="button" className="font-semibold text-[var(--color-bss-interactive-blue)] underline" onClick={() => navigate('vpf')}>Show all</button></p>}
      <Async state={state}>
        {() => <DataTable rows={rows} rowKey={r => String(r.employeeId)}
          empty={term || params.employeeId ? 'No VPF requests match' : 'No employee has opted for VPF yet'}
          columns={[
            { key: 'employeeName', label: 'Employee', render: r => <div><p className="font-semibold">{r.employeeName || '—'}</p><p className="text-[11px] text-gray-400">{r.employeeCode} · {r.email}</p></div> },
            { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
            { key: 'contribution', label: 'Contribution', render: r => r.contributionType === 'fixed' ? `${money(r.fixedAmount)} fixed` : `${num(r.percentage)}% of basic` },
            { key: 'basicSalary', label: 'Basic / month', align: 'right', render: r => money(r.basicSalary) },
            { key: 'monthlyDeduction', label: 'VPF / month', align: 'right', render: r => <b>{money(r.monthlyDeduction)}</b> },
            { key: 'requestedAt', label: 'Requested', render: r => fmtDateTime(r.requestedAt) },
            { key: 'effectiveFrom', label: 'Effective from', render: r => fmtDate(r.effectiveFrom) },
            { key: 'open', label: '', align: 'right', render: r => <Btn variant="ghost" onClick={() => navigate('employees', { employeeId: String(r.employeeId) })}>Employee</Btn> },
          ]} />}
      </Async>
    </Section>
  </div>;
}
