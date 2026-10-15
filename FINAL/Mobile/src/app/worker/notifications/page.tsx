"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, CheckCheck, ChevronRight, CircleAlert, Filter, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ModuleShell } from '@/components/worker/ModuleShell';
import PageHero from '@/components/portal/PageHero';
import { useNotifications } from '@/contexts/NotificationContext';
import type { NotificationCategory, WorkerNotification } from '@/lib/notifications';

type View = 'all' | 'unread' | 'actions';

export default function Notifications() {
  const router = useRouter();
  const { notifications, unreadCount, actionCount, loading, updateNotification, markAllRead } = useNotifications();
  const [view, setView] = useState<View>('all');
  const [category, setCategory] = useState<'All' | NotificationCategory>('All');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const categories = useMemo(() => ['All', ...new Set(notifications.map(item => item.category))] as Array<'All' | NotificationCategory>, [notifications]);
  const filtered = useMemo(() => notifications.filter(item => {
    if (item.resolved) return false;
    if (view === 'unread' && item.read) return false;
    if (view === 'actions' && !item.requiresAction) return false;
    if (category !== 'All' && item.category !== category) return false;
    const term = query.trim().toLocaleLowerCase('en-IN');
    return !term || `${item.title} ${item.message} ${item.category} ${item.entityId || ''}`.toLocaleLowerCase('en-IN').includes(term);
  }), [notifications, view, category, query]);

  const open = async (item: WorkerNotification) => {
    setError('');
    try { if (!item.read) await updateNotification(item.id, 'read'); }
    catch { setError('The read status could not be saved, but you can still complete the action.'); }
    router.push(item.href);
  };

  return <ModuleShell title="Notification Center" description="Pending actions, approvals and personal workflow updates in one place." icon={Bell} hero={<PageHero title="Notification Center" subtitle="Pending actions, approvals and personal workflow updates in one place." actions={<Link href="/worker" aria-label="Back to dashboard" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"><ArrowLeft size={18}/></Link>} />}>
    <section className="grid sm:grid-cols-3 gap-3">
      <Summary label="Unread" value={unreadCount} tone="blue"/>
      <Summary label="Needs your action" value={actionCount} tone="orange"/>
      <Summary label="Total active" value={notifications.filter(item => !item.resolved).length} tone="green"/>
    </section>

    <section className="bss-3d bss-scroll-rise bss-card rounded-2xl overflow-hidden">
      <header className="p-4 border-b border-bss-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex gap-1 bg-bss-bg p-1 rounded-lg w-fit">{(['all','unread','actions'] as View[]).map(item => <button key={item} onClick={() => setView(item)} className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize ${view === item ? 'bg-white shadow-sm text-bss-text-primary' : 'text-bss-text-muted'}`}>{item === 'actions' ? 'Pending actions' : item}</button>)}</div>{unreadCount > 0 && <button onClick={() => void markAllRead().catch(() => setError('Notifications could not be updated. Please try again.'))} className="text-xs font-semibold text-bss-interactive-blue flex items-center gap-1.5"><CheckCheck size={15}/>Mark all as read</button>}</div>
        <div className="grid sm:grid-cols-[1fr_190px] gap-3"><label className="relative"><Search size={15} className="absolute left-3 top-3 text-bss-text-muted"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, reference or category" className="w-full h-10 rounded-lg border border-bss-border pl-9 pr-3 text-sm focus:outline-none focus:border-bss-border"/></label><label className="relative"><Filter size={14} className="absolute left-3 top-3 text-bss-text-muted"/><select value={category} onChange={event => setCategory(event.target.value as typeof category)} className="w-full h-10 rounded-lg border border-bss-border pl-9 pr-3 text-sm bg-white">{categories.map(item => <option key={item}>{item}</option>)}</select></label></div>
      </header>
      {error && <p role="alert" className="m-4 mb-0 rounded-lg bg-bss-soft-orange border border-bss-border px-3 py-2 text-xs text-bss-error">{error}</p>}
      <div className="divide-y divide-bss-border">{loading ? <p className="p-10 text-center text-sm text-bss-text-muted">Loading notifications…</p> : filtered.length ? filtered.map(item => <button key={item.id} onClick={() => void open(item)} className={`w-full p-4 sm:p-5 text-left flex items-start gap-3 hover:bg-bss-bg transition ${item.read ? 'bg-white' : 'bg-bss-blue-tint/30'}`}><span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.read ? 'bg-bss-bg' : item.priority === 'critical' ? 'bg-bss-soft-orange0' : item.priority === 'high' ? 'bg-bss-soft-orange0' : 'bg-bss-blue-tint0'}`}/><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-bss-text-primary">{item.title}</strong><span className="text-[9px] uppercase font-bold tracking-wide text-bss-text-muted bg-bss-bg rounded px-1.5 py-0.5">{item.category}</span>{item.requiresAction && <span className="text-[9px] uppercase font-bold tracking-wide text-bss-orange bg-bss-soft-orange rounded px-1.5 py-0.5">Pending action</span>}</span><span className="block text-xs text-bss-text-muted mt-1.5">{item.message}</span><span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-bss-text-muted"><time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>{item.entityId && <span>Reference: {item.entityId}</span>}<span className="font-semibold text-bss-interactive-blue">{item.actionLabel}</span></span></span><ChevronRight size={17} className="mt-2 text-bss-text-muted"/></button>) : <div className="p-12 text-center"><CircleAlert size={30} className="mx-auto text-bss-text-muted"/><h2 className="text-sm font-semibold mt-3">No matching notifications</h2><p className="text-xs text-bss-text-muted mt-1">Try a different filter or search term.</p></div>}</div>
    </section>
    <p className="text-xs text-bss-text-muted">Opening a notification marks it as read and takes you directly to the related action or status page. Pending actions remain visible until the underlying workflow is resolved.</p>
  </ModuleShell>;
}

function Summary({ label, value, tone }: { label:string; value:number; tone:'blue'|'orange'|'green' }) { const colors={blue:'bg-bss-blue-tint text-bss-interactive-blue border-bss-border',orange:'bg-bss-soft-orange text-bss-orange border-bss-border',green:'bg-bss-soft-green text-bss-green border-bss-border'}; return <div className={`rounded-xl border p-4 ${colors[tone]}`}><span className="text-xs font-medium">{label}</span><strong className="block text-2xl mt-1">{value}</strong></div>; }
function formatTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date); }
