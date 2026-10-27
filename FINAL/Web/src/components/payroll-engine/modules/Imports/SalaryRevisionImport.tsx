"use client";

import { useState } from 'react';
import { CheckCircle2, Download, ExternalLink, FileSpreadsheet, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { PayrollEmployee } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, Confirm, DataTable, Field, FileInput, Modal, Row, Section, TextInput, Toggle, fmtDate, fmtDateTime, money, num, useAction, useLoad, type Column, type Notify } from '../../ui';
import { ACCEPT, Notice, RowFilter, SummaryKpis, normaliseUpload, uploadPreview, type RevisionConfirmed, type RevisionList, type RevisionPreview, type RevisionRow, type SalaryPoint, type StoredOverride } from './shared';
import { downloadRevisionTemplate, revisionComponentColumns, type ComponentCatalog } from './templates';

const BASE = 'import/salary-revision';

const FLAG_LABELS: Record<string, string> = { epfApplicable: 'EPF', pfOnActuals: 'PF on actuals', esiApplicable: 'ESI', lwfApplicable: 'LWF', ptApplicable: 'Professional tax' };

function Change({ from, to }: { from: number | undefined; to: number | undefined }) {
  return <div className="whitespace-nowrap"><span className="text-gray-400 line-through mr-1">{money(from)}</span><span className="font-semibold">{money(to)}</span></div>;
}

function Increment({ amount, pct }: { amount: number; pct: number }) {
  const tone = amount > 0 ? 'text-green-700' : amount < 0 ? 'text-red-700' : 'text-gray-600';
  return <span className={`whitespace-nowrap font-semibold ${tone}`}>{amount > 0 ? '+' : ''}{money(amount)} <span className="text-[11px]">({num(pct)}%)</span></span>;
}

function revisionColumns(onOpen: (r: RevisionRow) => void, withStatus: boolean): Column<RevisionRow>[] {
  return [
    { key: 'rowNumber', label: 'Row', align: 'right' },
    ...(withStatus ? [{ key: 'valid', label: 'Status', render: (r: RevisionRow) => r.valid ? <Badge status="verified">Valid</Badge> : <Badge status="failed">Error</Badge> }] : []),
    { key: 'employee', label: 'Employee', render: r => <div><p className="font-semibold">{r.employeeName || '—'}</p><p className="text-[11px] text-gray-500">{r.employeeCode || '—'}</p></div> },
    { key: 'type', label: 'Type', render: r => r.revisionTypeLabel || r.revisionType || '—' },
    { key: 'effective', label: 'Effective', render: r => fmtDate(r.effectiveFrom) },
    { key: 'ctc', label: 'CTC', render: r => r.valid ? <Change from={r.oldSalary?.ctc} to={r.newSalary?.ctc} /> : money(r.ctcInput) },
    { key: 'gross', label: 'Gross', render: r => r.valid ? <Change from={r.oldSalary?.grossSalary} to={r.newSalary?.grossSalary} /> : money(r.grossSalary) },
    { key: 'basic', label: 'Basic', render: r => r.valid ? <Change from={r.oldSalary?.basicSalary} to={r.newSalary?.basicSalary} /> : '—' },
    { key: 'inc', label: 'Increment', render: r => r.valid ? <Increment amount={r.incrementAmount} pct={r.incrementPercentage} /> : '—' },
    { key: 'arrears', label: 'Arrears', align: 'right', render: r => r.arrearsApplicable ? <div><p>{money(r.arrearsAmount)}</p><p className="text-[11px] text-gray-500">from {fmtDate(r.arrearsFromDate)}</p></div> : '—' },
    { key: 'planned', label: withStatus ? 'On confirm' : 'Result', render: r => <Badge status={r.appliedStatus || r.plannedStatus}>{r.appliedStatus || r.plannedStatus || '—'}</Badge> },
    { key: 'notes', label: 'Notes', className: 'min-w-48', render: r => <div className="space-y-0.5">
      {r.error && <p className="text-red-700">{r.error}</p>}
      {(r.warnings ?? []).map((w, i) => <p key={i} className="text-orange-700">{w}</p>)}
      {!r.error && !(r.warnings ?? []).length && <span className="text-gray-400">—</span>}
    </div> },
    { key: 'open', label: '', render: r => <Btn variant="ghost" onClick={e => { e.stopPropagation(); onOpen(r); }} aria-label={`Details for row ${r.rowNumber}`}>Details</Btn> },
  ];
}

function OverrideTable({ title, rows }: { title: string; rows: Array<StoredOverride | { category: string; code: string; name: string; amount?: number | null; overrideAmount?: number | null; disabled?: boolean }> | undefined }) {
  if (!rows?.length) return null;
  return <div>
    <p className="text-xs font-semibold text-gray-700 mb-1">{title}</p>
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <DataTable rows={rows} rowKey={(r, i) => `${r.category}-${r.code}-${i}`} columns={[
        { key: 'category', label: 'Category', render: r => <span className="capitalize">{r.category}</span> },
        { key: 'name', label: 'Component', render: r => <div><p>{r.name}</p><p className="text-[11px] text-gray-500">{r.code}</p></div> },
        { key: 'amt', label: 'Amount', align: 'right', render: r => { const v = 'overrideAmount' in r ? r.overrideAmount : (r as { amount?: number | null }).amount; return v === null || v === undefined ? 'Org default' : money(v); } },
        { key: 'disabled', label: 'Disabled', render: r => r.disabled ? 'Yes' : '—' },
      ]} />
    </div>
  </div>;
}

function SalaryColumn({ title, s }: { title: string; s: SalaryPoint | undefined }) {
  return <div className="space-y-1.5">
    <p className="text-xs font-semibold text-gray-700">{title}</p>
    <Row label="CTC" value={money(s?.ctc)} />
    <Row label="Gross salary" value={money(s?.grossSalary)} />
    <Row label="Basic salary" value={money(s?.basicSalary)} />
    {(s?.components ?? []).map((c, i) => <Row key={i} label={c.componentName || c.name || 'Component'} value={money(c.amount)} />)}
  </div>;
}

function RevisionDetail({ row, onClose }: { row: RevisionRow; onClose: () => void }) {
  const flags = Object.entries(row.statutoryFlags ?? {});
  return <Modal title={`Row ${row.rowNumber} · ${row.employeeName || row.employeeCode || 'Unknown employee'}`} subtitle={`${row.revisionTypeLabel || row.revisionType || '—'} · effective ${fmtDate(row.effectiveFrom)}`} onClose={onClose} width="max-w-3xl">
    <div className="space-y-4">
      {row.error && <Notice tone="error">{row.error}</Notice>}
      {(row.warnings ?? []).length > 0 && <Notice tone="warn"><ul className="list-disc pl-4">{row.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></Notice>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SalaryColumn title="Current salary" s={row.oldSalary} />
        <SalaryColumn title="New salary" s={row.newSalary} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Row label="Employee code" value={row.employeeCode || '—'} />
        <Row label="Increment" value={<Increment amount={row.incrementAmount ?? 0} pct={row.incrementPercentage ?? 0} />} />
        <Row label="Gross salary (file)" value={money(row.grossSalary)} />
        <Row label="Basic salary (file)" value={row.excelBasicSalary ? money(row.excelBasicSalary) : 'Derived'} />
        <Row label="CTC (file)" value={row.ctcInput === null || row.ctcInput === undefined ? 'Computed' : money(row.ctcInput)} />
        <Row label="State (PT / LWF)" value={row.state || '—'} />
        <Row label="Tax regime" value={row.taxRegime || 'Unchanged'} />
        <Row label="Payment frequency" value={row.paymentFrequency || 'Unchanged'} />
        <Row label="Arrears" value={row.arrearsApplicable ? `${money(row.arrearsAmount)} from ${fmtDate(row.arrearsFromDate)}` : 'Not applicable'} />
        <Row label="Auto approve / implement" value={`${row.autoApprove ? 'Yes' : 'No'} / ${row.autoImplement ? 'Yes' : 'No'}`} />
        <Row label={row.appliedStatus ? 'Applied status' : 'Status on confirm'} value={<Badge status={row.appliedStatus || row.plannedStatus}>{row.appliedStatus || row.plannedStatus || '—'}</Badge>} />
        {row.revisionId && <Row label="Revision ID" value={<code className="break-all">{row.revisionId}</code>} />}
        {row.remarks && <Row label="Remarks" value={row.remarks} />}
      </div>
      {flags.length > 0 && <div>
        <p className="text-xs font-semibold text-gray-700 mb-1">Statutory switches from file</p>
        <div className="flex flex-wrap gap-2">{flags.map(([k, v]) => <Badge key={k} status={v ? 'active' : 'inactive'}>{FLAG_LABELS[k] ?? k}: {v ? 'On' : 'Off'}</Badge>)}</div>
      </div>}
      <OverrideTable title="Component amounts from file" rows={row.excelComponentOverrides} />
      <OverrideTable title="New component overrides (stored on revision)" rows={row.newSalary?.componentOverrides} />
      <OverrideTable title="Components defaulted (column missing)" rows={row.defaultComponents ?? row.newSalary?.defaultComponents} />
      <OverrideTable title="Employee's current overrides" rows={row.employeeComponentOverrides ?? row.oldSalary?.componentOverrides} />
    </div>
  </Modal>;
}

export default function SalaryRevisionImport({ notify, navigate, employees, catalog }: { notify: Notify; navigate: (module: string, params?: Record<string, string>) => void; employees: PayrollEmployee[]; catalog: ComponentCatalog | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [prefill, setPrefill] = useState(true);
  const [preview, setPreview] = useState<(RevisionPreview & { failed?: string }) | null>(null);
  const [result, setResult] = useState<RevisionConfirmed | null>(null);
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [detail, setDetail] = useState<RevisionRow | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [batchId, setBatchId] = useState('');
  const { busy, run } = useAction(notify);

  const list = useLoad(() => pe.get<RevisionList>(BASE, { importBatchId: batchId || undefined }), [batchId]);

  const upload = async () => {
    if (!file) { notify('Choose a CSV or Excel file first', 'error'); return; }
    const form = new FormData();
    form.append('file', normaliseUpload(file));
    const out = await run(() => uploadPreview<RevisionPreview>(`${BASE}/preview`, form));
    if (!out) return;
    if (!out.ok) notify(out.message, 'error'); else notify(out.message || 'Preview generated', 'success');
    setResult(null);
    setFilter(out.data && out.data.summary?.validRows === 0 ? 'invalid' : 'all');
    setPreview(out.data ? { ...out.data, failed: out.ok ? undefined : out.message } : null);
  };

  const confirm = async () => {
    if (!preview?.importBatchId) return;
    const out = await run(() => pe.post<RevisionConfirmed>(`${BASE}/confirm`, { importBatchId: preview.importBatchId }), 'Salary revision import confirmed');
    setConfirming(false);
    if (!out) return;
    setResult(out);
    setPreview(null);
    setFile(null);
    setBatchInput(out.importBatchId);
    setBatchId(out.importBatchId);
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
  const planned = rows.filter(r => r.valid).reduce<Record<string, number>>((acc, r) => { acc[r.plannedStatus] = (acc[r.plannedStatus] ?? 0) + 1; return acc; }, {});
  const componentCols = revisionComponentColumns(catalog);
  const confirmed = list.data?.import ?? null;

  return <div className="space-y-4">
    <Section title="Bulk salary revision import" subtitle="Create salary revisions for many employees at once. Each row can also be auto-approved and auto-implemented (columns auto_approve / auto_implement)."
      right={<>
        <Toggle checked={prefill} onChange={setPrefill} label="Pre-fill active employees" />
        <Btn variant="secondary" onClick={() => void run(() => downloadRevisionTemplate(catalog, employees, prefill), 'Template downloaded')}><Download size={14} />Template</Btn>
      </>}>
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className="block text-xs font-medium text-gray-600 mb-1">File (.csv, .xlsx)</span>
            <div className="flex flex-wrap items-center gap-2">
              <FileInput accept={ACCEPT} onFiles={f => { setFile(f[0] ?? null); setPreview(null); }} label={file ? 'Change file' : 'Choose file'} />
              {file && <span className="inline-flex items-center gap-1 text-xs text-gray-700"><FileSpreadsheet size={14} />{file.name}</span>}
            </div>
          </div>
          <Btn onClick={() => void upload()} busy={busy && !confirming && !discarding} disabled={!file}><Upload size={14} />Preview</Btn>
        </div>
        <p className="text-[11px] text-gray-500 break-words">Required: <code>employee_code, revision_type, effective_from, gross_salary</code>. Optional: <code>basic_salary, ctc, state, tax_regime, payment_frequency, arrears_applicable, arrears_from, auto_approve, auto_implement, epf, pf_on_actuals, esi, lwf, professional_tax, remarks</code>{componentCols.length > 0 && <> and component columns <code>{componentCols.join(', ')}</code></>}. Blank component cells use the org default.</p>
      </div>
    </Section>

    {preview && <Section title={`Preview · ${preview.fileName ?? file?.name ?? ''}`} subtitle={preview.importBatchId ? `Batch ${preview.importBatchId}` : 'Not saved'}
      right={<>
        <Btn variant="secondary" onClick={() => setDiscarding(true)}><Trash2 size={14} />{preview.importBatchId ? 'Cancel draft' : 'Discard'}</Btn>
        {preview.importBatchId && <Btn onClick={() => setConfirming(true)} disabled={!preview.summary?.validRows}><CheckCircle2 size={14} />Confirm {preview.summary?.validRows ?? 0} revision(s)</Btn>}
      </>}>
      <div className="p-5 space-y-4">
        {preview.failed && <Notice tone="error">{preview.failed}</Notice>}
        {preview.warning && <Notice tone="warn">{preview.warning}</Notice>}
        {!preview.summary?.validRows && preview.importBatchId && <Notice tone="error">No valid rows — fix the errors below and upload again. Cancel this draft to discard it.</Notice>}
        <SummaryKpis summary={preview.summary} />
        {Object.keys(planned).length > 0 && <p className="text-xs text-gray-600">On confirm: {Object.entries(planned).map(([k, v]) => <span key={k} className="mr-3"><Badge status={k}>{k}</Badge> {v}</span>)}</p>}
        <div className="flex justify-end"><RowFilter value={filter} onChange={setFilter} counts={{ all: rows.length, valid: rows.filter(r => r.valid).length, invalid: rows.filter(r => !r.valid).length }} /></div>
      </div>
      <DataTable columns={revisionColumns(setDetail, true)} rows={shown} rowKey={r => String(r.rowNumber)} onRowClick={setDetail} empty="No rows in this filter" />
    </Section>}

    {result && <Section title="Import result" subtitle={`Batch ${result.importBatchId}`} right={<Btn variant="secondary" onClick={() => navigate('revisions')}><ExternalLink size={14} />Open Salary Revisions</Btn>}>
      <div className="p-5 space-y-4">
        <SummaryKpis summary={result.summary} extra />
        {result.errors.length > 0 && <Notice tone="error"><p className="font-semibold mb-1">{result.errors.length} row(s) failed to apply</p><ul className="list-disc pl-4">{result.errors.map(e => <li key={`${e.rowNumber}-${e.employeeCode}`}>Row {e.rowNumber} ({e.employeeCode}): {e.error}</li>)}</ul></Notice>}
      </div>
      <DataTable rows={result.applied} rowKey={r => String(r.rowNumber)} empty="No revisions were created" columns={[
        { key: 'rowNumber', label: 'Row', align: 'right' },
        { key: 'employee', label: 'Employee', render: r => <div><p className="font-semibold">{r.employeeName}</p><p className="text-[11px] text-gray-500">{r.employeeCode}</p></div> },
        { key: 'type', label: 'Type', render: r => r.revisionTypeLabel || r.revisionType },
        { key: 'ctc', label: 'CTC', render: r => <Change from={r.oldSalary?.ctc} to={r.newSalary?.ctc} /> },
        { key: 'gross', label: 'Gross', render: r => <Change from={r.oldSalary?.grossSalary} to={r.newSalary?.grossSalary} /> },
        { key: 'inc', label: 'Increment', render: r => <Increment amount={r.incrementAmount} pct={r.incrementPercentage} /> },
        { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
        { key: 'id', label: 'Revision ID', render: r => <code className="text-[11px] break-all">{r.revisionId}</code> },
      ]} />
    </Section>}

    <Section title="Confirmed imports" subtitle={batchId ? `Batch ${batchId}` : 'Most recent confirmed salary revision import'}
      right={<form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); setBatchId(batchInput.trim()); }}>
        <Field label="Batch ID (optional)"><TextInput value={batchInput} onChange={setBatchInput} placeholder="Latest" className="w-56" /></Field>
        <Btn type="submit" variant="secondary"><Search size={14} />Find</Btn>
        {batchId && <Btn variant="ghost" onClick={() => { setBatchInput(''); setBatchId(''); }}>Latest</Btn>}
        <Btn variant="ghost" onClick={list.reload} aria-label="Refresh"><RefreshCw size={14} /></Btn>
      </form>}>
      <Async state={list}>{() => confirmed
        ? <>
          <div className="p-5 space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
              <span>File: <b className="text-gray-900">{confirmed.fileName || '—'}</b></span>
              <span>Confirmed: <b className="text-gray-900">{fmtDateTime(confirmed.confirmedAt)}</b></span>
              <span>Batch: <code className="text-gray-900 break-all">{confirmed.importBatchId}</code></span>
            </div>
            <SummaryKpis summary={confirmed.summary} extra />
          </div>
          <DataTable columns={revisionColumns(setDetail, false)} rows={confirmed.rows} rowKey={r => String(r.rowNumber)} onRowClick={setDetail} />
        </>
        : <div className="px-5 py-10 text-center"><p className="text-sm font-semibold text-gray-600">{batchId ? 'No confirmed import with this batch ID' : 'No salary revision import confirmed yet'}</p><p className="text-xs text-gray-400 mt-1">Download the template, fill new salaries, then upload, preview and confirm above.</p></div>}
      </Async>
    </Section>

    {detail && <RevisionDetail row={detail} onClose={() => setDetail(null)} />}
    {confirming && <Confirm title="Confirm salary revisions" busy={busy} onClose={() => setConfirming(false)} onConfirm={() => void confirm()}
      message={<>Create <b>{preview?.summary?.validRows ?? 0}</b> salary revision(s)?{planned.approved ? ` ${planned.approved} will be auto-approved.` : ''}{planned.implemented ? ` ${planned.implemented} will be approved and implemented immediately (employee salary updated, arrears created where applicable).` : ''}{preview?.summary?.invalidRows ? ` ${preview.summary.invalidRows} row(s) with errors will be skipped.` : ''}</>} />}
    {discarding && <Confirm title={preview?.importBatchId ? 'Cancel draft import' : 'Discard preview'} danger busy={busy} onClose={() => setDiscarding(false)} onConfirm={() => void discard()}
      message={preview?.importBatchId ? 'The draft batch will be cancelled and no revisions will be created.' : 'Clear this preview?'} />}
  </div>;
}
