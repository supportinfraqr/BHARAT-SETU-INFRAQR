"use client";

import { useState } from 'react';
import { Building2, Clock3, History, UserRoundCheck } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SitePermissionsDialog, { type SitePermissionStatus } from '@/components/ui/SitePermissionsDialog';
import BindingHistoryDialog from '@/components/ui/BindingHistoryDialog';
import BindingSitesExplainer from '@/components/qr/BindingSitesExplainer';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerApproval } from '@/types/portal';

type Row = EmployerApproval & { __decide?: (row: EmployerApproval, status: 'Approved' | 'Rejected') => void };

export default function EmployerQrBindingRequestsPage() {
  const { employer, replaceEmployer, refresh, mutate } = useEmployer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [allotFor, setAllotFor] = useState<EmployerApproval | null>(null);
  const [confirm, setConfirm] = useState<{ row: EmployerApproval; kind: 'approve' | 'reject' | 'unbind' } | null>(null);
  const [historyFor, setHistoryFor] = useState<EmployerApproval | null>(null);
  const [unbindFor, setUnbindFor] = useState<EmployerApproval | null>(null);
  const [unbindSuccessor, setUnbindSuccessor] = useState<number | ''>('');

  function openAllot(row: EmployerApproval) {
    setAllotFor(row);
  }

  async function runConfirm() {
    if (!confirm) return;
    const { row, kind } = confirm;
    setConfirm(null);
    if (kind === 'unbind') {
      // Hand the contractor's sites (and workers) to a successor. A successor is
      // mandatory only when workers would be orphaned; otherwise it is optional.
      if ((row.workersAtRisk ?? 0) > 0 || (row.sitesAtRisk ?? 0) > 0) {
        setUnbindFor(row);
        setUnbindSuccessor((row.workersAtRisk ?? 0) > 0 ? (row.successorCandidates?.[0]?.contractorId ?? '') : '');
        return;
      }
      await decideUnbind(row);
      return;
    }
    await decide(row, kind === 'approve' ? 'Approved' : 'Rejected');
  }

  async function decide(row: EmployerApproval, status: 'Approved' | 'Rejected') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      let nextStatus: EmployerApproval['status'] = status;
      if (row.bindingId) {
        const response = await fetch('/api/employer/binding-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bindingId: Number(row.bindingId), action: status === 'Approved' ? 'approve-binding' : 'reject' }),
        });
        const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
        if (!response.ok) throw new Error(result.error || 'Binding could not be updated.');
        const returned = String(result.data?.status ?? '').toLowerCase();
        nextStatus = returned === 'accepted' ? 'Accepted' : returned === 'rejected' ? 'Rejected' : returned === 'cancelled' ? 'Cancelled' : 'Pending';
      } else {
        await mutate('approvals', 'PATCH', { ids: [row.id], status });
      }
      const approved = nextStatus === 'Approved' || nextStatus === 'Accepted';
      replaceEmployer({
        ...employer,
        approvals: employer.approvals.map(item => item.id === row.id ? { ...item, status: nextStatus } : item),
        contractors: employer.contractors.map(item => item.id === row.entityId && row.entityType === 'Contractor' ? { ...item, verified: approved, status: approved ? 'Active' : 'Suspended' } : item),
        workers: employer.workers.map(item => item.id === row.entityId && row.entityType === 'Worker' ? { ...item, verified: approved, status: approved ? 'Active' : 'Inactive' } : item),
      });
      setNotice(`${row.name} ${nextStatus.toLowerCase()}.`);
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Request could not be updated.'); }
    finally { setBusy(false); }
  }

  function applyAllotments(row: EmployerApproval, allotments: EmployerApproval['allotments'], contractors?: typeof employer.contractors) {
    const approved = (allotments ?? []).filter(a => a.status === 'Approved');
    const names = approved.map(a => a.site).join(', ');
    const next = { allotments, site: names || 'Sites to be allotted', siteIds: approved.map(a => a.siteId) };
    replaceEmployer({
      ...employer,
      approvals: employer.approvals.map(item => item.id === row.id ? { ...item, ...next } : item),
      contractors: contractors ?? employer.contractors,
    });
    setAllotFor(prev => prev && prev.id === row.id ? { ...prev, ...next } : prev);
  }

  async function bindingSiteAction(action: 'allot' | 'approve-site' | 'reject-site' | 'approve-site-release' | 'reject-site-release' | 'release-site' | 'set-site-successor', payload: { siteIds?: number[]; siteId?: number; successorContractorId?: number }) {
    if (!allotFor?.bindingId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/binding-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bindingId: Number(allotFor.bindingId), action, ...payload }) });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { allotments?: EmployerApproval['allotments'] } };
      if (!response.ok) throw new Error(result.error || 'Site permissions could not be updated.');
      applyAllotments(allotFor, result.data?.allotments ?? allotFor.allotments);
      const notices: Partial<Record<typeof action, string>> = {
        allot: `Site proposed to ${allotFor.name} — awaiting their approval.`,
        'approve-site': 'Site approved.',
        'reject-site': 'Site rejected.',
        'set-site-successor': 'Successor saved for this site.',
        'release-site': 'Site released.',
        'approve-site-release': 'Site release approved.',
        'reject-site-release': 'Site release declined.',
      };
      setNotice(notices[action] ?? 'Site permissions updated.');
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Site permissions could not be updated.'); }
    finally { setBusy(false); }
  }

  async function decideUnbind(row: EmployerApproval, successorContractorId?: number) {
    if (!row.bindingId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/binding-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bindingId: Number(row.bindingId), action: 'unbind', ...(successorContractorId ? { successorContractorId } : {}) }) });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
      if (!response.ok) throw new Error(result.error || 'Unbinding could not be requested.');
      const cancelled = String(result.data?.status ?? '').toLowerCase() === 'cancelled';
      replaceEmployer({ ...employer, approvals: employer.approvals.map(item => item.id === row.id ? { ...item, status: cancelled ? 'Cancelled' : item.status, unbindRequested: true, unbindConsentEmployer: true } : item) });
      setNotice(cancelled ? `${row.name} unbound — both parties consented.` : `Unbinding requested — awaiting ${row.name}’s consent.`);
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unbinding could not be requested.'); }
    finally { setBusy(false); }
  }

  async function rejectUnbind(row: EmployerApproval) {
    if (!row.bindingId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/binding-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bindingId: Number(row.bindingId), action: 'reject-unbind' }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'The unbind request could not be rejected.');
      replaceEmployer({ ...employer, approvals: employer.approvals.map(item => item.id === row.id ? { ...item, unbindRequested: false, unbindConsentEmployer: false } : item) });
      setNotice(`Unbind request from ${row.name} rejected — the binding stays active.`);
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The unbind request could not be rejected.'); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<Row>[] = [
    { id:'entity', header:'Requesting entity', value:row => row.name, render:row => <div><strong className="text-gray-900">{row.name}</strong><p className="font-mono text-[10px] text-gray-400">{row.bssId}</p></div> },
    { id:'type', header:'Request type', value:row => row.entityType, render:row => <span className={`px-2 py-1 rounded text-[10px] font-semibold ${row.entityType === 'Contractor' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>{row.entityType}</span> },
    { id:'site', header:'Site', value:row => row.site, export:{split:','} },
    { id:'through', header:'Connected through', value:row => row.contractor ?? 'Direct contractor request' },
    { id:'submitted', header:'Requested', value:row => row.submittedAt.slice(0, 10) },
    { id:'initiated', header:'Initiated by', value:row => row.initiatedBy || '—', render:row => <span className="font-semibold text-gray-700">{row.initiatedBy || '—'}</span> },
    { id:'accepted', header:'Accepted by', value:row => row.acceptedBy || '—', render:row => <span className={row.acceptedBy ? 'font-semibold text-green-700' : 'text-gray-400'}>{row.acceptedBy || '—'}</span> },
    { id:'status', header:'Relationship', value:row => row.status, render:row => <span className={row.status === 'Approved' || row.status === 'Accepted' ? 'text-green-700' : row.status === 'Rejected' || row.status === 'Cancelled' ? 'text-red-700' : 'text-orange-700'}>{row.status}</span> },
    { id:'actions', header:'Action', filterable:false, value:row => row.status, render:row => {
      if (row.status === 'Pending') {
        // A contractor↔employer binding the employer already consented to (they
        // scanned the contractor's QR) only needs the contractor's consent.
        if (row.bindingId && row.consentEmployer) return (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">Awaiting contractor</span>
            <button disabled={busy} onClick={() => openAllot(row)} className="h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#073B67] active:scale-95 text-xs font-bold transition-all disabled:opacity-50">Site permissions</button>
          </div>
        );
        return (
          <div className="flex items-center gap-1.5">
            <button
              disabled={busy}
              onClick={() => setConfirm({ row, kind: 'approve' })}
              className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              Approve
            </button>
            <button
              disabled={busy}
              onClick={() => setConfirm({ row, kind: 'reject' })}
              className="h-8 px-3 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95 text-xs font-bold transition-all disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        );
      }
      if (row.bindingId && (row.status === 'Accepted' || row.status === 'Approved')) {
        if (row.unbindRequested) {
          return row.unbindConsentEmployer
            ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">Awaiting contractor</span>
            : <div className="flex items-center gap-1.5"><button disabled={busy} onClick={() => setConfirm({ row, kind: 'unbind' })} className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50">Confirm unbind</button><button disabled={busy} onClick={() => void rejectUnbind(row)} className="h-8 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 active:scale-95 text-xs font-bold transition-all disabled:opacity-50">Reject request</button></div>;
        }
        return (
          <div className="flex items-center gap-1.5">
            <button disabled={busy} onClick={() => openAllot(row)} className="h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#073B67] active:scale-95 text-xs font-bold transition-all disabled:opacity-50">Site permissions</button>
            <button disabled={busy} onClick={() => setConfirm({ row, kind: 'unbind' })} className="h-8 px-3 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95 text-xs font-bold transition-all disabled:opacity-50">Unbind</button>
          </div>
        );
      }
      return <span className="text-gray-400">—</span>;
    } },
    { id:'history', header:'History', filterable:false, value:() => '', render:row => <button disabled={busy} onClick={() => setHistoryFor(row)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#073B67] hover:underline"><History size={13}/>History</button> },
  ];
  const rows: Row[] = employer.approvals;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">QR system</p><h1 className="text-2xl font-bold mt-1">Binding Requests</h1><p className="text-sm text-gray-500 mt-1">Manage contractor and worker requests to bind to your organisation and sites.</p></header>
    <BindingSitesExplainer/>
    <div className="grid grid-cols-3 gap-3"><Metric label="Pending" value={rows.filter(r => r.status === 'Pending').length} icon={Clock3} tone="bg-orange-50 text-orange-700"/><Metric label="Contractors" value={new Set(rows.filter(r => r.entityType === 'Contractor').map(r => r.entityId || r.bssId)).size} icon={Building2} tone="bg-blue-50 text-blue-700"/><Metric label="Workers" value={new Set(rows.filter(r => r.entityType === 'Worker').map(r => r.entityId || r.bssId)).size} icon={UserRoundCheck} tone="bg-green-50 text-green-700"/></div>
    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}
    <EnterpriseDataTable title="Binding request register" rows={rows} columns={columns} rowKey={row => row.id} filename="employer-binding-requests"/>

    <SitePermissionsDialog
      key={allotFor?.id ?? 'none'}
      open={!!allotFor}
      title="Site permissions"
      subtitle={allotFor ? `${allotFor.name} · ${allotFor.bssId}` : ''}
      intro="Two-step: you propose a site and the contractor approves — or the contractor requests and you approve. Workers only operate at approved sites."
      rows={(allotFor?.allotments ?? []).map(a => ({
        siteId: a.siteId,
        name: a.site,
        code: a.siteCode,
        status: a.status as SitePermissionStatus,
        source: a.source,
        isDefault: employer.defaultSite?.id === String(a.siteId),
        canApprove: a.status === 'Pending' && (a.source === 'contractor_request' || a.source === 'site_qr'),
        canReject: a.status === 'Pending' && (a.source === 'contractor_request' || a.source === 'site_qr'),
        canWithdraw: a.status === 'Pending' && a.source === 'employer_allot',
        canPropose: a.status === 'Rejected' || a.status === 'Released',
        releaseRequested: !!a.releaseRequested,
        canApproveRelease: a.status === 'Approved' && !!a.releaseRequested,
        canRejectRelease: a.status === 'Approved' && !!a.releaseRequested,
        canEmployerRelease: a.status === 'Approved' && !a.releaseRequested,
        workersAtRisk: a.workersAtRisk ?? 0,
        successorContractorId: a.successorContractorId ?? null,
        successorCandidates: (allotFor?.successorCandidates ?? []).map(c => ({ contractorId: c.contractorId, name: c.name })),
      }))}
      proposeableSites={allotFor ? employer.sites
        .filter(site => !(allotFor.allotments ?? []).some(a => a.siteId === Number(site.id)))
        .map(site => ({ siteId: Number(site.id), name: site.name, code: site.code })) : []}
      busy={busy}
      note={!employer.defaultSite ? 'No default site set — propose a site for this binding, or set a default in Sites.' : undefined}
      onClose={() => { setAllotFor(null); setError(''); }}
      onApprove={id => void bindingSiteAction('approve-site', { siteId: id })}
      onReject={id => void bindingSiteAction('reject-site', { siteId: id })}
      onPropose={id => void bindingSiteAction('allot', { siteIds: [id] })}
      onProposeMany={ids => void bindingSiteAction('allot', { siteIds: ids })}
      onRelease={() => {}}
      onApproveRelease={(id, successorContractorId) => void bindingSiteAction('approve-site-release', { siteId: id, successorContractorId })}
      onRejectRelease={id => void bindingSiteAction('reject-site-release', { siteId: id })}
      onEmployerRelease={(id, successorContractorId) => void bindingSiteAction('release-site', { siteId: id, successorContractorId })}
      onSetSuccessor={(id, successorContractorId) => void bindingSiteAction('set-site-successor', { siteId: id, successorContractorId })}
    />
    <ConfirmDialog
      open={!!confirm}
      tone={confirm?.kind === 'approve' ? 'positive' : 'negative'}
      title={confirm?.kind === 'reject' ? 'Reject this request?' : confirm?.kind === 'unbind' ? 'Unbind this binding?' : 'Approve this request?'}
      description={confirm?.kind === 'reject'
        ? 'The other party will be notified and this request will be rejected. This cannot be undone.'
        : confirm?.kind === 'unbind'
          ? 'This requests unbinding. The binding is cancelled only when both parties confirm.'
          : 'Both parties must consent before the binding is complete. Approving records your consent.'}
      details={confirm ? [
        { label: 'Entity', value: confirm.row.name },
        { label: 'BSS ID', value: confirm.row.bssId },
        { label: 'Type', value: confirm.row.entityType },
        { label: 'Site', value: confirm.row.site || '—' },
      ] : []}
      confirmLabel={confirm?.kind === 'reject' ? 'Confirm reject' : confirm?.kind === 'unbind' ? 'Confirm unbind' : 'Confirm approve'}
      busy={busy}
      onCancel={() => setConfirm(null)}
      onConfirm={() => void runConfirm()}
    />
    <BindingHistoryDialog
      open={!!historyFor}
      title="Binding history"
      subtitle={historyFor ? `${historyFor.name} · ${historyFor.bssId}` : ''}
      events={historyFor?.history ?? []}
      onClose={() => setHistoryFor(null)}
    />
    {unbindFor && (() => {
      const requiresSuccessor = (unbindFor.workersAtRisk ?? 0) > 0;
      const candidates = unbindFor.successorCandidates ?? [];
      return <div className="fixed inset-0 z-[95] grid place-items-center p-4 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setUnbindFor(null)}>
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-950">{requiresSuccessor ? 'Move workers before unbinding' : 'Hand over sites before unbinding'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{unbindFor.name} · {unbindFor.bssId}</p>
          </div>
          <div className="px-6 py-4 space-y-3">
            <p className="text-xs text-gray-600 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 leading-5">
              {unbindFor.name} still has <strong>{unbindFor.workersAtRisk ?? 0}</strong> worker(s) and <strong>{unbindFor.sitesAtRisk ?? 0}</strong> site(s) with you.{' '}
              {requiresSuccessor
                ? 'Choose a successor contractor so the workers and sites are moved instead of being orphaned.'
                : 'You may hand these sites to a successor contractor, or release them without one.'}
            </p>
            {candidates.length ? (
              <label className="block text-xs font-bold text-gray-700">Successor contractor {requiresSuccessor ? <span className="text-rose-600">*</span> : <span className="font-normal text-gray-400">(optional)</span>}
                <select value={unbindSuccessor} onChange={e => setUnbindSuccessor(e.target.value ? Number(e.target.value) : '')} className="mt-1 w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white">
                  <option value="">{requiresSuccessor ? 'Select a contractor…' : 'No successor — release only'}</option>
                  {candidates.map(c => <option key={c.contractorId} value={c.contractorId}>{c.name}</option>)}
                </select>
              </label>
            ) : <p className="text-xs text-red-600">{requiresSuccessor ? 'No other contractor is available in the system — onboard another contractor first, then unbind.' : 'No other contractor is available — the sites will be released without a successor.'}</p>}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <button onClick={() => setUnbindFor(null)} className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            {!requiresSuccessor && <button disabled={busy} onClick={() => { const row = unbindFor; setUnbindFor(null); void decideUnbind(row); }} className="h-10 px-4 rounded-xl border border-rose-200 text-rose-700 text-sm font-bold hover:bg-rose-50 disabled:opacity-50">Release without successor</button>}
            <button disabled={busy || (requiresSuccessor && !unbindSuccessor)} onClick={() => { const row = unbindFor; setUnbindFor(null); void decideUnbind(row, unbindSuccessor ? Number(unbindSuccessor) : undefined); }} className="h-10 px-4 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50">{requiresSuccessor ? 'Move workers & unbind' : 'Hand over & unbind'}</button>
          </div>
        </div>
      </div>;
    })()}
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Clock3; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
