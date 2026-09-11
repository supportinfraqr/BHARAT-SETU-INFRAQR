"use client";

import { useState } from 'react';
import { Banknote, Download, FileText, Send, XCircle } from 'lucide-react';
import { Empty, Field, Modal, Section, StatusPill, inputClass, money, paymentTone, primaryBtn, secondaryBtn, textareaClass } from '@/components/payroll/common';
import type { PaymentInfo, PayrollStore } from '@/components/payroll/store';

export default function PaymentsModule({ store }: { store: PayrollStore }) {
  const records = store.visibleRecords().filter(r => r.status === 'Verified' || r.status === 'Submitted');
  const [paying, setPaying] = useState<{ recordId: string; worker: string; net: number } | null>(null);
  const [mode, setMode] = useState<PaymentInfo['mode']>('Bank Transfer');
  const [account, setAccount] = useState('Primary account (SBIN0001234)');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState('');

  const finalise = () => {
    if (!paying) return;
    const info: PaymentInfo = { recordId: paying.recordId, status: mode === 'Cash' ? 'Pending' : 'Paid', mode, account, reference: reference.trim() || (mode === 'Cash' ? 'Cash at site office' : 'AUTO-UTR'), paidOn: date || new Date().toISOString().slice(0, 10), paidBy: store.actor };
    store.setPayment(paying.recordId, info);
    store.logAudit({ id: `AUD-${Date.now().toString().slice(-6)}`, timestamp: new Date().toISOString(), actor: store.actor, actorRole: store.role, action: 'Recorded payment', entity: 'Worker Payroll Payment', reference: paying.recordId, oldValue: 'Not Yet Paid', newValue: `${info.status} · ${info.mode}`, worker: paying.worker, employer: '—', contractor: '—', period: '—', reason: null });
    store.notify(`${paying.worker} marked ${info.status} (${info.mode}) — payslip can now be sent.`);
    setPaying(null);
  };

  const counts = { paid: Object.values(store.payments).filter(p => p.status === 'Paid').length, pending: records.length - Object.values(store.payments).filter(p => p.status === 'Paid' || p.status === 'Reversed').length };

  return <div className="space-y-5">
    <div className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      <PaymentStat label="Payable records" value={String(records.length)} note="verified / submitted" />
      <PaymentStat label="Paid" value={String(counts.paid)} note="recorded payments" tone="text-bss-green" />
      <PaymentStat label="Pending / not yet paid" value={String(counts.pending)} note="awaiting payment" tone="text-orange-600" />
      <PaymentStat label="Failed / reversed" value={String(Object.values(store.payments).filter(p => p.status === 'Failed' || p.status === 'Reversed').length)} note="review required" tone="text-red-600" />
    </div>

    <Section title="Payments" subtitle="Record Payment Date · Mode · Account · Reference per worker — payslips and TDS sheets follow the payment." right={<span className="text-[10px] font-bold text-blue-700 bg-blue-50 rounded-full px-2 py-1 inline-flex items-center gap-1"><Send size={11}/>Send payslips after payment</span>}>
      {records.length === 0 ? <Empty title="No payable worker records" text="Records move here once verified or submitted." /> : (
        <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr><th className="px-5 py-3">Worker</th><th className="px-5 py-3">Period</th><th className="px-5 py-3">Net pay</th><th className="px-5 py-3">Payslip</th><th className="px-5 py-3">TDS sheet</th><th className="px-5 py-3">Mode / ref</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead>
          <tbody className="divide-y divide-gray-100">{records.map(r => {
            const p = store.payments[r.id];
            return <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-5 py-3"><strong className="text-gray-900">{r.workerName}</strong><p className="font-mono text-[10px] text-gray-400">{r.workerId}</p></td>
              <td className="px-5 py-3 text-gray-600">{r.period}</td>
              <td className="px-5 py-3 font-bold text-bss-green">{money(r.netPay)}</td>
              <td className="px-5 py-3"><DocButton onClick={() => store.notify(`Payslip ${r.workerName} ${r.period} generated.`)} label="Payslip" /></td>
              <td className="px-5 py-3"><DocButton onClick={() => store.notify(`TDS worksheet ${r.workerName} ${r.period} generated.`)} label="TDS" /></td>
              <td className="px-5 py-3 text-gray-600">{p?.mode ? <span>{p.mode}{p.reference ? ` · ${p.reference}` : ''}</span> : <span className="text-gray-400">—</span>}</td>
              <td className="px-5 py-3"><StatusPill tone={paymentTone(p?.status ?? 'Not Yet Paid')}>{p?.status ?? 'Not Yet Paid'}</StatusPill></td>
              <td className="px-5 py-3">{!p || p.status === 'Not Yet Paid' || p.status === 'Failed' ? <button onClick={() => setPaying({ recordId: r.id, worker: r.workerName, net: r.netPay })} className="text-blue-700 font-semibold">Record payment</button> : <button onClick={() => { store.setPayment(r.id, { recordId: r.id, status: 'Reversed', paidBy: store.actor, paidOn: new Date().toISOString().slice(0, 10) }); store.notify(`${r.workerName} payment reversed — correction recorded in audit trail.`); }} className="text-red-600 font-semibold">Reverse</button>}</td>
            </tr>;
          })}</tbody></table></div>
      )}
    </Section>

    {paying && <Modal title="Record Payment" subtitle={`${paying.worker} · Net pay ${money(paying.net)}`} onClose={() => setPaying(null)}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Payment date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass}/></Field>
        <Field label="Payment mode"><select value={mode} onChange={e => setMode(e.target.value as PaymentInfo['mode'])} className={inputClass}>{['Bank Transfer', 'UPI', 'Cash', 'Cheque'].map(m => <option key={m}>{m}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Payment account"><select value={account} onChange={e => setAccount(e.target.value)} className={inputClass}><option>Primary account (SBIN0001234)</option><option>Secondary account (BARB0MUM1234)</option><option>Site office cash</option></select></Field></div>
        <div className="sm:col-span-2"><Field label="Reference number"><input value={reference} onChange={e => setReference(e.target.value)} placeholder="UTR / cheque / cash voucher number" className={inputClass}/></Field></div>
      </div>
      <p className="mt-4 text-[11px] text-gray-400 flex items-start gap-1.5"><Banknote size={13} className="mt-0.5 flex-shrink-0"/>Recording a payment is audit-logged with actor, timestamp, mode and reference. Reversals and corrections keep the full history.</p>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setPaying(null)} className={secondaryBtn}>Cancel</button><button onClick={finalise} className={primaryBtn}><Banknote size={15}/>Record payment</button></div>
    </Modal>}

    <Section title="Bulk document actions" subtitle="Generate and send payroll documents in one action.">
      <div className="p-5 flex flex-wrap gap-2">
        <button onClick={() => store.notify('All payslips for the filtered records generated (demo).')} className="h-9 px-4 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-gray-50"><Download size={14}/>Download all payslips</button>
        <button onClick={() => store.notify('All TDS worksheets generated (demo).')} className="h-9 px-4 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-gray-50"><FileText size={14}/>Download all TDS worksheets</button>
        <button onClick={() => store.notify(`Payslips queued for ${records.length} worker(s) via ${store.config.staffPortal.contact ?? 'payroll contact'}.`)} className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#062D4F]"><Send size={14}/>Send payslips to workers</button>
      </div>
    </Section>
  </div>;
}

function PaymentStat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
  return <div className="rounded-xl bg-white border border-gray-200 p-4"><p className="text-xs text-gray-500">{label}</p><strong className={`block mt-2 text-xl ${tone ?? 'text-gray-950'}`}>{value}</strong><p className="text-[11px] text-gray-400 mt-0.5">{note}</p></div>;
}
function DocButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1 text-blue-700 font-semibold text-[11px] hover:underline"><FileText size={12}/>{label}</button>;
}
