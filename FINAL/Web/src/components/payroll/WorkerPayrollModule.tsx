"use client";

import { useState } from 'react';
import { CheckCircle2, ChevronRight, Download, History, Printer, X, XCircle } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { SourceBadge, MatchStateBadge } from '@/components/contractor/payroll/PayrollProvenance';
import { money, recordStatusTone, StatusPill, Section, Empty } from '@/components/payroll/common';
import { totalsOf } from '@/lib/payroll/payrollService';
import type { PayrollStore } from '@/components/payroll/store';
import type { PayrollWorkerRecord } from '@/types/portal';

export default function WorkerPayrollModule({ store }: { store: PayrollStore }) {
  const [viewing, setViewing] = useState<PayrollWorkerRecord | null>(null);
  const records = store.visibleRecords();

  const columns: DataColumn<PayrollWorkerRecord>[] = [
    { id: 'worker', header: 'Worker', value: r => r.workerName, render: r => <div><strong className="text-gray-900">{r.workerName}</strong><p className="font-mono text-[10px] text-gray-400">{r.workerId}</p></div> },
    { id: 'employer', header: 'Employer', value: r => r.employer },
    { id: 'contractor', header: 'Contractor', value: r => r.contractor ?? '—', render: r => r.contractor ? <span className="text-blue-700">{r.contractor}</span> : <span className="font-bold text-red-600">MAPPING REQUIRED</span> },
    { id: 'site', header: 'Site', value: r => r.site },
    { id: 'period', header: 'Pay period', value: r => r.period },
    { id: 'gross', header: 'Gross', value: r => r.gross, render: r => money(r.gross) },
    { id: 'deductions', header: 'Deductions', value: r => r.totalDeductions, render: r => <span className="text-red-600">− {money(r.totalDeductions)}</span> },
    { id: 'net', header: 'Net pay', value: r => r.netPay, render: r => <strong className="text-bss-green">{money(r.netPay)}</strong> },
    { id: 'source', header: 'Source', value: r => r.source ?? '', render: r => <SourceBadge source={r.source} /> },
    { id: 'match', header: 'Match', value: r => r.matchState ?? '', render: r => <MatchStateBadge state={r.matchState} /> },
    { id: 'status', header: 'Status', value: r => r.status, render: r => <StatusPill tone={recordStatusTone(r.status)}>{r.status}</StatusPill> },
    { id: 'actions', header: 'Action', filterable: false, value: r => r.status, render: r => <button onClick={() => setViewing(r)} className="text-blue-700 font-semibold text-xs inline-flex items-center gap-1">View<ChevronRight size={13}/></button> },
  ];

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-sm font-semibold text-gray-950">Worker Payroll — {store.role === 'Admin' ? 'system-wide records' : store.role === 'Employer' ? 'your workforce records' : 'your bound-worker records'}</h2><p className="text-xs text-gray-400 mt-0.5">Every record belongs to one Worker and keeps Worker → Site → Contractor → Employer context.</p></div>
      <button onClick={() => store.notify('Payroll records are read from the unified Worker payroll model.')} className="text-xs font-semibold text-blue-700 hover:underline">About the data</button>
    </div>
    <EnterpriseDataTable title="Worker payroll records" rows={records} columns={columns} rowKey={r => r.id} filename={`${store.role.toLowerCase()}-worker-payroll`} />
    {viewing && <PayrollRecordDrawer record={viewing} onClose={() => setViewing(null)} store={store} />}
  </div>;
}

/** Shared Worker Payroll detail drawer — identity, job, salary details, payslips, provenance. */
export function PayrollRecordDrawer({ record, onClose, store }: { record: PayrollWorkerRecord; onClose: () => void; store: PayrollStore }) {
  const workerRef = store.workers.find(w => w.bssId === record.workerId);
  const fixedEarnings = record.earnings.filter(e => e.amount > 0);
  const monthlyFixed = fixedEarnings.reduce((s, e) => s + e.amount, 0);
  const annual = 12;
  const annualCTC = (monthlyFixed + record.employerCost - record.gross) * annual;
  const monthlyCTC = annualCTC / annual;
  const contributions = record.contributions;
  const payment = store.payments[record.id];

  return <div className="fixed inset-0 z-[80] bg-black/50 flex justify-end" role="presentation">
    <section role="dialog" aria-modal="true" aria-label={`Payroll record — ${record.workerName}`} className="bg-white w-full max-w-lg h-full overflow-y-auto animate-in slide-in-from-right-4 duration-200">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
        <div><h2 className="font-semibold text-gray-950">{record.workerName}</h2><p className="text-xs text-gray-500 font-mono mt-0.5">{record.workerId} · {record.period}</p><p className="text-xs text-gray-500 mt-0.5">{workerRef?.designation ?? '—'} · {record.site}</p></div>
        <div className="flex items-center gap-2 flex-shrink-0"><StatusPill tone={recordStatusTone(record.status)}>{record.status}</StatusPill>{payment && <StatusPill tone={payment.status === 'Paid' ? 'bg-green-50 text-green-700' : payment.status === 'Failed' || payment.status === 'Reversed' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}>{payment.status}</StatusPill>}<button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button></div>
      </header>

      <div className="p-5 space-y-5 text-xs">
        {/* Provenance */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700/70">Payroll source & traceability</p>
          <div className="flex flex-wrap gap-2"><SourceBadge source={record.source}/><MatchStateBadge state={record.matchState}/></div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <div><dt className="text-blue-800/60">Employer</dt><dd className="font-semibold text-blue-900">{record.employer}</dd></div>
            <div><dt className="text-blue-800/60">Contractor</dt><dd className="font-semibold text-blue-900">{record.contractor ?? 'MAPPING REQUIRED'}</dd></div>
            <div><dt className="text-blue-800/60">Entered by</dt><dd className="font-semibold text-blue-900">{record.updatedBy}</dd></div>
            <div><dt className="text-blue-800/60">On</dt><dd className="font-semibold text-blue-900">{new Date(record.updatedAt).toLocaleString('en-IN')}</dd></div>
            <div><dt className="text-blue-800/60">Attendance days (read from attendance)</dt><dd className="font-semibold text-blue-900">{record.attendanceDays}</dd></div>
            <div><dt className="text-blue-800/60">LOP days (read from approved leave)</dt><dd className="font-semibold text-blue-900">{record.lopDays}</dd></div>
          </dl>
          {record.matchState === 'Needs Review' && <p className="pt-2 mt-1 border-t border-blue-100 text-red-600 font-bold flex items-center gap-1.5"><XCircle size={13}/>REVIEW REQUIRED — Employer and Contractor sources differ. No automatic reconciliation.</p>}
          {record.errors?.map((e, i) => <p key={i} className="text-red-600 flex items-center gap-1.5"><XCircle size={12}/>{e}</p>)}
        </div>

        {/* Salary details — configured salary structure */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Salary details (configured structure)</p>
          <ul className="space-y-1.5">{fixedEarnings.map(e => <li key={e.component} className="flex justify-between rounded-lg border border-gray-100 px-3 py-2"><span className="text-gray-600">{e.component}</span><span className="font-semibold text-gray-800">{money(e.amount)}</span></li>)}<li className="flex justify-between px-3 py-2 font-semibold text-gray-900"><span>Monthly fixed</span><span>{money(monthlyFixed)}</span></li></ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-gray-100 p-2.5"><dt className="text-gray-400">Monthly amount</dt><dd className="font-bold text-gray-800 mt-0.5">{money(monthlyFixed)}</dd></div>
            <div className="rounded-lg border border-gray-100 p-2.5"><dt className="text-gray-400">Annual amount</dt><dd className="font-bold text-gray-800 mt-0.5">{money(monthlyFixed * annual)}</dd></div>
            <div className="rounded-lg border border-gray-100 p-2.5"><dt className="text-gray-400">Monthly CTC</dt><dd className="font-bold text-gray-800 mt-0.5">{money(monthlyCTC)}</dd></div>
            <div className="rounded-lg border border-gray-100 p-2.5"><dt className="text-gray-400">Annual CTC</dt><dd className="font-bold text-[#073B67] mt-0.5">{money(annualCTC)}</dd></div>
          </div>
        </div>

        {/* Deductions & statutory */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Deductions</p><ul className="space-y-1.5">{record.deductions.filter(d => d.amount > 0).map(d => <li key={d.component} className="flex justify-between rounded-lg border border-gray-100 px-3 py-2"><span className="text-gray-600">{d.component}</span><span className="font-semibold text-gray-800">{money(d.amount)}</span></li>)}</ul></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Statutory contributions</p><ul className="space-y-1.5">
            <li className="flex justify-between rounded-lg border border-gray-100 px-3 py-2"><span className="text-gray-600">EPF employee / employer</span><span className="font-semibold text-gray-800">{money(contributions.employeePF)} / {money(contributions.employerPF)}</span></li>
            <li className="flex justify-between rounded-lg border border-gray-100 px-3 py-2"><span className="text-gray-600">EPS (employer)</span><span className="font-semibold text-gray-800">{money(contributions.eps)}</span></li>
            <li className="flex justify-between rounded-lg border border-gray-100 px-3 py-2"><span className="text-gray-600">ESI employee / employer</span><span className="font-semibold text-gray-800">{money(contributions.employeeESI)} / {money(contributions.employerESI)}</span></li>
            <li className="flex justify-between rounded-lg border border-gray-100 px-3 py-2"><span className="text-gray-600">PT · LWF</span><span className="font-semibold text-gray-800">{money(contributions.employeePT)} · {money(contributions.lwfEmployee)}</span></li>
          </ul></div>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Gross</span><strong className="text-gray-900">{money(record.gross)}</strong></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Total deductions</span><strong className="text-red-700">− {money(record.totalDeductions)}</strong></div>
          <div className="flex justify-between text-base pt-1.5 border-t border-gray-100"><span className="font-semibold">Net pay</span><strong className="text-bss-green">{money(record.netPay)}</strong></div>
          <div className="flex justify-between text-[11px] text-gray-400"><span>Employer cost</span><span>{money(record.employerCost)}</span></div>
        </div>

        {/* Payslips & forms */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Payslips & annual statement</p>
          <div className="space-y-2">
            {['August 2026', 'July 2026'].map(p => (
              <div key={p} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2.5">
                <div><p className="text-xs font-semibold text-gray-800">{p}</p><p className="text-[11px] text-gray-400">Pay date · {p === 'August 2026' ? '07 Sep 2026' : '07 Aug 2026'}</p></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">{p === record.period ? money(record.netPay) : money(Math.round(record.netPay * 0.98))}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Issued</span>
                  <button onClick={() => store.notify(`Payslip for ${record.workerName} · ${p} prepared (demo PDF).`)} className="text-blue-700 font-semibold inline-flex items-center gap-1"><Download size={12}/>PDF</button>
                  <button onClick={() => store.notify(`Printing ${record.workerName} payslip for ${p}.`)} className="text-gray-500 inline-flex items-center gap-1"><Printer size={12}/></button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"><div><p className="text-xs font-semibold text-gray-800">Annual salary statement · FY 2026-27</p><p className="text-[11px] text-gray-400">{record.employer} · {record.site} · Status: Available on completion of the financial year</p></div><button onClick={() => store.notify(`Annual statement for ${record.workerName} (FY 2026-27) will be downloadable.`)} className="text-blue-700 font-semibold text-xs">Download</button></div>
          </div>
        </div>
      </div>
    </section>
  </div>;
}

/** Exceptions — validation, unmapped, conflicts, incomplete data. All clickable. */
export function ExceptionsModule({ store }: { store: PayrollStore }) {
  const records = store.visibleRecords();
  const issues = records.filter(r => r.status === 'Exception' || r.status === 'Returned' || (r.errors && r.errors.length > 0) || r.matchState === 'Needs Review');
  const unmapped = store.role === 'Employer' ? records.filter(r => !r.contractor) : [];
  const incomplete = records.filter(r => !r.attendanceDays && r.gross > 0);
  if (!issues.length && !unmapped.length && !incomplete.length) return <Section title="Validation / Exceptions"><Empty title="No exceptions" text="All payroll records are clean. Anything needing correction appears here with the exact reason." /></Section>;
  return <div className="space-y-5">
    {unmapped.length > 0 && <Section title="Unmapped workers" subtitle="Never silently assign an unmapped worker — complete the Worker → Site → Contractor mapping first." right={<span className="text-[10px] font-bold text-red-600 bg-red-50 rounded-full px-2 py-1">{unmapped.length} MAPPING REQUIRED</span>}>
      {unmapped.map(r => <div key={r.id} className="px-5 py-3 border-b border-gray-50 last:border-0 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-gray-900">{r.workerName} · {r.period}</p><p className="text-xs text-gray-500">{r.employer} · {r.site}</p></div><button onClick={() => store.notify('Complete mapping through the existing Worker → Contractor relationship (Binding / Distribution).', 'error')} className="text-red-600 text-xs font-bold underline">Resolve mapping</button></div>)}
    </Section>}
    {issues.length > 0 && <Section title="Records needing correction" subtitle={`${issues.length} record(s) — status, errors and source conflicts shown; fix before finalisation.`}>
      <div className="divide-y divide-gray-100">{issues.map(r => <div key={r.id} className="px-5 py-3.5 flex flex-wrap items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 grid place-items-center flex-shrink-0"><XCircle size={16}/></span>
        <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900">{r.workerName} · {r.period}</p><p className="text-xs text-gray-500">{r.employer} · {r.site} · {r.contractor ?? 'Unmapped'}</p>{r.errors?.map((e, i) => <p key={i} className="text-[11px] text-red-600 mt-0.5">{e}</p>)}</div>
        <StatusPill tone={recordStatusTone(r.status)}>{r.status}</StatusPill><MatchStateBadge state={r.matchState}/>
      </div>)}</div>
    </Section>}
  </div>;
}

/** History — source-traceable record timeline (who did what, when). */
export function HistoryModule({ store }: { store: PayrollStore }) {
  const records = [...store.visibleRecords()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return <Section title="Payroll history · source traceability" subtitle="Every record preserves Worker, Source (Employer/Contractor), Entered/Processed By and the Worker → Site → Contractor → Employer chain.">
    {records.map(r => (
      <div key={r.id} className="px-5 py-3.5 border-b border-gray-50 last:border-0 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50">
        <div className="flex items-center gap-3 min-w-0"><span className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 ${r.source === 'Employer' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}><History size={14}/></span>
          <div className="min-w-0"><p className="text-sm font-semibold text-gray-900">{r.workerName} · {r.period}</p><p className="text-[11px] text-gray-400 mt-0.5">{r.updatedBy} · {new Date(r.updatedAt).toLocaleString('en-IN')} · {r.employer} → {r.contractor ?? 'Unmapped'} · {r.site}</p></div></div>
        <div className="flex items-center gap-3 flex-shrink-0"><span className="text-xs font-semibold text-gray-800">{money(r.netPay)}</span><StatusPill tone={recordStatusTone(r.status)}>{r.status}</StatusPill><MatchStateBadge state={r.matchState}/><CheckCircle2 size={15} className="text-bss-green"/></div>
      </div>
    ))}
  </Section>;
}
