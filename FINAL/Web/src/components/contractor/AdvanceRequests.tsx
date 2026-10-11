"use client";

import { useState } from 'react';
import { Banknote, CheckCircle2, HandCoins, Landmark, Send, Wallet, X } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';

// Advance lifecycle managed by the contractor:
// Requested → Approved → Disbursed (Cash/Online) → worker accepts → Adjusted in Payroll
type AdvanceStatus = 'Requested' | 'Approved' | 'Disbursed' | 'Rejected' | 'Adjusted';
type AdvanceItem = {
  id: string; worker: string; workerId: string; site: string; employer: string;
  amount: number; reason: string; requestedOn: string; status: AdvanceStatus;
  approvedOn?: string; disbursedOn?: string; mode?: 'Cash' | 'Online'; reference?: string; payrollPeriod?: string;
};

const STATUS_META: Record<AdvanceStatus, { label: string; tone: string; hint: string }> = {
  Requested: { label: 'Requested — awaiting approval', tone: 'bg-bss-soft-orange text-bss-orange', hint: 'Worker requested an advance. Approve to proceed to disbursement.' },
  Approved: { label: 'Approved — disburse to worker', tone: 'bg-bss-blue-tint text-bss-interactive-blue', hint: 'Approved. Disburse the amount in Cash or Online (bank/UPI).' },
  Disbursed: { label: 'Disbursed — awaiting worker acceptance', tone: 'bg-purple-50 text-purple-700', hint: 'Disbursed. The worker confirms receipt in the BSS app before payroll adjustment.' },
  Rejected: { label: 'Rejected', tone: 'bg-bss-soft-orange text-bss-error', hint: 'Request declined.' },
  Adjusted: { label: 'Adjusted in Payroll', tone: 'bg-bss-soft-green text-bss-green', hint: 'Recovered through payroll deduction after worker acceptance.' },
};

function today() { return new Date().toISOString().slice(0, 10); }

export default function AdvanceRequests() {
  const { contractor } = useContractor();
  const [items, setItems] = useState<AdvanceItem[]>([
    { id: 'ADV-2026-0220', worker: 'Ravi Kumar', workerId: 'BSS234567890124', site: 'Mumbai Metro Line 3', employer: 'Larsen & Toubro', amount: 8000, reason: 'School fees advance', requestedOn: '2026-09-01', status: 'Requested' },
    { id: 'ADV-2026-0214', worker: 'Ravi Kumar', workerId: 'BSS234567890124', site: 'Mumbai Metro Line 3', employer: 'Larsen & Toubro', amount: 5000, reason: 'Medical emergency in family', requestedOn: '2026-08-18', approvedOn: '2026-08-19', disbursedOn: '2026-08-20', mode: 'Online', reference: 'UTR-HDFC2608200214', status: 'Disbursed' },
    { id: 'ADV-2026-0097', worker: 'Ravi Kumar', workerId: 'BSS234567890124', site: 'Mumbai Metro Line 3', employer: 'Larsen & Toubro', amount: 3000, reason: 'Travel to hometown', requestedOn: '2026-06-02', approvedOn: '2026-06-03', disbursedOn: '2026-06-04', mode: 'Cash', status: 'Adjusted', payrollPeriod: 'July 2026' },
  ]);
  const [disburseId, setDisburseId] = useState<string | null>(null);
  const [mode, setMode] = useState<'Cash' | 'Online'>('Cash');
  const [reference, setReference] = useState('');
  const [notice, setNotice] = useState('');
  const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  const pending = items.filter(i => i.status === 'Requested' || i.status === 'Approved').length;
  const outDisbursed = items.filter(i => i.status === 'Disbursed').reduce((s, i) => s + i.amount, 0);
  const adjusted = items.filter(i => i.status === 'Adjusted').reduce((s, i) => s + i.amount, 0);

  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 8000); };

  const approve = (id: string) => {
    setItems(cur => cur.map(i => i.id === id ? { ...i, status: 'Approved', approvedOn: today() } : i));
    const item = items.find(i => i.id === id);
    flash(`Advance ${id} approved for ${item?.worker ?? ''} — disburse the amount to proceed.`);
  };
  const decline = (id: string) => {
    setItems(cur => cur.map(i => i.id === id ? { ...i, status: 'Rejected' } : i));
    flash(`Advance ${id} was declined.`);
  };
  const confirmDisbursement = () => {
    if (!disburseId) return;
    setItems(cur => cur.map(i => i.id === disburseId ? { ...i, status: 'Disbursed', disbursedOn: today(), mode, reference: mode === 'Online' ? (reference.trim() || 'UTR-PENDING') : 'Cash receipt at site office' } : i));
    flash(`Advance ${disburseId} disbursed (${mode}${mode === 'Online' && reference.trim() ? ' · ' + reference.trim() : ''}) — the worker must accept it in the BSS app, after which it is adjusted in the Payroll.`);
    setDisburseId(null); setReference(''); setMode('Cash');
  };

  const current = items.find(i => i.status === 'Requested' || i.status === 'Approved' || i.status === 'Disbursed');
  const worker = items[0]?.workerId ? contractor.workers.find(w => w.bssId === items[0].workerId) : undefined;

  return <section className="bg-white border border-bss-border rounded-2xl overflow-hidden">
    <header className="px-5 py-4 border-b border-bss-border flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-bss-soft-orange text-bss-orange grid place-items-center"><Wallet size={17} /></span>
        <div>
          <h2 className="font-semibold text-bss-text-primary">Advance Payment Requests</h2>
          <p className="text-xs text-bss-text-muted mt-0.5">Worker salary advances — approve, disburse (Cash/Online), worker acceptance, then adjustment in Payroll. Showing bound workers {contractor.sites[0] ? `at ${contractor.sites[0].name}` : ''}.</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-bss-orange bg-bss-soft-orange border border-bss-border rounded-full px-2.5 py-1">{pending} awaiting action</span>
    </header>

    {notice && <p role="status" className="mx-5 mt-4 rounded-xl bg-bss-soft-green border border-bss-border text-bss-green px-3 py-2 text-xs font-semibold flex items-center gap-2"><CheckCircle2 size={14} />{notice}</p>}

    <div className="p-5 grid sm:grid-cols-4 gap-3 text-xs">
      <div className="rounded-xl bg-bss-soft-orange border border-bss-border p-3"><p className="text-bss-text-muted">Pending approvals</p><strong className="block mt-1 text-lg text-bss-text-primary">{pending}</strong></div>
      <div className="rounded-xl bg-purple-50 border border-purple-100 p-3"><p className="text-bss-text-muted">Disbursed — awaiting worker acceptance</p><strong className="block mt-1 text-lg text-bss-text-primary">{money(outDisbursed)}</strong></div>
      <div className="rounded-xl bg-bss-soft-green border border-bss-border p-3"><p className="text-bss-text-muted">Adjusted in Payroll</p><strong className="block mt-1 text-lg text-bss-text-primary">{money(adjusted)}</strong></div>
      <div className="rounded-xl bg-bss-bg border border-bss-border p-3 text-[11px] text-bss-text-muted leading-5"><strong className="text-bss-text-primary">Flow</strong><p className="mt-1">Approve → Disburse (Cash/Online) → worker accepts → auto-adjustment as advance recovery in Payroll.</p></div>
    </div>

    <div className="border-t border-bss-border divide-y divide-bss-border">
      {items.map(item => (
        <div key={item.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-[#01183A]">{item.id}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_META[item.status].tone}`}>{STATUS_META[item.status].label}</span>
            </div>
            <p className="text-sm font-semibold text-bss-text-primary mt-1">{money(item.amount)} · {item.worker} ({item.workerId}) · {item.reason}</p>
            <p className="text-[11px] text-bss-text-muted mt-0.5">{item.site} · {item.employer} · Requested {item.requestedOn}{item.approvedOn && ` · Approved ${item.approvedOn}`}{item.disbursedOn && ` · Disbursed ${item.disbursedOn} (${item.mode}${item.reference ? ` · ${item.reference}` : ''})`}{item.payrollPeriod && ` · Recovered in ${item.payrollPeriod} payroll`}</p>
            {item.status === 'Disbursed' && <p className="text-[11px] text-purple-700 mt-1 flex items-center gap-1.5"><HandCoins size={12}/>Worker must accept in the BSS app — acceptance automatically queues the advance recovery in the next Payroll run.</p>}
            {item.status === 'Adjusted' && <p className="text-[11px] text-bss-green mt-1 flex items-center gap-1.5"><Landmark size={12}/>Shown as an advance-recovery deduction on the worker&apos;s Payroll record for {item.payrollPeriod}.</p>}
          </div>
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {item.status === 'Requested' && <>
              <button onClick={() => approve(item.id)} className="h-9 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#022B5E]"><CheckCircle2 size={14}/>Approve</button>
              <button onClick={() => decline(item.id)} className="h-9 px-4 rounded-lg border border-bss-border text-bss-error text-xs font-bold inline-flex items-center gap-1.5 hover:bg-bss-soft-orange"><X size={14}/>Decline</button>
            </>}
            {item.status === 'Approved' && <button onClick={() => { setDisburseId(item.id); setReference(''); setMode('Cash'); }} className="h-9 px-4 rounded-lg bg-[#14843C] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:brightness-95"><Banknote size={14}/>Disburse (Cash/Online)</button>}
            {item.status === 'Disbursed' && <span className="text-[11px] font-semibold text-bss-text-muted inline-flex items-center gap-1.5"><Send size={13}/>Awaiting worker acceptance</span>}
          </div>
        </div>
      ))}
      {!items.length && <p className="p-6 text-center text-xs text-bss-text-muted">No advance requests from bound workers.</p>}
    </div>
    {current && worker && <p className="px-5 pb-4 text-[11px] text-bss-text-muted">Demo record bound to {worker.name} ({worker.bssId}) · {worker.site}.</p>}

    {/* Disbursement modal — Cash or Online */}
    {disburseId && (
      <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Disburse advance">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
            <div><h2 className="font-semibold text-bss-text-primary">Disburse Advance {disburseId}</h2><p className="text-xs text-bss-text-muted mt-0.5">Choose the disbursement mode used by your office.</p></div>
            <button onClick={() => setDisburseId(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full text-bss-text-muted hover:bg-bss-bg"><X size={16}/></button>
          </header>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMode('Cash')} className={`rounded-xl border p-4 text-left transition ${mode === 'Cash' ? 'border-[#14843C] bg-bss-soft-green ring-1 ring-[#14843C]' : 'border-bss-border hover:border-bss-border'}`}><Banknote size={20} className="mb-2 text-[#14843C]"/><strong className="block text-sm">Cash</strong><small className="text-[11px] text-bss-text-muted">Paid at site office</small></button>
              <button type="button" onClick={() => setMode('Online')} className={`rounded-xl border p-4 text-left transition ${mode === 'Online' ? 'border-[#01183A] bg-bss-blue-tint ring-1 ring-[#01183A]' : 'border-bss-border hover:border-bss-border'}`}><HandCoins size={20} className="mb-2 text-[#01183A]"/><strong className="block text-sm">Online</strong><small className="text-[11px] text-bss-text-muted">Bank / UPI transfer</small></button>
            </div>
            {mode === 'Online' && <label className="block text-xs font-semibold text-bss-text-secondary">Transaction / UTR reference (optional)<input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. UTR-HDFC2609011234" className="mt-1.5 w-full rounded-xl border border-bss-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"/></label>}
            <p className="text-[11px] text-bss-text-muted leading-5"><HandCoins size={12} className="inline mr-1"/>After disbursement the worker accepts the receipt in their app; the amount is then recovered as an advance deduction in the Payroll.</p>
            <div className="flex gap-2">
              <button onClick={confirmDisbursement} className="flex-1 h-11 rounded-xl bg-[#01183A] text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[#022B5E]"><Banknote size={15}/>Confirm {mode} disbursement</button>
              <button onClick={() => setDisburseId(null)} className="h-11 px-4 rounded-xl border border-bss-border text-bss-text-secondary text-sm font-bold hover:bg-bss-bg">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
  </section>;
}
