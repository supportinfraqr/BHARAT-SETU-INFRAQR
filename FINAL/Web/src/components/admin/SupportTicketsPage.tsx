'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Mail, MailWarning, MessageSquare, RefreshCw, Send, TicketCheck, XCircle } from 'lucide-react';
import AdminPageHero from '@/components/admin/AdminPageHero';

type Reply = {
  id: number;
  body: string;
  author: string;
  emailed: boolean;
  emailError: string;
  createdAt: string;
};

type Ticket = {
  id: number;
  reference: string;
  name: string;
  role: string;
  roleLabel: string;
  bssId: string;
  email: string;
  phone: string;
  category: string;
  categoryLabel: string;
  subject: string;
  message: string;
  status: 'NEW' | 'READ' | 'RESOLVED' | 'CLOSED';
  statusLabel: string;
  emailed: boolean;
  emailError: string;
  createdAt: string;
  updatedAt: string;
  replies: Reply[];
};

const STATUS_STYLE: Record<string, string> = {
  NEW: 'bg-amber-50 text-amber-700 border-amber-200',
  READ: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
};

function when(value: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'open' | 'all' | 'NEW' | 'READ' | 'CLOSED'>('open');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/support-tickets', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: Ticket[]; openCount?: number; error?: string };
      if (!response.ok) throw new Error(body.error || 'Support tickets could not be loaded.');
      const rows = body.data ?? [];
      setTickets(rows);
      setOpenCount(body.openCount ?? rows.filter(row => !['RESOLVED', 'CLOSED'].includes(row.status)).length);
      setSelectedId(current => current && rows.some(row => row.id === current) ? current : (rows[0]?.id ?? null));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Support tickets could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tickets.filter(ticket => {
      const open = !['RESOLVED', 'CLOSED'].includes(ticket.status);
      const matchesFilter = filter === 'all' || (filter === 'open' ? open : ticket.status === filter);
      const matchesQuery = !needle || [ticket.reference, ticket.name, ticket.email, ticket.subject,
        ticket.bssId, ticket.categoryLabel].some(value => value.toLowerCase().includes(needle));
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, tickets]);

  const selected = visible.find(ticket => ticket.id === selectedId) ?? visible[0] ?? null;
  const newCount = tickets.filter(ticket => ticket.status === 'NEW').length;
  const closedCount = tickets.filter(ticket => ['RESOLVED', 'CLOSED'].includes(ticket.status)).length;

  async function sendReply() {
    if (!selected || reply.trim().length < 2) return;
    setBusy(`reply:${selected.id}`); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/support-tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', id: selected.id, message: reply.trim() }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; emailed?: boolean; emailError?: string };
      if (!response.ok) throw new Error(body.error || 'The reply could not be sent.');
      setReply('');
      setNotice(body.emailed ? 'Reply saved and emailed to the requester.' : `Reply saved in the dashboard. Email was not sent: ${body.emailError || 'SMTP is not configured.'}`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The reply could not be sent.');
    } finally {
      setBusy('');
    }
  }

  async function closeTicket() {
    if (!selected) return;
    setBusy(`close:${selected.id}`); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/support-tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', id: selected.id, status: 'CLOSED' }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'The ticket could not be closed.');
      setNotice(`Ticket ${selected.reference} marked closed.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The ticket could not be closed.');
    } finally {
      setBusy('');
    }
  }

  return <div className="space-y-6 pb-12">
    <AdminPageHero
      eyebrow="Support operations"
      title="Support tickets"
      description="Every contact-form ticket lands here. Reply from the dashboard and the reply is also emailed to the requester. Close a ticket when it is resolved."
      icon={<TicketCheck size={14}/>}
      actions={<button type="button" onClick={() => void load()} disabled={loading} className="h-10 px-4 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/20 transition-colors backdrop-blur-sm disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>Refresh</button>}
    />

    {(error || notice) && <div aria-live="polite" className={error ? 'bss-alert bss-alert-error' : 'bss-alert bss-alert-success'}>{error || notice}</div>}

    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Open', value: openCount, icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
        { label: 'New', value: newCount, icon: MessageSquare, tone: 'bg-blue-50 text-blue-700' },
        { label: 'Closed', value: closedCount, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
        { label: 'Total', value: tickets.length, icon: TicketCheck, tone: 'bg-indigo-50 text-indigo-700' },
      ].map(card => <article key={card.label} className="bss-kpi-card">
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{card.label}</span><span className={`bss-kpi-icon ${card.tone}`}><card.icon size={16}/></span></div>
        <strong>{card.value}</strong>
      </article>)}
    </section>

    <section className="bss-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-2">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search reference, name, email, subject…" className="bss-input flex-1 min-w-[220px]" />
        <select value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="bss-select">
          <option value="open">Open tickets</option>
          <option value="all">All tickets</option>
          <option value="NEW">New</option>
          <option value="READ">Read</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="grid xl:grid-cols-[360px_1fr] min-h-[560px]">
        <div className="divide-y divide-gray-100 xl:border-r xl:border-gray-100 max-h-[720px] overflow-y-auto">
          {visible.map(ticket => <button key={ticket.id} type="button" onClick={() => { setSelectedId(ticket.id); setReply(''); }}
            className={`w-full p-4 text-left hover:bg-gray-50 transition ${selected?.id === ticket.id ? 'bg-blue-50/60' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[ticket.status] || STATUS_STYLE.READ}`}>{ticket.statusLabel}</span>
                  <span className="font-mono text-[10px] text-gray-500">{ticket.reference}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mt-2 truncate">{ticket.subject}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{ticket.name} · {ticket.roleLabel} · {ticket.categoryLabel}</p>
                <p className="text-[10px] text-gray-400 mt-1">{when(ticket.updatedAt)}</p>
              </div>
              {ticket.replies.length > 0 && <span className="text-[10px] font-bold text-gray-500 shrink-0">{ticket.replies.length} reply</span>}
            </div>
          </button>)}
          {!visible.length && <div className="p-10 text-center text-sm text-gray-500">{loading ? 'Loading tickets…' : 'No tickets match.'}</div>}
        </div>

        <aside className="bg-gray-50/40">
          {selected ? <div className="p-5 sm:p-6 space-y-5">
            <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[selected.status] || STATUS_STYLE.READ}`}>{selected.statusLabel}</span>
                  <span className="font-mono text-xs text-gray-500">{selected.reference}</span>
                </div>
                <h2 className="text-lg font-extrabold text-gray-950 mt-2">{selected.subject}</h2>
                <p className="text-xs text-gray-500 mt-1">{selected.categoryLabel} · opened {when(selected.createdAt)}</p>
              </div>
              {!['RESOLVED', 'CLOSED'].includes(selected.status) && <button type="button" onClick={() => void closeTicket()} disabled={busy === `close:${selected.id}`} className="h-9 px-3 rounded-lg border border-emerald-200 bg-white text-xs font-bold text-emerald-700 inline-flex items-center gap-1.5 hover:bg-emerald-50 disabled:opacity-50"><CheckCircle2 size={14}/>{busy === `close:${selected.id}` ? 'Closing…' : 'Mark closed'}</button>}
            </header>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#01183A] text-white grid place-items-center text-xs font-bold shrink-0">{initials(selected.name)}</span>
                <div className="min-w-0"><p className="text-sm font-bold text-gray-900 truncate">{selected.name}</p><p className="text-[11px] text-gray-500 truncate">{selected.roleLabel} · {selected.bssId || 'No BSS ID'} · {selected.email}</p></div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">{selected.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
                <span className="inline-flex items-center gap-1">{selected.emailed ? <Mail size={11}/> : <MailWarning size={11}/>}{selected.emailed ? 'Ticket email sent' : `Ticket email: ${selected.emailError || 'not sent'}`}</span>
                {selected.phone && <span>{selected.phone}</span>}
              </div>
            </div>

            {selected.replies.length > 0 && <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Replies</p>
              {selected.replies.map(item => <article key={item.id} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-gray-900">{item.author}</p><span className="text-[10px] text-gray-400">{when(item.createdAt)}</span></div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{item.body}</p>
                <p className={`mt-2 text-[10px] inline-flex items-center gap-1 ${item.emailed ? 'text-emerald-600' : 'text-amber-600'}`}>{item.emailed ? <Mail size={10}/> : <MailWarning size={10}/>}{item.emailed ? 'Emailed' : (item.emailError || 'Email not sent')}</p>
              </article>)}
            </div>}

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Reply to requester</label>
              <textarea value={reply} onChange={event => setReply(event.target.value)} rows={4} placeholder="Write your reply. It is saved here and emailed to the requester." className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-y" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] text-gray-400">Sending a reply reopens a closed ticket as “Read”.</p>
                <button type="button" onClick={() => void sendReply()} disabled={busy === `reply:${selected.id}` || reply.trim().length < 2} className="h-9 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"><Send size={13}/>{busy === `reply:${selected.id}` ? 'Sending…' : 'Send reply'}</button>
              </div>
            </div>

            {selected.status === 'CLOSED' && <p className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 inline-flex items-center gap-2"><XCircle size={14}/>This ticket is closed. A new reply will reopen it as Read.</p>}
          </div> : <p className="p-10 text-sm text-gray-500">Select a ticket to open the thread.</p>}
        </aside>
      </div>
    </section>
  </div>;
}
