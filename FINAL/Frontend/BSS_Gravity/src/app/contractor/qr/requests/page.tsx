"use client";

import { useState } from 'react';
import { Building2, CheckCircle2, Clock3, Handshake, KeyRound, Link2, UserRound, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
  const [confirm, setConfirm] = useState<{ row: ContractorBindingRequest; kind: 'approve' | 'reject' | 'accept' | 'ce-unbind' | 'worker-unbind' } | null>(null);
  const [sitesFor, setSitesFor] = useState<ContractorBindingRequest | null>(null);

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

  async function decideBinding(row: ContractorBindingRequest, action: 'approve-binding' | 'reject') {
    if (!row.bindingId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/contractor/binding-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bindingId: row.bindingId, action }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Binding could not be updated.');
      const accepted = action === 'approve-binding';
      replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.bindingId === row.bindingId ? { ...item, status: (accepted ? 'Accepted' : 'Rejected') as ContractorBindingRequest['status'], consentContractor: accepted ? true : item.consentContractor } : item) });
      setNotice(accepted ? `Binding with ${row.entityName} accepted.` : `Binding with ${row.entityName} declined.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Binding could not be updated.'); }
    finally { setBusy(false); }
  }

  async function decideCeUnbind(row: ContractorBindingRequest) {
    if (!row.bindingId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/contractor/binding-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bindingId: row.bindingId, action: 'unbind' }) });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
      if (!response.ok) throw new Error(result.error || 'Unbinding could not be requested.');
      const cancelled = String(result.data?.status ?? '').toLowerCase() === 'cancelled';
      replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.bindingId === row.bindingId ? { ...item, status: (cancelled ? 'Cancelled' : 'Accepted') as ContractorBindingRequest['status'], unbindRequested: true, unbindConsentContractor: true } : item) });
      setNotice(cancelled ? `Unbound from ${row.entityName} — both parties consented.` : 'Unbinding requested — awaiting the employer’s consent.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unbinding could not be requested.'); }
    finally { setBusy(false); }
  }

  async function contractorSiteAction(action: 'approve-site' | 'reject-site', siteId: number) {
    if (!sitesFor?.bindingId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/contractor/binding-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bindingId: sitesFor.bindingId, action, siteId }) });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { allotments?: ContractorBindingRequest['allotments'] } };
      if (!response.ok) throw new Error(result.error || 'Site permission could not be updated.');
      const allotments = result.data?.allotments ?? sitesFor.allotments;
      setSitesFor(prev => prev ? { ...prev, allotments } : prev);
      replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.bindingId === sitesFor.bindingId ? { ...item, allotments } : item) });
      setNotice(action === 'approve-site' ? 'Site approved.' : 'Site rejected.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Site permission could not be updated.'); }
    finally { setBusy(false); }
  }

  async function runConfirm() {
    if (!confirm) return;
    const { row, kind } = confirm;
    setConfirm(null);
    if (kind === 'accept') { await accept(row); return; }
    if (kind === 'ce-unbind') { await decideCeUnbind(row); return; }
    if (kind === 'worker-unbind') { await consentUnbind(row); return; }
    await decideBinding(row, kind === 'approve' ? 'approve-binding' : 'reject');
  }

  const columns: DataColumn<ContractorBindingRequest>[] = [
    { id:'entity', header:'Entity', value:r => r.entityName, render:r => <div><strong className="text-gray-900">{r.entityName}</strong><p className="font-mono text-[10px] text-gray-400">{r.bssId}</p></div> },
    { id:'type', header:'Request type', value:r => r.type, render:r => <span className={`px-2 py-1 rounded text-[10px] font-semibold ${r.type === 'Employer' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>{r.type === 'Employer' ? 'Contractor ↔ Employer' : 'Contractor ↔ Worker'}</span> },
    { id:'site', header:'Site', value:r => r.site },
    { id:'employer', header:'Employer', value:r => r.employer },
    { id:'detail', header:'Designation / Wage', value:r => r.designation, render:r => <div><p className="text-gray-800">{r.designation}</p><p className="text-[10px] text-gray-400">{r.wage}</p></div> },
    { id:'requested', header:'Requested', value:r => r.requestedOn },
    { id:'initiated', header:'Initiated by', value:r => r.initiatedBy || '—', render:r => <span className="font-semibold text-gray-700">{r.initiatedBy || '—'}</span> },
    { id:'accepted', header:'Accepted by', value:r => r.acceptedBy || '—', render:r => <span className={r.acceptedBy ? 'font-semibold text-green-700' : 'text-gray-400'}>{r.acceptedBy || '—'}</span> },
    { id:'status', header:'Relationship', value:r => r.status, render:r => <span className={r.status === 'Accepted' ? 'text-green-700' : r.status === 'Rejected' || r.status === 'Cancelled' ? 'text-red-700' : 'text-orange-700'}>{r.status}</span> },
    { id:'actions', header:'Action', filterable:false, value:r => r.status, render:r => {
      if (r.type === 'Employer') {
        if (r.status === 'Pending' && !r.consentContractor) return <div className="flex gap-2"><button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'approve' })} className="text-green-700 font-semibold">Accept binding</button><button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'reject' })} className="text-red-700 font-semibold">Decline</button></div>;
        if (r.status === 'Pending') return <span className="text-orange-700">Awaiting employer</span>;
        if (r.status === 'Accepted') {
          if (r.unbindRequested) {
            return r.unbindConsentContractor
              ? <span className="text-orange-700">Awaiting employer</span>
              : <button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'ce-unbind' })} className="text-red-700 font-semibold">Confirm unbind</button>;
          }
          return <div className="flex gap-2"><button disabled={busy} onClick={() => setSitesFor(r)} className="text-[#073B67] font-semibold">Site permissions</button><button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'ce-unbind' })} className="text-red-700 font-semibold">Request unbind</button></div>;
        }
        return <span className="text-gray-400">—</span>;
      }
      if (r.status === 'Accepted' && r.unbindRequested && !r.unbindConsentContractor) return <button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'worker-unbind' })} className="text-red-700 font-semibold">Confirm unbind</button>;
      if (r.status === 'Accepted' && r.unbindRequested) return <span className="text-orange-700">Awaiting worker</span>;
      if (r.status === 'Pending' && r.consentWorker && !r.consentContractor) return <button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'accept' })} className="text-green-700 font-semibold">Accept binding</button>;
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
      <Metric label="Workers" value={new Set(rows.filter(r => r.type === 'Worker').map(r => r.bssId || r.entityName)).size} icon={UserRound} tone="bg-blue-50 text-blue-700"/>
      <Metric label="Employers" value={new Set(rows.filter(r => r.type === 'Employer').map(r => r.bssId || r.entityName)).size} icon={Building2} tone="bg-indigo-50 text-indigo-700"/>
      <Metric label="Active bindings" value={rows.filter(r => r.status === 'Accepted').length} icon={CheckCircle2} tone="bg-green-50 text-green-700"/>
    </div>

    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}

    <EnterpriseDataTable title="Binding request register" rows={rows} columns={columns} rowKey={r => r.id} filename="contractor-binding-requests" showDownload={false}/>

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
    {sitesFor && (
      <div className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Site permissions">
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
          <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div><h2 className="font-semibold text-gray-900">Site permissions</h2><p className="text-xs text-gray-500 mt-0.5">{sitesFor.entityName} · {sitesFor.bssId}</p></div>
            <button onClick={() => setSitesFor(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full text-gray-400 hover:bg-gray-100"><X size={16}/></button>
          </header>
          <div className="p-5 space-y-2">
            <p className="text-xs text-gray-500">Two-step: the employer proposes a site and you approve. To request a new site, scan that site&apos;s QR — the employer then approves it.</p>
            {(sitesFor.allotments ?? []).length === 0 && <p className="text-xs text-gray-400">No sites proposed or allotted yet.</p>}
            {(sitesFor.allotments ?? []).map(a => (
              <div key={a.siteId} className="flex flex-wrap items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2">
                <div><p className="font-semibold text-sm text-gray-900">{a.site}</p><p className="text-[11px] text-gray-400 font-mono">{a.siteCode}</p></div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.status === 'Approved' ? 'bg-green-50 text-green-700' : a.status === 'Pending' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'}`}>{a.status}</span>
                  {a.status === 'Pending' && a.source === 'employer_allot' && <button disabled={busy} onClick={() => void contractorSiteAction('approve-site', a.siteId)} className="text-green-700 text-xs font-bold">Approve</button>}
                  {a.status === 'Pending' && <button disabled={busy} onClick={() => void contractorSiteAction('reject-site', a.siteId)} className="text-red-600 text-xs font-semibold">Reject</button>}
                  {a.status === 'Pending' && a.source !== 'employer_allot' && <span className="text-orange-700 text-xs font-semibold">Awaiting employer</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    <ConfirmDialog
      open={!!confirm}
      tone={confirm?.kind === 'approve' || confirm?.kind === 'accept' ? 'positive' : 'negative'}
      title={confirm?.kind === 'reject' ? 'Decline this binding?' : (confirm?.kind === 'ce-unbind' || confirm?.kind === 'worker-unbind') ? 'Unbind this binding?' : 'Accept this binding?'}
      description={confirm?.kind === 'reject'
        ? 'The other party will be notified and this binding will be declined. This cannot be undone.'
        : (confirm?.kind === 'ce-unbind' || confirm?.kind === 'worker-unbind')
          ? 'This requests unbinding. The binding is cancelled only when both parties confirm.'
          : 'Both parties must consent before the binding is complete. Confirming records your consent.'}
      details={confirm ? [
        { label: 'Entity', value: confirm.row.entityName },
        { label: 'BSS ID', value: confirm.row.bssId },
        { label: 'Type', value: confirm.row.type === 'Employer' ? 'Contractor ↔ Employer' : 'Contractor ↔ Worker' },
        { label: 'Site', value: confirm.row.site || '—' },
      ] : []}
      confirmLabel={confirm?.kind === 'reject' ? 'Confirm decline' : (confirm?.kind === 'ce-unbind' || confirm?.kind === 'worker-unbind') ? 'Confirm unbind' : 'Confirm accept'}
      busy={busy}
      onCancel={() => setConfirm(null)}
      onConfirm={() => void runConfirm()}
    />
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Clock3; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
