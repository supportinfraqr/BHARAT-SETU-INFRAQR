"use client";

import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Check, CircleDot, Clock3, FileCheck2, Filter, LifeBuoy, RefreshCw, Search, ShieldCheck, TicketCheck, UserCheck, Users } from 'lucide-react';
import { useOperations } from '@/components/support/useOperations';
import type { OperationsSnapshot, OperationsTicket, SupportCase } from '@/types/operations';

export default function BssStaffDashboard({ initialSnapshot }: { initialSnapshot: OperationsSnapshot }) {
  const { snapshot, refreshing, busyId, error, notice, refresh, run } = useOperations(initialSnapshot, 15_000);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Active');
  const [type, setType] = useState('All');
  const [selectedId, setSelectedId] = useState(initialSnapshot.cases[0]?.id ?? '');

  const cases = useMemo(() => snapshot.cases.filter(item => {
    const active = item.status !== 'Resolved';
    const matchesStatus = status === 'All' || (status === 'Active' ? active : item.status === status);
    const matchesType = type === 'All' || item.type === type;
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || [item.id, item.subject, item.party, item.owner].some(value => value.toLowerCase().includes(needle));
    return matchesStatus && matchesType && matchesQuery;
  }), [snapshot.cases, status, type, query]);
  const selected = snapshot.cases.find(item => item.id === selectedId) ?? cases[0] ?? null;
  const urgent = snapshot.cases.filter(item => item.priority === 'Urgent' && item.status !== 'Resolved').length;
  const waiting = snapshot.cases.filter(item => item.status === 'Waiting for evidence').length;
  const unassigned = snapshot.cases.filter(item => !item.assignee && item.status !== 'Resolved').length;
  const resolved = snapshot.cases.filter(item => item.status === 'Resolved').length;
  const metrics = [
    { label:'Open cases', value:snapshot.metrics.openCases, icon:LifeBuoy, tone:'bg-blue-50 text-blue-700' },
    { label:'Urgent', value:urgent, icon:AlertTriangle, tone:'bg-red-50 text-red-700' },
    { label:'Unassigned', value:unassigned, icon:Users, tone:'bg-orange-50 text-orange-700' },
    { label:'Waiting for evidence', value:waiting, icon:Clock3, tone:'bg-indigo-50 text-indigo-700' },
    { label:'Resolved today', value:resolved, icon:Check, tone:'bg-green-50 text-green-700' },
    { label:'Platform uptime', value:`${snapshot.metrics.uptime}%`, icon:Activity, tone:'bg-emerald-50 text-emerald-700' },
    { label:'Open tickets', value:snapshot.metrics.openTickets, icon:TicketCheck, tone:'bg-indigo-50 text-indigo-700' },
  ];

  async function ticketAction(ticket: OperationsTicket, value: 'claim' | 'monitor' | 'resolve' | 'escalate') {
    await run({ action:'ticket', id:ticket.id, transition:value }, `ticket:${ticket.id}:${value}`);
  }

  async function transition(item: SupportCase, value: 'claim' | 'wait' | 'resolve' | 'escalate') {
    await run({ action:'case', id:item.id, transition:value }, `case:${item.id}:${value}`);
  }

  return <div className="space-y-6 pb-10">
    <header id="overview" className="bss-page-header">
      <div><p className="bss-eyebrow">Backend service delivery</p><div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="bss-page-title">BSS Staff Workbench</h1><span className="bss-live-badge"><CircleDot size={11}/>Queue live</span></div><p className="bss-page-description">Resolve consent, document, worker-record and dispute cases with a complete audit trail.</p></div>
      <button type="button" onClick={() => void refresh()} disabled={refreshing} className="bss-secondary-action"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Refreshing…' : 'Refresh queue'}</button>
    </header>

    {(error || notice) && <div aria-live="polite" className={error ? 'bss-alert bss-alert-error' : 'bss-alert bss-alert-success'}>{error || notice}</div>}

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="BSS staff key metrics">
      {metrics.map(metric => <article key={metric.label} className="bss-kpi-card">
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{metric.label}</span><span className={`bss-kpi-icon ${metric.tone}`}><metric.icon size={16}/></span></div>
        <strong>{metric.value}</strong>
      </article>)}
    </section>

    <section id="queue" className="bss-panel overflow-hidden">
      <header className="bss-panel-header"><div><h2>Unified case queue</h2><p>Every transition is authorised server-side and recorded in the staff audit stream.</p></div><span className="text-xs text-gray-500">{cases.length} matching</span></header>
      <div className="p-4 border-b border-gray-100 grid sm:grid-cols-[minmax(220px,1fr)_180px_170px] gap-2">
        <label className="relative"><span className="sr-only">Search cases</span><Search size={15} className="absolute left-3 top-3 text-gray-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search case, worker, owner…" className="bss-input pl-9"/></label>
        <label className="relative"><span className="sr-only">Status</span><Filter size={14} className="absolute left-3 top-3 text-gray-400"/><select value={status} onChange={event => setStatus(event.target.value)} className="bss-select w-full pl-9"><option>Active</option><option>All</option><option>Open</option><option>In progress</option><option>Waiting for evidence</option><option>Escalated</option><option>Resolved</option></select></label>
        <label><span className="sr-only">Case type</span><select value={type} onChange={event => setType(event.target.value)} className="bss-select w-full"><option>All</option><option>Binding</option><option>Document</option><option>Dispute</option><option>Worker record</option></select></label>
      </div>

      <div className="grid xl:grid-cols-[1fr_380px] min-h-[440px]">
        <div className="divide-y divide-gray-100 xl:border-r xl:border-gray-100">
          {cases.map(item => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full p-4 sm:p-5 text-left hover:bg-gray-50 transition ${selected?.id === item.id ? 'bg-blue-50/60' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Priority value={item.priority}/><span className="font-mono text-xs text-gray-500">{item.id}</span><span className="text-[10px] text-gray-600 bg-gray-100 px-2 py-1 rounded">{item.type}</span></div><h3 className="text-sm font-semibold text-gray-900 mt-2">{item.subject}</h3><p className="text-xs text-gray-500 mt-1 truncate">{item.party} · {item.owner}</p></div><CaseStatus value={item.status}/></div>
          </button>)}
          {!cases.length && <div className="py-16 text-center text-sm text-gray-500">No cases match the selected filters.</div>}
        </div>

        <aside id="case-detail" className="p-5 bg-gray-50/60">
          {selected ? <div className="sticky top-24"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-gray-500">{selected.id}</p><h2 className="font-semibold text-gray-950 mt-1">{selected.subject}</h2></div><CaseStatus value={selected.status}/></div><p className="text-sm leading-6 text-gray-600 mt-4">{selected.summary}</p><dl className="grid grid-cols-2 gap-4 mt-5 text-xs"><Detail label="Party" value={selected.party}/><Detail label="Owner" value={selected.owner}/><Detail label="Assignee" value={selected.assignee ?? 'Unassigned'}/><Detail label="Updated" value={relative(selected.updatedAt)}/></dl><div className="mt-6 pt-5 border-t border-gray-200"><p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Available actions</p><div className="grid grid-cols-2 gap-2 mt-3">{!selected.assignee && <CaseAction icon={UserCheck} label="Claim" onClick={() => void transition(selected, 'claim')} busy={busyId === `case:${selected.id}:claim`}/>}<CaseAction icon={Clock3} label="Request evidence" onClick={() => void transition(selected, 'wait')} busy={busyId === `case:${selected.id}:wait`}/><CaseAction icon={FileCheck2} label="Resolve" tone="success" onClick={() => void transition(selected, 'resolve')} busy={busyId === `case:${selected.id}:resolve`}/><CaseAction icon={ShieldCheck} label="Escalate" tone="danger" onClick={() => void transition(selected, 'escalate')} busy={busyId === `case:${selected.id}:escalate`}/></div></div></div> : <p className="text-sm text-gray-500">Select a case to review it.</p>}
        </aside>
      </div>
    </section>

    <section id="services" className="bss-panel overflow-hidden">
      <header className="bss-panel-header"><div><h2>Platform service health</h2><p>Merged operational monitoring — authenticated probes only.</p></div><span className="text-xs text-gray-500">Updated {new Date(snapshot.generatedAt).toLocaleTimeString('en-IN')}</span></header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        {snapshot.services.map(service => (
          <article key={service.id} className="p-4">
            <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-gray-900">{service.name}</h3><ServiceState value={service.status}/></div>
            <p className="text-[11px] font-mono text-gray-400 mt-1">{service.host} · {service.uptime}% uptime · {service.latencyMs} ms</p>
          </article>
        ))}
      </div>
    </section>

    <section id="incidents" className="bss-panel overflow-hidden">
      <header className="bss-panel-header"><div><h2>Incident & request queue</h2><p>Operational incidents merged from the IT console — claim, monitor, resolve or escalate.</p></div><TicketCheck size={18} className="text-indigo-700"/></header>
      <div className="divide-y divide-gray-100">
        {snapshot.tickets.map(ticket => <article key={ticket.id} className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div><div className="flex flex-wrap items-center gap-2"><span className={`text-[10px] font-bold rounded px-2 py-1 ${ticket.priority === 'P1' ? 'bg-red-100 text-red-800' : ticket.priority === 'P2' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>{ticket.priority}</span><span className="font-mono text-xs text-gray-500">{ticket.id}</span><TicketState value={ticket.status}/></div>
            <h3 className="text-sm font-semibold text-gray-900 mt-2">{ticket.title}</h3><p className="text-xs text-gray-500 mt-1">{ticket.service} · {ticket.assignee ? `Assigned to ${ticket.assignee}` : 'Unassigned'} · updated {relative(ticket.updatedAt)}</p></div>
            <div className="flex flex-wrap gap-2 shrink-0">{!ticket.assignee && <CaseAction icon={UserCheck} label="Claim" onClick={() => void ticketAction(ticket, 'claim')} busy={busyId === `ticket:${ticket.id}:claim`}/>}<CaseAction icon={Clock3} label="Monitor" onClick={() => void ticketAction(ticket, 'monitor')} busy={busyId === `ticket:${ticket.id}:monitor`}/><CaseAction icon={FileCheck2} label="Resolve" tone="success" onClick={() => void ticketAction(ticket, 'resolve')} busy={busyId === `ticket:${ticket.id}:resolve`}/><CaseAction icon={ShieldCheck} label="Escalate" tone="danger" onClick={() => void ticketAction(ticket, 'escalate')} busy={busyId === `ticket:${ticket.id}:escalate`}/></div>
          </div>
        </article>)}
        {!snapshot.tickets.length && <p className="p-8 text-center text-sm text-gray-400">No open incidents.</p>}
      </div>
    </section>

    <section id="audit" className="bss-panel overflow-hidden"><header className="bss-panel-header"><div><h2>Recent staff audit</h2><p>Staff-visible, sanitised case and consent events.</p></div><ShieldCheck size={18} className="text-indigo-700"/></header><div className="divide-y divide-gray-100">{snapshot.logs.map(log => <article key={log.id} className="p-4 flex gap-3"><span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 grid place-items-center shrink-0"><ShieldCheck size={15}/></span><div><p className="text-xs text-gray-800">{log.message}</p><p className="text-[10px] font-mono text-gray-400 mt-1">{new Date(log.timestamp).toLocaleString('en-IN')} · {log.correlationId}</p></div></article>)}</div></section>
  </div>;
}

function Priority({ value }: { value:SupportCase['priority'] }) { const tone = value === 'Urgent' ? 'bg-red-100 text-red-800' : value === 'High' ? 'bg-orange-50 text-orange-700' : value === 'Normal' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'; return <span className={`text-[10px] font-bold px-2 py-1 rounded ${tone}`}>{value}</span>; }
function CaseStatus({ value }: { value:SupportCase['status'] }) { const tone = value === 'Resolved' ? 'text-green-700 bg-green-50' : value === 'Escalated' ? 'text-red-700 bg-red-50' : value === 'Waiting for evidence' ? 'text-orange-700 bg-orange-50' : 'text-blue-700 bg-blue-50'; return <span className={`text-[10px] font-semibold rounded px-2 py-1 shrink-0 ${tone}`}>{value}</span>; }
function Detail({ label, value }: { label:string; value:string }) { return <div><dt className="text-gray-400">{label}</dt><dd className="font-semibold text-gray-800 mt-1 break-words">{value}</dd></div>; }
function CaseAction({ icon:Icon, label, onClick, busy, tone = 'default' }: { icon:typeof UserCheck; label:string; onClick:() => void; busy:boolean; tone?:'default' | 'success' | 'danger' }) { const color = tone === 'success' ? 'border-green-200 text-green-700 hover:bg-green-50' : tone === 'danger' ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-gray-200 text-gray-700 hover:bg-white'; return <button type="button" onClick={onClick} disabled={busy} className={`min-h-11 px-3 border rounded-lg text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 ${color}`}><Icon size={14}/>{busy ? 'Working…' : label}</button>; }
function relative(value:string) { const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000)); return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`; }
function ServiceState({ value }:{ value:string }) { const tone = value === 'Operational' ? 'bg-green-50 text-green-700' : value === 'Degraded' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'; return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tone}`}>{value}</span>; }
function TicketState({ value }:{ value:OperationsTicket['status'] }) { const tone = value === 'Resolved' ? 'bg-green-50 text-green-700' : value === 'Escalated' ? 'bg-red-50 text-red-700' : value === 'Monitoring' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'; return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tone}`}>{value}</span>; }
