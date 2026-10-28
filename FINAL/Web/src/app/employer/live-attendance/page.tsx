"use client";

import { useMemo, useState } from 'react';
import { Camera, MapPin, RefreshCw, Radio, Users } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { useLiveFeed } from '@/components/employer/LivePulse';
import { WorkerDetailDialog, WorkersTable, type LiveData, type WorkerRow } from '@/components/employer/EmployerAnalytics';
import FaceDataCoverage from '@/components/employer/FaceDataCoverage';

type LiveEvent = LiveData['recentEvents'][number];

function timeLabel(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function eventLabel(event: LiveEvent) {
  if (event.source === 'CAMERA') return event.type === 'SIGHTING' ? 'CAMERA SIGHTING' : `CAMERA ${event.type}`;
  if (event.source === 'QR') return 'QR SCAN';
  return `${event.source} ${event.type}`.trim();
}

export default function EmployerLiveAttendancePage() {
  const { employer, refresh } = useEmployer();
  const [siteId, setSiteId] = useState('');
  const [selected, setSelected] = useState<WorkerRow | null>(null);
  const live = useLiveFeed({ siteId, intervalMs: 10000 });
  const data = live.data;

  const eventRows = useMemo(() => data?.recentEvents ?? [], [data?.recentEvents]);
  const workers = data?.workers ?? [];
  const stats = [
    { label: 'On site', value: data?.onSiteNow ?? 0, icon: Users, tone: 'text-bss-green' },
    { label: 'Present', value: data?.today?.present ?? 0, icon: Users, tone: 'text-bss-text-primary' },
    { label: 'Checked out', value: data?.today?.checkedOut ?? 0, icon: Users, tone: 'text-bss-interactive-blue' },
    { label: 'Not arrived', value: data?.today?.notArrived ?? 0, icon: Users, tone: 'text-bss-orange' },
    { label: 'Feed', value: eventRows.length, icon: Radio, tone: 'text-bss-text-primary' },
  ];

  const openEvent = (event: LiveEvent) => {
    const row = workers.find(worker => worker.bssId === event.bssId);
    setSelected(row ?? {
      worker: event.worker, bssId: event.bssId, site: event.site, contractor: '',
      status: event.type === 'IN' ? 'on_site' : event.type === 'OUT' ? 'checked_out' : 'on_camera',
      lastSource: event.source, lastType: event.type, lastAt: event.at,
    });
  };

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-bss-text-muted">Employer · Live attendance</p>
        <h1 className="mt-1 text-2xl font-extrabold text-bss-text-primary">Live Attendance &amp; Face Data</h1>
        <p className="mt-1 max-w-3xl text-sm text-bss-text-muted">Live on-site status, camera sightings, QR events and manual/self face-enrollment coverage across all sites.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bss-soft-green px-3 py-1.5 text-[11px] font-extrabold text-bss-green"><span className="w-1.5 h-1.5 rounded-full bg-bss-green animate-pulse" />LIVE</span>
        <select value={siteId} onChange={event => setSiteId(event.target.value)} className="h-9 rounded-lg border border-bss-border bg-white px-2 text-xs font-semibold text-bss-text-primary">
          <option value="">All sites</option>
          {employer.sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>
        <button type="button" onClick={() => void Promise.all([live.reload(), refresh()])} disabled={live.loading} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-bss-border bg-white px-3 text-xs font-bold text-bss-text-primary hover:bg-bss-bg disabled:opacity-50">
          <RefreshCw size={13} className={live.loading ? 'animate-spin' : ''} />Refresh
        </button>
        {live.updatedAt && <span className="text-[11px] text-bss-text-muted">Updated {live.updatedAt}</span>}
      </div>
    </header>

    {live.error && <p className="rounded-xl border border-bss-soft-orange bg-bss-soft-orange/50 px-4 py-3 text-xs font-semibold text-bss-orange">{live.error}</p>}

    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map(stat => <article key={stat.label} className="rounded-2xl border border-bss-border bg-white p-4">
        <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-bss-text-muted">{stat.label}</span><stat.icon size={15} className={stat.tone}/></div>
        <strong className={`mt-2 block text-2xl font-extrabold tabular-nums ${stat.tone}`}>{stat.value}</strong>
      </article>)}
    </section>

    <div className="grid gap-5 lg:grid-cols-3">
      <section className="rounded-2xl border border-bss-border bg-white lg:col-span-2">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-bss-border px-4 py-3">
          <div><h2 className="text-sm font-bold text-bss-text-primary">Live camera sightings</h2><p className="text-[11px] text-bss-text-muted">Latest attendance events from cameras, QR and self scans</p></div>
          <span className="text-[10px] font-bold text-bss-text-muted">{eventRows.length} in feed</span>
        </header>
        {eventRows.length ? <ol className="max-h-[460px] divide-y divide-bss-border overflow-y-auto">
          {eventRows.map((event, index) => <li key={`${event.bssId}-${event.at}-${index}`} className="flex items-center gap-3 px-4 py-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${event.source === 'CAMERA' ? 'bg-bss-blue-tint text-bss-interactive-blue' : 'bg-bss-soft-green text-bss-green'}`}><Camera size={15}/></span>
            <button type="button" onClick={() => openEvent(event)} className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-bold text-bss-text-primary">{event.worker || 'Unknown worker'}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-bss-text-muted"><span className="font-mono">{event.bssId || '—'}</span>{event.site && <><span>·</span><MapPin size={10}/>{event.site}</>}</span>
            </button>
            <div className="shrink-0 text-right"><span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${event.source === 'CAMERA' ? 'bg-bss-blue-tint text-bss-interactive-blue' : 'bg-bss-soft-green text-bss-green'}`}>{eventLabel(event)}</span><span className="mt-1 block text-[10px] tabular-nums text-bss-text-muted">{timeLabel(event.at)}</span></div>
          </li>)}
        </ol> : <p className="px-4 py-10 text-center text-sm text-bss-text-muted">{live.loading ? 'Loading live sightings…' : 'No camera sightings recorded today.'}</p>}
      </section>

      <section className="rounded-2xl border border-bss-border bg-white">
        <header className="border-b border-bss-border px-4 py-3"><h2 className="text-sm font-bold text-bss-text-primary">Live workforce</h2><p className="text-[11px] text-bss-text-muted">Workers currently bound to {siteId ? 'this site' : 'your sites'}</p></header>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between rounded-xl bg-bss-bg px-3 py-2"><span className="text-xs font-semibold text-bss-text-secondary">Bound workers</span><strong className="text-sm text-bss-text-primary">{data?.boundWorkers ?? workers.length}</strong></div>
          <div className="flex items-center justify-between rounded-xl bg-bss-bg px-3 py-2"><span className="text-xs font-semibold text-bss-text-secondary">On site now</span><strong className="text-sm text-bss-green">{data?.onSiteNow ?? 0}</strong></div>
          <div className="flex items-center justify-between rounded-xl bg-bss-bg px-3 py-2"><span className="text-xs font-semibold text-bss-text-secondary">Not arrived</span><strong className="text-sm text-bss-orange">{data?.today?.notArrived ?? 0}</strong></div>
          <p className="pt-1 text-[11px] leading-5 text-bss-text-muted">Face and QR events update this page automatically every 10 seconds. Operator toggles for Face / QR / Both are managed in the attendance client.</p>
        </div>
      </section>
    </div>

    <FaceDataCoverage coverage={employer.faceCoverage} siteId={siteId || undefined} />

    <section className="rounded-2xl border border-bss-border bg-white">
      <header className="border-b border-bss-border px-4 py-3"><h2 className="text-sm font-bold text-bss-text-primary">Workers in live view</h2><p className="text-[11px] text-bss-text-muted">Tap a worker to open attendance details</p></header>
      <div className="p-4"><WorkersTable workers={workers} onWorker={setSelected} pageSize={12} /></div>
    </section>

    {selected && <WorkerDetailDialog row={selected} onClose={() => setSelected(null)} />}
  </div>;
}
