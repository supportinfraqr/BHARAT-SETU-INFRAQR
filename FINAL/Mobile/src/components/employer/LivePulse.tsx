"use client";

/** Always-visible live attendance strip for the employer dashboard.
 *  Uses the same request the Analytics → Live tab makes
 *  (GET /api/employer/analytics?tab=live&period=live) on the same 30s cadence,
 *  so it stays live whichever dashboard view or analytics tab is open. */

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Loader2, Radio } from 'lucide-react';
import type { LiveData, WorkerRow } from '@/components/employer/EmployerAnalytics';

export type LiveFeed = {
  data: Partial<LiveData> | null; loading: boolean; error: string; updatedAt: string; reload: () => Promise<void>;
};

export function useLiveFeed(options: { siteId?: string; intervalMs?: number } = {}): LiveFeed {
  const [data, setData] = useState<Partial<LiveData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const q = new URLSearchParams({ tab: 'live', period: 'live' });
      if (options.siteId) q.set('siteId', options.siteId);
      const response = await fetch(`/api/employer/analytics?${q}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: Partial<LiveData>; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error || 'Live feed could not be loaded.');
      setData(body.data);
      setUpdatedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Live feed could not be loaded.');
    } finally { setLoading(false); }
  }, [options.siteId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const id = setInterval(() => { void reload(); }, options.intervalMs ?? 30000);
    return () => clearInterval(id);
  }, [reload, options.intervalMs]);

  return { data, loading, error, updatedAt, reload };
}

type LiveEvent = LiveData['recentEvents'][number];
const eventToRow = (e: LiveEvent): WorkerRow => ({ worker: e.worker, bssId: e.bssId, site: e.site, contractor: '', status: e.type === 'IN' ? 'on_site' : 'checked_out', lastSource: e.source, lastType: e.type, lastAt: e.at });
const hhmm = (v?: string) => (v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '');

export function LivePulse({ feed, onWorker }: { feed: LiveFeed; onWorker: (w: WorkerRow) => void }) {
  const { data, loading, error, updatedAt } = feed;
  const events = data?.recentEvents ?? [];
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (events.length < 2) return;
    const id = setInterval(() => setI(n => (n + 1) % Math.min(events.length, 5)), 4000);
    return () => clearInterval(id);
  }, [events.length]);
  const latest = events.length ? events[i % Math.min(events.length, 5)] : null;

  const counts: Array<{ label: string; value: number; color: string }> = [
    { label: 'On site', value: data?.onSiteNow ?? 0, color: '#14843C' },
    { label: 'Present', value: data?.today?.present ?? 0, color: '#FFFFFF' },
    { label: 'Checked out', value: data?.today?.checkedOut ?? 0, color: '#6886C6' },
    { label: 'Not arrived', value: data?.today?.notArrived ?? 0, color: '#E45D24' },
  ];

  return <div className="relative">
    <div className="rounded-2xl bg-[#01183A] text-white px-3 py-2 flex items-center gap-3 shadow-[0_10px_24px_-14px_rgba(1,24,58,0.6)]">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#14843C] px-2.5 py-1 text-[10px] font-extrabold tracking-[0.14em] shrink-0">
        <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75"/><span className="relative w-1.5 h-1.5 rounded-full bg-white"/></span>LIVE
      </span>

      <dl className="flex items-center gap-3 sm:gap-4 shrink-0">
        {counts.map((c, n) => <div key={c.label} className={`flex items-baseline gap-1.5 ${n > 0 ? 'hidden sm:flex' : 'flex'}`}>
          <dd className="text-lg font-extrabold tabular-nums leading-none" style={{ color: c.color }}>{data ? c.value : '–'}</dd>
          <dt className="text-[10px] uppercase tracking-wider text-white/55">{c.label}</dt>
        </div>)}
      </dl>

      <span className="hidden md:block w-px h-6 bg-white/15 shrink-0" />

      <button type="button" onClick={() => latest && onWorker(eventToRow(latest))} disabled={!latest} className="min-w-0 flex-1 text-left flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-white/10 disabled:hover:bg-transparent transition-colors" aria-live="polite">
        {latest ? <>
          <span className={`hidden sm:inline-flex shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${latest.type === 'IN' ? 'bg-[#14843C] text-white' : 'bg-[#6886C6] text-white'}`}>{latest.source} {latest.type}</span>
          <span key={`${latest.bssId}-${latest.at}`} className="min-w-0 truncate text-xs animate-[pulse_0.6s_ease-out_1]"><strong className="font-bold">{latest.worker}</strong><span className="text-white/55"> · {latest.site} · {hhmm(latest.at)}</span></span>
        </> : <span className="text-xs text-white/55">{error || (loading ? 'Connecting to live feed…' : 'No punches recorded yet today.')}</span>}
      </button>

      <span className="hidden lg:flex items-center gap-1.5 text-[10px] text-white/45 shrink-0">{loading && <Loader2 size={11} className="animate-spin"/>}{updatedAt && `Updated ${updatedAt}`}</span>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-semibold inline-flex items-center gap-1.5 shrink-0">
        <Radio size={12}/><span className="hidden sm:inline">Feed</span>{events.length > 0 && <span className="tabular-nums">{events.length}</span>}<ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>
    </div>

    {open && <div className="absolute right-0 mt-2 w-full sm:w-[420px] rounded-2xl bg-white border border-[#DBE3EF] shadow-2xl overflow-hidden z-40">
      <div className="px-4 py-3 border-b border-[#DBE3EF] flex items-center justify-between">
        <p className="text-sm font-extrabold text-[#01183A]">Live event feed</p>
        <span className="text-[10px] text-bss-text-muted">Latest punches — any source · tap to open</span>
      </div>
      {events.length ? <ol className="max-h-[360px] overflow-y-auto p-2">{events.map((e, n) => <li key={n}>
        <button type="button" onClick={() => { setOpen(false); onWorker(eventToRow(e)); }} className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#F2F6FC]">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.type === 'IN' ? '#14843C' : '#1E3A8A' }}/>
          <span className="min-w-0 flex-1"><strong className="block text-xs text-[#01183A] truncate">{e.worker}</strong><span className="block text-[10px] text-bss-text-muted truncate"><span className="font-mono">{e.bssId}</span> · {e.site}</span></span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${e.type === 'IN' ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-blue-tint text-bss-interactive-blue'}`}>{e.source} {e.type}</span>
          <span className="text-[10px] text-bss-text-muted tabular-nums w-14 text-right shrink-0">{hhmm(e.at)}</span>
        </button>
      </li>)}</ol> : <p className="p-6 text-center text-xs text-bss-text-muted">No punches recorded yet today.</p>}
    </div>}
  </div>;
}
