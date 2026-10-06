"use client";

import { useState } from 'react';
import { CheckCircle2, ClipboardCheck, Eye, MessageSquareText, X } from 'lucide-react';
import { Empty, Modal, Section, StatusPill, approvalTone, money, primaryBtn, secondaryBtn, textareaClass } from '@/components/payroll/common';
import type { PayrollApprovalItem, PayrollStore } from '@/components/payroll/store';

const CATEGORIES = ['All', 'Payroll Run Approval', 'Reimbursement Approval', 'Salary Revision Approval', 'Proof of Investment Review', 'Full & Final Settlement Approval', 'Claims', 'Payroll Request (VPF)'] as const;

export default function ApprovalsModule({ store }: { store: PayrollStore }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [open, setOpen] = useState<PayrollApprovalItem | null>(null);
  const [remark, setRemark] = useState('');

  const rows = store.approvals.filter(a => category === 'All' || a.category === category);
  const pending = rows.filter(a => a.status === 'Pending');

  const decide = (item: PayrollApprovalItem, status: PayrollApprovalItem['status'], note: string) => {
    store.setApprovalStatus(item.id, status, store.actor, note);
    // Payroll run approvals flow straight into the Pay Run record (shared store).
    if (item.category === 'Payroll Run Approval') {
      const run = store.runs.find(r => r.id === item.reference);
      if (run) store.setRunStatus(run.id, status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Awaiting Approval', store.actor);
    }
    store.logAudit({ id: `AUD-${Date.now().toString().slice(-6)}`, timestamp: new Date().toISOString(), actor: store.actor, actorRole: store.role, action: status, entity: item.category, reference: item.reference, oldValue: item.status, newValue: status, worker: item.workerId === '—' ? item.worker : item.worker, employer: item.employer, contractor: item.contractor, period: '—', reason: note || null });
    store.notify(`${item.category} ${item.reference} — ${status.toLowerCase()} by ${store.actor}.`);
    setOpen(null); setRemark('');
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2">{CATEGORIES.map(c => <button key={c} onClick={() => setCategory(c)} className={`px-3.5 py-2 rounded-full text-xs font-bold transition ${category === c ? 'bg-[#0F172A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{c}{c !== 'All' && <span className="ml-1.5 opacity-70">{store.approvals.filter(a => a.category === c).length}</span>}</button>)}</div>

    <Section title="Payroll approvals" subtitle={`${pending.length} pending across the visible categories — every decision is audit-logged (actor, timestamp, reason).`}>
      {rows.length === 0 ? <Empty title="No approval items" text="Approvals created from Pay Runs, F&F, claims, revisions and requests appear here." /> : (
        <div className="divide-y divide-gray-100">{rows.map(a => (
          <div key={a.id} className="px-5 py-4 flex flex-wrap items-center gap-3">
            <span className={`w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 ${a.status === 'Pending' ? 'bg-orange-50 text-orange-600' : a.status === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}><ClipboardCheck size={17}/></span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-gray-900">{a.category}</p><span className="font-mono text-[10px] text-[#073B67]">{a.reference}</span><StatusPill tone={approvalTone(a.status)}>{a.status}</StatusPill></div>
              <p className="text-xs text-gray-500 mt-0.5">{a.worker}{a.workerId !== '—' ? ` (${a.workerId})` : ''} · {a.employer} · {a.contractor} · {a.site}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Requested by {a.requestedBy} · {new Date(a.requestedOn).toLocaleString('en-IN')} · Amount {money(a.amount)}{a.remarks ? ` · ${a.remarks}` : ''}</p>
              {a.history.length > 0 && <p className="text-[11px] text-gray-400 mt-1">Last: {a.history[a.history.length - 1].by} — {a.history[a.history.length - 1].action}</p>}
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <button onClick={() => setOpen(a)} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-gray-50"><Eye size={13}/>Review</button>
              {a.status === 'Pending' && <button onClick={() => decide(a, 'Approved', '')} className="h-8 px-3 rounded-lg bg-[#2F9E67] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:brightness-95"><CheckCircle2 size={13}/>Approve</button>}
              {a.status === 'Pending' && <button onClick={() => decide(a, 'Rejected', '')} className="h-8 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-red-50"><X size={13}/>Reject</button>}
            </div>
          </div>
        ))}</div>
      )}
    </Section>

    {open && <Modal title="Review approval" subtitle={`${open.category} · ${open.reference}`} onClose={() => setOpen(null)}>
      <dl className="grid grid-cols-2 gap-3 text-xs mb-4">
        <Detail label="Request type" value={open.category} />
        <Detail label="Worker" value={`${open.worker}${open.workerId !== '—' ? ` · ${open.workerId}` : ''}`} />
        <Detail label="Employer" value={open.employer} />
        <Detail label="Contractor" value={open.contractor} />
        <Detail label="Site" value={open.site} />
        <Detail label="Amount" value={money(open.amount)} />
        <Detail label="Requested by" value={`${open.requestedBy} · ${new Date(open.requestedOn).toLocaleString('en-IN')}`} />
        <Detail label="Status" value={open.status} />
      </dl>
      <label className="block text-xs font-semibold text-gray-600 mb-2">Decision remarks / clarification<textarea value={remark} onChange={e => setRemark(e.target.value)} rows={3} placeholder="Add remarks — mandatory for partial approvals and clarification requests" className={textareaClass + ' mt-1.5'} /></label>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button onClick={() => decide(open, 'Partially Approved', remark || 'Partial approval')} className="h-9 px-3 rounded-lg border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50">Partially approve</button>
        <button onClick={() => decide(open, 'Clarification Requested', remark || 'Clarification requested')} className={secondaryBtn + ' !h-9 !text-xs'}>Request clarification</button>
        <button onClick={() => decide(open, 'Rejected', remark)} className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50">Reject</button>
        <button onClick={() => decide(open, 'Approved', remark)} className={primaryBtn + ' !h-9 !text-xs bg-[#2F9E67] hover:brightness-95'}><CheckCircle2 size={14}/>Approve</button>
      </div>
    </Modal>}
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-gray-100 p-3"><dt className="text-gray-400 text-[10px] uppercase tracking-wider font-bold">{label}</dt><dd className="font-semibold text-gray-800 mt-1">{value}</dd></div>;
}
