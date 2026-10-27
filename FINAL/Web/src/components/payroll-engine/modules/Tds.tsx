"use client";

/**
 * TDS / Income Tax (HR). Legacy controller/payroll/tdsManagement.js:
 * tds/list, tds/bulkCalculate, tds/config, and per-employee detail
 * (tds/employee, tds/calculate, tds/hra-details, tds/declaration, tds/proof-status,
 * tds/lock, tds/record DELETE, tds/tax-report[/download]).
 */

import { useState } from 'react';
import { ArrowLeft, Calculator, Search } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, Confirm, currentFinancialYear, DataTable, EmployeePicker, employeeName, Field, FinancialYearPicker, fmtDateTime, Kpi, KpiGrid, Modal, money, Section, Select, Tabs, TextInput, useAction, useEmployees, useLoad,
} from '../ui';
import { EmployeeTdsDetail } from './Tds/EmployeeTdsDetail';
import { TdsConfigPanel } from './Tds/TdsConfigPanel';
import { recordEmployee, recordEmployeeId, type EmployeeTdsRecord } from './Tds/types';

type ListResp = { total: number; records: EmployeeTdsRecord[] };
type BulkResp = { total: number; results: Array<{ employeeId: string; status: 'success' | 'failed'; monthlyTDS?: number; error?: string }> };

export default function Tds({ notify, params }: ModuleProps) {
  const [fy, setFy] = useState(params.financialYear || currentFinancialYear());
  const [tab, setTab] = useState(params.tab || 'calculated');
  const [regime, setRegime] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(params.employeeId ? { id: params.employeeId, label: 'Employee' } : null);
  const [pick, setPick] = useState('');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulk, setBulk] = useState<BulkResp | null>(null);
  const employees = useEmployees();
  const declarations = tab === 'declarations';
  const list = useLoad(() => tab === 'config' ? Promise.resolve(null) : pe.get<ListResp>('tds/list', { financialYear: fy, taxRegime: regime, search: query, declarations: declarations ? 'true' : undefined }), [fy, regime, query, tab]);
  const { busy, run } = useAction(notify);
  const empList = employees.data ?? [];
  const labelFor = (id: string, rec?: EmployeeTdsRecord) => {
    const e = empList.find(x => x._id === id);
    if (e) return `${employeeName(e)} · ${e.customId || e.uniqueId}`;
    const p = rec ? recordEmployee(rec) : null;
    return p ? `${[p.firstName, p.lastName].filter(Boolean).join(' ')} · ${p.payrollInfo?.employeeCode || p.uniqueId || ''}` : 'Employee';
  };

  async function bulkCalc() {
    const out = await run(() => pe.post<BulkResp>('tds/bulkCalculate', { financialYear: fy }), 'Bulk TDS calculation completed');
    setConfirmBulk(false);
    if (out) { setBulk(out); list.reload(); }
  }

  const header = <div className="flex flex-wrap items-center gap-2">
    <FinancialYearPicker value={fy} onChange={v => { setFy(v); }} />
    <Btn variant="secondary" onClick={() => setConfirmBulk(true)}><Calculator size={14} />Bulk calculate</Btn>
  </div>;

  if (selected) {
    return <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Btn variant="ghost" onClick={() => { setSelected(null); list.reload(); }}><ArrowLeft size={14} />All employees</Btn>
        <FinancialYearPicker value={fy} onChange={setFy} />
      </div>
      <EmployeeTdsDetail key={`${selected.id}-${fy}`} employeeId={selected.id} employeeLabel={selected.label === 'Employee' ? labelFor(selected.id) : selected.label} financialYear={fy} notify={notify} onChanged={list.reload} />
    </div>;
  }

  const records = list.data?.records ?? [];
  const totals = records.reduce((a, r) => ({ tax: a.tax + (Number(r.taxPayable?.total) || 0), monthly: a.monthly + (Number(r.monthlyTDS) || 0), deducted: a.deducted + (Number(r.totalTDSDeducted) || 0), locked: a.locked + (r.isLocked ? 1 : 0), proofs: a.proofs + (r.proofStatus === 'submitted' ? 1 : 0) }), { tax: 0, monthly: 0, deducted: 0, locked: 0, proofs: 0 });

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'calculated', label: 'Calculated TDS' }, { key: 'declarations', label: 'Declarations & proofs' }, { key: 'config', label: 'Tax configuration' }]} />
      {header}
    </div>

    {tab === 'config' ? <TdsConfigPanel key={fy} financialYear={fy} notify={notify} /> : <>
      <KpiGrid>
        <Kpi label={declarations ? 'Declarations' : 'Employees calculated'} value={list.data?.total ?? '—'} />
        <Kpi label="Annual tax (sum)" value={money(totals.tax)} />
        <Kpi label="Monthly TDS (sum)" value={money(totals.monthly)} />
        <Kpi label={declarations ? 'Proofs awaiting review' : 'TDS deducted so far'} value={declarations ? totals.proofs : money(totals.deducted)} sub={`${totals.locked} locked`} />
      </KpiGrid>

      <Section title={declarations ? 'Employee investment declarations' : 'Employee TDS'} subtitle={declarations ? 'Everyone who has saved a declaration for this FY — open a row to edit, verify proofs or lock' : 'Rows appear after Calculate TDS (single or bulk). Open a row for the full computation.'}
        right={<div className="flex flex-wrap items-center gap-2">
          <div className="w-64"><EmployeePicker value={pick} employees={empList} placeholder="Open employee…" onChange={(id, e) => { setPick(''); if (id) setSelected({ id, label: e ? `${employeeName(e)} · ${e.customId || e.uniqueId}` : 'Employee' }); }} /></div>
        </div>}>
        <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-end gap-2">
          <Field label="Search" className="w-64"><form onSubmit={e => { e.preventDefault(); setQuery(search.trim()); }} className="flex gap-1"><TextInput value={search} onChange={setSearch} placeholder="Name, email, code" /><Btn type="submit" variant="secondary" aria-label="Search"><Search size={14} /></Btn></form></Field>
          <Field label="Regime" className="w-36"><Select value={regime} placeholder="All" options={[{ value: 'new', label: 'New' }, { value: 'old', label: 'Old' }]} onChange={setRegime} /></Field>
        </div>
        <Async state={list}>{data => <DataTable rows={data.records} rowKey={(r, i) => r._id ?? String(i)} onRowClick={r => setSelected({ id: recordEmployeeId(r), label: labelFor(recordEmployeeId(r), r) })}
          empty={declarations ? 'No declarations saved for this FY yet' : 'No TDS calculated for this FY — use Bulk calculate or open an employee'}
          columns={[
            { key: 'emp', label: 'Employee', render: r => { const p = recordEmployee(r); return <div><div className="font-semibold">{labelFor(recordEmployeeId(r), r).split(' · ')[0]}</div><div className="text-[11px] text-gray-400">{p?.email ?? ''}</div></div>; } },
            { key: 'taxRegime', label: 'Regime', render: r => r.taxRegime === 'old' ? 'Old' : 'New' },
            { key: 'income', label: 'Projected income', align: 'right', render: r => money(r.projectedAnnualIncome?.total) },
            { key: 'deductions', label: 'Deductions', align: 'right', render: r => money(r.declaredDeductions?.total) },
            { key: 'taxable', label: 'Taxable', align: 'right', render: r => money(r.taxableIncome) },
            { key: 'tax', label: 'Annual tax', align: 'right', render: r => money(r.taxPayable?.total) },
            { key: 'monthly', label: 'Monthly TDS', align: 'right', render: r => money(r.monthlyTDS) },
            { key: 'deducted', label: 'Deducted', align: 'right', render: r => money(r.totalTDSDeducted) },
            { key: 'proof', label: 'Proofs', render: r => <Badge status={r.proofStatus}>{r.proofStatus ?? 'pending'}</Badge> },
            { key: 'lock', label: 'Lock', render: r => r.isLocked ? <Badge status="locked">Locked</Badge> : <span className="text-gray-400">—</span> },
            { key: 'updatedAt', label: 'Updated', render: r => fmtDateTime(r.updatedAt) },
          ]} />}</Async>
      </Section>
    </>}

    {confirmBulk && <Confirm title="Bulk calculate TDS" busy={busy} message={<>Recalculate and save TDS for <b>every active employee</b> for FY {fy}? Each employee&apos;s saved regime and declaration are used.</>} onClose={() => setConfirmBulk(false)} onConfirm={bulkCalc} />}
    {bulk && <Modal title="Bulk TDS calculation" subtitle={`${bulk.results.filter(r => r.status === 'success').length} of ${bulk.total} succeeded`} onClose={() => setBulk(null)} footer={<Btn onClick={() => setBulk(null)}>Done</Btn>}>
      <DataTable rows={bulk.results} rowKey={r => String(r.employeeId)} columns={[
        { key: 'emp', label: 'Employee', render: r => labelFor(String(r.employeeId)) },
        { key: 'status', label: 'Status', render: r => <Badge status={r.status === 'success' ? 'completed' : 'failed'}>{r.status}</Badge> },
        { key: 'monthly', label: 'Monthly TDS', align: 'right', render: r => r.status === 'success' ? money(r.monthlyTDS) : <span className="text-red-600">{r.error}</span> },
      ]} />
    </Modal>}
  </div>;
}
