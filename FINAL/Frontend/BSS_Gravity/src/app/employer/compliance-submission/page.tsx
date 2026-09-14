"use client";

import { useState } from 'react';
import { CheckCircle2, Clock3, FileCheck2 } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerSubmission } from '@/types/portal';

export default function EmployerComplianceSubmissionPage() {
  const { employer, replaceEmployer, mutate } = useEmployer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function review(row: EmployerSubmission, status: 'Verified' | 'Rejected') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await mutate('submissions', 'PATCH', { id: row.id, status });
      replaceEmployer({ ...employer, submissions: employer.submissions.map(item => item.id === row.id ? { ...item, status } : item) });
      setNotice(`${row.type} for ${row.site} ${status.toLowerCase()}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Submission could not be updated.'); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<EmployerSubmission>[] = [
    { id:'contractor', header:'Contractor', value:row => row.contractor, render:row => <div><strong className="text-gray-900">{row.contractor}</strong><p className="font-mono text-[10px] text-gray-400">{row.contractorId}</p></div> },
    { id:'site', header:'Site', value:row => row.site },
    { id:'type', header:'Compliance type', value:row => row.type, render:row => <div><strong className="text-gray-900">{row.type}</strong><a href={`/api/employer/submissions/${row.id}/file`} target="_blank" rel="noreferrer" className="block text-[11px] text-blue-600 hover:underline mt-0.5">View evidence</a></div> },
    { id:'period', header:'Period', value:row => row.period },
    { id:'submitted', header:'Submitted', value:row => row.submittedAt.slice(0, 10) },
    { id:'status', header:'Status', value:row => row.status, render:row => <Status value={row.status}/> },
    { id:'actions', header:'Action', filterable:false, value:row => row.status, render:row => row.status === 'Pending review' ? <div className="flex gap-2"><button disabled={busy} onClick={() => review(row, 'Verified')} className="text-green-700 font-semibold hover:underline">Verify</button><button disabled={busy} onClick={() => review(row, 'Rejected')} className="text-red-700 font-semibold hover:underline">Reject</button></div> : <span className="text-gray-400">No action</span> },
  ];

  const pending = employer.submissions.filter(item => item.status === 'Pending review');
  const verified = employer.submissions.filter(item => item.status === 'Verified').length;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Governance controls</p><h1 className="text-2xl font-bold mt-1">Compliance Submission</h1><p className="text-sm text-gray-500 mt-1">Review statutory, wage, and safety evidence submitted by connected contractors.</p></header>
    <div className="grid grid-cols-3 gap-3"><Metric label="Total submissions" value={employer.submissions.length} icon={FileCheck2} tone="bg-blue-50 text-blue-700"/><Metric label="Pending review" value={pending.length} icon={Clock3} tone="bg-orange-50 text-orange-700"/><Metric label="Verified" value={verified} icon={CheckCircle2} tone="bg-green-50 text-green-700"/></div>
    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}
    <EnterpriseDataTable title="Contractor compliance submissions" rows={employer.submissions} columns={columns} rowKey={row => row.id} filename="employer-compliance-submissions"/>
  </div>;
}

function Status({ value }: { value: EmployerSubmission['status'] }) { const tone = value === 'Verified' ? 'bg-green-50 text-green-700' : value === 'Pending review' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'; return <span className={`px-2 py-1 rounded text-[10px] font-semibold ${tone}`}>{value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof FileCheck2; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }

