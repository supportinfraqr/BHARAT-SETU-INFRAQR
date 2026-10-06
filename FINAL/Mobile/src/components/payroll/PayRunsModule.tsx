"use client";

import { useMemo, useState } from 'react';
import { CheckCircle2, Eye, Play, Plus, TriangleAlert } from 'lucide-react';
import { Empty, Field, Kpi, Modal, Section, StatusPill, inputClass, money, primaryBtn, runTone, secondaryBtn } from '@/components/payroll/common';
import { buildPayRun, formatInr, PERIODS, totalsOf, workerVsEmployer } from '@/lib/payroll/payrollService';
import type { PayRun, PayRunType } from '@/lib/payroll/types';
import type { PayrollStore } from '@/components/payroll/store';
import type { PayrollWorkerRecord } from '@/types/portal';

const RUN_TYPES: PayRunType[] = ['Regular Payroll', 'Past Payroll', 'Final Settlement Payroll', 'One-Time Payout', 'Off-Cycle Payroll', 'Bulk Final Settlement Payroll', 'Reassessment Payroll'];

export default function PayRunsModule({ store }: { store: PayrollStore }) {
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [period, setPeriod] = useState('August 2026');
  const [type, setType] = useState<PayRunType>('Regular Payroll');
  const [employer, setEmployer] = useState('');
  const [contractor, setContractor] = useState('');
  const [site, setSite] = useState('');

  const runs = store.runs;
  const viewing = runs.find(r => r.id === viewId) ?? null;

  const canRun = store.role === 'Contractor' || store.role === 'Employer';
  const roleNote = store.role === 'Admin' ? 'BSS Admin oversees pay runs — creation is done by the owning Employer/Contractor.' : 'Pick a deliberate scope (employer / contractor / site) — never an accidental system-wide run.';

  const createRun = () => {
    const records = eligible(store, period, employer, contractor, site);
    const run = buildPayRun(records, { type, period, employer: employer || store.orgName, contractor: contractor || null, site: site || null, paymentDate: '07 Sep 2026', schedule: store.config.paySchedule.payDay, createdBy: store.actor });
    store.addRun(run);
    store.addApproval({
      id: `APR-${Date.now().toString().slice(-6)}`, category: 'Payroll Run Approval', reference: run.id, worker: `${run.workersIncluded} worker(s)`, workerId: '—', employer: run.employer, contractor: run.contractor ?? store.orgName, site: run.site ?? '—', requestedBy: store.actor, requestedOn: new Date().toISOString(), amount: run.net, status: 'Pending', remarks: `${run.type} · ${run.period}`, history: [{ by: store.actor, action: 'Submitted pay run for approval', at: new Date().toISOString() }],
    });
    store.logAudit({ id: `AUD-${Date.now().toString().slice(-6)}`, timestamp: new Date().toISOString(), actor: store.actor, actorRole: store.role, action: 'Created', entity: 'Pay Run', reference: run.id, oldValue: null, newValue: `${run.type} · ${run.period} · ${formatInr(run.gross)} gross`, worker: `${run.workersIncluded} workers`, employer: run.employer, contractor: run.contractor ?? '—', period: run.period, reason: null });
    setOpen(false);
    store.notify(`Pay run ${run.id} created (${run.type}) — ${run.workersIncluded} worker(s), awaiting approval.`);
  };

  return <div className="space-y-5">
    <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-2"><span>{roleNote}</span>{canRun && <button onClick={() => setOpen(true)} className={primaryBtn + ' !h-9 !px-3 !text-xs bg-[#073B67] hover:bg-[#062D4F]'}><Plus size={14}/>Create Pay Run</button>}</div>

    <Section title="Pay Runs" subtitle="One Pay Run engine with a type — Regular, Past, F&F, One-Time, Off-Cycle, Bulk F&F, Reassessment." right={store.role === 'Admin' ? <span className="text-[10px] font-bold text-gray-500 bg-gray-50 rounded-full px-2 py-1">{runs.length} system-wide runs</span> : undefined}>
      {runs.length === 0 ? <Empty title="No pay runs yet" text="Create a scoped pay run from verified/submitted Worker payroll records." /> : (
        <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr><th className="px-5 py-3">Run</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Period</th><th className="px-5 py-3">Employer / Contractor / Site</th><th className="px-5 py-3">Workers</th><th className="px-5 py-3">Gross / Net</th><th className="px-5 py-3">Pay date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead>
          <tbody className="divide-y divide-gray-100">{runs.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-5 py-3 font-mono font-bold text-[#073B67]">{r.id}</td>
              <td className="px-5 py-3 text-gray-700">{r.type}</td>
              <td className="px-5 py-3 text-gray-700">{r.period}</td>
              <td className="px-5 py-3 text-gray-600">{r.employer}{r.contractor ? ` · ${r.contractor}` : ''}{r.site ? ` · ${r.site}` : ''}</td>
              <td className="px-5 py-3"><strong className="text-gray-900">{r.workersIncluded}</strong><span className="text-gray-400"> / {r.workersIncluded + r.workersSkipped}</span>{r.workersSkipped > 0 && <span title={r.errors.join(' · ')} className="ml-1.5 text-red-500"><TriangleAlert size={13} className="inline"/></span>}</td>
              <td className="px-5 py-3"><span className="font-semibold text-gray-800">{money(r.gross)}</span> / <span className="text-bss-green font-semibold">{money(r.net)}</span></td>
              <td className="px-5 py-3 text-gray-600">{r.paymentDate}</td>
              <td className="px-5 py-3"><StatusPill tone={runTone(r.status)}>{r.status}</StatusPill></td>
              <td className="px-5 py-3"><button onClick={() => setViewId(r.id)} className="text-blue-700 font-semibold inline-flex items-center gap-1">View<Eye size={13}/></button></td>
            </tr>))}</tbody></table></div>
      )}
    </Section>

    {/* Skipped workers note */}
    {runs.some(r => r.workersSkipped > 0) && <Section title="Skipped workers across runs" subtitle="Records never silently disappear — every skip keeps its reason.">
      <div className="divide-y divide-gray-100">{runs.filter(r => r.workersSkipped > 0).map(r => <div key={r.id} className="px-5 py-3 flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-[#073B67]">{r.id}</span><span className="text-xs text-gray-700">{r.workersSkipped} skipped in {r.period}</span><ul className="text-[11px] text-red-600 ml-1">{r.errors.slice(0, 3).map((e, i) => <li key={i}>• {e}</li>)}</ul></div>)}</div>
    </Section>}

    {open && <Modal title="Create Pay Run" subtitle="Scope is deliberate — Employer, Contractor and/or Site. Workers come from existing verified/submitted payroll records." onClose={() => setOpen(false)} width="max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Pay run type"><select value={type} onChange={e => setType(e.target.value as PayRunType)} className={inputClass}>{RUN_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Payroll period"><select value={period} onChange={e => setPeriod(e.target.value)} className={inputClass}>{PERIODS.map(p => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Employer scope"><select value={employer} onChange={e => setEmployer(e.target.value)} className={inputClass}><option value="">All visible employers</option>{store.employers.map(e => <option key={e}>{e}</option>)}</select></Field>
        <Field label="Contractor scope"><select value={contractor} onChange={e => setContractor(e.target.value)} className={inputClass}><option value="">All contractors</option>{store.contractors.map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Site scope"><select value={site} onChange={e => setSite(e.target.value)} className={inputClass}><option value="">All sites</option>{store.sites.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Pay date"><input readOnly value="07 Sep 2026 (from Pay Schedule)" className={inputClass + ' bg-gray-50'}/></Field>
      </div>
      <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500">Will include <strong>{eligible(store, period, employer, contractor, site).length}</strong> verified/submitted record(s) matching the scope & period; any other record is skipped with a reason and never auto-imported.</div>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setOpen(false)} className={secondaryBtn}>Cancel</button><button onClick={createRun} className={primaryBtn}><Play size={15}/>Create & submit for approval</button></div>
    </Modal>}

    {viewing && <RunDetailModal run={viewing} store={store} onClose={() => setViewId(null)} />}
  </div>;
}

function eligible(store: PayrollStore, period: string, employer: string, contractor: string, site: string): PayrollWorkerRecord[] {
  return store.records.filter(r => r.period === period && (!employer || r.employer === employer) && (!contractor || r.contractor === contractor) && (!site || r.site === site) && (r.status === 'Verified' || r.status === 'Submitted'));
}

function RunDetailModal({ run, store, onClose }: { run: PayRun; store: PayrollStore; onClose: () => void }) {
  const [tab, setTab] = useState<'summary' | 'taxes' | 'insights'>('summary');
  const included = useMemo(() => store.records.filter(r => r.period === run.period && (!run.contractor || r.contractor === run.contractor) && (!run.site || r.site === run.site) && (r.status === 'Verified' || r.status === 'Submitted')), [run, store.records]);
  const totals = totalsOf(included);
  const split = workerVsEmployer(included);

  return <Modal title={`Pay Run ${run.id}`} subtitle={`${run.type} · ${run.period} · ${run.employer}`} onClose={onClose} width="max-w-4xl">
    <div className="flex flex-wrap gap-2 mb-4">
      {([['summary', 'Worker Summary'], ['taxes', 'Taxes & Deductions'], ['insights', 'Overall Insights']] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-3.5 py-2 rounded-lg text-xs font-bold ${tab === id ? 'bg-[#073B67] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>)}
    </div>

    <div className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Kpi label="Workers included" value={String(run.workersIncluded)} sub={`${run.workersSkipped} skipped`} icon={CheckCircle2} tone="bg-green-50 text-green-700" />
      <Kpi label="Gross payroll" value={money(run.gross)} icon={TriangleAlert} tone="bg-gray-50 text-gray-700" />
      <Kpi label="Net payroll" value={money(run.net)} icon={TriangleAlert} tone="bg-green-50 text-bss-green" />
      <Kpi label="Status" value={<StatusPill tone={runTone(run.status)}>{run.status}</StatusPill>} sub="pay date" icon={TriangleAlert} tone="bg-blue-50 text-blue-700" />
    </div>

    {tab === 'summary' && <div className="overflow-x-auto rounded-xl border border-gray-200"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr><th className="px-4 py-2.5">Worker</th><th className="px-4 py-2.5">BSS ID</th><th className="px-4 py-2.5">Paid days</th><th className="px-4 py-2.5">Gross</th><th className="px-4 py-2.5">Deductions</th><th className="px-4 py-2.5">Net</th><th className="px-4 py-2.5">Source</th><th className="px-4 py-2.5">Status</th></tr></thead>
      <tbody className="divide-y divide-gray-100">{included.map(r => <tr key={r.id} className="hover:bg-gray-50"><td className="px-4 py-2.5 font-semibold text-gray-900">{r.workerName}</td><td className="px-4 py-2.5 font-mono text-gray-500">{r.workerId}</td><td className="px-4 py-2.5 text-gray-600">{r.attendanceDays}</td><td className="px-4 py-2.5">{money(r.gross)}</td><td className="px-4 py-2.5 text-red-600">− {money(r.totalDeductions)}</td><td className="px-4 py-2.5 font-bold text-bss-green">{money(r.netPay)}</td><td className="px-4 py-2.5 text-gray-600">{r.source ?? '—'}</td><td className="px-4 py-2.5"><StatusPill tone="bg-green-50 text-green-700">{r.status}</StatusPill></td></tr>)}
      {!included.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No included records found for this scope/period in the current store.</td></tr>}</tbody></table></div>}

    {tab === 'taxes' && <div className="grid sm:grid-cols-2 gap-4">
      <div className="rounded-xl border border-gray-200 p-4"><p className="text-xs font-bold text-gray-900 mb-3">Paid by Worker</p><DedRows rows={[['EPF (employee)', totals.statutory.epfEmployee], ['ESI (employee)', totals.statutory.esiEmployee], ['Professional Tax', totals.statutory.pt], ['LWF (employee)', totals.statutory.lwfEmployee], ['TDS', totals.statutory.tds], ['Other deductions', split.worker.other]]} tone="text-orange-700" /></div>
      <div className="rounded-xl border border-gray-200 p-4"><p className="text-xs font-bold text-gray-900 mb-3">Paid by Employer</p><DedRows rows={[['EPS', totals.statutory.eps], ['EPF (employer balance)', totals.statutory.epfEmployer], ['ESI (employer)', totals.statutory.esiEmployer], ['LWF (employer)', totals.statutory.lwfEmployer], ['EDLI', totals.statutory.edli], ['Admin charges', totals.statutory.admin]]} tone="text-blue-700" /></div>
    </div>}

    {tab === 'insights' && <div className="grid sm:grid-cols-2 gap-3 text-xs">
      <StatisticCard label="Statutory contributions" value={`${formatInr(totals.employeeDeductions)} worker · ${formatInr(totals.employerContributions)} employer`} />
      <StatisticCard label="Payment-mode summary" value="Bank Transfer (default from Pay Schedule); payslips sent after finalisation" />
      <StatisticCard label="Payroll components" value={`${store.config.salary.earnings.filter(e => e.active).length} earnings · ${store.config.salary.deductions.filter(d => d.active).length} deductions · ${store.config.salary.benefits.filter(b => b.active).length} benefits`} />
      <StatisticCard label="Workers affected" value={`${included.length} included · ${run.workersSkipped} skipped · total payout ${formatInr(run.net)}`} />
    </div>}
  </Modal>;
}

function DedRows({ rows, tone }: { rows: Array<[string, number]>; tone: string }) {
  return <div className="space-y-1.5">{rows.map(([label, amount]) => <div key={label} className="flex justify-between text-xs"><span className="text-gray-500">{label}</span><strong className={tone}>{money(amount)}</strong></div>)}</div>;
}
function StatisticCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-gray-100 p-3.5"><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{label}</p><p className="text-sm font-semibold text-gray-800 mt-1.5">{value}</p></div>;
}
