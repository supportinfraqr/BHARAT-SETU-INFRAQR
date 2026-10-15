"use client";

import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/contexts/NotificationContext';

export default function NotificationBell({ viewAllHref = '/worker/notifications' }: { viewAllHref?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { notifications, unreadCount, actionCount, loading, updateNotification, markAllRead } = useNotifications();
  const visible = notifications.filter(item => !item.resolved).slice(0, 5);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = async (id: string, href: string) => {
    try { await updateNotification(id, 'read'); } catch { /* navigation remains available */ }
    setOpen(false);
    router.push(href);
  };

  return <div ref={rootRef} className="relative">
    <button type="button" onClick={() => setOpen(value => !value)} aria-label={`${unreadCount} unread notifications`} aria-expanded={open} className="relative w-9 h-9 rounded-full flex items-center justify-center text-[#68717c] hover:text-[#01183A] hover:bg-black/5 transition-colors">
      <Bell size={20}/>
      {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-bss-soft-orange0 text-white text-[9px] font-bold rounded-full border-2 border-white flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <section className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-11 sm:w-[390px] bss-card rounded-2xl shadow-2xl overflow-hidden z-[70]" aria-label="Notification preview">
      <header className="px-4 py-3 border-b border-bss-border flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-bss-text-primary">Notifications</h2><p className="text-[11px] text-bss-text-muted">{actionCount} pending action{actionCount === 1 ? '' : 's'}</p></div>{unreadCount > 0 && <button onClick={() => void markAllRead()} className="text-[11px] font-semibold text-bss-interactive-blue flex items-center gap-1"><CheckCheck size={14}/>Mark all read</button>}</header>
      <div className="max-h-[390px] overflow-y-auto">{loading ? <p className="p-6 text-center text-xs text-bss-text-muted">Loading notifications…</p> : visible.length ? visible.map(item => <button key={item.id} onClick={() => void openItem(item.id, item.href)} className={`w-full p-4 border-b border-bss-border text-left flex gap-3 hover:bg-bss-bg ${item.read ? 'bg-white' : 'bg-bss-blue-tint/40'}`}><span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${item.read ? 'bg-bss-surface' : item.priority === 'critical' ? 'bg-bss-soft-orange0' : 'bg-bss-blue-tint0'}`}/><span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="text-xs text-bss-text-primary truncate">{item.title}</strong>{item.requiresAction && <small className="text-[9px] font-bold uppercase text-bss-orange bg-bss-soft-orange px-1.5 py-0.5 rounded">Action</small>}</span><span className="block text-[11px] text-bss-text-muted mt-1 line-clamp-2">{item.message}</span></span><ChevronRight size={14} className="mt-1 text-bss-text-muted"/></button>) : <p className="p-6 text-center text-xs text-bss-text-muted">You are all caught up.</p>}</div>
      <button onClick={() => { setOpen(false); router.push(viewAllHref); }} className="w-full h-11 text-xs font-semibold text-[#01183A] bg-bss-bg hover:bg-bss-bg">View all notifications</button>
    </section>}
  </div>;
}
