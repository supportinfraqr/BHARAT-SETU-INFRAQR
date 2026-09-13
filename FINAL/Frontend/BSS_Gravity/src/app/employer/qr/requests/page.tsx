"use client";

import { useState } from 'react';
import { Building2, Clock3, UserRoundCheck } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerApproval } from '@/types/portal';

type Row = EmployerApproval & { __decide?: (row: EmployerApproval, status: 'Approved' | 'Rejected') => void };

export default function EmployerQrBindingRequestsPage() {
  const { employer, replaceEmployer, mutate } = useEmployer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [allotFor, setAllotFor] = useState<EmployerApproval | null>(null);
  const [chosenSites, setChosenSites] = useState<number[]>([]);
  const [confirm, setConfirm] = useState<{ row: EmployerApproval; kind: 'approve' | 'reject' | 'unbind' } | null>(null);

  async function runConfirm() {
    if (!confirm) return;
    const { row, kind } = confirm;
    setConfirm(null);
    if (kind === 'unbind') { await decideUnbind(row); return; }
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
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Request could not be updated.'); }
    finally { setBusy(false); }
  }

  async function allot() {
    if (!allotFor?.bindingId || !chosenSites.length) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/binding-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bindingId: Number(allotFor.bindingId), action: 'allot', siteIds: chosenSites }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Sites could not be allotted.');
      const nextIds = Array.from(new Set([...(allotFor.siteIds ?? []), ...chosenSites]));
      const names = employer.sites.filter(site => nextIds.includes(Number(site.id))).map(site => site.name).join(', ');
      replaceEmployer({ ...employer, approvals: employer.approvals.map(item => item.id === allotFor.id ? { ...item, site: names || item.site, siteIds: nextIds } : item) });
      setNotice(`Allotted ${chosenSites.length} site(s) to ${allotFor.name}.`);
      setAllotFor(null); setChosenSites([]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sites could not be allotted.'); }
    finally { setBusy(false); }
  }

  async function decideUnbind(row: EmployerApproval) {
    if (!row.bindingId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/binding-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bindingId: Number(row.bindingId), action: 'unbind' }) });
      const result = await response.json().catch(() => ({})) as { error?: string; data?: { status?: string } };
      if (!response.ok) throw new Error(result.error || 'Unbinding could not be requested.');
      const cancelled = String(result.data?.status ?? '').toLowerCase() === 'cancelled';
      replaceEmployer({ ...employer, approvals: employer.approvals.map(item => item.id === row.id ? { ...item, status: cancelled ? 'Cancelled' : item.status, unbindRequested: true, unbindConsentEmployer: true } : item) });
      setNotice(cancelled ? `${row.name} unbound — both parties consented.` : `Unbinding requested — awaiting ${row.name}’s consent.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unbinding could not be requested.'); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<Row>[] = [
    { id:'entity', header:'Requesting entity', value:row => row.name, render:row => <div><strong className="text-gray-900">{row.name}</strong><p className="font-mono text-[10px] text-gray-400">{row.bssId}</p></div> },
    { id:'type', header:'Request type', value:row => row.entityType, render:row => <span className={`px-2 py-1 rounded text-[10px] font-semibold ${row.entityType === 'Contractor' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>{row.entityType}</span> },
    { id:'site', header:'Site', value:row => row.site },
    { id:'through', header:'Connected through', value:row => row.contractor ?? 'Direct contractor request' },
    { id:'submitted', header:'Requested', value:row => row.submittedAt.slice(0, 10) },
    { id:'initiated', header:'Initiated by', value:row => row.initiatedBy || '—', render:row => <span className="font-semibold text-gray-700">{row.initiatedBy || '—'}</span> },
    { id:'accepted', header:'Accepted by', value:row => row.acceptedBy || '—', render:row => <span className={row.acceptedBy ? 'font-semibold text-green-700' : 'text-gray-400'}>{row.acceptedBy || '—'}</span> },
    { id:'status', header:'Relationship', value:row => row.status, render:row => <span className={row.status === 'Approved' || row.status === 'Accepted' ? 'text-green-700' : row.status === 'Rejected' || row.status === 'Cancelled' ? 'text-red-700' : 'text-orange-700'}>{row.status}</span> },
    { id:'actions', header:'Action', filterable:false, value:row => row.status, render:row => {
      if (row.status === 'Pending') {
        // A contractor↔employer binding the employer already consented to (they
        // scanned the contractor's QR) only needs the contractor's consent.
        if (row.bindingId && row.consentEmployer) return <span className="text-orange-700 text-xs font-semibold">Awaiting contractor</span>;
        return <div className="flex gap-2"><button disabled={busy} onClick={() => setConfirm({ row, kind: 'approve' })} className="text-green-700 font-semibold">Approve</button><button disabled={busy} onClick={() => setConfirm({ row, kind: 'reject' })} className="text-red-700 font-semibold">Reject</button></div>;
      }
      if (row.bindingId && (row.status === 'Accepted' || row.status === 'Approved')) {
        if (row.unbindRequested) {
          return row.unbindConsentEmployer
            ? <span className="text-orange-700 text-xs font-semibold">Awaiting contractor</span>
            : <button disabled={busy} onClick={() => setConfirm({ row, kind: 'unbind' })} className="text-red-600 font-semibold">Confirm unbind</button>;
        }
        return <div className="flex gap-2"><button disabled={busy} onClick={() => { setAllotFor(row); setChosenSites(row.siteIds ?? []); }} className="text-[#073B67] font-semibold">Allot sites</button><button disabled={busy} onClick={() => setConfirm({ row, kind: 'unbind' })} className="text-red-600 font-semibold">Unbind</button></div>;
      }
      return <span className="text-gray-400">—</span>;
    } },
  ];
  const rows: Row[] = employer.approvals;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">QR system</p><h1 className="text-2xl font-bold mt-1">Binding Requests</h1><p className="text-sm text-gray-500 mt-1">Manage contractor and worker requests to bind to your organisation and sites.</p></header>
    <div className="grid grid-cols-3 gap-3"><Metric label="Pending" value={rows.filter(r => r.status === 'Pending').length} icon={Clock3} tone="bg-orange-50 text-orange-700"/><Metric label="Contractors" value={new Set(rows.filter(r => r.entityType === 'Contractor').map(r => r.entityId || r.bssId)).size} icon={Building2} tone="bg-blue-50 text-blue-700"/><Metric label="Workers" value={new Set(rows.filter(r => r.entityType === 'Worker').map(r => r.entityId || r.bssId)).size} icon={UserRoundCheck} tone="bg-green-50 text-green-700"/></div>
    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}
    <EnterpriseDataTable title="Binding request register" rows={rows} columns={columns} rowKey={row => row.id} filename="employer-binding-requests"/>

    {allotFor && (
      <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
        <section role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-md">
          <h2 className="font-semibold">Allot sites to {allotFor.name}</h2>
          <p className="text-xs text-gray-500 mt-1">Select the site(s) this contractor may operate at.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {employer.sites.map(site => {
              const id = Number(site.id);
              const on = chosenSites.includes(id);
              return <button key={site.id} type="button" onClick={() => setChosenSites(current => on ? current.filter(x => x !== id) : [...current, id])} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${on ? 'bg-[#073B67] text-white border-[#073B67]' : 'bg-white text-gray-700 border-gray-300'}`}>{site.name}</button>;
            })}
          </div>
          {!employer.sites.length && <p className="text-xs text-gray-400 mt-3">No sites yet — register a site first.</p>}
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => { setAllotFor(null); setChosenSites([]); }} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold">Cancel</button>
            <button disabled={busy || !chosenSites.length} onClick={() => void allot()} className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-50">{busy ? 'Allotting…' : `Allot ${chosenSites.length || ''} site(s)`}</button>
          </div>
        </section>
      </div>
    )}
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
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Clock3; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
