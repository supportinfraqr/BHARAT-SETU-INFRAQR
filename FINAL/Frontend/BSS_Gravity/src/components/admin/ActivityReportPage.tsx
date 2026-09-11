"use client";

import { useMemo, useState } from 'react';
import { Filter, Search, ShieldCheck } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { ACTIVITY_LOG, type AdminRow, StatusBadge } from '@/data/adminMasters';

export default function ActivityReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [role, setRole] = useState('All');
  const [action, setAction] = useState('All');

  const roles = useMemo(() => Array.from(new Set(ACTIVITY_LOG.map(r => String(r.role)))).sort(), []);
  const actions = useMemo(() => Array.from(new Set(ACTIVITY_LOG.map(r => String(r.action)))).sort(), []);

  const filtered = useMemo(() => ACTIVITY_LOG.filter(row => {
    const date = new Date(String(row.timestamp)).toISOString().slice(0, 10);
    const inRange = (!from || date >= from) && (!to || date <= to);
    const inRole = role === 'All' || String(row.role) === role;
    const inAction = action === 'All' || String(row.action) === action;
    return inRange && inRole && inAction;
  }), [from, to, role, action]);

  const columns: DataColumn<AdminRow>[] = [
    { id: 'timestamp', header: 'Timestamp', value: r => String(r.timestamp), render: r => <span className="text-gray-600">{new Date(String(r.timestamp)).toLocaleString('en-IN')}</span> },
    { id: 'actor', header: 'Actor', value: r => String(r.actor), render: r => <span className="font-mono text-blue-700">{r.actor}</span> },
    { id: 'role', header: 'Role', value: r => String(r.role) },
    { id: 'action', header: 'Action', value: r => String(r.action), render: r => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${String(r.action) === 'Delete' ? 'bg-red-50 text-red-700' : String(r.action) === 'Create' ? 'bg-green-50 text-green-700' : String(r.action) === 'Deactivate' ? 'bg-orange-50 text-orange-700' : String(r.action) === 'Approve' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{r.action}</span> },
    { id: 'module', header: 'Module', value: r => String(r.module) },
    { id: 'entity', header: 'Entity', value: r => String(r.entity) },
    { id: 'entityId', header: 'Entity ID', value: r => String(r.entityId) },
    { id: 'status', header: 'Status', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
    { id: 'details', header: 'Details', value: r => String(r.details) },
  ];

  return <div className="space-y-6 pb-10">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Audit</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Activity Report</h1><p className="text-sm text-gray-500 mt-1">System-wide activity log — actor, role, action, module, entity and status. Sanitised; no secrets or payloads are exposed.</p></header>

    <section className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <label className="text-xs font-semibold text-gray-600">Activity date from<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs"/></label>
        <label className="text-xs font-semibold text-gray-600">To<input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs"/></label>
        <label className="text-xs font-semibold text-gray-600">Role<select value={role} onChange={e => setRole(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white"><option>All</option>{roles.map(r => <option key={r}>{r}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-600">Action<select value={action} onChange={e => setAction(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white"><option>All</option>{actions.map(a => <option key={a}>{a}</option>)}</select></label>
        <div className="flex items-center gap-2 text-xs text-gray-500"><Filter size={14}/>{filtered.length} of {ACTIVITY_LOG.length} events</div>
      </div>
    </section>

    <EnterpriseDataTable title="Activity log listing" rows={filtered} columns={columns} rowKey={r => String(r.id)} filename="bss-admin-activity"/>

    <p className="text-[11px] text-gray-400 flex items-center gap-1.5"><Search size={13}/>Search all fields with the table search box · date, actor, role, module, action and status filters supported above.</p>
  </div>;
}
