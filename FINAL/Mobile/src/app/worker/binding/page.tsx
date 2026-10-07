"use client";

import React, { useState } from 'react';
import { Building2, CheckCircle2, Clock3, Handshake, History, Home, Link2, MapPin, QrCode, Search, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useWorker } from '@/contexts/WorkerContext';
import RebindAuthModal from '@/components/worker/RebindAuthModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import BindingHistoryDialog, { type BindingHistoryEvent } from '@/components/ui/BindingHistoryDialog';
import { recordBindingApproval, formatApprovalDate } from '@/lib/workerDocumentWorkflow';

type BindingRequest = {
  id: number;
  ref: string;
  contractor: string;
  contractorCode: string;
  lin: string;
  employer: string;
  site: string;
  designation: string;
  wage: string;
  costSheetId?: number | null;
  costSheet?: string;
  costSheetName?: string;
  requestedOn: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Expired' | 'Cancelled' | 'Site Changed';
  initiatedBy?: string;
  acceptedBy?: string;
  contractorDetails?: { name: string; code: string; tradeName: string; lin: string; contactPerson: string; email: string; state: string; address: string };
  consentWorker?: boolean;
  consentContractor?: boolean;
  unbindRequested?: boolean;
  unbindConsentWorker?: boolean;
  unbindConsentContractor?: boolean;
  history?: BindingHistoryEvent[];
};



export default function BindingRequestsPage() {
  const { worker, portal, refresh } = useWorker();

  const apiRequests: BindingRequest[] = (portal.bindings ?? []).map(req => ({
    id: Number(req.id),
    ref: String(req.ref || `BIND-2026-${String(req.id).padStart(3, '0')}`),
    contractor: String(req.contractor || ''),
    contractorCode: String(req.contractorCode || ''),
    lin: String(req.lin || ''),
    employer: String(req.employer || ''),
    site: String(req.site || ''),
    designation: String(req.designation || ''),
    wage: String(req.wage || ''),
    costSheetId: req.costSheetId ?? null,
    costSheet: String(req.costSheet || ''),
    costSheetName: String(req.costSheetName || ''),
    requestedOn: String(req.requestedOn || '—'),
    status: (['Pending', 'Accepted', 'Rejected', 'Expired', 'Cancelled', 'Site Changed'].includes(req.status) ? req.status : 'Pending') as BindingRequest['status'],
    initiatedBy: String(req.initiatedBy || ''),
    acceptedBy: String(req.acceptedBy || ''),
    contractorDetails: req.contractorDetails,
    consentWorker: Boolean(req.consentWorker),
    consentContractor: Boolean(req.consentContractor),
    unbindRequested: Boolean(req.unbindRequested),
    unbindConsentWorker: Boolean(req.unbindConsentWorker),
    unbindConsentContractor: Boolean(req.unbindConsentContractor),
    history: (req.history as BindingHistoryEvent[]) ?? [],
  }));

  const [requests, setRequests] = useState<BindingRequest[]>(apiRequests.length > 0 ? apiRequests : []);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const boundContractor = (worker.employment.status === 'Active' && worker.employment.contractor?.trim()) ? worker.employment.contractor : null;
  const [authRequestId, setAuthRequestId] = useState<number | null>(null);
  const authRequest = requests.find(r => r.id === authRequestId) ?? null;
  const [confirm, setConfirm] = useState<{ req: BindingRequest; kind: 'accept' | 'decline' | 'unbind' } | null>(null);
  const [historyFor, setHistoryFor] = useState<BindingRequest | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'action' | 'active' | 'all'>('all');

  function runConfirm() {
    if (!confirm) return;
    const { req, kind } = confirm;
    setConfirm(null);
    if (kind === 'accept') { requestAccept(req); return; }
    if (kind === 'unbind') { void requestUnbind(req); return; }
    void act(req.id, 'decline');
  }

  const act = async (id: number, action: 'accept' | 'decline') => {
    setBusyId(id);
    setError('');
    try {
      const response = await fetch('/api/worker/bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not update binding request.');
      const status: BindingRequest['status'] = action === 'accept' ? 'Accepted' : 'Rejected';
      setRequests(current => current.map(r => r.id === id ? { ...r, status } : r));
      const req = requests.find(r => r.id === id);
      if (action === 'accept' && req) {
        recordBindingApproval({ contractor: req.contractor, approvedOn: formatApprovalDate(new Date()) });
      }
      setNotice(action === 'accept' ? `Binding approved — you are now bound to ${req?.contractor || 'the contractor'}.` : `You declined the binding request from ${req?.contractor || 'the contractor'}.`);
      void refresh();
      setTimeout(() => setNotice(''), 6000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update binding request.');
    } finally {
      setBusyId(null);
    }
  };

  const requestAccept = (req: BindingRequest) => {
    if (boundContractor && req.status === 'Pending') { setAuthRequestId(req.id); return; }
    void act(req.id, 'accept');
  };

  const requestUnbind = async (req: BindingRequest) => {
    setBusyId(req.id); setError(''); setNotice('');
    try {
      const response = await fetch('/api/worker/bindings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: req.id, action: 'unbind', side: 'worker' }) });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
      if (!response.ok) throw new Error(result.error || 'Could not request unbinding.');
      const cancelled = result.data?.status === 'Cancelled';
      setRequests(current => current.map(r => r.id === req.id ? { ...r, status: (cancelled ? 'Cancelled' : 'Accepted') as BindingRequest['status'], unbindRequested: true, unbindConsentWorker: true, unbindConsentContractor: cancelled ? true : r.unbindConsentContractor } : r));
      setNotice(cancelled ? 'Binding unbound — both parties consented.' : 'Unbinding requested — awaiting the contractor’s consent.');
      void refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not request unbinding.');
    } finally { setBusyId(null); }
  };

  const rejectUnbind = async (req: BindingRequest) => {
    setBusyId(req.id); setError(''); setNotice('');
    try {
      const response = await fetch('/api/worker/bindings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: req.id, action: 'decline-unbind', side: 'worker' }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not reject the unbind request.');
      setRequests(current => current.map(r => r.id === req.id ? { ...r, unbindRequested: false, unbindConsentWorker: false, unbindConsentContractor: false } : r));
      setNotice('Unbind request rejected — the binding stays active.');
      void refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not reject the unbind request.');
    } finally { setBusyId(null); }
  };

  const badge = (status: string) => {
    const map: Record<string, string> = {
      Pending: 'bg-orange-100 text-orange-700',
      Accepted: 'bg-green-100 text-green-700',
      Rejected: 'bg-red-100 text-red-700',
      Expired: 'bg-gray-100 text-gray-500',
      Cancelled: 'bg-slate-100 text-slate-600',
      'Site Changed': 'bg-sky-100 text-sky-700',
    };
    return <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  const q = query.trim().toLowerCase();
  const matchesQuery = (r: BindingRequest) => !q || [r.contractor, r.contractorCode, r.site, r.ref, r.employer, r.designation]
    .some(value => String(value || '').toLowerCase().includes(q));
  const tabFiltered = requests.filter(r => tab === 'all' ? true : tab === 'active' ? r.status === 'Accepted' : r.status === 'Pending');
  const filtered = tabFiltered.filter(matchesQuery);
  const tabCount = (t: 'action' | 'active' | 'all') => requests.filter(r => t === 'all' ? true : t === 'active' ? r.status === 'Accepted' : r.status === 'Pending').length;

  return <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#062D4F]">Binding Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Connect a worker with a contractor. Both parties must approve before binding is complete.</p>
      </div>
      <Link href="/worker" className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-[#073B67] hover:border-[#073B67] transition-all shadow-sm" title="Go to Dashboard"><Home size={18}/></Link>
    </div>

    {notice && <p role="status" className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>{notice}</p>}
    {error && <p role="alert" className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</p>}

    {/* How binding works */}
    <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <span className="w-11 h-11 rounded-xl bg-white border border-blue-100 text-[#073B67] flex items-center justify-center flex-shrink-0"><Handshake size={20}/></span>
      <div className="flex-1"><h2 className="text-sm font-semibold text-gray-900">How binding works</h2><p className="text-xs text-gray-500 mt-0.5">You can start a binding request by scanning a Contractor QR code. The contractor must approve it, and you must accept — only then are you bound and can start work at the site.</p></div>
      <Link href="/worker/scan" className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#062D4F] flex-shrink-0"><QrCode size={16}/>Scan contractor QR</Link>
    </section>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[{l:'Pending',v:requests.filter(r=>r.status==='Pending').length,t:'text-orange-600'},{l:'Active binding',v:requests.filter(r=>r.status==='Accepted').length,t:'text-green-700'},{l:'Declined',v:requests.filter(r=>r.status==='Rejected').length,t:'text-red-600'},{l:'Total requests',v:requests.length,t:'text-gray-800'}].map(s=><div key={s.l} className="bg-white border border-gray-200 rounded-xl p-4"><strong className={`block text-xl ${s.t}`}>{s.v}</strong><span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{s.l}</span></div>)}
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {([['action', 'Needs action'], ['active', 'Active'], ['all', 'All']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`h-9 px-3.5 rounded-full text-xs font-bold border transition-colors ${tab === key ? 'bg-[#073B67] text-white border-[#073B67]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            {label}<span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${tab === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{tabCount(key)}</span>
          </button>
        ))}
      </div>
      <div className="relative w-full sm:ml-auto sm:w-64">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search contractor, site, ref…" className="w-full h-9 rounded-full border border-gray-200 bg-white pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#073B67]/20" />
      </div>
    </div>

    {filtered.length === 0 && <p className="text-sm text-gray-500 text-center py-10">No binding requests match{query ? ` “${query}”` : ''}.</p>}

    <div className="grid gap-4 xl:grid-cols-2">
      {filtered.map(req => (
        <article key={req.id} className="flex h-full flex-col bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex gap-3 min-w-0">
              <span className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 text-[#073B67] flex items-center justify-center flex-shrink-0"><Building2 size={20}/></span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-gray-950">{req.contractor}</h3>{badge(req.status)}</div>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{req.contractorCode} · {req.lin}</p>
              </div>
            </div>
            <div className="text-left sm:text-right flex-shrink-0 text-xs text-gray-500"><p>Requested {req.requestedOn}</p><p className="font-mono text-[11px] text-gray-400 mt-0.5">{req.ref}</p><p className="mt-0.5">Initiated by {req.initiatedBy || '—'}{req.acceptedBy ? ` · Accepted by ${req.acceptedBy}` : ''}</p><button onClick={() => setHistoryFor(req)} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#073B67] hover:underline"><History size={12}/>History</button></div>
          </div>

          <dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><dt className="text-gray-400">Principal employer</dt><dd className="font-semibold text-gray-800 mt-0.5">{req.employer}</dd></div>
            <div><dt className="text-gray-400">Site</dt><dd className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1"><MapPin size={11} className="text-gray-400"/>{req.site}</dd></div>
            <div><dt className="text-gray-400">Designation</dt><dd className="font-semibold text-gray-800 mt-0.5">{req.designation}</dd></div>
            <div><dt className="text-gray-400">Cost sheet</dt><dd className="font-semibold text-green-700 mt-0.5">{req.costSheetName || req.wage || '—'}</dd></div>
          </dl>

          {req.status === 'Accepted' && req.contractorDetails && (
            <div className="mt-4 rounded-xl border border-green-100 bg-green-50/40 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-green-700 mb-2">Contractor details — unlocked by your binding</p>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div><dt className="text-gray-400">Trade name</dt><dd className="font-semibold text-gray-800 mt-0.5">{req.contractorDetails.tradeName || '—'}</dd></div>
                <div><dt className="text-gray-400">Contact person</dt><dd className="font-semibold text-gray-800 mt-0.5">{req.contractorDetails.contactPerson || '—'}</dd></div>
                <div><dt className="text-gray-400">Email</dt><dd className="font-semibold text-gray-800 mt-0.5 break-all">{req.contractorDetails.email || '—'}</dd></div>
                <div><dt className="text-gray-400">State</dt><dd className="font-semibold text-gray-800 mt-0.5">{req.contractorDetails.state || '—'}</dd></div>
                <div className="col-span-2"><dt className="text-gray-400">Registered address</dt><dd className="font-semibold text-gray-800 mt-0.5">{req.contractorDetails.address || '—'}</dd></div>
              </dl>
            </div>
          )}

          {req.status === 'Pending' && (req.consentWorker && !req.consentContractor ? (
            // This worker raised the request (scanned the contractor QR), so their
            // consent is already recorded — it is waiting on the contractor, not on
            // the worker. Never show "Accept" on the worker's own request.
            <div className="mt-auto pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><Clock3 size={14}/>Awaiting contractor approval — you raised this request.</p>
            </div>
          ) : (
            <div className="mt-auto pt-4 border-t border-gray-100 flex flex-wrap gap-2">
              <button onClick={() => setConfirm({ req, kind: 'accept' })} disabled={busyId===req.id} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-sm font-bold flex items-center gap-2 hover:bg-[#062D4F] disabled:opacity-60"><Link2 size={15}/>{busyId===req.id?'Approving…':'Accept & Bind'}</button>
              <button onClick={() => setConfirm({ req, kind: 'decline' })} disabled={busyId===req.id} className="h-10 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-bold flex items-center gap-2 hover:bg-red-50 disabled:opacity-60"><XCircle size={15}/>Decline</button>
            </div>
          ))}
          {req.status === 'Accepted' && (req.unbindRequested ? (
            <div className="mt-auto pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
              <p className="text-xs text-orange-700 font-semibold flex items-center gap-1.5"><XCircle size={14}/>{req.unbindConsentWorker ? 'Unbinding requested — awaiting the contractor’s consent.' : 'The contractor requested unbinding — awaiting your consent.'}</p>
              {!req.unbindConsentWorker && <button onClick={() => setConfirm({ req, kind: 'unbind' })} disabled={busyId===req.id} className="h-9 px-3 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-red-700 disabled:opacity-60"><XCircle size={14}/>{busyId===req.id?'Confirming…':'Confirm unbind'}</button>}
              {!req.unbindConsentWorker && <button onClick={() => void rejectUnbind(req)} disabled={busyId===req.id} className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-60">Reject request</button>}
            </div>
          ) : (
            <div className="mt-auto pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
              <p className="text-xs text-green-700 font-semibold flex items-center gap-1.5"><CheckCircle2 size={14}/>Binding active · employment started with {req.contractor} on approval of both parties.</p>
              <button onClick={() => setConfirm({ req, kind: 'unbind' })} disabled={busyId===req.id} className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-bold flex items-center gap-1.5 hover:bg-red-50 disabled:opacity-60"><XCircle size={14}/>Request Unbind</button>
            </div>
          ))}
          {req.status === 'Cancelled' && <p className="mt-auto pt-4 border-t border-gray-100 text-xs text-gray-500 font-semibold">Binding unbound — both parties consented.</p>}
          {req.status === 'Site Changed' && <p className="mt-auto pt-4 border-t border-gray-100 text-xs text-gray-500 font-semibold">Binding closed — your contractor moved you to another site; your engagement continues there.</p>}
        </article>
      ))}
    </div>

    {authRequest && boundContractor && (
      <RebindAuthModal
        currentContractor={boundContractor}
        targetContractor={authRequest.contractor}
        contextLabel={`Binding request ${authRequest.id} · ${authRequest.contractor} · ${authRequest.site}`}
        onCancel={() => setAuthRequestId(null)}
        onAuthenticated={() => { setAuthRequestId(null); void act(authRequest.id, 'accept'); }}
      />
    )}
    <ConfirmDialog
      open={!!confirm}
      tone={confirm?.kind === 'accept' ? 'positive' : 'negative'}
      title={confirm?.kind === 'decline' ? 'Decline this binding?' : confirm?.kind === 'unbind' ? 'Unbind this binding?' : 'Accept this binding?'}
      description={confirm?.kind === 'decline'
        ? 'The contractor will be notified and this request will be declined. This cannot be undone.'
        : confirm?.kind === 'unbind'
          ? 'This requests unbinding. The binding is cancelled only when both parties confirm.'
          : 'Both parties must approve before you are bound. Accepting records your consent and starts your employment at the site.'}
      details={confirm ? [
        { label: 'Contractor', value: confirm.req.contractor },
        { label: 'Contractor ID', value: confirm.req.contractorCode },
        { label: 'Site', value: confirm.req.site },
        { label: 'Designation', value: confirm.req.designation },
      ] : []}
      confirmLabel={confirm?.kind === 'decline' ? 'Confirm decline' : confirm?.kind === 'unbind' ? 'Confirm unbind' : 'Confirm accept'}
      busy={!!confirm && busyId === confirm.req.id}
      onCancel={() => setConfirm(null)}
      onConfirm={runConfirm}
    />
    <BindingHistoryDialog
      open={!!historyFor}
      title="Binding history"
      subtitle={historyFor ? `${historyFor.contractor} · ${historyFor.ref}` : ''}
      events={historyFor?.history ?? []}
      onClose={() => setHistoryFor(null)}
    />
  </div>;
}
