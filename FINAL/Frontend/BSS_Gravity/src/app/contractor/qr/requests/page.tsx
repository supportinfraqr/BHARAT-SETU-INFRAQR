"use client";

import { useState } from 'react';
import { Building2, CheckCircle2, Clock3, Handshake, KeyRound, Link2, UserRound } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorBindingRequest } from '@/types/portal';

export default function ContractorBindingRequestsPage() {
  const { contractor, replaceContractor, employerScope } = useContractor();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [otpFor, setOtpFor] = useState<ContractorBindingRequest | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const rows = employerScope === 'all' ? contractor.bindingRequests : contractor.bindingRequests.filter(r => r.employer === employerScope);

  async function accept(row: ContractorBindingRequest) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/worker/bindings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, action: 'accept' }) });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
      if (!response.ok) throw new Error(result.error || 'Binding could not be accepted.');
      const accepted = result.data?.status === 'Accepted';
      replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.id === row.id ? { ...item, status: (accepted ? 'Accepted' : 'Pending') as ContractorBindingRequest['status'], consentContractor: true } : item) });
      setNotice(accepted ? `Bound to ${row.entityName}.` : `Accepted — awaiting the worker's consent.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Request could not be updated.'); }
    finally { setBusy(false); }
  }

  async function consentUnbind(row: ContractorBindingRequest) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/worker/bindings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, action: 'unbind', side: 'contractor' }) });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
      if (!response.ok) throw new Error(result.error || 'Could not confirm unbinding.');
      const cancelled = result.data?.status === 'Cancelled';
      replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.id === row.id ? { ...item, status: (cancelled ? 'Cancelled' : 'Accepted') as ContractorBindingRequest['status'], unbindRequested: true, unbindConsentContractor: true, unbindConsentWorker: cancelled ? true : item.unbindConsentWorker } : item) });
      setNotice(cancelled ? `${row.entityName} unbound — both parties consented.` : `Unbinding confirmed — awaiting the worker's consent.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Request could not be updated.'); }
    finally { setBusy(false); }
  }

  async function sendWorkerOtp(row: ContractorBindingRequest) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/worker/bindings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, action: 'send-otp', target: 'worker' }) });
      const result = await response.json().catch(() => ({})) as { error?: string; mobile?: string };
      if (!response.ok) throw new Error(result.error || 'OTP could not be sent.');
      setOtpFor(row); setOtpSent(true); setOtp('');
      setNotice(`OTP sent to the worker's mobile ${result.mobile ?? ''}. Enter the OTP the worker reads out to record their consent.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'OTP could not be sent.'); }
    finally { setBusy(false); }
  }

  async function verifyWorkerOtp() {
    if (!otpFor) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/worker/bindings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: otpFor.id, action: 'accept-otp', side: 'worker', otp }) });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
      if (!response.ok) throw new Error(result.error || 'OTP verification failed.');
      const accepted = result.data?.status === 'Accepted';
      replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.id === otpFor.id ? { ...item, status: (accepted ? 'Accepted' : 'Pending') as ContractorBindingRequest['status'], consentWorker: true } : item) });
      setNotice(accepted ? `Bound to ${otpFor.entityName} — worker consent recorded via OTP.` : `Worker consent recorded via OTP — awaiting the contractor's acceptance.`);
      setOtpFor(null); setOtpSent(false); setOtp('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'OTP verification failed.'); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<ContractorBindingRequest>[] = [
    { id:'entity', header:'Entity', value:r => r.entityName, render:r => <div><strong className="text-gray-900">{r.entityName}</strong><p className="font-mono text-[10px] text-gray-400">{r.bssId}</p></div> },
    { id:'type', header:'Request type', value:r => r.type, render:r => <span className={`px-2 py-1 rounded text-[10px] font-semibold ${r.type === 'Employer' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>{r.type === 'Employer' ? 'Contractor ↔ Employer' : 'Contractor ↔ Worker'}</span> },
    { id:'site', header:'Site', value:r => r.site },
    { id:'employer', header:'Employer', value:r => r.employer },
    { id:'detail', header:'Designation / Wage', value:r => r.designation, render:r => <div><p className="text-gray-800">{r.designation}</p><p className="text-[10px] text-gray-400">{r.wage}</p></div> },
    { id:'requested', header:'Requested', value:r => r.requestedOn },
    { id:'status', header:'Relationship', value:r => r.status, render:r => <span className={r.status === 'Accepted' ? 'text-green-700' : r.status === 'Rejected' || r.status === 'Cancelled' ? 'text-red-700' : 'text-orange-700'}>{r.status}</span> },
    { id:'actions', header:'Action', filterable:false, value:r => r.status, render:r => {
      if (r.status === 'Accepted' && r.unbindRequested && !r.unbindConsentContractor) return <button disabled={busy} onClick={() => void consentUnbind(r)} className="text-red-700 font-semibold">Confirm unbind</button>;
      if (r.status === 'Accepted' && r.unbindRequested) return <span className="text-orange-700">Awaiting worker</span>;
      if (r.status === 'Pending' && r.consentWorker && !r.consentContractor) return <button disabled={busy} onClick={() => void accept(r)} className="text-green-700 font-semibold">Accept binding</button>;
      if (r.status === 'Pending' && !r.consentWorker && r.type === 'Worker') return <button disabled={busy} onClick={() => void sendWorkerOtp(r)} className="text-[#073B67] font-semibold inline-flex items-center gap-1"><KeyRound size={13}/>Send OTP to worker</button>;
      if (r.status === 'Pending' && !r.consentWorker) return <span className="text-gray-400">Awaiting worker</span>;
      if (r.status === 'Accepted') return <span className="text-green-700">Active</span>;
      return <span className="text-gray-400">—</span>;
    } },
  ];

  const pending = rows.filter(r => r.status === 'Pending').length;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">QR system</p><h1 className="text-2xl font-bold mt-1">Binding Requests</h1><p className="text-sm text-gray-500 mt-1">Contractor ↔ Worker and Contractor ↔ Employer binding requests. Approval is never automatic — both parties must accept before binding is complete.</p></header>

    {/* How binding works — reuses Worker portal pattern */}
    <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <span className="w-11 h-11 rounded-xl bg-white border border-blue-100 text-[#073B67] flex items-center justify-center flex-shrink-0"><Handshake size={20}/></span>
      <div className="flex-1"><h2 className="text-sm font-semibold text-gray-900">How binding works</h2><p className="text-xs text-gray-500 mt-0.5">Scan a Worker QR to send a binding request, or accept a request raised by a worker or principal employer. Binding is recorded as E-C-S-W only after both parties approve — no scan-to-autobind.</p></div>
      <a href="/contractor/scan" className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#062D4F] flex-shrink-0"><Link2 size={16}/>Scan QR to bind</a>
    </section>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Metric label="Pending" value={pending} icon={Clock3} tone="bg-orange-50 text-orange-700"/>
      <Metric label="Workers" value={rows.filter(r => r.type === 'Worker').length} icon={UserRound} tone="bg-blue-50 text-blue-700"/>
      <Metric label="Employers" value={rows.filter(r => r.type === 'Employer').length} icon={Building2} tone="bg-indigo-50 text-indigo-700"/>
      <Metric label="Active bindings" value={rows.filter(r => r.status === 'Accepted').length} icon={CheckCircle2} tone="bg-green-50 text-green-700"/>
    </div>

    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}

    <EnterpriseDataTable title="Binding request register" rows={rows} columns={columns} rowKey={r => r.id} filename="contractor-binding-requests"/>

    {otpFor && (
      <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
        <section role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <h2 className="font-semibold text-gray-900">Approve binding via worker OTP</h2>
          <p className="text-xs text-gray-500 mt-1">{otpFor.entityName} · {otpFor.site}</p>
          <p className="text-[11px] text-gray-400 mt-2">The OTP is sent to the worker&apos;s mobile. If the worker has no smartphone, ask them to read it out and enter it here to record their consent.</p>
          {otpSent && <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit OTP" className="mt-4 w-full bg-[#F5F5F7] border border-gray-200 rounded-xl px-4 py-3 text-center tracking-[0.4em] font-bold focus:outline-none"/>}
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => { setOtpFor(null); setOtpSent(false); setOtp(''); }} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold">Cancel</button>
            {otpSent && <button onClick={() => void verifyWorkerOtp()} disabled={busy} className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">{busy ? 'Verifying…' : 'Verify & Approve'}</button>}
          </div>
        </section>
      </div>
    )}
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Clock3; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
