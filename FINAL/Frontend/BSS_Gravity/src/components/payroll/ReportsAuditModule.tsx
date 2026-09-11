"use client";

import { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Download, History } from 'lucide-react';
import { Empty, Section, StatusPill, money, recordStatusTone } from '@/components/payroll/common';
import { formatInr, totalsOf, workerVsEmployer } from '@/lib/payroll/payrollService';
import type { PayrollStore } from '@/components/payroll/store';

type ReportId = 'period' | 'employer' | 'contractor' | 'site' | 'statutory' | 'contributions' | 'payments' | 'loans' | 'ff' | 'form16' | 'revisions' | 'worker';

export function ReportsModule({ store }: { store: PayrollStore }) {
  const [report, setReport] = useState<ReportId>('period');
  const records = store.visibleRecords();
  const totals = totalsOf(records);
  const split = workerVsEmployer(records);

  const reports: Array<[ReportId, string]> = [
    ['period', 'Payroll Period Summary'], ['employer', 'Employer-wise Payroll'], ['contractor', 'Contractor-wise Payroll'], ['site', 'Site-wise Payroll'], ['worker', 'Worker Payroll'],
    ['statutory', 'Statutory Summary'], ['contributions', 'Employer Contributions'], ['payments', 'Payment Status'], ['loans', 'Loans'], ['ff', 'Full & Final'], ['form16', 'Form 16'], ['revisions', 'Salary Revisions'],
  ];

  const groupRows = (field: 'employer' | 'site' | 'contractor') => {
    const groups = new Map<string, typeof records>();
    for (const r of records) { const key = field === 'contractor' ? (r.contractor ?? 'Unmapped') : r[field]; const list = groups.get(key) ?? []; list.push(r); groups.set(key, list); }
    return [...groups.entries()].map(([name, rows]) => ({ name, workers: rows.length, gross: rows.reduce((s, r) => s + r.gross, 0), net: rows.reduce((s, r) => s + r.netPay, 0), empCost: rows.reduce((s, r) => s + r.employerCost, 0) }));
  };

  const exportXls = () => {
    const esc = (v: unknown) => String(v ?? '');
    const build = (head: string[], body: string[][]) => `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    let rows: Array<{ head: string[]; body: string[][] }>;
    if (report === 'period') rows = [{ head: ['Period', 'Records', 'Gross', 'Net'], body: [...new Map(records.map(r => [r.period, r])).keys()].map(p => { const list = records.filter(r => r.period === p); const t = totalsOf(list); return [p, String(list.length), String(t.gross), String(t.net)]; }) }];
    else if (report === 'employer' || report === 'contractor' || report === 'site') rows = [{ head: ['Group', 'Workers', 'Gross', 'Net', 'Employer cost'], body: groupRows(report === 'employer' ? 'employer' : report === 'contractor' ? 'contractor' : 'site').map(g => [g.name, String(g.workers), String(g.gross), String(g.net), String(g.empCost)]) }];
    else if (report === 'statutory') rows = [{ head: ['Measure', 'Amount'], body: [['EPF employee', String(totals.statutory.epfEmployee)], ['EPF/EPS employer', String(totals.statutory.epfEmployer + totals.statutory.eps)], ['ESI employee', String(totals.statutory.esiEmployee)], ['ESI employer', String(totals.statutory.esiEmployer)], ['PT', String(totals.statutory.pt)], ['LWF employee', String(totals.statutory.lwfEmployee)], ['LWF employer', String(totals.statutory.lwfEmployer)]] }];
    else if (report === 'contributions') rows = [{ head: ['Contribution', 'Amount'], body: [['EPS', String(totals.statutory.eps)], ['EPF employer', String(totals.statutory.epfEmployer)], ['ESI employer', String(totals.statutory.esiEmployer)], ['EDLI', String(totals.statutory.edli)], ['Admin', String(totals.statutory.admin)], ['LWF employer', String(totals.statutory.lwfEmployer)]] }];
    else if (report === 'payments') rows = [{ head: ['Worker', 'Period', 'Net', 'Status'], body: records.map(r => { const p = store.payments[r.id]; return [r.workerName, r.period, String(r.netPay), p?.status ?? 'Not Yet Paid']; }) }];
    else if (report === 'worker') rows = [{ head: ['Worker', 'BSS ID', 'Gross', 'Deductions', 'Net', 'Status'], body: records.map(r => [r.workerName, r.workerId, String(r.gross), String(r.totalDeductions), String(r.netPay), r.status]) }];
    else if (report === 'loans') rows = [{ head: ['Loan', 'Worker', 'Amount', 'Repaid', 'Remaining', 'Status'], body: store.loans.map(l => [l.id, l.worker, String(l.amount), String(l.repaid), String(Math.max(0, l.amount - l.repaid)), l.status]) }];
    else if (report === 'ff') rows = [{ head: ['Reference', 'Worker', 'Net payable', 'Status'], body: store.fandf.map(f => [f.id, f.worker, String(f.summary.totalNetPayable), f.status]) }];
    else if (report === 'form16') rows = [{ head: ['Worker', 'FY', 'Status'], body: store.form16.map(f => [f.worker, f.financialYear, f.generationStatus]) }];
    else rows = [{ head: ['Worker', 'Type', 'From', 'Prev CTC', 'Revised CTC', 'Status'], body: store.revisions.map(r => [r.worker, r.revisionType, r.effectiveFrom, String(r.previousCTC), String(r.revisedCTC), r.status]) }];
    const html = build(rows[0].head, rows[0].body);
    const file = new File([html], `payroll-${report}-report.xls`, { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 800);
    store.notify(`${report} report exported (XLS).`);
  };

  return <Section title="Payroll Reports" subtitle="Integrated with BSS reporting patterns — only reports supported by available data are exposed." right={<button onClick={exportXls} className="h-9 px-3 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#062D4F]"><Download size={14}/>Download (XLS)</button>}>
    <div className="p-5 flex flex-wrap gap-2">{reports.map(([id, label]) => <button key={id} onClick={() => setReport(id)} className={`px-3.5 py-2 rounded-full text-xs font-bold transition ${report === id ? 'bg-[#0F172A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>)}</div>

    <div className="px-5 pb-5">
      {report === 'period' && <SummaryTable head={['Period', 'Records', 'Gross', 'Net', 'Employer cost']} rows={[...new Map(records.map(r => [r.period, r])).keys()].map(p => { const list = records.filter(r => r.period === p); const t = totalsOf(list); return [p, String(list.length), formatInr(t.gross), formatInr(t.net), formatInr(t.employerCost)]; })} />}
      {(report === 'employer' || report === 'contractor' || report === 'site') && <SummaryTable head={['Group', 'Workers', 'Gross', 'Net', 'Employer cost']} rows={groupRows(report === 'employer' ? 'employer' : report === 'contractor' ? 'contractor' : 'site').map(g => [g.name, String(g.workers), formatInr(g.gross), formatInr(g.net), formatInr(g.empCost)])} />}
      {report === 'worker' && <WorkerReport store={store} />}
      {report === 'statutory' && <SummaryTable head={['Statutory measure', 'Amount']} rows={[['EPF (employee)', formatInr(totals.statutory.epfEmployee)], ['EPF/EPS (employer)', formatInr(totals.statutory.epfEmployer + totals.statutory.eps)], ['ESI (employee)', formatInr(totals.statutory.esiEmployee)], ['ESI (employer)', formatInr(totals.statutory.esiEmployer)], ['Professional Tax', formatInr(totals.statutory.pt)], ['LWF (employee)', formatInr(totals.statutory.lwfEmployee)], ['LWF (employer)', formatInr(totals.statutory.lwfEmployer)], ['EDLI + Admin', formatInr(totals.statutory.edli + totals.statutory.admin)], ['TDS', formatInr(totals.statutory.tds)]]} />}
      {report === 'contributions' && <SummaryTable head={['Employer contribution', 'Amount']} rows={[['EPS', formatInr(totals.statutory.eps)], ['EPF (balance)', formatInr(totals.statutory.epfEmployer)], ['ESI', formatInr(totals.statutory.esiEmployer)], ['EDLI', formatInr(totals.statutory.edli)], ['Admin charges', formatInr(totals.statutory.admin)], ['LWF', formatInr(totals.statutory.lwfEmployer)], ['Total employer contributions', formatInr(totals.employerContributions)]]} />}
      {report === 'payments' && <SummaryTable head={['Worker', 'Period', 'Net pay', 'Payment status', 'Mode']} rows={records.map(r => { const p = store.payments[r.id]; return [r.workerName, r.period, formatInr(r.netPay), p?.status ?? 'Not Yet Paid', p?.mode ?? '—']; })} />}
      {report === 'loans' && <SummaryTable head={['Loan', 'Worker', 'Amount', 'Repaid', 'Remaining', 'Status']} rows={store.loans.map(l => [l.id, l.worker, formatInr(l.amount), formatInr(l.repaid), formatInr(Math.max(0, l.amount - l.repaid)), l.status])} />}
      {report === 'ff' && <SummaryTable head={['Reference', 'Worker', 'Net payable', 'Status']} rows={store.fandf.map(f => [f.id, f.worker, formatInr(f.summary.totalNetPayable), f.status])} />}
      {report === 'form16' && <SummaryTable head={['Worker', 'FY', 'Status', 'Regime']} rows={store.form16.map(f => [f.worker, f.financialYear, f.generationStatus, f.regime])} />}
      {report === 'revisions' && <SummaryTable head={['Worker', 'Type', 'Effective', 'Previous CTC', 'Revised CTC', 'Status']} rows={store.revisions.map(r => [r.worker, r.revisionType, r.effectiveFrom, formatInr(r.previousCTC), formatInr(r.revisedCTC), r.status])} />}
    </div>
  </Section>;
}

function SummaryTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto rounded-xl border border-gray-200"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr>{head.map(h => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{rows.map((row, i) => <tr key={i} className="hover:bg-gray-50">{row.map((cell, j) => <td key={j} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{cell}</td>)}</tr>)}</tbody></table></div>;
}

function WorkerReport({ store }: { store: PayrollStore }) {
  const records = store.visibleRecords();
  return <SummaryTable head={['Worker', 'BSS ID', 'Gross', 'Deductions', 'Net', 'Status']} rows={records.map(r => [r.workerName, r.workerId, formatInr(r.gross), formatInr(r.totalDeductions), formatInr(r.netPay), r.status])} />;
}

export function AuditModule({ store }: { store: PayrollStore }) {
  const [filter, setFilter] = useState('All');
  const kinds = ['All', 'Created', 'Changed', 'Verified', 'Approved', 'Rejected', 'Repaid', 'Recorded payment', 'Submitted', 'Generated', 'Override'];
  const rows = store.audit.filter(a => filter === 'All' || a.action === filter);

  return <Section title="Payroll Audit Trail" subtitle="WHO DID WHAT — every payroll decision carries actor, role, timestamp, old/new value, worker, employer, contractor, period and reason." right={<span className="text-[10px] font-bold text-gray-500 bg-gray-50 rounded-full px-2 py-1 inline-flex items-center gap-1"><History size={11}/>{store.audit.length} events</span>}>
    <div className="px-5 pt-4 flex flex-wrap gap-1.5">{kinds.map(k => <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${filter === k ? 'bg-[#0F172A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{k}</button>)}</div>
    {rows.length === 0 ? <Empty title="No audit events" text="Actions you take across Payroll modules are appended here automatically." /> : (
      <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Entity</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Worker</th><th className="px-5 py-3">Employer / Contractor</th><th className="px-5 py-3">Old → New</th><th className="px-5 py-3">Reason</th></tr></thead>
        <tbody className="divide-y divide-gray-100">{rows.map(a => <tr key={a.id} className="hover:bg-gray-50"><td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{new Date(a.timestamp).toLocaleString('en-IN')}</td><td className="px-5 py-2.5"><strong className="text-gray-900">{a.actor}</strong><p className="text-[10px] text-gray-400">{a.actorRole}</p></td><td className="px-5 py-2.5"><StatusPill tone={a.action.includes('eject') || a.action === 'Rejected' ? 'bg-red-50 text-red-600' : a.action === 'Approved' || a.action === 'Verified' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}>{a.action}</StatusPill></td><td className="px-5 py-2.5 text-gray-700">{a.entity}</td><td className="px-5 py-2.5 font-mono text-[#073B67]">{a.reference}</td><td className="px-5 py-2.5 text-gray-600">{a.worker}</td><td className="px-5 py-2.5 text-gray-600">{a.employer}<p className="text-[10px] text-gray-400">{a.contractor}</p></td><td className="px-5 py-2.5 text-gray-600 max-w-[200px]"><span className="text-gray-400">{a.oldValue ?? '—'}</span> → <strong>{a.newValue ?? '—'}</strong></td><td className="px-5 py-2.5 text-gray-500 max-w-[160px] truncate" title={a.reason ?? ''}>{a.reason ?? '—'}</td></tr>)}</tbody></table></div>
      )}
  </Section>;
}
