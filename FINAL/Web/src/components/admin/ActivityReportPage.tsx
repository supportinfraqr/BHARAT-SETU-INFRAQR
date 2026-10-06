"use client";

import { useCallback, useEffect, useState } from 'react';
import { Filter, Loader2, Search, ShieldCheck } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { StatusBadge } from '@/data/adminMasters';

type ActivityRow = {
  id: string; timestamp: string; actor: string; role: string; action: string;
  module: string; entity: string; entityId: string; status: string; details: string;
};

export default function ActivityReportPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [role, setRole] = useState('All');
  const [action, setAction] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (role !== 'All') params.set('role', role);
      if (action !== 'All') params.set('action', action);
      const response = await fetch(`/api/admin/activity${params.toString() ? `?${params}` : ''}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { rows?:ActivityRow[]; roles?:string[]; actions?:string[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The activity log could not be loaded.');
      setRows(body.rows ?? []);
      if (body.roles) setRoles(body.roles);
      if (body.actions) setActions(body.actions);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The activity log could not be loaded.'); }
    finally { setLoading(false); }
  }, [from, to, role, action]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- filter reload
  useEffect(() => { void load(); }, [load]);

  const columns: DataColumn<ActivityRow>[] = [
    { id: 'timestamp', header: 'Timestamp', value: r => r.timestamp, render: r => <span className="text-gray-600">{r.timestamp ? new Date(r.timestamp).toLocaleString('en-IN') : '—'}</span> },
    { id: 'actor', header: 'Actor', value: r => r.actor, render: r => <span className="font-mono text-blue-700">{r.actor}</span> },
    { id: 'role', header: 'Role', value: r => r.role },
    { id: 'action', header: 'Action', value: r => r.action, render: r => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.action === 'Delete' ? 'bg-red-50 text-red-700' : r.action === 'Create' ? 'bg-green-50 text-green-700' : r.action === 'Update' ? 'bg-orange-50 text-orange-700' : r.action === 'Approve' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{r.action}</span> },
    { id: 'module', header: 'Module', value: r => r.module },
    { id: 'entity', header: 'Entity', value: r => r.entity },
    { id: 'entityId', header: 'Entity ID', value: r => r.entityId },
    { id: 'status', header: 'Status', value: r => r.status, render: r => <StatusBadge value={r.status}/> },
    { id: 'details', header: 'Details', value: r => r.details },
  ];

  return <div className="space-y-6 pb-10">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Audit</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Activity Report</h1><p className="text-sm text-gray-500 mt-1">System-wide audit trail — actor, role, action, module, entity and status. Sanitised; no secrets or payloads are exposed.</p></header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <section className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <label className="text-xs font-semibold text-gray-600">Activity date from<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs"/></label>
        <label className="text-xs font-semibold text-gray-600">To<input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs"/></label>
        <label className="text-xs font-semibold text-gray-600">Role<select value={role} onChange={e => setRole(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white"><option>All</option>{roles.map(r => <option key={r}>{r}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-600">Action<select value={action} onChange={e => setAction(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white"><option>All</option>{actions.map(a => <option key={a}>{a}</option>)}</select></label>
        <div className="flex items-center gap-2 text-xs text-gray-500"><Filter size={14}/>{rows.length} event{rows.length === 1 ? '' : 's'}</div>
      </div>
    </section>

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading activity…</p>
      : <EnterpriseDataTable title="Activity log listing" rows={rows} columns={columns} rowKey={r => String(r.id)} filename="bss-admin-activity"/>}

    <p className="text-[11px] text-gray-400 flex items-center gap-1.5"><Search size={13}/>Search all fields with the table search box · date, actor, role, module, action and status filters supported above. <ShieldCheck size={13}/>Source: append-only audit log.</p>
  </div>;
}
