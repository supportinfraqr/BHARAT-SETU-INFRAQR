"use client";

import { useState } from 'react';
import { formatDate } from '@/lib/date';
import { Banknote, HandCoins, Landmark, Plus } from 'lucide-react';
import { Empty, Field, Modal, Section, StatusPill, inputClass, money, primaryBtn, secondaryBtn } from '@/components/payroll/common';
import { loanRemaining, today } from '@/lib/payroll/payrollService';
import type { PayrollLoan, PayrollStore } from '@/components/payroll/store';

export default function LoansModule({ store }: { store: PayrollStore }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [repayId, setRepayId] = useState<string | null>(null);
  // create form
  const [name, setName] = useState('Worker Loan');
  const [workerId, setWorkerId] = useState('');
  const [amount, setAmount] = useState('');
  const [disbursedOn, setDisbursedOn] = useState(today());
  const [mode, setMode] = useState('Bank Transfer');
  const [account, setAccount] = useState('Primary account');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  // repay form
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(today());
  const [repayMode, setRepayMode] = useState('Cash');
  const [repayRef, setRepayRef] = useState('');

  const loans = store.loans;
  const openLoan = loans.find(l => l.id === repayId) ?? null;

  const create = () => {
    const worker = store.workers.find(w => w.bssId === workerId);
    if (!worker) { store.notify('Choose a worker for the loan.', 'error'); return; }
    const value = Number(amount) || 0;
    if (value <= 0) { store.notify('Enter a valid loan amount.', 'error'); return; }
    const loan: PayrollLoan = { id: `LOAN-${Date.now().toString().slice(-6)}`, loanName: name.trim() || 'Worker Loan', worker: worker.name, workerId, employer: worker.employer, contractor: worker.contractor, amount: value, repaid: 0, disbursedOn, mode, account, reference: reference.trim(), reason: reason.trim(), status: 'Active', repayments: [], createdBy: store.actor };
    store.addLoan(loan);
    store.logAudit({ id: `AUD-${Date.now().toString().slice(-6)}`, timestamp: new Date().toISOString(), actor: store.actor, actorRole: store.role, action: 'Created', entity: 'Payroll Loan', reference: loan.id, oldValue: null, newValue: `${money(value)} · ${worker.name}`, worker: worker.name, employer: worker.employer, contractor: worker.contractor, period: '—', reason: null });
    store.notify(`Loan ${loan.id} of ${money(value)} created for ${worker.name}.`);
    setCreateOpen(false); setWorkerId(''); setAmount(''); setReason(''); setReference('');
  };

  const repay = () => {
    if (!openLoan) return;
    const value = Number(repayAmount) || 0;
    if (value <= 0 || value > loanRemaining(openLoan)) { store.notify('Enter a valid repayment amount within the remaining balance.', 'error'); return; }
    store.repayLoan(openLoan.id, { id: `REP-${Date.now().toString().slice(-6)}`, amount: value, date: repayDate, mode: repayMode, account, reference: repayRef.trim(), by: store.actor });
    store.logAudit({ id: `AUD-${Date.now().toString().slice(-6)}`, timestamp: new Date().toISOString(), actor: store.actor, actorRole: store.role, action: 'Repaid', entity: 'Payroll Loan', reference: openLoan.id, oldValue: null, newValue: `${money(value)} ${repayMode}`, worker: openLoan.worker, employer: openLoan.employer, contractor: openLoan.contractor, period: '—', reason: null });
    store.notify(`Repayment of ${money(value)} recorded against ${openLoan.id}.`);
    setRepayId(null); setRepayAmount(''); setRepayRef('');
  };

  return <div className="space-y-5">
    <Section title="Payroll Loans" subtitle="Shared loan register — Worker · BSS ID · Employer · Contractor · Amount · Repaid · Remaining · Status." right={<button onClick={() => setCreateOpen(true)} className={primaryBtn + ' !h-9 !px-3 !text-xs'}><Plus size={14}/>Create loan</button>}>
      {loans.length === 0 ? <Empty title="No loans" text="Create a loan against a worker — repayment is recorded per transaction." /> : (
        <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr><th className="px-5 py-3">Loan</th><th className="px-5 py-3">Worker</th><th className="px-5 py-3">BSS ID</th><th className="px-5 py-3">Employer / Contractor</th><th className="px-5 py-3">Loan amount</th><th className="px-5 py-3">Repaid</th><th className="px-5 py-3">Remaining</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead>
          <tbody className="divide-y divide-gray-100">{loans.map(l => {
            const remaining = loanRemaining(l);
            return <tr key={l.id} className="hover:bg-gray-50">
              <td className="px-5 py-3"><span className="font-semibold text-gray-900">{l.loanName}</span><p className="font-mono text-[10px] text-[#073B67]">{l.id}</p></td>
              <td className="px-5 py-3 font-semibold text-gray-800">{l.worker}</td>
              <td className="px-5 py-3 font-mono text-gray-500">{l.workerId}</td>
              <td className="px-5 py-3 text-gray-600">{l.employer}<p className="text-[11px] text-gray-400">{l.contractor}</p></td>
              <td className="px-5 py-3">{money(l.amount)}</td>
              <td className="px-5 py-3 text-gray-600">{money(l.repaid)} <span className="text-gray-400">({l.repayments.length})</span></td>
              <td className="px-5 py-3 font-bold text-gray-900">{money(remaining)}</td>
              <td className="px-5 py-3"><StatusPill tone={l.status === 'Active' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}>{l.status}</StatusPill></td>
              <td className="px-5 py-3">{remaining > 0 ? <button onClick={() => { setRepayId(l.id); setRepayAmount(''); }} className="text-blue-700 font-semibold inline-flex items-center gap-1"><HandCoins size={13}/>Repay</button> : <span className="text-[11px] text-green-700 font-semibold">Settled</span>}</td>
            </tr>;
          })}</tbody></table></div>
      )}
    </Section>

    {loans.some(l => l.repayments.length > 0) && <Section title="Recent repayments" subtitle="Repayment history — date, mode, account, reference and who recorded it.">
      <div className="divide-y divide-gray-100">{loans.filter(l => l.repayments.length > 0).flatMap(l => l.repayments.map(rp => (
        <div key={rp.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-gray-800">{l.worker} · {l.id}</p><p className="text-[11px] text-gray-400">{formatDate(rp.date)} · {rp.mode}{rp.reference ? ` · ${rp.reference}` : ''} · by {rp.by}</p></div><strong className="text-xs text-gray-900">{money(rp.amount)}</strong></div>
      )))}</div>
    </Section>}

    {createOpen && <Modal title="Create Loan" subtitle="Loan amount, disbursement date, payment mode/account, reference and reason." onClose={() => setCreateOpen(false)} width="max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Loan name"><input value={name} onChange={e => setName(e.target.value)} className={inputClass}/></Field>
        <Field label="Worker"><select value={workerId} onChange={e => setWorkerId(e.target.value)} className={inputClass}><option value="">Select worker</option>{store.workers.map(w => <option key={w.bssId} value={w.bssId}>{w.name} · {w.bssId}</option>)}</select></Field>
        <Field label="Loan amount (₹)"><input type="number" min={1000} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 20000" className={inputClass}/></Field>
        <Field label="Disbursement date"><input type="date" value={disbursedOn} onChange={e => setDisbursedOn(e.target.value)} className={inputClass}/></Field>
        <Field label="Payment mode"><select value={mode} onChange={e => setMode(e.target.value)} className={inputClass}>{['Bank Transfer', 'UPI', 'Cash', 'Cheque'].map(m => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Deposit account"><select value={account} onChange={e => setAccount(e.target.value)} className={inputClass}><option>Primary account (SBIN0001234)</option><option>Secondary account (BARB0MUM1234)</option></select></Field>
        <Field label="Reference"><input value={reference} onChange={e => setReference(e.target.value)} placeholder="UTR / voucher" className={inputClass}/></Field>
        <Field label="Reason"><input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is the loan being given?" className={inputClass}/></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setCreateOpen(false)} className={secondaryBtn}>Cancel</button><button onClick={create} className={primaryBtn}><Landmark size={15}/>Create loan</button></div>
    </Modal>}

    {openLoan && <Modal title={`Repayment — ${openLoan.id}`} subtitle={`${openLoan.worker} · Remaining ${money(loanRemaining(openLoan))}`} onClose={() => setRepayId(null)}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Repayment amount (₹)"><input type="number" min={1} max={loanRemaining(openLoan)} value={repayAmount} onChange={e => setRepayAmount(e.target.value)} className={inputClass}/></Field>
        <Field label="Date"><input type="date" value={repayDate} onChange={e => setRepayDate(e.target.value)} className={inputClass}/></Field>
        <Field label="Payment mode"><select value={repayMode} onChange={e => setRepayMode(e.target.value)} className={inputClass}>{['Cash', 'Bank Transfer', 'UPI', 'Cheque'].map(m => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Reference"><input value={repayRef} onChange={e => setRepayRef(e.target.value)} placeholder="optional" className={inputClass}/></Field>
      </div>
      <p className="mt-4 text-[11px] text-gray-400"><Banknote size={12} className="inline mr-1"/>Repayments reduce the remaining balance; when it reaches zero the loan is closed. Payroll recovery is visible on the worker&apos;s next pay run.</p>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setRepayId(null)} className={secondaryBtn}>Cancel</button><button onClick={repay} className={primaryBtn}><HandCoins size={15}/>Record repayment</button></div>
    </Modal>}
  </div>;
}
