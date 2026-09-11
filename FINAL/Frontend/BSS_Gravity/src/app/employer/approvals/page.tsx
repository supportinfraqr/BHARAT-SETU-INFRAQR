"use client";

import { useState } from 'react';
import { Building2, Check, CheckCircle2, Clock3, UserRoundCheck, X, XCircle } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerApproval } from '@/types/portal';

export default function EmployerApprovalsPage() {
  const { employer, replaceEmployer, mutate } = useEmployer();
  const [view, setView] = useState<'Pending' | 'All'>('Pending');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const rows = view === 'Pending' ? employer.approvals.filter(item => item.status === 'Pending') : employer.approvals;
  const pending = employer.approvals.filter(item => item.status === 'Pending');
  const allVisibleSelected = rows.length > 0 && rows.every(item => selected.includes(item.id));
  const siteCode = (site: string) => employer.sites.find(item => item.name === site)?.code ?? '—';

  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]); }
  function toggleAll() { setSelected(current => allVisibleSelected ? current.filter(id => !rows.some(row => row.id === id)) : Array.from(new Set([...current, ...rows.map(row => row.id)]))); }

  async function decide(status: 'Approved' | 'Rejected') {
    if (!selected.length) return;
    setBusy(true);
    setError('');
    setNotice('');
    const selectedRequests = employer.approvals.filter(item => selected.includes(item.id) && item.status === 'Pending');
    try {
      await mutate('approvals', 'PATCH', { ids:selected, status });
      const contractorIds = new Set(selectedRequests.filter(item => item.entityType === 'Contractor').map(item => item.entityId));
      const workerIds = new Set(selectedRequests.filter(item => item.entityType === 'Worker').map(item => item.entityId));
      replaceEmployer({
        ...employer,
        approvals:employer.approvals.map(item => selected.includes(item.id) ? { ...item, status } : item),
        contractors:employer.contractors.map(item => contractorIds.has(item.id) ? { ...item, verified:status === 'Approved', status:status === 'Approved' ? 'Active' : 'Suspended' } : item),
        workers:employer.workers.map(item => workerIds.has(item.id) ? { ...item, verified:status === 'Approved', status:status === 'Approved' ? 'Active' : 'Inactive' } : item),
        stats:{ ...employer.stats, pendingApprovals:Math.max(0, employer.stats.pendingApprovals - selectedRequests.length) },
      });
      setNotice(`${selectedRequests.length} request${selectedRequests.length === 1 ? '' : 's'} ${status.toLowerCase()}.`);
      setSelected([]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The selected requests could not be updated.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 pb-24">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Governance queue</p><h1 className="text-2xl font-bold mt-1">Approvals</h1><p className="text-sm text-gray-500 mt-1">Every binding in E·C·S·W is site-scoped — a contractor or worker is approved against the <strong>site</strong> shown on the request, never against the employer in general.</p></header>
    <div className="grid grid-cols-3 gap-3"><Metric label="Pending" value={pending.length} icon={Clock3} tone="bg-orange-50 text-orange-700"/><Metric label="Contractors" value={pending.filter(item => item.entityType === 'Contractor').length} icon={Building2} tone="bg-blue-50 text-blue-700"/><Metric label="Workers" value={pending.filter(item => item.entityType === 'Worker').length} icon={UserRoundCheck} tone="bg-green-50 text-green-700"/></div>
    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3"><div><h2 className="text-sm font-semibold text-gray-900">Approval requests</h2><p className="text-[11px] text-gray-400 mt-0.5">{rows.length} records in this view</p></div><div className="flex bg-gray-100 rounded-lg p-1">{(['Pending','All'] as const).map(value => <button key={value} onClick={() => { setView(value); setSelected([]); }} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${view === value ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}>{value}</button>)}</div></header>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs">
        <thead className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3 w-10"><input type="checkbox" aria-label="Select all visible requests" checked={allVisibleSelected} onChange={toggleAll} className="w-4 h-4 rounded border-gray-300"/></th><th className="px-4 py-3">Request</th><th className="px-4 py-3">Connected through</th><th className="px-4 py-3">Site</th><th className="px-4 py-3">Required checks</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-gray-100">{rows.map(row => <tr key={row.id} className={selected.includes(row.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}><td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${row.name}`} checked={selected.includes(row.id)} onChange={() => toggle(row.id)} className="w-4 h-4 rounded border-gray-300"/></td><td className="px-4 py-3"><div className="flex items-center gap-3"><span className={`w-8 h-8 rounded-lg grid place-items-center ${row.entityType === 'Contractor' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>{row.entityType === 'Contractor' ? <Building2 size={15}/> : <UserRoundCheck size={15}/>}</span><div><strong className="text-gray-900">{row.name}</strong><p className="font-mono text-[10px] text-gray-400 mt-0.5">{row.bssId}</p></div></div></td><td className="px-4 py-3 text-gray-600">{row.contractor ?? 'Direct contractor request'}</td><td className="px-4 py-3 text-gray-600"><span className="font-medium text-gray-800">{row.site}</span>{row.site && <p className="font-mono text-[10px] text-gray-400 mt-0.5">{siteCode(row.site)}</p>}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1">{row.checks.map(check => <span key={check} className="bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 text-[10px]">{check}</span>)}</div></td><td className="px-4 py-3 text-gray-500">{row.submittedAt.slice(0, 10)}</td><td className="px-4 py-3"><ApprovalStatus value={row.status}/></td></tr>)}{!rows.length && <tr><td colSpan={7} className="py-12 text-center text-gray-400">No requests in this view.</td></tr>}</tbody>
      </table></div>
    </section>

    {selected.length > 0 && <div className="fixed bottom-5 left-4 right-4 z-40"><div className="max-w-[760px] mx-auto bg-white border border-gray-200 shadow-2xl rounded-2xl p-3 pb-safe flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 grid place-items-center font-bold">{selected.length}</span><div><p className="text-sm font-semibold">{selected.length} selected</p><p className="text-[11px] text-gray-500">The decision is recorded against each entity.</p></div></div><div className="flex gap-2"><button disabled={busy} onClick={() => decide('Rejected')} className="h-9 px-4 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><X size={14}/>Reject Selected</button><button disabled={busy} onClick={() => decide('Approved')} className="h-9 px-4 bg-[#073B67] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><Check size={14}/>{busy ? 'Updating…' : 'Approve Selected'}</button></div></div></div>}
  </div>;
}

function ApprovalStatus({ value }: { value:EmployerApproval['status'] }) { const tone = value === 'Approved' ? 'bg-green-50 text-green-700' : value === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'; const Icon = value === 'Approved' ? CheckCircle2 : value === 'Rejected' ? XCircle : Clock3; return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold ${tone}`}><Icon size={11}/>{value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Clock3; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
