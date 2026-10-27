"use client";

import { useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, RefreshCw, Trash2, Upload } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { PayrollEmployee } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, Confirm, DataTable, Field, FileInput, Kpi, KpiGrid, MONTHS, PeriodPicker, Section, fmtDateTime, money, useAction, useLoad, type Column, type Notify } from '../../ui';
import { ACCEPT, Notice, RowFilter, SummaryKpis, normaliseUpload, uploadPreview, type OneTimeConfirmed, type OneTimeList, type OneTimePreview, type OneTimeRow } from './shared';
import { downloadOneTimeTemplate, type ComponentCatalog } from './templates';

const BASE = 'import/one-time-earnings-deductions';

const columns = (withStatus: boolean): Column<OneTimeRow>[] => [
  { key: 'rowNumber', label: 'Row', align: 'right' },
  ...(withStatus ? [{ key: 'status', label: 'Status', render: (r: OneTimeRow) => r.valid ? <Badge status="verified">Valid</Badge> : <Badge status="failed">Error</Badge> }] : []),
  { key: 'employee', label: 'Employee', render: r => <div><p className="font-semibold">{r.employeeName || '—'}</p><p className="text-[11px] text-gray-500">{r.employeeCode || '—'}</p></div> },
  { key: 'category', label: 'Category', render: r => <span className="capitalize">{r.category || '—'}</span> },
  { key: 'component', label: 'Component', render: r => <div><p>{r.componentName || '—'}</p><p className="text-[11px] text-gray-500">{r.componentCode || '—'}</p></div> },
  { key: 'type', label: 'Type', render: r => r.valid ? (r.isAdHoc ? <Badge status="pending">Ad-hoc line</Badge> : <Badge status="processed">Org component</Badge>) : '—' },
  { key: 'amount', label: 'Amount', align: 'right', render: r => money(r.amount) },
  { key: 'remarks', label: 'Remarks', render: r => r.remarks || '—' },
  ...(withStatus ? [{ key: 'error', label: 'Error', className: 'text-red-700 min-w-48', render: (r: OneTimeRow) => r.error || '' }] : []),
];

function totals(rows: OneTimeRow[]) {
  const sum = (cat: string) => rows.filter(r => r.valid && r.category === cat).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return { earnings: sum('earnings'), deductions: sum('deductions'), benefits: sum('benefits'), employees: new Set(rows.filter(r => r.valid).map(r => r.employeeId)).size };
}

function Totals({ rows }: { rows: OneTimeRow[] }) {
  const t = totals(rows);
  return <KpiGrid>
    <Kpi label="Employees" value={t.employees} />
    <Kpi label="Earnings" value={money(t.earnings)} tone="text-green-700" />
    <Kpi label="Deductions" value={money(t.deductions)} tone="text-red-700" />
    <Kpi label="Benefits" value={money(t.benefits)} />
  </KpiGrid>;
}

export default function OneTimeImport({ notify, employees, catalog }: { notify: Notify; employees: PayrollEmployee[]; catalog: ComponentCatalog | null }) {
  const now = new Date();
  const [period, setPeriod] = useState<{ month: string; year: number }>({ month: MONTHS[now.getMonth()], year: now.getFullYear() });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<(OneTimePreview & { failed?: string }) | null>(null);
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const { busy, run } = useAction(notify);

  const list = useLoad(() => pe.get<OneTimeList>(BASE, { month: period.month, year: period.year }), [period.month, period.year]);

  const upload = async () => {
    if (!file) { notify('Choose a CSV or Excel file first', 'error'); return; }
    const form = new FormData();
    form.append('file', normaliseUpload(file));
    form.append('month', period.month);
    form.append('year', String(period.year));
    const out = await run(() => uploadPreview<OneTimePreview>(`${BASE}/preview`, form));
    if (!out) return;
    if (!out.ok) notify(out.message, 'error'); else notify(out.message || 'Preview generated', 'success');
    setFilter(out.ok ? 'all' : 'invalid');
    setPreview(out.data ? { ...out.data, failed: out.ok ? undefined : out.message } : null);
  };

  const confirm = async () => {
    if (!preview?.importBatchId) return;
    const out = await run(() => pe.post<OneTimeConfirmed>(`${BASE}/confirm`, { importBatchId: preview.importBatchId }), 'One-time components import confirmed');
    setConfirming(false);
    if (!out) return;
    setPreview(null);
    setFile(null);
    setPeriod({ month: out.month, year: out.year });
    list.reload();
  };

  const discard = async () => {
    if (!preview?.importBatchId) { setPreview(null); setDiscarding(false); return; }
    const out = await run(() => pe.del(`${BASE}/${encodeURIComponent(preview.importBatchId ?? '')}`), 'Draft import cancelled');
    setDiscarding(false);
    if (out !== undefined) { setPreview(null); setFile(null); }
  };

  const rows = preview?.preview ?? [];
  const shown = rows.filter(r => filter === 'all' || (filter === 'valid' ? r.valid : !r.valid));
  const confirmed = list.data?.import ?? null;

  return <div className="space-y-4">
    <Section title="Upload one-time earnings & deductions" subtitle="Bonuses, incentives, recoveries and other amounts that apply to a single pay period only. Applied when payroll for that period is processed."
      right={<Btn variant="secondary" onClick={() => void run(() => downloadOneTimeTemplate(catalog, employees), 'Template downloaded')}><Download size={14} />Template</Btn>}>
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Pay period"><PeriodPicker month={period.month} year={period.year} onChange={(month, year) => setPeriod({ month, year })} /></Field>
          <div>
            <span className="block text-xs font-medium text-gray-600 mb-1">File (.csv, .xlsx)</span>
            <div className="flex flex-wrap items-center gap-2">
              <FileInput accept={ACCEPT} onFiles={f => { setFile(f[0] ?? null); setPreview(null); }} label={file ? 'Change file' : 'Choose file'} />
              {file && <span className="inline-flex items-center gap-1 text-xs text-gray-700"><FileSpreadsheet size={14} />{file.name}</span>}
            </div>
          </div>
          <Btn onClick={() => void upload()} busy={busy && !confirming && !discarding} disabled={!file}><Upload size={14} />Preview</Btn>
        </div>
        <p className="text-[11px] text-gray-500">Columns: <code>employee_code, category, component_code, component_name, amount, remarks</code>. Category is earnings, deductions or benefits. Codes not in your salary components become ad-hoc lines on the payslip.</p>
      </div>
    </Section>

    {preview && <Section title={`Preview · ${preview.fileName ?? file?.name ?? ''}`} subtitle={`${preview.month ?? period.month} ${preview.year ?? period.year}${preview.importBatchId ? ` · Batch ${preview.importBatchId}` : ''}`}
      right={<>
        <Btn variant="secondary" onClick={() => setDiscarding(true)}><Trash2 size={14} />{preview.importBatchId ? 'Cancel draft' : 'Discard'}</Btn>
        {preview.importBatchId && <Btn onClick={() => setConfirming(true)} disabled={!preview.summary?.validRows}><CheckCircle2 size={14} />Confirm {preview.summary?.validRows ?? 0} row(s)</Btn>}
      </>}>
      <div className="p-5 space-y-4">
        {preview.failed && <Notice tone="error">{preview.failed}. Fix the rows below and upload again.</Notice>}
        {preview.warning && <Notice tone="warn">{preview.warning}</Notice>}
        <SummaryKpis summary={preview.summary} />
        <Totals rows={rows} />
        <div className="flex justify-end"><RowFilter value={filter} onChange={setFilter} counts={{ all: rows.length, valid: rows.filter(r => r.valid).length, invalid: rows.filter(r => !r.valid).length }} /></div>
      </div>
      <DataTable columns={columns(true)} rows={shown} rowKey={r => String(r.rowNumber)} empty="No rows in this filter" />
    </Section>}

    <Section title={`Confirmed import · ${period.month} ${period.year}`} subtitle="The active one-time components for this period. Confirming a new upload for the same period replaces it."
      right={<><PeriodPicker month={period.month} year={period.year} onChange={(month, year) => setPeriod({ month, year })} /><Btn variant="ghost" onClick={list.reload} aria-label="Refresh"><RefreshCw size={14} /></Btn></>}>
      <Async state={list}>{() => confirmed
        ? <>
          <div className="p-5 space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
              <span>File: <b className="text-gray-900">{confirmed.fileName || '—'}</b></span>
              <span>Confirmed: <b className="text-gray-900">{fmtDateTime(confirmed.confirmedAt)}</b></span>
              <span>Batch: <code className="text-gray-900 break-all">{confirmed.importBatchId}</code></span>
            </div>
            <SummaryKpis summary={confirmed.summary} />
            <Totals rows={confirmed.rows} />
          </div>
          <DataTable columns={columns(false)} rows={confirmed.rows} rowKey={r => String(r.rowNumber)} />
        </>
        : <div className="px-5 py-10 text-center"><p className="text-sm font-semibold text-gray-600">No confirmed import for {period.month} {period.year}</p><p className="text-xs text-gray-400 mt-1">Download the template, fill one row per employee per component, then upload and confirm it above.</p></div>}
      </Async>
    </Section>

    {confirming && <Confirm title="Confirm one-time import" busy={busy} onClose={() => setConfirming(false)} onConfirm={() => void confirm()}
      message={<>Apply <b>{preview?.summary?.validRows ?? 0}</b> valid row(s) to <b>{preview?.month} {preview?.year}</b> payroll?{preview?.summary?.invalidRows ? ` ${preview.summary.invalidRows} row(s) with errors will be skipped.` : ''} Any previously confirmed import for this period will be replaced. Re-process payroll for the period if it was already processed.</>} />}
    {discarding && <Confirm title={preview?.importBatchId ? 'Cancel draft import' : 'Discard preview'} danger busy={busy} onClose={() => setDiscarding(false)} onConfirm={() => void discard()}
      message={preview?.importBatchId ? 'The draft batch will be cancelled and nothing will be applied.' : 'Clear this preview?'} />}
  </div>;
}
