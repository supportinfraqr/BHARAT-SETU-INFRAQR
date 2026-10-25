"use client";

import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Clock3, Handshake, History, KeyRound, Link2, MapPin, UserRound } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SitePermissionsDialog from '@/components/ui/SitePermissionsDialog';
import BindingHistoryDialog from '@/components/ui/BindingHistoryDialog';
import { useContractor } from '@/contexts/ContractorContext';
import { usePortalAutoRefresh } from '@/lib/usePortalAutoRefresh';
import { formatISTDateTime } from '@/lib/date';
import { ResendOtp } from '@/components/auth/ResendOtp';
import type { ContractorBindingRequest } from '@/types/portal';

export default function ContractorBindingRequestsPage() {
  const { contractor, replaceContractor, refresh, mutate, employerScope } = useContractor();
  // Keep binding requests live (refresh on mount / focus / every 20s).
  usePortalAutoRefresh(refresh, { pollMs: 20000 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [otpFor, setOtpFor] = useState<ContractorBindingRequest | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpMode, setOtpMode] = useState<'bind' | 'unbind'>('bind');
  const [wageFor, setWageFor] = useState<ContractorBindingRequest | null>(null);
  const [acceptSheet, setAcceptSheet] = useState('');
  const [acceptMode, setAcceptMode] = useState<'sheet' | 'manual'>('sheet');
  const [acceptWage, setAcceptWage] = useState('');
  const [wageError, setWageError] = useState('');
  const [costSheets, setCostSheets] = useState<Array<{ id:number; name:string; code:string; status?:string; ownerId?:number|null; siteId?:number|null; siteName?:string }>>([]);
  const [confirm, setConfirm] = useState<{ row: ContractorBindingRequest; kind: 'approve' | 'reject' | 'accept' | 'ce-unbind' | 'worker-unbind' | 'worker-decline' } | null>(null);
  const [sitesFor, setSitesFor] = useState<ContractorBindingRequest | null>(null);
  const [historyFor, setHistoryFor] = useState<ContractorBindingRequest | null>(null);
  const [siteMoveFor, setSiteMoveFor] = useState<ContractorBindingRequest | null>(null);
  const [siteMoveChoice, setSiteMoveChoice] = useState('');
  const [siteMoveError, setSiteMoveError] = useState('');

  const rows = employerScope === 'all' ? contractor.bindingRequests : contractor.bindingRequests.filter(r => r.employer === employerScope);

  // Cost sheets the contractor can attach at bind time — only employer-accepted
  // (PUBLISHED) copies, filtered to the binding's site.
  useEffect(() => {
    let active = true;
    void fetch('/api/contractor/cost-sheets', { cache:'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((b: { rows?: Array<{ id:number; name:string; code:string; status?:string; ownerId?:number|null; siteId?:number|null; siteName?:string }> } | null) => {
        if (active && b?.rows) setCostSheets(b.rows);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const acceptSite = wageFor ? contractor.sites.find(s => s.id === wageFor.siteId) : undefined;
  const acceptSheets = costSheets.filter(s => s.status === 'PUBLISHED' && !!s.ownerId && (!s.siteId || (acceptSite && String(s.siteId) === acceptSite.id)));

  async function accept(row: ContractorBindingRequest, costSheetId?: number, offeredWage?: number) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/worker/bindings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, action: 'accept', costSheetId, offeredWage }) });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
      if (!response.ok) throw new Error(result.error || 'Binding could not be accepted.');
      const accepted = result.data?.status === 'Accepted';
      replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.id === row.id ? { ...item, status: (accepted ? 'Accepted' : 'Pending') as ContractorBindingRequest['status'], consentContractor: true } : item) });
      setNotice(accepted ? `Bound to ${row.entityName}.` : `Accepted — awaiting the worker's consent.`);
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Request could not be updated.'); }
    finally { setBusy(false); }
  }

  function openWagePrompt(row: ContractorBindingRequest) {
    setWageFor(row);
    setAcceptSheet('');
    setAcceptMode('sheet');
    setAcceptWage('');
    setWageError('');
  }

  async function confirmWage() {
    if (!wageFor) return;
    const row = wageFor;
    if (acceptMode === 'sheet') {
      if (!acceptSheet) { setWageError('Pick an employer-accepted cost sheet for the site.'); return; }
      setWageFor(null);
      await accept(row, Number(acceptSheet));
      return;
    }
    const wage = Number(acceptWage);
    if (!(wage > 0)) { setWageError('Enter a valid monthly gross wage (₹).'); return; }
    setWageFor(null);
    await accept(row, undefined, wage);
  }

  async function declineWorker(row: ContractorBindingRequest) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/worker/bindings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, action: 'decline' }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Binding request could not be declined.');
      replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.id === row.id ? { ...item, status: 'Rejected' as ContractorBindingRequest['status'] } : item) });
      setNotice(`Binding request from ${row.entityName} declined.`);
      void refresh();
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
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Request could not be updated.'); }
    finally { setBusy(false); }
  }

  async function sendWorkerOtp(row: ContractorBindingRequest, mode: 'bind' | 'unbind') {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/worker/bindings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, action: 'send-otp', target: 'worker' }) });
      const result = await response.json().catch(() => ({})) as { error?: string; mobile?: string };
      if (!response.ok) throw new Error(result.error || 'OTP could not be sent.');
      setOtpFor(row); setOtpMode(mode); setOtpSent(true); setOtp('');
      setNotice(`OTP sent to the worker's mobile ${result.mobile ?? ''}. Enter the OTP the worker reads out to record their ${mode === 'unbind' ? 'unbinding' : 'binding'} consent.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'OTP could not be sent.'); }
    finally { setBusy(false); }
  }

  async function verifyWorkerOtp() {
    if (!otpFor) return;
    setBusy(true); setError('');
    try {
      const unbind = otpMode === 'unbind';
      const response = await fetch('/api/worker/bindings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: otpFor.id, action: unbind ? 'unbind' : 'accept-otp', side: 'worker', otp }) });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
      if (!response.ok) throw new Error(result.error || 'OTP verification failed.');
      if (unbind) {
        const cancelled = result.data?.status === 'Cancelled';
        replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.id === otpFor.id ? { ...item, status: (cancelled ? 'Cancelled' : 'Accepted') as ContractorBindingRequest['status'], unbindRequested: true, unbindConsentWorker: true, unbindConsentContractor: cancelled ? true : item.unbindConsentContractor } : item) });
        setNotice(cancelled ? `Unbound from ${otpFor.entityName} — worker consent recorded via OTP.` : 'Worker unbinding consent recorded via OTP.');
      } else {
        const accepted = result.data?.status === 'Accepted';
        replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.id === otpFor.id ? { ...item, status: (accepted ? 'Accepted' : 'Pending') as ContractorBindingRequest['status'], consentWorker: true } : item) });
        setNotice(accepted ? `Bound to ${otpFor.entityName} — worker consent recorded via OTP.` : `Worker consent recorded via OTP — awaiting the contractor's acceptance.`);
      }
      setOtpFor(null); setOtpSent(false); setOtp('');
      void refresh();
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
      void refresh();
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
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unbinding could not be requested.'); }
    finally { setBusy(false); }
  }

  async function rejectCeUnbind(row: ContractorBindingRequest) {
    if (!row.bindingId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/contractor/binding-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bindingId: row.bindingId, action: 'reject-unbind' }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'The unbind request could not be rejected.');
      replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.bindingId === row.bindingId ? { ...item, unbindRequested: false, unbindConsentContractor: false } : item) });
      setNotice(`Unbind request from ${row.entityName} rejected — the binding stays active.`);
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The unbind request could not be rejected.'); }
    finally { setBusy(false); }
  }

  async function rejectWorkerUnbind(row: ContractorBindingRequest) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/worker/bindings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, action: 'decline-unbind', side: 'contractor' }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'The unbind request could not be rejected.');
      replaceContractor({ ...contractor, bindingRequests: contractor.bindingRequests.map(item => item.id === row.id ? { ...item, unbindRequested: false, unbindConsentContractor: false } : item) });
      setNotice(`Unbind request from ${row.entityName} rejected — the binding stays active.`);
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The unbind request could not be rejected.'); }
    finally { setBusy(false); }
  }

  async function contractorSiteAction(action: 'approve-site' | 'reject-site' | 'request-site-release' | 'cancel-site-release', siteId: number) {
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
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Site permission could not be updated.'); }
    finally { setBusy(false); }
  }

  async function changeWorkerSite() {
    if (!siteMoveFor?.bindingId || !siteMoveChoice) return;
    setBusy(true); setError(''); setNotice(''); setSiteMoveError('');
    try {
      await mutate('worker-site', 'POST', { bindingId: String(siteMoveFor.bindingId), siteId: String(siteMoveChoice) });
      setSiteMoveFor(null); setSiteMoveChoice('');
      setNotice('Worker moved — the old binding is closed and a new one was created at the selected site.');
      void refresh();
    } catch (reason) { setSiteMoveError(reason instanceof Error ? reason.message : 'The site could not be changed.'); }
    finally { setBusy(false); }
  }

  async function runConfirm() {
    if (!confirm) return;
    const { row, kind } = confirm;
    setConfirm(null);
    if (kind === 'accept') { await accept(row); return; }
    if (kind === 'worker-decline') { await declineWorker(row); return; }
    if (kind === 'ce-unbind') { await decideCeUnbind(row); return; }
    if (kind === 'worker-unbind') { await consentUnbind(row); return; }
    await decideBinding(row, kind === 'approve' ? 'approve-binding' : 'reject');
  }

  const columns: DataColumn<ContractorBindingRequest>[] = [
    { id:'entity', header:'Entity', value:r => r.entityName, render:r => <div><strong className="text-bss-text-primary">{r.entityName}</strong><p className="font-mono text-[10px] text-bss-text-muted">{r.bssId}</p></div> },
    { id:'type', header:'Request type', value:r => r.type, render:r => <span className={`px-2 py-1 rounded text-[10px] font-semibold ${r.type === 'Employer' ? 'bg-bss-blue-tint text-bss-interactive-blue' : 'bg-bss-soft-orange text-bss-orange'}`}>{r.type === 'Employer' ? 'Contractor ↔ Employer' : 'Contractor ↔ Worker'}</span> },
    { id:'site', header:'Site', value:r => r.site, export:{split:','}, render:r => {
      const names = r.site.split(',').map(s => s.trim()).filter(Boolean);
      if (!names.length) return <span className="text-bss-text-muted">—</span>;
      const statusOf = (name: string) => (r.allotments ?? []).find(a => a.site === name)?.status;
      const tone = (s?: string) => s === 'Approved' ? 'bg-bss-soft-green text-bss-green border-bss-border'
        : s === 'Rejected' ? 'bg-bss-soft-orange text-bss-error border-bss-border'
        : s === 'Released' ? 'bg-bss-bg text-bss-text-muted border-bss-border'
        : 'bg-bss-soft-orange text-bss-orange border-bss-border';
      
      if (names.length <= 3) {
        return <div className="flex max-w-[220px] flex-wrap gap-1">{names.map(n => { const s = statusOf(n); return <span key={n} title={`${n} (${s || 'Pending'})`} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone(s)}`}>{n}</span>; })}</div>;
      }
      
      const visible = names.slice(0, 2);
      const remaining = names.length - 2;
      return (
        <div className="flex flex-col gap-1 max-w-[200px]">
          <div className="flex flex-wrap gap-1">
            {visible.map(n => { const s = statusOf(n); return <span key={n} title={`${n} (${s || 'Pending'})`} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone(s)}`}>{n}</span>; })}
          </div>
          <button type="button" onClick={() => setSitesFor(r)} className="text-left text-[11px] font-bold text-[#01183A] hover:underline cursor-pointer">
            + {remaining} more sites
          </button>
        </div>
      );
    } },
    { id:'employer', header:'Employer', value:r => r.employer },
    { id:'detail', header:'Designation / Wage', value:r => r.designation, render:r => <div><p className="text-bss-text-primary">{r.designation}</p><p className="text-[10px] text-bss-text-muted">{r.wage}</p></div> },
    { id:'joining', header:'Date of joining', value:r => r.type === 'Worker' ? (r.joiningDate || '—') : '—' },
    { id:'requested', header:'Requested (IST)', value:r => formatISTDateTime(r.requestedOn) },
    { id:'initiated', header:'Initiated by', value:r => r.initiatedBy || '—', render:r => <span className="font-semibold text-bss-text-primary">{r.initiatedBy || '—'}</span> },
    { id:'accepted', header:'Accepted by', value:r => r.acceptedBy || '—', render:r => <span className={r.acceptedBy ? 'font-semibold text-bss-green' : 'text-bss-text-muted'}>{r.acceptedBy || '—'}</span> },
    { id:'status', header:'Relationship', value:r => r.status, render:r => <span className={r.status === 'Accepted' ? 'text-bss-green' : r.status === 'Rejected' || r.status === 'Cancelled' ? 'text-bss-error' : r.status === 'Site Changed' ? 'text-bss-text-muted' : 'text-bss-orange'}>{r.status}</span> },
    { id:'actions', header:'Action', filterable:false, value:r => r.status, render:r => {
      if (r.type === 'Employer') {
        if (r.status === 'Pending' && !r.consentContractor) return <div className="flex items-center gap-1.5"><button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'approve' })} className="h-8 px-3 rounded-lg bg-bss-green hover:bg-bss-green active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50">Accept binding</button><button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'reject' })} className="h-8 px-3 rounded-lg border border-bss-border bg-bss-soft-orange hover:bg-bss-soft-orange text-bss-error active:scale-95 text-xs font-bold transition-all disabled:opacity-50">Decline</button></div>;
        if (r.status === 'Pending') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-bss-soft-orange text-bss-orange border border-bss-border/60">Awaiting employer</span>;
        if (r.status === 'Accepted') {
          if (r.unbindRequested) {
            return r.unbindConsentContractor
              ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-bss-soft-orange text-bss-orange border border-bss-border/60">Awaiting employer</span>
              : <div className="flex items-center gap-1.5"><button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'ce-unbind' })} className="h-8 px-3 rounded-lg bg-bss-error hover:bg-bss-error active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50">Confirm unbind</button><button disabled={busy} onClick={() => void rejectCeUnbind(r)} className="h-8 px-3 rounded-lg border border-bss-border bg-white hover:bg-bss-bg text-bss-text-primary active:scale-95 text-xs font-bold transition-all disabled:opacity-50">Reject request</button></div>;
          }
          return <div className="flex items-center gap-1.5"><button disabled={busy} onClick={() => setSitesFor(r)} className="h-8 px-3 rounded-lg border border-bss-border bg-bss-blue-tint hover:bg-bss-blue-tint text-[#01183A] active:scale-95 text-xs font-bold transition-all disabled:opacity-50">Site permissions</button><button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'ce-unbind' })} className="h-8 px-3 rounded-lg border border-bss-border bg-bss-soft-orange hover:bg-bss-soft-orange text-bss-error active:scale-95 text-xs font-bold transition-all disabled:opacity-50">Request unbind</button></div>;
        }
        return <span className="text-bss-text-muted">—</span>;
      }
      if (r.status === 'Accepted' && r.unbindRequested && !r.unbindConsentContractor) return <div className="flex items-center gap-1.5"><button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'worker-unbind' })} className="h-8 px-3 rounded-lg bg-bss-error hover:bg-bss-error active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50">Confirm unbind</button><button disabled={busy} onClick={() => void rejectWorkerUnbind(r)} className="h-8 px-3 rounded-lg border border-bss-border bg-white hover:bg-bss-bg text-bss-text-primary active:scale-95 text-xs font-bold transition-all disabled:opacity-50">Reject request</button></div>;
      if (r.status === 'Accepted' && r.unbindRequested) return <div className="flex items-center gap-2"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-bss-soft-orange text-bss-orange border border-bss-border/60">Awaiting worker</span><button disabled={busy} onClick={() => void sendWorkerOtp(r, 'unbind')} className="h-8 px-3 rounded-lg border border-bss-border bg-bss-blue-tint hover:bg-bss-blue-tint text-[#01183A] active:scale-95 text-xs font-bold inline-flex items-center gap-1 transition-all disabled:opacity-50"><KeyRound size={13}/>Send OTP</button></div>;
      if (r.status === 'Pending' && r.consentWorker && !r.consentContractor) return <div className="flex items-center gap-1.5"><button disabled={busy} onClick={() => openWagePrompt(r)} className="h-8 px-3 rounded-lg bg-bss-green hover:bg-bss-green active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50">Accept binding</button><button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'worker-decline' })} className="h-8 px-3 rounded-lg border border-bss-border bg-bss-soft-orange hover:bg-bss-soft-orange text-bss-error active:scale-95 text-xs font-bold transition-all disabled:opacity-50">Decline</button></div>;
      if (r.status === 'Pending' && !r.consentWorker && r.type === 'Worker') return <button disabled={busy} onClick={() => void sendWorkerOtp(r, 'bind')} className="h-8 px-3 rounded-lg border border-bss-border bg-bss-blue-tint hover:bg-bss-blue-tint text-[#01183A] active:scale-95 text-xs font-bold inline-flex items-center gap-1 transition-all disabled:opacity-50"><KeyRound size={13}/>Send OTP</button>;
      if (r.status === 'Pending' && !r.consentWorker) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-bss-bg text-bss-text-secondary border border-bss-border/60">Awaiting worker</span>;
      if (r.status === 'Accepted') return <div className="flex items-center gap-2"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-bss-soft-green text-bss-green border border-bss-border/60">Active</span><button disabled={busy} onClick={() => { setSiteMoveFor(r); setSiteMoveChoice(''); setSiteMoveError(''); }} className="h-8 px-3 rounded-lg border border-bss-border bg-bss-blue-tint hover:bg-bss-blue-tint text-[#01183A] active:scale-95 text-xs font-bold inline-flex items-center gap-1 transition-all disabled:opacity-50"><MapPin size={13}/>Change Site</button><button disabled={busy} onClick={() => setConfirm({ row: r, kind: 'worker-unbind' })} className="h-8 px-3 rounded-lg border border-bss-border bg-bss-soft-orange hover:bg-bss-soft-orange text-bss-error active:scale-95 text-xs font-bold transition-all disabled:opacity-50">Request unbind</button></div>;
      return <span className="text-bss-text-muted">—</span>;
    } },
    { id:'history', header:'History', filterable:false, value:() => '', render:r => <button disabled={busy} onClick={() => setHistoryFor(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#01183A] hover:underline"><History size={13}/>History</button> },
  ];

  const pending = rows.filter(r => r.status === 'Pending').length;

  return <div className="space-y-6">
    <header className="relative overflow-hidden rounded-3xl bss-anim-gradient bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue text-white p-5 sm:p-6 shadow-lg">
      <div aria-hidden className="absolute -right-8 -top-10 w-44 h-44 rounded-full bg-white/5 blur-2xl" />
      <div className="relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">QR system · Two-way consent</p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Binding Requests</h1>
        <p className="text-sm text-white/75 mt-1 max-w-2xl">Contractor ↔ Worker and Contractor ↔ Employer binding requests. Approval is never automatic — both parties must accept before binding is complete.</p>
      </div>
    </header>

    {/* How binding works — reuses Worker portal pattern */}
    <section className="rounded-xl border border-bss-border bg-bss-blue-tint/60 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <span className="w-11 h-11 rounded-xl bg-white border border-bss-border text-[#01183A] flex items-center justify-center flex-shrink-0"><Handshake size={20}/></span>
      <div className="flex-1"><h2 className="text-sm font-semibold text-bss-text-primary">How binding works</h2><p className="text-xs text-bss-text-muted mt-0.5">Scan a Worker QR to send a binding request, or accept a request raised by a worker or principal employer. Binding is recorded as E-C-S-W only after both parties approve — no scan-to-autobind.</p></div>
      <a href="/contractor/scan" className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#022B5E] flex-shrink-0"><Link2 size={16}/>Scan QR to bind</a>
    </section>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Metric label="Pending" value={pending} icon={Clock3} tone="bg-bss-soft-orange text-bss-orange"/>
      <Metric label="Workers" value={new Set(rows.filter(r => r.type === 'Worker').map(r => r.bssId || r.entityName)).size} icon={UserRound} tone="bg-bss-blue-tint text-bss-interactive-blue"/>
      <Metric label="Employers" value={new Set(rows.filter(r => r.type === 'Employer').map(r => r.bssId || r.entityName)).size} icon={Building2} tone="bg-bss-blue-tint text-bss-interactive-blue"/>
      <Metric label="Active bindings" value={rows.filter(r => r.status === 'Accepted').length} icon={CheckCircle2} tone="bg-bss-soft-green text-bss-green"/>
    </div>

    {error && <p role="alert" className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-bss-green bg-bss-soft-green border border-bss-border rounded-xl p-3">{notice}</p>}

    <div className="bss-scroll-rise">
    <EnterpriseDataTable title="Binding request register" rows={rows} columns={columns} rowKey={r => r.id} filename="contractor-binding-requests" showDownload={false}/>
    </div>

    {otpFor && (
      <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
        <section role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <h2 className="font-semibold text-bss-text-primary">{otpMode === 'unbind' ? 'Confirm unbinding via worker OTP' : 'Approve binding via worker OTP'}</h2>
          <p className="text-xs text-bss-text-muted mt-1">{otpFor.entityName} · {otpFor.site}</p>
          <p className="text-[11px] text-bss-text-muted mt-2">The OTP is sent to the worker&apos;s mobile. If the worker has no smartphone, ask them to read it out and enter it here to record their {otpMode === 'unbind' ? 'unbinding' : 'binding'} consent.</p>
          {otpSent && <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit OTP" className="mt-4 w-full bg-[#F5F5F7] border border-bss-border rounded-xl px-4 py-3 text-center tracking-[0.4em] font-bold focus:outline-none"/>}
          {otpSent && <ResendOtp onSend={() => sendWorkerOtp(otpFor, otpMode)} className="mt-2 text-center" />}
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => { setOtpFor(null); setOtpSent(false); setOtp(''); }} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold">Cancel</button>
            {otpSent && <button onClick={() => void verifyWorkerOtp()} disabled={busy} className="h-9 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold disabled:opacity-60">{busy ? 'Verifying…' : otpMode === 'unbind' ? 'Verify & Unbind' : 'Verify & Approve'}</button>}
          </div>
        </section>
      </div>
    )}
    {wageFor && (
      <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
        <section role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
          <h2 className="font-semibold text-bss-text-primary">Approve binding — wage terms</h2>
          <p className="text-xs text-bss-text-muted mt-1">{wageFor.entityName} · {wageFor.site}</p>
          <p className="text-[11px] text-bss-text-muted mt-2">Pick the employer-accepted cost sheet for this site, or enter a monthly wage. Whichever you choose is printed on the worker&apos;s appointment letter.</p>
          <div className="mt-4 inline-flex rounded-lg border border-bss-border bg-bss-bg p-0.5 text-xs font-semibold">
            <button type="button" onClick={() => { setAcceptMode('sheet'); setWageError(''); }} className={`px-3 py-1.5 rounded-md transition-colors ${acceptMode === 'sheet' ? 'bg-white text-[#01183A] shadow-sm' : 'text-bss-text-muted'}`}>Cost sheet</button>
            <button type="button" onClick={() => { setAcceptMode('manual'); setWageError(''); }} className={`px-3 py-1.5 rounded-md transition-colors ${acceptMode === 'manual' ? 'bg-white text-[#01183A] shadow-sm' : 'text-bss-text-muted'}`}>Enter wage</button>
          </div>
          {acceptMode === 'sheet' ? (
            <>
              <label className="block mt-3 text-[11px] font-bold uppercase tracking-wider text-bss-text-muted">Cost sheet</label>
              <select value={acceptSheet} onChange={e => { setAcceptSheet(e.target.value); setWageError(''); }} disabled={!acceptSheets.length} className="mt-1.5 w-full bg-[#F5F5F7] border border-bss-border rounded-xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#01183A] disabled:text-bss-text-muted truncate">
                <option value="">{acceptSheets.length ? 'Select an employer-accepted cost sheet…' : 'No accepted cost sheet for this site'}</option>
                {acceptSheets.map(s => <option key={s.id} value={s.id}>{s.name}{s.siteName ? ` · ${s.siteName}` : ''} · {s.code}</option>)}
              </select>
            </>
          ) : (
            <>
              <label className="block mt-3 text-[11px] font-bold uppercase tracking-wider text-bss-text-muted">Monthly gross wage</label>
              <input inputMode="numeric" value={acceptWage} onChange={e => { setAcceptWage(e.target.value.replace(/[^0-9]/g, '')); setWageError(''); }} placeholder="Monthly gross wage (₹)" className="mt-1.5 w-full bg-[#F5F5F7] border border-bss-border rounded-xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#01183A]"/>
            </>
          )}
          {wageError && <p className="text-[11px] text-bss-error font-semibold mt-2">{wageError}</p>}
          <div className="mt-5 flex gap-2 justify-end">
            <button onClick={() => setWageFor(null)} className="h-9 px-4 rounded-lg border border-bss-border text-xs font-semibold hover:bg-bss-bg">Cancel</button>
            <button onClick={() => void confirmWage()} disabled={busy} className="h-9 px-4 rounded-lg bg-bss-green hover:bg-bss-green text-white text-xs font-bold disabled:opacity-60 transition-colors">{busy ? 'Approving…' : 'Approve & Bind'}</button>
          </div>
        </section>
      </div>
    )}
    <SitePermissionsDialog
      open={!!sitesFor}
      title="Site permissions"
      subtitle={sitesFor ? `${sitesFor.entityName} · ${sitesFor.bssId}` : ''}
      intro="Two-step: the employer proposes a site and you approve. To request a new site, scan that site's QR — the employer then approves it."
      rows={(sitesFor?.allotments ?? []).map(a => ({
        siteId: a.siteId,
        name: a.site,
        bssId: a.siteBssId,
        status: a.status,
        source: a.source,
        canApprove: a.status === 'Pending' && a.source === 'employer_allot',
        canReject: a.status === 'Pending' && a.source === 'employer_allot',
        canWithdraw: a.status === 'Pending' && (a.source === 'contractor_request' || a.source === 'site_qr'),
        canPropose: false,
        releaseRequested: !!a.releaseRequested,
        canRelease: a.status === 'Approved' && !a.releaseRequested,
        canCancelRelease: a.status === 'Approved' && !!a.releaseRequested,
      }))}
      busy={busy}
      onClose={() => setSitesFor(null)}
      onApprove={id => void contractorSiteAction('approve-site', id)}
      onReject={id => void contractorSiteAction('reject-site', id)}
      onPropose={() => {}}
      onRelease={id => {
        const a = sitesFor?.allotments?.find(x => x.siteId === id);
        void contractorSiteAction(a?.releaseRequested ? 'cancel-site-release' : 'request-site-release', id);
      }}
      onApproveRelease={() => {}}
      onRejectRelease={() => {}}
    />
    <BindingHistoryDialog
      open={!!historyFor}
      title="Binding history"
      subtitle={historyFor ? `${historyFor.entityName} · ${historyFor.bssId}` : ''}
      events={historyFor?.history ?? []}
      onClose={() => setHistoryFor(null)}
    />
    {siteMoveFor && (
      <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-center p-4">
        <section role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <h2 className="font-semibold text-bss-text-primary">Change worker site</h2>
          <p className="text-xs text-bss-text-muted mt-1">{siteMoveFor.entityName} · current site {siteMoveFor.site || '—'}</p>
          <p className="text-[11px] text-bss-text-muted mt-2">Moving the worker closes the current binding and creates a new one at the selected site of the same employer. As the contractor you can do this yourself — the worker&apos;s consent is not required again.</p>
          <label className="block mt-4 text-[11px] font-bold uppercase tracking-wider text-bss-text-muted">New site</label>
          <select value={siteMoveChoice} onChange={e => { setSiteMoveChoice(e.target.value); setSiteMoveError(''); }} disabled={busy} className="mt-1 w-full bg-white border border-bss-border rounded-xl px-3 py-3 text-sm font-semibold focus:outline-none">
            <option value="">Select site</option>
            {contractor.sites.filter(s => String(s.id) !== String(siteMoveFor.siteId) && (!siteMoveFor.employer || s.employer === siteMoveFor.employer)).map(s => <option key={s.id} value={s.id}>{s.name} — {s.employer}</option>)}
          </select>
          {siteMoveError && <p className="text-[11px] text-bss-error font-semibold mt-2">{siteMoveError}</p>}
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => { setSiteMoveFor(null); setSiteMoveChoice(''); setSiteMoveError(''); }} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold">Cancel</button>
            <button onClick={() => void changeWorkerSite()} disabled={busy || !siteMoveChoice} className="h-9 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold disabled:opacity-60">{busy ? 'Moving…' : 'Move worker'}</button>
          </div>
        </section>
      </div>
    )}
    <ConfirmDialog
      open={!!confirm}
      tone={confirm?.kind === 'approve' || confirm?.kind === 'accept' ? 'positive' : 'negative'}
      title={confirm?.kind === 'reject' || confirm?.kind === 'worker-decline' ? 'Decline this request?' : (confirm?.kind === 'ce-unbind' || confirm?.kind === 'worker-unbind') ? 'Unbind this binding?' : 'Accept this binding?'}
      description={confirm?.kind === 'reject' || confirm?.kind === 'worker-decline'
        ? 'The other party will be notified and this request will be declined. This cannot be undone.'
        : (confirm?.kind === 'ce-unbind' || confirm?.kind === 'worker-unbind')
          ? 'This requests unbinding. The binding is cancelled only when both parties confirm.'
          : 'Both parties must consent before the binding is complete. Confirming records your consent.'}
      details={confirm ? [
        { label: 'Entity', value: confirm.row.entityName },
        { label: 'BSS ID', value: confirm.row.bssId },
        { label: 'Type', value: confirm.row.type === 'Employer' ? 'Contractor ↔ Employer' : 'Contractor ↔ Worker' },
        { label: 'Site', value: confirm.row.site || '—' },
      ] : []}
      confirmLabel={confirm?.kind === 'reject' || confirm?.kind === 'worker-decline' ? 'Confirm decline' : (confirm?.kind === 'ce-unbind' || confirm?.kind === 'worker-unbind') ? 'Confirm unbind' : 'Confirm accept'}
      busy={busy}
      onCancel={() => setConfirm(null)}
      onConfirm={() => void runConfirm()}
    />
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Clock3; tone:string }) { return <div className="bg-white border border-bss-border rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-bss-text-muted">{label}</p></div>; }
