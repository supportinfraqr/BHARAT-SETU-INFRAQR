"use client";

import { useState } from 'react';
import { Building2, Clock3, UserRoundCheck } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerApproval } from '@/types/portal';

type Row = EmployerApproval & { __decide?: (row: EmployerApproval, status: 'Approved' | 'Rejected') => void };

export default function EmployerQrBindingRequestsPage() {
  const { employer, replaceEmployer, mutate } = useEmployer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function decide(row: EmployerApproval, status: 'Approved' | 'Rejected') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (row.engagementId) {
        const response = await fetch('/api/employer/engagements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bindingId: Number(row.engagementId), action: status === 'Approved' ? 'approve-binding' : 'reject' }),
        });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error || 'Engagement could not be updated.');
      } else {
        await mutate('approvals', 'PATCH', { ids: [row.id], status });
      }
      replaceEmployer({
        ...employer,
        approvals: employer.approvals.map(item => item.id === row.id ? { ...item, status } : item),
        contractors: employer.contractors.map(item => item.id === row.entityId && row.entityType === 'Contractor' ? { ...item, verified: status === 'Approved', status: status === 'Approved' ? 'Active' : 'Suspended' } : item),
        workers: employer.workers.map(item => item.id === row.entityId && row.entityType === 'Worker' ? { ...item, verified: status === 'Approved', status: status === 'Approved' ? 'Active' : 'Inactive' } : item),
      });
      setNotice(`${row.name} ${status.toLowerCase()}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Request could not be updated.'); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<Row>[] = [
    { id:'entity', header:'Requesting entity', value:row => row.name, render:row => <div><strong className="text-gray-900">{row.name}</strong><p className="font-mono text-[10px] text-gray-400">{row.bssId}</p></div> },
    { id:'type', header:'Request type', value:row => row.entityType, render:row => <span className={`px-2 py-1 rounded text-[10px] font-semibold ${row.entityType === 'Contractor' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>{row.entityType}</span> },
    { id:'site', header:'Site', value:row => row.site },
    { id:'through', header:'Connected through', value:row => row.contractor ?? 'Direct contractor request' },
    { id:'submitted', header:'Requested', value:row => row.submittedAt.slice(0, 10) },
    { id:'status', header:'Relationship', value:row => row.status, render:row => <span className={row.status === 'Approved' ? 'text-green-700' : row.status === 'Rejected' ? 'text-red-700' : 'text-orange-700'}>{row.status}</span> },
    { id:'actions', header:'Action', filterable:false, value:row => row.status, render:row => row.status === 'Pending' ? <div className="flex gap-2"><button disabled={busy} onClick={() => decide(row, 'Approved')} className="text-green-700 font-semibold">Approve</button><button disabled={busy} onClick={() => decide(row, 'Rejected')} className="text-red-700 font-semibold">Reject</button></div> : <span className="text-gray-400">—</span> },
  ];
  const rows: Row[] = employer.approvals;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">QR system</p><h1 className="text-2xl font-bold mt-1">Binding Requests</h1><p className="text-sm text-gray-500 mt-1">Manage contractor and worker requests to bind to your organisation and sites.</p></header>
    <div className="grid grid-cols-3 gap-3"><Metric label="Pending" value={rows.filter(r => r.status === 'Pending').length} icon={Clock3} tone="bg-orange-50 text-orange-700"/><Metric label="Contractors" value={rows.filter(r => r.entityType === 'Contractor').length} icon={Building2} tone="bg-blue-50 text-blue-700"/><Metric label="Workers" value={rows.filter(r => r.entityType === 'Worker').length} icon={UserRoundCheck} tone="bg-green-50 text-green-700"/></div>
    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}
    <EnterpriseDataTable title="Binding request register" rows={rows} columns={columns} rowKey={row => row.id} filename="employer-binding-requests"/>
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Clock3; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
