"use client";

import { useState } from 'react';
import { ArrowRight, CheckCircle2, FileCheck2 } from 'lucide-react';
import { Empty, Field, Modal, Section, StatusPill, inputClass, money, primaryBtn, secondaryBtn, textareaClass } from '@/components/payroll/common';
import { fnfSummary } from '@/lib/payroll/payrollService';
import type { FnFRequest, PayrollStore } from '@/components/payroll/store';
import type { PayrollWorkerRecord } from '@/types/portal';

type Step = 'basic' | 'leave' | 'gratuity' | 'penalties' | 'summary';

const PENALTY_HEADS = ['Notice Period Penalty', 'Clearance Penalty', 'Asset Penalty', 'Joining Bonus Recovery', 'Assumed Day Penalty', 'Excess Leave Recovery', 'Unclaimed Reimbursement'];

export default function FandfModule({ store }: { store: PayrollStore }) {
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState<Step>('basic');
  const [workerId, setWorkerId] = useState('');
  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [leaveBalance, setLeaveBalance] = useState('4');
  const [years, setYears] = useState('2');
  const [penalties, setPenalties] = useState<Record<string, string>>({});
  const [regime, setRegime] = useState<'Old Tax Regime' | 'New Tax Regime'>('New Tax Regime');

  const record = store.records.find(r => r.workerId === workerId) ?? null;
  const computed = wizard && record ? fnfSummary(record, store.config, lastWorkingDate, Number(leaveBalance) || 0, Number(years) || 0, PENALTY_HEADS.filter(h => (Number(penalties[h]) || 0) > 0).map(h => ({ label: h, amount: Number(penalties[h]) || 0 }))) : null;

  const finalise = () => {
    if (!record || !computed) return;
    const reference = `FNF-2026-${String(1000 + Math.floor(Math.random() * 9000))}`;
    const fnf: FnFRequest = {
      id: reference, worker: record.workerName, workerId: record.workerId, employer: record.employer, contractor: record.contractor ?? store.orgName, site: record.site, designation: '—', joiningDate: '2024-08-12', lastWorkingDate, status: 'Submitted', summary: { ...computed.summary, salaryHoldMonths: 0, net: computed.net }, heads: computed.heads, taxRegime: regime, submittedBy: store.actor, submittedOn: new Date().toISOString(),
    };
    store.addFandf(fnf);
    store.addApproval({ id: `APR-${Date.now().toString().slice(-6)}`, category: 'Full & Final Settlement Approval', reference, worker: record.workerName, workerId: record.workerId, employer: record.employer, contractor: record.contractor ?? store.orgName, site: record.site, requestedBy: store.actor, requestedOn: new Date().toISOString(), amount: computed.net, status: 'Pending', remarks: 'F&F summary submitted for review', history: [{ by: store.actor, action: 'Submitted F&F settlement for approval', at: new Date().toISOString() }] });
    store.logAudit({ id: `AUD-${Date.now().toString().slice(-6)}`, timestamp: new Date().toISOString(), actor: store.actor, actorRole: store.role, action: 'Submitted', entity: 'Full & Final Settlement', reference, oldValue: null, newValue: `Net payable ${money(computed.net)}`, worker: record.workerName, employer: record.employer, contractor: record.contractor ?? '—', period: '—', reason: null });
    store.notify(`F&F ${reference} submitted for approval — leave encashment & gratuity computed from payroll setup.`);
    setWizard(false);
  };

  return <div className="space-y-5">
    <Section title="Full & Final Settlement" subtitle="Guided wizard — basic details · leave encashment · gratuity · penalties · summary. Uses existing leave/employment records." right={<button onClick={() => { setWizard(true); setStep('basic'); setWorkerId(''); setLastWorkingDate(''); setLeaveBalance('4'); setYears('2'); setPenalties({}); }} className={primaryBtn + ' !h-9 !px-3 !text-xs'}><FileCheck2 size={14}/>Start F&F wizard</button>}>
      {store.fandf.length === 0 ? <Empty title="No F&F settlements" text="Start the wizard for a worker to compute leave encashment, gratuity, penalties and net payable." /> : (
        <div className="divide-y divide-gray-100">{store.fandf.map(f => (
          <div key={f.id} className="px-5 py-4 flex flex-wrap items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 grid place-items-center"><FileCheck2 size={17}/></span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-gray-900">{f.worker}</p><span className="font-mono text-[10px] text-[#073B67]">{f.id}</span><StatusPill tone={f.status === 'Approved' ? 'bg-green-50 text-green-700' : f.status === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}>{f.status}</StatusPill></div>
              <p className="text-xs text-gray-500 mt-0.5">{f.employer} · {f.contractor} · {f.site} · Last working day {f.lastWorkingDate} · {f.taxRegime}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Net payable <strong className="text-gray-700">{money(f.summary.totalNetPayable)}</strong> · {f.heads.length} heads · by {f.submittedBy} on {new Date(f.submittedOn).toLocaleString('en-IN')}</p>
            </div>
          </div>
        ))}</div>
      )}
    </Section>

    {wizard && record && computed && (
      <Modal title={`F&F wizard · ${record.workerName}`} subtitle={`Step ${(['basic', 'leave', 'gratuity', 'penalties', 'summary'] as Step[]).indexOf(step) + 1} of 5`} onClose={() => setWizard(false)} width="max-w-3xl">
        <div className="flex flex-wrap gap-1.5 mb-4">{(['basic', 'leave', 'gratuity', 'penalties', 'summary'] as Step[]).map(s => <span key={s} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${step === s ? 'bg-[#073B67] text-white' : 'bg-gray-100 text-gray-500'}`}>{s}</span>)}</div>

        {step === 'basic' && <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Worker"><select value={workerId} onChange={e => setWorkerId(e.target.value)} className={inputClass}><option value="">Select worker</option>{store.visibleRecords().filter((r, i, a) => a.findIndex(x => x.workerId === r.workerId) === i).map(r => <option key={r.workerId} value={r.workerId}>{r.workerName} · {r.workerId}</option>)}</select></Field>
          <Field label="Last working date"><input type="date" value={lastWorkingDate} onChange={e => setLastWorkingDate(e.target.value)} className={inputClass}/></Field>
          <Field label="Employer" ><input readOnly value={record.employer} className={inputClass + ' bg-gray-50'}/></Field>
          <Field label="Contractor"><input readOnly value={record.contractor ?? store.orgName} className={inputClass + ' bg-gray-50'}/></Field>
          <Field label="Site"><input readOnly value={record.site} className={inputClass + ' bg-gray-50'}/></Field>
          <Field label="Tax regime"><select value={regime} onChange={e => setRegime(e.target.value as 'Old Tax Regime' | 'New Tax Regime')} className={inputClass}><option>Old Tax Regime</option><option>New Tax Regime</option></select></Field>
        </div>}

        {step === 'leave' && <div className="space-y-3 text-xs"><Field label="Leave balance days to encash (from approved leave records)"><input type="number" value={leaveBalance} onChange={e => setLeaveBalance(e.target.value)} className={inputClass}/></Field><p className="rounded-lg bg-blue-50 border border-blue-100 text-blue-900 px-3 py-2">Encashment basis: {store.config.salary.fullFinal.leaveEncashment.leaveType} · {store.config.salary.fullFinal.leaveEncashment.calcDays} · encashable computed from existing leave balances.</p></div>}

        {step === 'gratuity' && <div className="space-y-3 text-xs"><Field label="Completed years of service"><input type="number" value={years} onChange={e => setYears(e.target.value)} className={inputClass}/></Field><p className="rounded-lg bg-blue-50 border border-blue-100 text-blue-900 px-3 py-2">Gratuity scheme {store.config.salary.fullFinal.gratuityEncashment.enabled ? 'enabled' : 'not enabled'} · maturity {store.config.salary.fullFinal.gratuityEncashment.maturityYears} / {store.config.salary.fullFinal.gratuityEncashment.maturityMonths} · formula 15/26 × last drawn × completed service (≥5 years).</p></div>}

        {step === 'penalties' && <div className="space-y-2.5">{PENALTY_HEADS.map(h => <Field key={h} label={h}><input type="number" min={0} value={penalties[h] ?? ''} onChange={e => setPenalties(cur => ({ ...cur, [h]: e.target.value }))} placeholder="₹ amount, leave blank if not applicable" className={inputClass}/></Field>)}</div>}

        {step === 'summary' && <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">{Object.entries(computed.summary).filter(([k]) => !['salaryHoldMonths', 'lastMonthSalary'].includes(k)).map(([label, value]) => <div key={label} className="rounded-lg border border-gray-100 px-3 py-2 flex justify-between"><span className="text-gray-500 capitalize">{label.replace(/([A-Z])/g, ' $1')}</span><strong className="text-gray-900">{typeof value === 'number' ? money(value) : value}</strong></div>)}</div>
          <p className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-gray-600">Review required before finalisation — this creates an approval request in the Approvals module.</p>
        </div>}

        <div className="mt-6 flex items-center justify-between gap-2">
          <button onClick={() => setStep(cur => (cur === 'basic' ? 'basic' : (['basic', 'leave', 'gratuity', 'penalties', 'summary'] as Step[])[(['basic', 'leave', 'gratuity', 'penalties', 'summary'] as Step[]).indexOf(cur) - 1]))} className={secondaryBtn} disabled={step === 'basic'}>Back</button>
          {step !== 'summary' ? <button onClick={() => setStep(cur => (['basic', 'leave', 'gratuity', 'penalties', 'summary'] as Step[])[(['basic', 'leave', 'gratuity', 'penalties', 'summary'] as Step[]).indexOf(cur) + 1])} className={primaryBtn}>Next<ArrowRight size={15}/></button> : <button onClick={finalise} className={primaryBtn}><CheckCircle2 size={15}/>Submit for approval</button>}
        </div>
      </Modal>
    )}
  </div>;
}
