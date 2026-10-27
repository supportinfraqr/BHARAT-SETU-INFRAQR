"use client";

/**
 * Bank transfer files (legacy controller/payroll/bankFileGeneration.js):
 *   GET    bank/validate?month&year   bank-detail check of approved/paid payrolls
 *   POST   bank/generateFile          { month, year, bankFormat: NEFT | RTGS | CSV }
 *   GET    bank/history               generated files (newest first)
 *   GET    bank/download/:fileId      file stream (or JSON {content, fileName, mimeType})
 *   DELETE bank/:fileId
 */

import { useMemo, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, Confirm, DataTable, Empty, Field, FormGrid, Kpi, KpiGrid, MONTHS, PeriodPicker, Section, Select,
  fmtDateTime, money, num, useAction, useLoad, type Column,
} from '../ui';

type Issue = { employeeId: string; name: string; employeeName: string; email: string; type: string; message: string; issue: string };
type Validation = {
  total: number; valid: number; invalid: number; issues: Issue[];
  totalEmployees: number; validRecords: number; invalidRecords: number; month: string; year: number;
};
type Generated = {
  fileId: string; fileName: string; format: string; month: string; year: number;
  totalRecords: number; employeeCount: number; totalAmount: number; status: string;
};
type BankFile = {
  fileId: string; fileName: string; createdAt: string; size: number; month: string; year: number | string;
  format: string; totalAmount: number; employeeCount: number; status: string;
};

const FORMATS = [
  { value: 'NEFT', label: 'NEFT (text file)', hint: 'Standard NEFT salary file. Employees without account number / IFSC or with zero net pay are skipped.' },
  { value: 'RTGS', label: 'RTGS (text file)', hint: 'Only net pay of ₹2,00,000 or more is included (RTGS minimum).' },
  { value: 'CSV', label: 'CSV (bank upload sheet)', hint: 'Name, employee code, account, IFSC, net pay and email for every approved / paid payroll.' },
];

function bytes(n: number): string {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${num(n / 1024, 1)} KB`;
  return `${num(n / 1024 / 1024, 1)} MB`;
}

export default function BankFiles({ notify, navigate, params }: ModuleProps) {
  const now = new Date();
  const [period, setPeriod] = useState(() => ({
    month: params.month && (MONTHS as readonly string[]).includes(params.month) ? params.month : (MONTHS[now.getMonth()] as string),
    year: Number(params.year) || now.getFullYear(),
  }));
  const [bankFormat, setBankFormat] = useState('NEFT');
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [toDelete, setToDelete] = useState<BankFile | null>(null);
  const [formatFilter, setFormatFilter] = useState('');
  const { busy, run } = useAction(notify);

  const validation = useLoad(() => pe.get<Validation>('bank/validate', period), [period.month, period.year]);
  const history = useLoad(() => pe.get<BankFile[]>('bank/history'), []);

  const download = (fileId: string, fileName?: string) =>
    run(() => pe.download(`bank/download/${fileId}`, undefined, fileName || 'bank-file.txt'));

  const generate = async () => {
    const out = await run(() => pe.post<Generated>('bank/generateFile', { month: period.month, year: period.year, bankFormat }), 'Bank file generated');
    if (out) { setGenerated(out); history.reload(); }
  };

  const remove = async () => {
    if (!toDelete) return;
    const ok = await run(async () => { await pe.del(`bank/${toDelete.fileId}`); return true; }, 'Bank file deleted');
    if (ok) {
      if (generated?.fileId === toDelete.fileId) setGenerated(null);
      setToDelete(null);
      history.reload();
    }
  };

  const v = validation.data;
  const fmt = FORMATS.find(f => f.value === bankFormat);

  const issueCols: Column<Issue>[] = [
    { key: 'name', label: 'Employee', render: r => <span className="font-semibold">{r.employeeName || r.name}</span> },
    { key: 'email', label: 'Email', render: r => r.email || '—' },
    { key: 'type', label: 'Type', render: r => <Badge status="failed">{r.type === 'bank_details' ? 'Bank details' : r.type}</Badge> },
    { key: 'issue', label: 'Issue', render: r => r.issue || r.message },
    { key: 'fix', label: '', align: 'right', render: r => <Btn variant="ghost" onClick={() => navigate('employees', { employeeId: String(r.employeeId) })}>Fix bank details</Btn> },
  ];

  const files = useMemo(() => (history.data ?? []).filter(f => !formatFilter || f.format === formatFilter), [history.data, formatFilter]);
  const formatsInHistory = useMemo(() => Array.from(new Set((history.data ?? []).map(f => f.format))), [history.data]);

  const fileCols: Column<BankFile>[] = [
    { key: 'fileName', label: 'File', render: r => <span className="font-semibold break-all">{r.fileName}</span> },
    { key: 'format', label: 'Format', render: r => <Badge status="processed">{r.format}</Badge> },
    { key: 'period', label: 'Period', render: r => r.month ? `${r.month} ${r.year}` : '—' },
    { key: 'employeeCount', label: 'Employees', align: 'right', render: r => num(r.employeeCount, 0) },
    { key: 'totalAmount', label: 'Total net pay', align: 'right', className: 'tabular-nums whitespace-nowrap', render: r => money(r.totalAmount) },
    { key: 'size', label: 'Size', align: 'right', render: r => bytes(r.size) },
    { key: 'createdAt', label: 'Generated', render: r => <span className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</span> },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status === 'generated' ? 'completed' : r.status}>{r.status}</Badge> },
    {
      key: 'actions', label: 'Actions', align: 'right', render: r => <div className="flex justify-end gap-1">
        <Btn variant="ghost" aria-label={`Download ${r.fileName}`} disabled={busy} onClick={() => void download(r.fileId, r.fileName)}><Download size={14} />Download</Btn>
        <Btn variant="ghost" aria-label={`Delete ${r.fileName}`} className="!text-red-600 hover:!bg-red-50" onClick={() => setToDelete(r)}><Trash2 size={14} /></Btn>
      </div>,
    },
  ];

  return <div className="space-y-4">
    <Section title="Generate bank transfer file" subtitle="Builds a salary payment file from approved and paid payrolls of the selected month">
      <div className="p-4 space-y-4">
        <FormGrid cols={3}>
          <Field label="Pay period"><PeriodPicker month={period.month} year={period.year} onChange={(month, year) => { setPeriod({ month, year }); setGenerated(null); }} /></Field>
          <Field label="File format" hint={fmt?.hint}>
            <Select value={bankFormat} onChange={setBankFormat} options={FORMATS.map(f => ({ value: f.value, label: f.label }))} />
          </Field>
          <div className="flex items-end gap-2">
            <Btn variant="secondary" onClick={validation.reload} busy={validation.loading}><ShieldCheck size={14} />Re-validate</Btn>
            <Btn onClick={() => void generate()} busy={busy} disabled={!!v && v.total === 0}><FileSpreadsheet size={14} />Generate file</Btn>
          </div>
        </FormGrid>

        <Async state={validation}>{() => !v ? null : v.total === 0
          ? <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">No approved or paid payroll for {v.month} {v.year}. Approve the pay run in Pay Runs before generating a bank file.</div>
          : <div className="space-y-3">
            <KpiGrid>
              <Kpi label="Approved / paid payrolls" value={v.totalEmployees ?? v.total} sub={`${v.month} ${v.year}`} />
              <Kpi label="Valid bank details" value={v.validRecords ?? v.valid} tone="text-green-700" />
              <Kpi label="Missing / invalid" value={v.invalidRecords ?? v.invalid} tone={(v.invalidRecords ?? v.invalid) ? 'text-red-700' : 'text-gray-950'} />
              <Kpi label="Readiness" value={`${v.total ? Math.round(((v.validRecords ?? v.valid) / v.total) * 100) : 0}%`} />
            </KpiGrid>
            {v.issues.length === 0
              ? <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 size={16} />All employees have bank account and IFSC details.</p>
              : <div className="rounded-xl border border-red-200 overflow-hidden">
                <p className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 flex items-center gap-2"><TriangleAlert size={14} />{v.issues.length} employee(s) will be skipped in NEFT / RTGS files until their bank details are fixed</p>
                <DataTable columns={issueCols} rows={v.issues} rowKey={(r, i) => `${r.employeeId}-${i}`} />
              </div>}
          </div>}</Async>

        {generated && <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-green-900">
            <p className="font-semibold break-all">{generated.fileName}</p>
            <p className="text-xs mt-0.5">{generated.format} · {generated.month} {generated.year} · {generated.employeeCount ?? generated.totalRecords} payroll record(s) · {money(generated.totalAmount)} · <Badge status="completed">{generated.status}</Badge></p>
          </div>
          <Btn onClick={() => void download(generated.fileId, generated.fileName)} busy={busy}><Download size={14} />Download</Btn>
        </div>}
      </div>
    </Section>

    <Section title="Generated files" subtitle="Every bank file generated for this organization"
      right={<>
        <label className="sr-only" htmlFor="bank-format-filter">Filter by format</label>
        <Select id="bank-format-filter" className="w-36" value={formatFilter} onChange={setFormatFilter} placeholder="All formats" options={formatsInHistory} />
        <Btn variant="secondary" onClick={history.reload} busy={history.loading}>Refresh</Btn>
      </>}>
      <Async state={history} empty={<Empty title="No bank files yet" text="Pick a period with approved payroll above and generate a file." />}>
        {() => <DataTable columns={fileCols} rows={files} rowKey={r => String(r.fileId)} empty="No files match this format" />}
      </Async>
    </Section>

    {toDelete && <Confirm danger busy={busy} title="Delete bank file?" onClose={() => setToDelete(null)} onConfirm={() => void remove()}
      message={<>Delete <b className="break-all">{toDelete.fileName}</b> ({toDelete.format}, {toDelete.month} {toDelete.year})? The file can be regenerated later from the same payroll.</>} />}
  </div>;
}
