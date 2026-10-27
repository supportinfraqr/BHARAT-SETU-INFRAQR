"use client";

/**
 * Form 16 (HR). Legacy controller/payroll/form16.js:
 * form16/summary, form16/bulk, form16/:employeeId (JSON), form16/:employeeId/download (PDF).
 */

import { useState } from 'react';
import { Download, Eye, FileCheck2 } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, currentFinancialYear, DataTable, EmployeePicker, employeeName, FinancialYearPicker, Kpi, KpiGrid, Modal, money, Section, useAction, useEmployees, useLoad } from '../ui';
import { Form16View, type Form16Data } from './Form16/Form16View';

type Summary = { financialYear: string; financialYearLabel: string; summary: { totalEmployees: number; totalIncome: number; totalTaxDeducted: number; regimeWise: { new: number; old: number }; departmentWise: Record<string, { count: number; totalIncome: number; totalTax: number }> } };
type BulkResult = { employeeId: string; name: string; email?: string; employeeCode?: string; status: 'ready' | 'failed'; error: string | null; totalTDSDeducted?: number };
type Bulk = { financialYear: string; total: number; ready: number; failed: number; results: BulkResult[]; downloadHint: string };

export default function Form16({ notify, params }: ModuleProps) {
  const [fy, setFy] = useState(params.financialYear || currentFinancialYear());
  const [bulk, setBulk] = useState<Bulk | null>(null);
  const [view, setView] = useState<{ id: string; label: string } | null>(null);
  const [pick, setPick] = useState('');
  const employees = useEmployees();
  const summary = useLoad(() => pe.get<Summary>('form16/summary', { financialYear: fy }), [fy]);
  const form = useLoad(() => view ? pe.get<Form16Data>(`form16/${view.id}`, { financialYear: fy }) : Promise.resolve(null), [view?.id, fy]);
  const { busy, run } = useAction(notify);
  const [downloading, setDownloading] = useState('');

  async function generateBulk() {
    const out = await run(() => pe.post<Bulk>('form16/bulk', { financialYear: fy }), 'Form 16 validation completed');
    if (out) setBulk(out);
  }
  async function download(id: string, label: string) {
    setDownloading(id);
    await run(() => pe.download(`form16/${id}/download`, { financialYear: fy }, `Form16-${label.replace(/\W+/g, '_')}-${fy}.pdf`));
    setDownloading('');
  }
  async function downloadAll() {
    if (!bulk) return;
    for (const r of bulk.results.filter(x => x.status === 'ready')) await download(String(r.employeeId), r.name || String(r.employeeId));
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <FinancialYearPicker value={fy} onChange={v => { setFy(v); setBulk(null); }} />
      <div className="flex flex-wrap gap-2">
        <div className="w-64"><EmployeePicker value={pick} employees={employees.data ?? []} placeholder="View Form 16 for…" onChange={(id, e) => { setPick(''); if (id) setView({ id, label: e ? employeeName(e) : 'Employee' }); }} /></div>
        <Btn busy={busy} onClick={generateBulk}><FileCheck2 size={14} />Generate for all</Btn>
      </div>
    </div>

    <Async state={summary}>{s => <>
      <KpiGrid>
        <Kpi label="Employees with TDS record" value={s.summary.totalEmployees} sub={s.financialYearLabel} />
        <Kpi label="Projected income" value={money(s.summary.totalIncome)} />
        <Kpi label="TDS deducted" value={money(s.summary.totalTaxDeducted)} />
        <Kpi label="Regime split" value={`${s.summary.regimeWise.new} new · ${s.summary.regimeWise.old} old`} />
      </KpiGrid>
      <Section title="Department-wise" subtitle="From employee TDS records for the FY" className="mt-4">
        <DataTable rows={Object.entries(s.summary.departmentWise)} rowKey={r => r[0]} empty="No TDS records for this FY — calculate TDS first (TDS / Income Tax)" columns={[
          { key: 'dept', label: 'Department', render: r => r[0] },
          { key: 'count', label: 'Employees', align: 'right', render: r => r[1].count },
          { key: 'income', label: 'Projected income', align: 'right', render: r => money(r[1].totalIncome) },
          { key: 'tax', label: 'TDS deducted', align: 'right', render: r => money(r[1].totalTax) },
        ]} />
      </Section>
    </>}</Async>

    {bulk ? <Section title={`Form 16 — FY ${bulk.financialYear}`} subtitle={`${bulk.ready} ready · ${bulk.failed} failed of ${bulk.total}`} right={bulk.ready > 0 && <Btn variant="secondary" busy={!!downloading} onClick={downloadAll}><Download size={14} />Download all PDFs</Btn>}>
      <DataTable rows={bulk.results} rowKey={r => String(r.employeeId)} empty="No employees with a TDS record" columns={[
        { key: 'name', label: 'Employee', render: r => <div><div className="font-semibold">{r.name || '—'}</div><div className="text-[11px] text-gray-400">{r.employeeCode ?? ''} {r.email ? `· ${r.email}` : ''}</div></div> },
        { key: 'status', label: 'Status', render: r => <Badge status={r.status === 'ready' ? 'completed' : 'failed'}>{r.status}</Badge> },
        { key: 'tds', label: 'TDS deducted', align: 'right', render: r => r.status === 'ready' ? money(r.totalTDSDeducted) : <span className="text-red-600">{r.error}</span> },
        { key: 'actions', label: '', align: 'right', render: r => r.status === 'ready' && <div className="flex justify-end gap-1">
          <Btn variant="ghost" onClick={() => setView({ id: String(r.employeeId), label: r.name })}><Eye size={14} />View</Btn>
          <Btn variant="ghost" busy={downloading === String(r.employeeId)} onClick={() => download(String(r.employeeId), r.name)}><Download size={14} />PDF</Btn>
        </div> },
      ]} />
    </Section> : <Section title="Generate Form 16"><p className="px-5 py-6 text-sm text-gray-500">Click <b>Generate for all</b> to validate Form 16 for every employee with a TDS record in FY {fy}, then view or download each PDF. Or pick a single employee above.</p></Section>}

    {view && <Modal title={`Form 16 — ${view.label}`} subtitle={`FY ${fy}`} width="max-w-4xl" onClose={() => setView(null)}
      footer={<><Btn variant="secondary" onClick={() => setView(null)}>Close</Btn><Btn busy={downloading === view.id} disabled={!form.data} onClick={() => download(view.id, view.label)}><Download size={14} />Download PDF</Btn></>}>
      <Async state={form}>{d => <Form16View data={d} />}</Async>
    </Modal>}
  </div>;
}
