"use client";

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Cpu,
  Database,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  TerminalSquare,
  TicketCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useOperations } from '@/components/support/useOperations';
import type { OperationsLog, OperationsSnapshot, OperationsTicket } from '@/types/operations';

const shortcuts = ['health', 'services', 'queues', 'sessions', 'bindings', 'db-stats', 'worker-lookup', 'tail-logs'] as const;

export default function ItOperationsDashboard({ initialSnapshot }: { initialSnapshot: OperationsSnapshot }) {
  const { snapshot, refreshing, busyId, error, notice, refresh, run } = useOperations(initialSnapshot, 5_000);
  const [command, setCommand] = useState('health');
  const [terminal, setTerminal] = useState<string[]>([
    'BSS restricted operations console',
    'Commands are allowlisted, audited and do not provide host shell access.',
    'Run help to view available commands.',
  ]);
  const [ticketFilter, setTicketFilter] = useState<'active' | 'all'>('active');

  const tickets = useMemo(() => ticketFilter === 'all' ? snapshot.tickets : snapshot.tickets.filter(ticket => ticket.status !== 'Resolved'), [snapshot.tickets, ticketFilter]);
  const degraded = snapshot.services.filter(service => service.status !== 'Operational').length;
  const metrics = [
    { label:'Platform uptime', value:`${snapshot.metrics.uptime}%`, icon:Activity, tone:'bg-green-50 text-green-700' },
    { label:'Active sessions', value:snapshot.metrics.activeSessions.toLocaleString('en-IN'), icon:Users, tone:'bg-blue-50 text-blue-700' },
    { label:'Queue depth', value:snapshot.metrics.queueDepth, icon:Database, tone:'bg-orange-50 text-orange-700' },
    { label:'Failed jobs', value:snapshot.metrics.failedJobs, icon:XCircle, tone:'bg-red-50 text-red-700' },
    { label:'Open tickets', value:snapshot.metrics.openTickets, icon:TicketCheck, tone:'bg-indigo-50 text-indigo-700' },
    { label:'Degraded services', value:degraded, icon:Server, tone:degraded ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700' },
  ];

  async function execute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = command.trim();
    if (!clean) return;
    setTerminal(current => [...current, `ops> ${clean}`]);
    const result = await run({ action:'command', command:clean }, 'terminal');
    setTerminal(current => [...current, ...(result?.output ?? ['Command failed. See the alert above.'])].slice(-80));
  }

  async function transition(ticket: OperationsTicket, value: 'claim' | 'monitor' | 'resolve' | 'escalate') {
    await run({ action:'ticket', id:ticket.id, transition:value }, `ticket:${ticket.id}:${value}`);
  }

  return <div className="space-y-6 pb-10">
    <header id="overview" className="bss-page-header">
      <div>
        <p className="bss-eyebrow">BSS platform operations</p>
        <div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="bss-page-title">IT Operations Command Centre</h1><span className="bss-live-badge"><CircleDot size={11}/>Live</span></div>
        <p className="bss-page-description">Service health, incident response, audited diagnostics and restricted remediation controls.</p>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={refreshing} className="bss-secondary-action"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Refreshing…' : 'Refresh now'}</button>
    </header>

    {(error || notice) && <div aria-live="polite" className={error ? 'bss-alert bss-alert-error' : 'bss-alert bss-alert-success'}>{error || notice}</div>}

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3" aria-label="IT operations key metrics">
      {metrics.map(metric => <article key={metric.label} className="bss-kpi-card">
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{metric.label}</span><span className={`bss-kpi-icon ${metric.tone}`}><metric.icon size={16}/></span></div>
        <strong>{metric.value}</strong>
      </article>)}
    </section>

    <div className="grid xl:grid-cols-[1.15fr_.85fr] gap-5 items-start">
      <section id="services" className="bss-panel overflow-hidden">
        <header className="bss-panel-header"><div><h2>Service health</h2><p>Authenticated application-level probes; no infrastructure credentials are exposed.</p></div><span className="text-xs text-gray-500">Updated {time(snapshot.generatedAt)}</span></header>
        <div className="divide-y divide-gray-100">
          {snapshot.services.map(service => <article key={service.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-gray-900">{service.name}</h3><Status value={service.status}/></div><p className="text-[11px] font-mono text-gray-400 mt-1 truncate">{service.host} · {service.uptime}% uptime</p></div>
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0"><span className={`text-xs font-semibold ${service.latencyMs > 500 ? 'text-red-700' : service.latencyMs > 250 ? 'text-orange-700' : 'text-gray-600'}`}>{service.latencyMs} ms</span><button type="button" onClick={() => void run({ action:'probe-service', id:service.id }, `probe:${service.id}`)} disabled={Boolean(busyId)} className="bss-compact-action"><Activity size={14}/>{busyId === `probe:${service.id}` ? 'Probing…' : 'Probe'}</button></div>
          </article>)}
        </div>
      </section>

      <section id="terminal" className="rounded-2xl overflow-hidden border border-slate-800 bg-[#07111f] text-slate-100 shadow-sm">
        <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between"><div className="flex items-center gap-2"><TerminalSquare size={17} className="text-emerald-400"/><h2 className="text-sm font-semibold">Restricted terminal</h2></div><span className="text-[10px] uppercase tracking-wider text-slate-400">Audited · allowlist only</span></header>
        <div role="log" aria-live="polite" className="h-56 sm:h-64 overflow-y-auto p-4 font-mono text-xs leading-6 text-slate-300 bss-scroll-region">{terminal.map((line, index) => <p key={`${index}-${line}`} className={line.startsWith('ops>') ? 'text-emerald-400' : ''}>{line}</p>)}</div>
        <form onSubmit={execute} className="p-3 border-t border-white/10"><div className="flex gap-2"><label className="sr-only" htmlFor="ops-command">Command</label><span className="text-emerald-400 font-mono self-center">$</span><input id="ops-command" value={command} onChange={event => setCommand(event.target.value)} autoComplete="off" spellCheck={false} className="h-11 min-w-0 flex-1 bg-white/5 border border-white/10 rounded-lg px-3 font-mono text-sm outline-none focus:border-emerald-400"/><button disabled={busyId === 'terminal'} className="h-11 px-4 rounded-lg bg-emerald-500 text-[#07111f] font-bold text-sm inline-flex items-center gap-2"><Play size={15}/>{busyId === 'terminal' ? 'Running' : 'Run'}</button></div><div className="flex flex-wrap gap-1.5 mt-2">{shortcuts.map(value => <button type="button" key={value} onClick={() => setCommand(value)} className="px-2 py-1 rounded bg-white/5 text-[10px] text-slate-300 hover:bg-white/10">{value}</button>)}</div></form>
      </section>
    </div>

    <div className="grid xl:grid-cols-[1.2fr_.8fr] gap-5 items-start">
      <section id="incidents" className="bss-panel overflow-hidden">
        <header className="bss-panel-header"><div><h2>Incident & request queue</h2><p>Claim ownership, monitor recovery, resolve or escalate within assigned rights.</p></div><select value={ticketFilter} onChange={event => setTicketFilter(event.target.value as 'active' | 'all')} className="bss-select"><option value="active">Active</option><option value="all">All</option></select></header>
        <div className="divide-y divide-gray-100">{tickets.map(ticket => <article key={ticket.id} className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className={`text-[10px] font-bold rounded px-2 py-1 ${ticket.priority === 'P1' ? 'bg-red-100 text-red-800' : ticket.priority === 'P2' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>{ticket.priority}</span><span className="font-mono text-xs text-gray-500">{ticket.id}</span><TicketStatus value={ticket.status}/></div><h3 className="text-sm font-semibold text-gray-900 mt-2">{ticket.title}</h3><p className="text-xs text-gray-500 mt-1">{ticket.service} · {ticket.assignee ? `Assigned to ${ticket.assignee}` : 'Unassigned'} · updated {relative(ticket.updatedAt)}</p></div><div className="flex flex-wrap gap-2 shrink-0">{!ticket.assignee && <ActionButton label="Claim" onClick={() => void transition(ticket, 'claim')} busy={busyId === `ticket:${ticket.id}:claim`}/>}<ActionButton label="Monitor" onClick={() => void transition(ticket, 'monitor')} busy={busyId === `ticket:${ticket.id}:monitor`}/><ActionButton label="Resolve" tone="success" onClick={() => void transition(ticket, 'resolve')} busy={busyId === `ticket:${ticket.id}:resolve`}/><ActionButton label="Escalate" tone="danger" onClick={() => void transition(ticket, 'escalate')} busy={busyId === `ticket:${ticket.id}:escalate`}/></div></div>
        </article>)}</div>
      </section>

      <section id="logs" className="bss-panel overflow-hidden">
        <header className="bss-panel-header"><div><h2>Live application logs</h2><p>Sanitised operational events refresh every five seconds.</p></div><Cpu size={18} className="text-blue-700"/></header>
        <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-100 bss-scroll-region">{snapshot.logs.map(log => <LogRow key={log.id} log={log}/>)}</div>
      </section>
    </div>
  </div>;
}

function Status({ value }: { value:string }) {
  const tone = value === 'Operational' ? 'bg-green-50 text-green-700' : value === 'Degraded' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700';
  return <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${tone}`}>{value}</span>;
}

function TicketStatus({ value }: { value: OperationsTicket['status'] }) {
  return <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded px-2 py-1">{value}</span>;
}

function ActionButton({ label, onClick, busy, tone = 'default' }: { label:string; onClick:() => void; busy:boolean; tone?:'default' | 'success' | 'danger' }) {
  const color = tone === 'success' ? 'border-green-200 text-green-700 hover:bg-green-50' : tone === 'danger' ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-gray-200 text-gray-700 hover:bg-gray-50';
  return <button type="button" onClick={onClick} disabled={busy} className={`h-9 px-3 border rounded-lg text-xs font-semibold disabled:opacity-50 ${color}`}>{busy ? 'Working…' : label}</button>;
}

function LogRow({ log }: { log:OperationsLog }) {
  const icon = log.level === 'error' ? <XCircle size={14}/> : log.level === 'warning' ? <AlertTriangle size={14}/> : log.level === 'audit' ? <ShieldCheck size={14}/> : <CheckCircle2 size={14}/>;
  const tone = log.level === 'error' ? 'text-red-600' : log.level === 'warning' ? 'text-orange-600' : log.level === 'audit' ? 'text-indigo-600' : 'text-green-600';
  return <article className="p-4 flex gap-3"><span className={`mt-0.5 ${tone}`}>{icon}</span><div className="min-w-0"><p className="text-xs text-gray-800 leading-relaxed">{log.message}</p><p className="text-[10px] font-mono text-gray-400 mt-1 truncate">{time(log.timestamp)} · {log.source} · {log.correlationId}</p></div></article>;
}

function time(value:string) { return new Intl.DateTimeFormat('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' }).format(new Date(value)); }
function relative(value:string) { const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000)); return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`; }
