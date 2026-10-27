"use client";

/**
 * Payroll audit trail (legacy controller/payroll/auditLog.js):
 *   GET audit/logs?action&entityType&employeeId&startDate&endDate&page&limit
 *       -> { total, page, limit, totalPages, data: AuditEntry[] }
 *   GET audit/log/:logId                 -> AuditEntry (with before/after data)
 *   GET audit/employee/:employeeId       -> AuditEntry[] (latest 100)
 */

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, DataTable, Empty, EmployeePicker, Field, FormGrid, JsonView, Modal, Row, Section, Select, Tabs, TextInput,
  employeeName, fmtDateTime, money, useEmployees, useLoad, type Column, type Notify,
} from '../ui';
import { exportWorkbook, sheet, type Spec } from './Reports/table';

type Person = string | { _id?: string; firstName?: string; lastName?: string; email?: string } | null | undefined;
type AuditEntry = {
  _id: string; organizationId?: string; action: string; entityType: string; entityId: string;
  performedBy: Person; performedByName?: string; affectedEmployee?: Person; affectedEmployeeName?: string;
  beforeData?: unknown; afterData?: unknown;
  payrollDetails?: { month?: string; year?: number; grossEarnings?: number; totalDeductions?: number; netPay?: number } | null;
  ipAddress?: string; userAgent?: string; remarks?: string; createdAt: string; updatedAt?: string;
};
type LogPage = { total: number; page: number; limit: number; totalPages: number; data: AuditEntry[] };

const ACTIONS = [
  'payroll_processed', 'payroll_approved', 'payroll_rejected', 'payroll_paid', 'payroll_deleted',
  'salary_component_updated', 'compliance_updated', 'tds_calculated', 'claim_approved', 'claim_rejected',
  'settlement_initiated', 'settlement_approved', 'settlement_paid', 'salary_revision_created', 'salary_revision_deleted',
];
const ENTITY_TYPES = ['payroll', 'salary_component', 'compliance', 'tds', 'claim', 'settlement', 'salary_revision'];

const humanize = (s: string) => s ? s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : '—';

function personName(p: Person, fallback?: string): string {
  if (fallback) return fallback;
  if (!p) return '—';
  if (typeof p === 'string') return p;
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || p._id || '—';
}
const personEmail = (p: Person) => (p && typeof p === 'object' ? p.email : '') || '';
const personId = (p: Person) => (p && typeof p === 'object' ? p._id : p) || '';

function actionTone(action: string): string {
  if (/rejected|deleted/.test(action)) return 'rejected';
  if (/paid|approved/.test(action)) return 'approved';
  if (/processed|calculated|created|initiated/.test(action)) return 'processed';
  return 'pending';
}

function payrollSummary(d: AuditEntry['payrollDetails']): string {
  if (!d || (!d.month && !d.netPay)) return '—';
  return `${d.month ?? ''} ${d.year ?? ''} · Net ${money(d.netPay)}`.trim();
}

const exportSpecs: Spec<AuditEntry>[] = [
  { label: 'When', value: r => r.createdAt, kind: 'datetime' },
  { label: 'Action', value: r => humanize(r.action) },
  { label: 'Entity type', value: r => humanize(r.entityType) },
  { label: 'Entity id', value: r => r.entityId },
  { label: 'Performed by', value: r => personName(r.performedBy, r.performedByName) },
  { label: 'Performed by email', value: r => personEmail(r.performedBy) },
  { label: 'Employee', value: r => r.affectedEmployee || r.affectedEmployeeName ? personName(r.affectedEmployee, r.affectedEmployeeName) : '' },
  { label: 'Payroll month', value: r => r.payrollDetails?.month },
  { label: 'Payroll year', value: r => r.payrollDetails?.year },
  { label: 'Gross', value: r => r.payrollDetails?.grossEarnings, kind: 'money' },
  { label: 'Deductions', value: r => r.payrollDetails?.totalDeductions, kind: 'money' },
  { label: 'Net pay', value: r => r.payrollDetails?.netPay, kind: 'money' },
  { label: 'Remarks', value: r => r.remarks },
  { label: 'IP address', value: r => r.ipAddress },
  { label: 'Before', value: r => r.beforeData === undefined ? '' : JSON.stringify(r.beforeData) },
  { label: 'After', value: r => r.afterData === undefined ? '' : JSON.stringify(r.afterData) },
];

function logColumns(showEmployee: boolean): Column<AuditEntry>[] {
  const cols: Column<AuditEntry>[] = [
    { key: 'createdAt', label: 'When', render: r => <span className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</span> },
    { key: 'action', label: 'Action', render: r => <Badge status={actionTone(r.action)}>{humanize(r.action)}</Badge> },
    { key: 'entityType', label: 'Entity', render: r => humanize(r.entityType) },
    { key: 'performedBy', label: 'Performed by', render: r => <div><p className="font-semibold">{personName(r.performedBy, r.performedByName)}</p>{personEmail(r.performedBy) && <p className="text-[11px] text-gray-500">{personEmail(r.performedBy)}</p>}</div> },
  ];
  if (showEmployee) cols.push({ key: 'employee', label: 'Employee', render: r => r.affectedEmployee || r.affectedEmployeeName ? personName(r.affectedEmployee, r.affectedEmployeeName) : '—' });
  cols.push(
    { key: 'payroll', label: 'Payroll', render: r => <span className="whitespace-nowrap">{payrollSummary(r.payrollDetails)}</span> },
    { key: 'remarks', label: 'Remarks', render: r => <span className="line-clamp-2 max-w-xs">{r.remarks || '—'}</span> },
  );
  return cols;
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

function flatten(value: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (prefix) {
    out[prefix] = value === undefined ? '' : JSON.stringify(value);
  }
  return out;
}

function ChangeTable({ before, after }: { before: unknown; after: unknown }) {
  const rows = useMemo(() => {
    const b = flatten(before), a = flatten(after);
    return Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).filter(k => b[k] !== a[k]).map(k => ({ field: k, before: b[k], after: a[k] }));
  }, [before, after]);
  if (!rows.length) return <p className="text-xs text-gray-500">No field-level differences between before and after.</p>;
  return <div className="rounded-xl border border-gray-200 overflow-hidden">
    <DataTable rows={rows} rowKey={r => r.field} columns={[
      { key: 'field', label: 'Field', render: r => <code className="text-[11px]">{r.field}</code> },
      { key: 'before', label: 'Before', render: r => <span className="text-red-700 break-all">{r.before ?? '—'}</span> },
      { key: 'after', label: 'After', render: r => <span className="text-green-700 break-all">{r.after ?? '—'}</span> },
    ]} />
  </div>;
}

function LogDetail({ logId, onClose, onEmployee }: { logId: string; onClose: () => void; onEmployee: (id: string) => void }) {
  const state = useLoad(() => pe.get<AuditEntry>(`audit/log/${logId}`), [logId]);
  return <Modal title="Audit entry" subtitle={logId} onClose={onClose} width="max-w-4xl" footer={<Btn variant="secondary" onClick={onClose}>Close</Btn>}>
    <Async state={state}>{l => {
      const hasBefore = l.beforeData !== undefined && l.beforeData !== null;
      const hasAfter = l.afterData !== undefined && l.afterData !== null;
      const empId = personId(l.affectedEmployee);
      return <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Row label="When" value={fmtDateTime(l.createdAt)} />
          <Row label="Action" value={<Badge status={actionTone(l.action)}>{humanize(l.action)}</Badge>} />
          <Row label="Entity type" value={humanize(l.entityType)} />
          <Row label="Entity id" value={<span className="break-all">{l.entityId || '—'}</span>} />
          <Row label="Performed by" value={`${personName(l.performedBy, l.performedByName)}${personEmail(l.performedBy) ? ` (${personEmail(l.performedBy)})` : ''}`} />
          <Row label="Affected employee" value={empId || l.affectedEmployeeName
            ? <button type="button" className="underline text-[var(--color-bss-interactive-blue)]" disabled={!empId} onClick={() => empId && onEmployee(empId)}>{personName(l.affectedEmployee, l.affectedEmployeeName)}{personEmail(l.affectedEmployee) ? ` (${personEmail(l.affectedEmployee)})` : ''}</button>
            : '—'} />
          {l.payrollDetails && <>
            <Row label="Payroll period" value={`${l.payrollDetails.month ?? '—'} ${l.payrollDetails.year ?? ''}`} />
            <Row label="Gross earnings" value={money(l.payrollDetails.grossEarnings)} />
            <Row label="Total deductions" value={money(l.payrollDetails.totalDeductions)} />
            <Row label="Net pay" value={money(l.payrollDetails.netPay)} />
          </>}
          <Row label="IP address" value={l.ipAddress || '—'} />
          <Row label="Last updated" value={fmtDateTime(l.updatedAt)} />
        </div>
        {l.userAgent && <Row label="User agent" value={<span className="break-all font-normal">{l.userAgent}</span>} />}
        {l.remarks && <div className="rounded-lg border border-gray-100 px-3 py-2"><p className="text-xs text-gray-500">Remarks</p><p className="text-sm text-gray-800 whitespace-pre-wrap">{l.remarks}</p></div>}
        {(hasBefore || hasAfter) && <>
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Changes</p>
            <ChangeTable before={l.beforeData} after={l.afterData} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><p className="text-xs font-semibold text-gray-700 mb-1">Before</p>{hasBefore ? <JsonView value={l.beforeData} /> : <p className="text-xs text-gray-400">No previous state recorded</p>}</div>
            <div><p className="text-xs font-semibold text-gray-700 mb-1">After</p>{hasAfter ? <JsonView value={l.afterData} /> : <p className="text-xs text-gray-400">No new state recorded</p>}</div>
          </div>
        </>}
      </div>;
    }}</Async>
  </Modal>;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

type Filters = { action: string; entityType: string; employeeId: string; startDate: string; endDate: string; limit: number };
const EMPTY_FILTERS: Filters = { action: '', entityType: '', employeeId: '', startDate: '', endDate: '', limit: 50 };

function useXlsx(notify: Notify) {
  const [busy, setBusy] = useState(false);
  const run = async (name: string, rows: AuditEntry[]) => {
    setBusy(true);
    try { await exportWorkbook(name, [sheet('Audit log', exportSpecs, rows)]); notify('Excel downloaded', 'success'); }
    catch (e) { notify(e instanceof Error ? e.message : 'Export failed', 'error'); }
    finally { setBusy(false); }
  };
  return { busy, run };
}

function AllLogs({ notify, onOpen }: { notify: Notify; onOpen: (id: string) => void }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const employees = useEmployees();
  const set = (patch: Partial<Filters>) => { setFilters(f => ({ ...f, ...patch })); setPage(1); };
  const state = useLoad(() => pe.get<LogPage>('audit/logs', {
    action: filters.action, entityType: filters.entityType, employeeId: filters.employeeId,
    startDate: filters.startDate, endDate: filters.endDate ? `${filters.endDate}T23:59:59.999` : '',
    page, limit: filters.limit,
  }), [filters, page]);
  const ex = useXlsx(notify);
  const d = state.data;
  const active = Object.entries(filters).some(([k, v]) => k !== 'limit' && v);
  const totalPages = Math.max(1, d?.totalPages || 1);

  return <Section title="Payroll audit log" subtitle="Every payroll action — processing, approvals, payments, deletions, revisions, claims and settlements"
    right={<Btn variant="secondary" busy={ex.busy} disabled={!d?.data.length} onClick={() => void ex.run(`Payroll_Audit_Log_page${page}`, d?.data ?? [])}><Download size={14} />Export page</Btn>}>
    <div className="p-4 border-b border-gray-100">
      <FormGrid cols={3}>
        <Field label="Action"><Select value={filters.action} onChange={v => set({ action: v })} placeholder="All actions" options={ACTIONS.map(a => ({ value: a, label: humanize(a) }))} /></Field>
        <Field label="Entity type"><Select value={filters.entityType} onChange={v => set({ entityType: v })} placeholder="All entities" options={ENTITY_TYPES.map(a => ({ value: a, label: humanize(a) }))} /></Field>
        <Field label="Employee"><EmployeePicker value={filters.employeeId} onChange={id => set({ employeeId: id })} employees={employees.data ?? []} placeholder="All employees" /></Field>
        <Field label="From date"><TextInput type="date" value={filters.startDate} max={filters.endDate || undefined} onChange={v => set({ startDate: v })} /></Field>
        <Field label="To date"><TextInput type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={v => set({ endDate: v })} /></Field>
        <Field label="Rows per page"><Select value={String(filters.limit)} onChange={v => set({ limit: Number(v) })} options={['20', '50', '100', '200']} /></Field>
      </FormGrid>
      {active && <div className="mt-3"><Btn variant="ghost" onClick={() => { setFilters(f => ({ ...EMPTY_FILTERS, limit: f.limit })); setPage(1); }}>Clear filters</Btn></div>}
    </div>
    <Async state={state}>{() => !d?.data.length
      ? <Empty title={active ? 'No audit entries match these filters' : 'No audit entries yet'} text={active ? 'Widen the date range or clear filters.' : 'Entries appear as payroll is processed, approved and paid.'} />
      : <>
        <DataTable columns={logColumns(true)} rows={d.data} rowKey={r => String(r._id)} onRowClick={r => onOpen(String(r._id))} />
        <nav aria-label="Audit log pages" className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
          <span>Showing {(d.page - 1) * d.limit + 1}–{(d.page - 1) * d.limit + d.data.length} of {d.total}</span>
          <div className="flex items-center gap-2">
            <Btn variant="secondary" aria-label="Previous page" disabled={page <= 1 || state.loading} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></Btn>
            <span>Page {d.page} of {totalPages}</span>
            <Btn variant="secondary" aria-label="Next page" disabled={page >= totalPages || state.loading} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></Btn>
          </div>
        </nav>
      </>}</Async>
  </Section>;
}

function EmployeeHistory({ notify, employeeId, setEmployeeId, onOpen }: { notify: Notify; employeeId: string; setEmployeeId: (id: string) => void; onOpen: (id: string) => void }) {
  const employees = useEmployees();
  const state = useLoad(() => employeeId ? pe.get<AuditEntry[]>(`audit/employee/${employeeId}`) : Promise.resolve(null), [employeeId]);
  const ex = useXlsx(notify);
  const emp = (employees.data ?? []).find(e => e._id === employeeId);
  return <Section title="Employee audit history" subtitle="Latest 100 payroll actions affecting one employee"
    right={<>
      <label className="block w-64"><span className="sr-only">Employee</span><EmployeePicker value={employeeId} onChange={id => setEmployeeId(id)} employees={employees.data ?? []} /></label>
      <Btn variant="secondary" busy={ex.busy} disabled={!state.data?.length} onClick={() => void ex.run(`Audit_${emp?.customId || emp?.uniqueId || employeeId}`, state.data ?? [])}><Download size={14} />Export</Btn>
    </>}>
    {!employeeId ? <Empty title="Select an employee" text="Pick an employee to see every payroll action recorded against them." />
      : <Async state={state} empty={<Empty title={`No audit entries for ${emp ? employeeName(emp) : 'this employee'}`} text="Entries appear once their payroll is processed or changed." />}>
        {rows => <DataTable columns={logColumns(false)} rows={rows} rowKey={r => String(r._id)} onRowClick={r => onOpen(String(r._id))} />}
      </Async>}
  </Section>;
}

export default function AuditLog({ notify, params }: ModuleProps) {
  const [tab, setTab] = useState(params.employeeId ? 'employee' : 'all');
  const [employeeId, setEmployeeId] = useState(params.employeeId ?? '');
  const [openId, setOpenId] = useState(params.logId ?? '');
  return <div className="space-y-4">
    <div className="bg-white border border-gray-200 rounded-2xl px-3 pt-2">
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'all', label: 'All activity' }, { key: 'employee', label: 'By employee' }]} />
    </div>
    {tab === 'all' ? <AllLogs notify={notify} onOpen={setOpenId} /> : <EmployeeHistory notify={notify} employeeId={employeeId} setEmployeeId={setEmployeeId} onOpen={setOpenId} />}
    {openId && <LogDetail logId={openId} onClose={() => setOpenId('')} onEmployee={id => { setEmployeeId(id); setTab('employee'); setOpenId(''); }} />}
  </div>;
}
