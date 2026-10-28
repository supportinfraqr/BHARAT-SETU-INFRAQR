'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock3, MessageSquare, Plus, RefreshCw, TicketCheck, XCircle } from 'lucide-react';

type Reply = { id: number; body: string; author: string; createdAt: string };
type Ticket = {
  id: number; reference: string; subject: string; message: string; categoryLabel: string;
  status: 'NEW' | 'READ' | 'RESOLVED' | 'CLOSED'; statusLabel: string; createdAt: string;
  updatedAt: string; replies: Reply[];
};

const STATUS_STYLE: Record<string, string> = {
  NEW: 'bg-amber-50 text-amber-700 border-amber-200',
  READ: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_ICON: Record<string, typeof Clock3> = {
  NEW: Clock3, READ: MessageSquare, RESOLVED: CheckCircle2, CLOSED: XCircle,
};

function when(value: string) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

export default function MySupportTickets({ backHref, contactHref }: { backHref: string; contactHref: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/support-tickets', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: Ticket[]; error?: string };
      if (!response.ok) throw new Error(body.error || 'Your tickets could not be loaded.');
      setTickets(body.data ?? []);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your tickets could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  return <div className="mx-auto max-w-4xl space-y-6 pb-12">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs font-semibold text-bss-text-muted hover:text-bss-text-primary"><ArrowLeft size={13}/>Back</Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-bss-text-muted">Support</p>
        <h1 className="mt-1 text-2xl font-extrabold text-bss-text-primary">My support tickets</h1>
        <p className="mt-1 text-sm text-bss-text-muted">Track the status of every ticket you raised with BSS and read the support team’s replies.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void load()} disabled={loading} className="h-10 px-3 rounded-xl border border-bss-border bg-white text-xs font-bold text-bss-text-primary inline-flex items-center gap-1.5 hover:bg-bss-bg disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>Refresh</button>
        <Link href={contactHref} className="h-10 px-4 rounded-xl bg-bss-navy text-white text-xs font-bold inline-flex items-center gap-1.5"><Plus size={14}/>Raise new ticket</Link>
      </div>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    {loading && !tickets.length ? <div className="rounded-2xl border border-bss-border bg-white p-10 text-center text-sm text-bss-text-muted">Loading your tickets…</div>
      : !tickets.length ? <div className="rounded-2xl border border-dashed border-bss-border bg-white p-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-bss-blue-tint text-bss-interactive-blue"><TicketCheck size={22}/></span>
        <p className="mt-4 text-sm font-bold text-bss-text-primary">No support tickets yet</p>
        <p className="mt-1 text-xs text-bss-text-muted">Use “Raise new ticket” to send a question or grievance to the BSS support team.</p>
      </div>
      : <div className="space-y-3">{tickets.map(ticket => {
        const Icon = STATUS_ICON[ticket.status] || Clock3;
        return <details key={ticket.id} className="group rounded-2xl border border-bss-border bg-white overflow-hidden">
          <summary className="list-none cursor-pointer p-4 sm:p-5 flex items-start gap-3">
            <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${ticket.status === 'CLOSED' || ticket.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : ticket.status === 'NEW' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}><Icon size={16}/></span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[ticket.status] || STATUS_STYLE.READ}`}>{ticket.statusLabel}</span>
                <span className="font-mono text-[10px] text-bss-text-muted">{ticket.reference}</span>
                <span className="text-[10px] text-bss-text-muted">· {ticket.categoryLabel}</span>
              </span>
              <span className="mt-1.5 block text-sm font-bold text-bss-text-primary">{ticket.subject}</span>
              <span className="mt-1 block text-[11px] text-bss-text-muted">{when(ticket.updatedAt)}{ticket.replies.length ? ` · ${ticket.replies.length} repl${ticket.replies.length === 1 ? 'y' : 'ies'}` : ''}</span>
            </span>
          </summary>
          <div className="border-t border-bss-border bg-bss-bg/30 p-4 sm:p-5 space-y-3">
            <div className="rounded-xl border border-bss-border bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Your message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-bss-text-secondary">{ticket.message}</p>
              <p className="mt-2 text-[10px] text-bss-text-muted">Raised {when(ticket.createdAt)}</p>
            </div>
            {ticket.replies.map(reply => <div key={reply.id} className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-bss-text-primary">{reply.author}</p><span className="text-[10px] text-bss-text-muted">{when(reply.createdAt)}</span></div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-bss-text-secondary">{reply.body}</p>
            </div>)}
            {!ticket.replies.length && <p className="text-xs text-bss-text-muted">No reply yet. The support team will reply here and by email.</p>}
          </div>
        </details>;
      })}</div>}
  </div>;
}
