"use client";

/** POST processPayroll { month, year, employeeIds?, excludeEmployeeIds? } with result report. */

import { useMemo, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import { Badge, Btn, DataTable, Kpi, Modal, TextInput, Toggle, employeeName, money, useAction, useEmployees, useLoad, type Notify } from '../../ui';
import type { PayrollRun, ProcessResult } from './types';

type Mode = 'all' | 'include' | 'exclude';

export function ProcessModal({ month, year, notify, onClose, onDone }: {
  month: string; year: number; notify: Notify; onClose: () => void; onDone: () => void;
}) {
  const employees = useEmployees('Active');
  const existing = useLoad(() => pe.get<{ total: number; data: PayrollRun[] }>('getPayrollHistory', { month, year }), [month, year]);
  const processedIds = useMemo(() => new Set((existing.data?.data ?? []).map(r => (r.employeeId && typeof r.employeeId === 'object' ? r.employeeId._id : String(r.employeeId)))), [existing.data]);
  const [mode, setMode] = useState<Mode>('all');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<ProcessResult | null>(null);
  const { busy, run } = useAction(notify);

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (employees.data ?? []).filter(e => !term || `${employeeName(e)} ${e.customId} ${e.uniqueId} ${e.department}`.toLowerCase().includes(term));
  }, [employees.data, search]);
  const active = employees.data ?? [];
  const pending = active.filter(e => !processedIds.has(e._id));
  const missingSalary = active.filter(e => !e.payrollInfo?.baseSalary);

  const toggle = (id: string) => setPicked(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const targetCount = mode === 'all' ? active.length : mode === 'include' ? picked.size : active.length - picked.size;

  const submit = async () => {
    const body: Record<string, unknown> = { month, year };
    if (mode === 'include') body.employeeIds = [...picked];
    if (mode === 'exclude') body.excludeEmployeeIds = [...picked];
    const out = await run(() => pe.post<ProcessResult>('processPayroll', body));
    if (out) {
      setResult(out);
      notify(`Payroll processed: ${out.successful} succeeded, ${out.failed} failed`, out.failed && !out.successful ? 'error' : 'success');
      onDone();
    }
  };

  if (result) {
    return <Modal title={`Payroll processing — ${month} ${year}`} onClose={onClose} width="max-w-3xl" footer={<Btn onClick={onClose}>Done</Btn>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Successful" value={result.successful} tone="text-green-700" />
          <Kpi label="Failed / skipped" value={result.failed} tone={result.failed ? 'text-red-700' : undefined} />
          <Kpi label="Excluded" value={result.excluded} />
        </div>
        {result.results.length > 0 && <div>
          <p className="text-xs font-semibold text-gray-700 mb-1">Processed</p>
          <DataTable rows={result.results} rowKey={r => String(r.employeeId)} columns={[
            { key: 'name', label: 'Employee' },
            { key: 'netPay', label: 'Net pay', align: 'right', render: r => money(r.netPay) },
            { key: 'status', label: 'Status', render: r => <Badge status={r.status === 'success' ? 'completed' : r.status}>{r.status}</Badge> },
          ]} />
        </div>}
        {result.errors.length > 0 && <div>
          <p className="text-xs font-semibold text-red-700 mb-1">Not processed</p>
          <DataTable rows={result.errors} rowKey={r => String(r.employeeId)} columns={[
            { key: 'name', label: 'Employee' },
            { key: 'error', label: 'Reason', render: r => <span className="text-red-700">{r.error}</span> },
          ]} />
          <p className="text-[11px] text-gray-500 mt-1">“Payroll already processed” rows can be recalculated from the employee’s payroll, or deleted and processed again. “No salary structure defined” needs the employee’s salary set up first.</p>
        </div>}
        {result.excludedEmployees.length > 0 && <p className="text-xs text-gray-500">Excluded: {result.excludedEmployees.map(e => e.name || e.employeeId).join(', ')}</p>}
      </div>
    </Modal>;
  }

  return <Modal title={`Process payroll — ${month} ${year}`} subtitle="Calculates salary, statutory deductions, TDS, arrears, loans, approved claims and one-time imports for active employees."
    onClose={onClose} width="max-w-3xl"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} disabled={targetCount <= 0} onClick={submit}><PlayCircle size={14} />Process {targetCount} employee{targetCount === 1 ? '' : 's'}</Btn></>}>
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Employees to process">
        {([['all', 'All active employees', `${active.length} active · ${pending.length} not yet processed`], ['include', 'Only selected', 'Pick employees below'], ['exclude', 'All except selected', 'Pick employees to skip']] as const).map(([key, label, sub]) =>
          <button key={key} type="button" role="radio" aria-checked={mode === key} onClick={() => { setMode(key); setPicked(new Set()); }}
            className={`text-left rounded-xl border px-3 py-2 ${mode === key ? 'border-[var(--color-bss-interactive-blue)] bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <p className="text-xs font-semibold text-gray-900">{label}</p><p className="text-[11px] text-gray-500">{sub}</p>
          </button>)}
      </div>
      {missingSalary.length > 0 && <p className="text-xs rounded-lg bg-orange-50 text-orange-700 px-3 py-2">{missingSalary.length} active employee(s) have no base salary and will be reported as “No salary structure defined”.</p>}
      {processedIds.size > 0 && <p className="text-xs text-gray-500">Employees already processed for this period are skipped by the engine (shown as “processed”).</p>}
      {mode !== 'all' && <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <TextInput value={search} onChange={setSearch} placeholder="Search name, code, department" aria-label="Search employees" className="max-w-xs" />
          <Btn variant="ghost" onClick={() => setPicked(new Set(list.filter(e => mode === 'exclude' || !processedIds.has(e._id)).map(e => e._id)))}>Select all shown</Btn>
          <Btn variant="ghost" onClick={() => setPicked(new Set())}>Clear</Btn>
          <span className="text-xs text-gray-500">{picked.size} selected</span>
        </div>
        <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
          {employees.loading && !employees.data && <p className="p-3 text-xs text-gray-500">Loading employees…</p>}
          {employees.error && <p className="p-3 text-xs text-red-700">{employees.error}</p>}
          {list.map(e => <div key={e._id} className="flex items-center justify-between gap-2 px-3 py-2">
            <Toggle checked={picked.has(e._id)} onChange={() => toggle(e._id)} label={`${employeeName(e)} · ${e.customId || e.uniqueId}`} />
            <span className="flex items-center gap-2 text-[11px] text-gray-500">
              {e.department}
              {!e.payrollInfo?.baseSalary && <Badge status="failed">no salary</Badge>}
              {processedIds.has(e._id) && <Badge status="processed">processed</Badge>}
            </span>
          </div>)}
          {employees.data && list.length === 0 && <p className="p-3 text-xs text-gray-500">No active employees match.</p>}
        </div>
      </div>}
    </div>
  </Modal>;
}
