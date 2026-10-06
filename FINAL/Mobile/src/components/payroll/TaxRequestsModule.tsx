"use client";

import { useState } from 'react';
import { CheckCircle2, Download, FileText, RefreshCw, Send } from 'lucide-react';
import { Empty, Field, Modal, Section, StatusPill, inputClass, money, primaryBtn, secondaryBtn } from '@/components/payroll/common';
import { formatInr, today } from '@/lib/payroll/payrollService';
import type { PayrollStore } from '@/components/payroll/store';

export function TaxModule({ store }: { store: PayrollStore }) {
  const fy = 'FY 2026-27';
  const rows = store.form16;
  const regimeCounts = { Old: rows.filter(r => r.regime === 'Old Tax Regime').length, New: rows.filter(r => r.regime === 'New Tax Regime').length, NotDeclared: rows.filter(r => r.regime === 'Not Declared').length };
  const [proofs, setProofs] = useState([
    { id: 'POI-01', worker: 'Ravi Kumar', workerId: 'BSS892199210001', declared: 18000, approved: 15000, comment: '', status: 'Pending' as 'Pending' | 'Approved' | 'Partially Approved' | 'Rejected', attachment: 'rent-receipts.pdf' },
    { id: 'POI-02', worker: 'Amit Singh', workerId: 'BSS892199220002', declared: 50000, approved: 0, comment: '', status: 'Pending' as 'Pending' | 'Approved' | 'Partially Approved' | 'Rejected', attachment: 'lic-premium.pdf' },
  ]);

  const reviewProof = (id: string, status: 'Approved' | 'Partially Approved' | 'Rejected', note: string) => {
    setProofs(cur => cur.map(p => p.id === id ? { ...p, status, approved: status === 'Rejected' ? 0 : status === 'Partially Approved' ? Math.round(p.approved || p.declared * 0.8) : p.declared, comment: note } : p));
    const p = proofs.find(x => x.id === id);
    store.addApproval({ id: `APR-${Date.now().toString().slice(-6)}`, category: 'Proof of Investment Review', reference: p?.id ?? id, worker: p?.worker ?? '—', workerId: p?.workerId ?? '—', employer: store.role === 'Employer' ? store.orgName : 'L&T Construction', contractor: store.orgName, site: '—', requestedBy: p?.worker ?? 'Worker', requestedOn: new Date().toISOString(), amount: p?.declared ?? 0, status, remarks: note || status, history: [] });
    store.notify(`Proof ${id} — ${status.toLowerCase()}${note ? ` (${note})` : ''}.`);
  };

  return <div className="space-y-5">
    <Section title="Form 16 management" subtitle="Tied to Payroll/TDS records — worker · employer · FY · generation status · generate/regenerate/download." right={<div className="flex gap-2">
      <button onClick={() => { rows.filter(r => r.generationStatus === 'Not Generated').forEach(r => store.generateForm16(r.workerId, fy, store.actor)); store.notify('Bulk Form 16 generation started for all workers.'); }} className={secondaryBtn + ' !h-9 !text-xs'}><RefreshCw size={13}/>Bulk generate</button>
      <button onClick={() => store.notify('All generated Form 16 downloads prepared (demo).')} className={primaryBtn + ' !h-9 !px-3 !text-xs'}><Download size={13}/>Download all</button>
    </div>}>
      <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr><th className="px-5 py-3">Worker</th><th className="px-5 py-3">Employer</th><th className="px-5 py-3">Contractor</th><th className="px-5 py-3">FY</th><th className="px-5 py-3">TDS (estimate)</th><th className="px-5 py-3">Regime</th><th className="px-5 py-3">Generation status</th><th className="px-5 py-3"></th></tr></thead>
        <tbody className="divide-y divide-gray-100">{rows.map(r => <tr key={r.workerId} className="hover:bg-gray-50"><td className="px-5 py-3"><strong className="text-gray-900">{r.worker}</strong><p className="font-mono text-[10px] text-gray-400">{r.workerId}</p></td><td className="px-5 py-3 text-gray-600">{r.employer}</td><td className="px-5 py-3 text-gray-600">{r.contractor}</td><td className="px-5 py-3 text-gray-600">{r.financialYear}</td><td className="px-5 py-3">{formatInr(r.tds)}</td><td className="px-5 py-3 text-gray-600">{r.regime}</td><td className="px-5 py-3"><StatusPill tone={r.generationStatus === 'Not Generated' ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-green-700'}>{r.generationStatus}</StatusPill>{r.generatedDate && <p className="text-[10px] text-gray-400 mt-0.5">{r.generatedDate.slice(0, 10)}</p>}</td><td className="px-5 py-3">{r.generationStatus === 'Not Generated' ? <button onClick={() => store.generateForm16(r.workerId, fy, store.actor)} className="text-blue-700 font-semibold">Generate</button> : <div className="flex gap-2"><button onClick={() => store.generateForm16(r.workerId, fy, store.actor)} className="text-blue-700 font-semibold">Regenerate</button><button onClick={() => store.notify(`Form 16 for ${r.worker} (${fy}) downloaded (demo PDF).`)} className="text-gray-500 font-semibold inline-flex items-center gap-1"><Download size={12}/>Download</button></div>}</td></tr>)}</tbody></table></div>
      <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">TDS figures are indicative estimates from configured payroll; Form 16 remains tied to payroll/TDS records — no separate tax database.</p>
    </Section>

    <Section title="Taxation summary" subtitle="Worker-level regimes — never aggregated into one meaningless comparison.">
      <div className="p-5 grid sm:grid-cols-3 gap-3 text-xs">
        <Count label="Old tax regime workers" value={regimeCounts.Old} tone="text-blue-700" />
        <Count label="New tax regime workers" value={regimeCounts.New} tone="text-green-700" />
        <Count label="Not declared" value={regimeCounts.NotDeclared} tone="text-gray-500" />
      </div>
    </Section>

    <Section title="Proof of investment review" subtitle="Declared amount · proof · comments · approved amount · review status — approve / partial / reject with comment.">
      {proofs.map(p => <div key={p.id} className="px-5 py-3.5 border-b border-gray-50 last:border-0 flex flex-wrap items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 grid place-items-center"><FileText size={15}/></span>
        <div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-gray-900">{p.worker}</p><span className="font-mono text-[10px] text-[#073B67]">{p.id}</span><StatusPill tone={p.status === 'Approved' ? 'bg-green-50 text-green-700' : p.status === 'Rejected' ? 'bg-red-50 text-red-600' : p.status === 'Partially Approved' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}>{p.status}</StatusPill></div>
          <p className="text-[11px] text-gray-500 mt-0.5">Declared {money(p.declared)} · Approved {p.approved ? money(p.approved) : '—'} · {p.attachment}{p.comment && ` · ${p.comment}`}</p></div>
        {p.status === 'Pending' && <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => reviewProof(p.id, 'Approved', '')} className="h-8 px-3 rounded-lg bg-[#2F9E67] text-white text-xs font-bold hover:brightness-95">Approve</button>
          <button onClick={() => reviewProof(p.id, 'Partially Approved', 'Receipts partially valid')} className="h-8 px-3 rounded-lg border border-blue-200 text-blue-700 text-xs font-bold">Partial</button>
          <button onClick={() => reviewProof(p.id, 'Rejected', 'Proof does not match declaration')} className="h-8 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold">Reject</button>
        </div>}
      </div>)}
    </Section>
  </div>;
}

export function RequestsModule({ store }: { store: PayrollStore }) {
  const [open, setOpen] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [option, setOption] = useState('10% of Basic');
  const [effective, setEffective] = useState('September 2026');

  const create = () => {
    const worker = store.workers.find(w => w.bssId === workerId);
    if (!worker) { store.notify('Select a worker for the VPF request.', 'error'); return; }
    const id = `VPF-2026-${String(1000 + Math.floor(Math.random() * 9000))}`;
    store.addVpf({ id, type: 'VPF Request', worker: worker.name, workerId, contractor: worker.contractor, employer: worker.employer, site: worker.site, submittedDate: today(), selectedOption: option, effectivePeriod: effective, status: 'Requested' });
    store.logAudit({ id: `AUD-${Date.now().toString().slice(-6)}`, timestamp: new Date().toISOString(), actor: store.actor, actorRole: store.role, action: 'Created', entity: 'Payroll Request (VPF)', reference: id, oldValue: null, newValue: `${option} from ${effective}`, worker: worker.name, employer: worker.employer, contractor: worker.contractor, period: effective, reason: null });
    store.notify(`VPF request ${id} created for ${worker.name}.`);
    setOpen(false); setWorkerId('');
  };

  return <div className="space-y-5">
    <Section title="Payroll Requests (VPF)" subtitle="A generic Payroll Request framework — VPF first; future request types reuse the same architecture." right={<button onClick={() => setOpen(true)} className={primaryBtn + ' !h-9 !px-3 !text-xs'}><Send size={13}/>New VPF request</button>}>
      {store.vpfRequests.length === 0 ? <Empty title="No VPF requests" text="Create a Voluntary Provident Fund request for a worker." /> : (
        <div className="divide-y divide-gray-100">{store.vpfRequests.map(r => <div key={r.id} className="px-5 py-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-gray-900">{r.worker}</p><span className="font-mono text-[10px] text-[#073B67]">{r.id}</span><StatusPill tone={r.status === 'Approved' ? 'bg-green-50 text-green-700' : r.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-700'}>{r.status}</StatusPill></div>
            <p className="text-xs text-gray-500 mt-0.5">{r.workerId} · {r.employer} · {r.contractor} · {r.site}</p><p className="text-[11px] text-gray-400 mt-0.5">Option: <strong>{r.selectedOption}</strong> · Effective {r.effectivePeriod} · Submitted {r.submittedDate}</p></div>
          {r.status === 'Requested' && <div className="flex gap-2"><button onClick={() => { store.setVpfStatus(r.id, 'Approved', store.actor); store.notify(`${r.id} approved.`); }} className="h-8 px-3 rounded-lg bg-[#2F9E67] text-white text-xs font-bold">Approve</button><button onClick={() => { store.setVpfStatus(r.id, 'Rejected', store.actor); store.notify(`${r.id} rejected.`); }} className="h-8 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold">Reject</button></div>}
        </div>)}</div>
      )}
    </Section>

    {open && <Modal title="New VPF Request" subtitle="Voluntary Provident Fund — option and effective period flow into the worker's payroll." onClose={() => setOpen(false)}>
      <div className="space-y-4">
        <Field label="Worker"><select value={workerId} onChange={e => setWorkerId(e.target.value)} className={inputClass}><option value="">Select worker</option>{store.workers.map(w => <option key={w.bssId} value={w.bssId}>{w.name} · {w.bssId}</option>)}</select></Field>
        <Field label="Selected option"><select value={option} onChange={e => setOption(e.target.value)} className={inputClass}><option>10% of Basic</option><option>20% of Basic</option><option>30% of Basic</option><option>Fixed amount</option></select></Field>
        <Field label="Effective period"><select value={effective} onChange={e => setEffective(e.target.value)} className={inputClass}><option>September 2026</option><option>October 2026</option><option>November 2026</option></select></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setOpen(false)} className={secondaryBtn}>Cancel</button><button onClick={create} className={primaryBtn}><Send size={14}/>Create request</button></div>
    </Modal>}
  </div>;
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-xl border border-gray-100 p-3.5"><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{label}</p><strong className={`block text-xl mt-1 ${tone}`}>{value}</strong></div>;
}
