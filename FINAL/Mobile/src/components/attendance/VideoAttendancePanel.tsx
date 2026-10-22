"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, CameraOff, Radio, Settings2, Video, X } from 'lucide-react';
import CameraPreview from '@/components/employer/CameraPreview';

type SiteOption = { id: string; name: string; bssId?: string };
type Sighting = { id: number; name: string | null; tsStart: number; camera?: string | null };
type CameraRow = { id?: number; siteId?: number; label: string; area: string; enabled: boolean; configured: boolean; running?: boolean };

/**
 * CCTV attendance control — employer-only. Attendance runs ONLY from the
 * employer-configured site CCTV feeds (set up in CCTV Setup). There is no
 * device/laptop camera here: pressing Start launches the site's configured
 * camera feeds on the attendance engine, and the engine marks recognised
 * workers present automatically. Contractors have no access to this system.
 */
export default function VideoAttendancePanel({
  sites,
}: {
  sites: SiteOption[];
}) {
  const api = '/api/employer/attendance/camera';

  const [siteId, setSiteId] = useState('');
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [marked, setMarked] = useState(0);
  const [previewFor, setPreviewFor] = useState<CameraRow | null>(null);
  const [allowFeedView, setAllowFeedView] = useState(false);
  const stoppedManually = useRef(false);

  const effectiveSite = siteId || String(sites[0]?.id ?? '');

  const apply = useCallback((data: {
    running: boolean; sightings?: Sighting[]; markedToday?: number; cameras?: CameraRow[]; siteName?: string; allowFeedView?: boolean;
  }) => {
    setRunning(data.running);
    if (data.sightings) setSightings(data.sightings);
    if (typeof data.markedToday === 'number') setMarked(data.markedToday);
    if (data.cameras) setCameras(data.cameras);
    if (typeof data.allowFeedView === 'boolean') setAllowFeedView(data.allowFeedView);
  }, []);

  const call = useCallback(async (action: 'status' | 'start' | 'stop' | 'sync') => {
    const response = await fetch(api, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: Number(effectiveSite), action }),
    });
    const body = await response.json().catch(() => ({})) as {
      data?: { running: boolean; siteName: string; sightings?: Sighting[]; markedToday?: number; cameras?: CameraRow[]; allowFeedView?: boolean }; error?: string;
    };
    if (!response.ok || !body.data) throw new Error(body.error ?? 'CCTV attendance request failed.');
    apply(body.data);
    return body.data;
  }, [api, effectiveSite, apply]);

  const start = useCallback(async () => {
    if (!effectiveSite) { setError('Select a site first.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      stoppedManually.current = false;
      const data = await call('start');
      setSiteId(effectiveSite);
      setNotice(`CCTV attendance running for ${data.siteName} — recognised workers are being marked.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start CCTV attendance.');
    } finally { setBusy(false); }
  }, [call, effectiveSite]);

  const stop = useCallback(async () => {
    setBusy(true); setError(''); setNotice('');
    stoppedManually.current = true;
    try {
      const data = await call('stop');
      setNotice(`CCTV attendance stopped for ${data.siteName}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not stop CCTV attendance.');
    } finally { setBusy(false); }
  }, [call]);

  // Load status when the site changes; auto-start once a site has cameras.
  useEffect(() => {
    if (!effectiveSite) return;
    let active = true;
    void (async () => {
      try {
        const data = await call('status');
        if (!active) return;
        const usable = (data.cameras ?? []).some(c => c.enabled && c.configured);
        if (usable && !data.running && !stoppedManually.current) {
          const started = await call('start');
          if (active) setNotice(`CCTV attendance running for ${started.siteName}.`);
        }
      } catch { /* handled on explicit start */ }
    })();
    return () => { active = false; };
  }, [effectiveSite, call]);

  // While running, poll for detections.
  useEffect(() => {
    if (!running || !effectiveSite) return;
    let active = true;
    const tick = async () => {
      try { await call('sync'); } catch { /* transient; retry next tick */ }
    };
    const timer = setInterval(() => { if (active) void tick(); }, 10_000);
    return () => { active = false; clearInterval(timer); };
  }, [running, effectiveSite, call]);

  const configuredCount = cameras.filter(c => c.configured).length;
  const noCameras = cameras.length === 0;

  return (
    <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl border border-slate-700 text-white p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className={`text-xs font-extrabold uppercase tracking-widest ${running ? 'text-emerald-400' : 'text-slate-400'}`}>{running ? 'Live — tracking CCTV' : 'CCTV attendance'}</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">CCTV Attendance</h2>
          <p className="text-xs text-slate-300 mt-1">Attendance is captured from the site&apos;s CCTV cameras configured by the employer. No laptop or mobile camera is used.</p>
        </div>
        <button
          type="button"
          disabled={busy || sites.length === 0 || noCameras}
          onClick={() => void (running ? stop() : start())}
          className={`h-11 px-5 rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all self-start sm:self-auto disabled:opacity-50 ${running ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'}`}
        >
          {running ? <><CameraOff size={16}/> Stop CCTV Attendance</> : <><Camera size={16}/> Start CCTV Attendance</>}
        </button>
      </div>

      {notice && <p className="text-xs text-emerald-300">{notice}</p>}
      {error && <p className="text-xs text-rose-300">{error}</p>}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Site</span>
          <select value={effectiveSite} onChange={e => { setSiteId(e.target.value); stoppedManually.current = false; }} disabled={running} className="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-2 text-xs font-semibold text-slate-200 focus:outline-none disabled:opacity-60">
            {sites.length === 0 && <option value="">No sites available</option>}
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.bssId ? ` · ${s.bssId}` : ''}</option>)}
          </select>
          <p className="text-[10px] text-slate-400">Status: <span className={running ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>{running ? 'Running' : 'Stopped'}</span></p>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CCTV cameras</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-white">{configuredCount}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">Configured</span>
          </div>
          <p className="text-[10px] text-slate-400">{cameras.length - configuredCount} incomplete / disabled</p>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recognised today</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-white">{marked}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Workers marked</span>
          </div>
          <p className="text-[10px] text-emerald-300">{sightings.length} live recognition events</p>
        </div>
      </div>

      <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Video size={12}/> Site CCTV cameras</span>
          {running ? <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300"><Radio size={12}/> Live</span> : <span className="text-[10px] font-bold text-slate-500">Off</span>}
        </div>

        {noCameras ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-2">
            <p className="font-bold">No CCTV cameras configured for this site yet.</p>
            <p>Add the site&apos;s camera feeds (IP address, camera, login) in CCTV Setup, then attendance will use them automatically.</p>
            <Link href="/employer/cctv-setup" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-amber-400 text-slate-950 font-bold"><Settings2 size={14}/> Open CCTV Setup</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              {cameras.map(c => {
                const previewable = allowFeedView && c.enabled && c.configured && c.id != null;
                return (
                <div key={c.id ?? c.label} className="flex items-center gap-3">
                  {previewable ? (
                    <button type="button" onClick={() => setPreviewFor(c)} className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400/40" title="Click to enlarge">
                      <CameraPreview cameraId={c.id ?? 0} label={c.label} className="w-28 h-16" />
                    </button>
                  ) : (
                    <div className="grid h-16 w-28 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-[9px] text-slate-500">{allowFeedView ? 'No feed' : 'View locked'}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-slate-200">{c.label}{c.area && c.area !== c.label ? <span className="font-normal text-slate-400"> · {c.area}</span> : null}</p>
                    <span className={`text-[10px] font-bold ${!c.enabled ? 'text-slate-500' : c.configured ? (c.running ? 'text-emerald-300' : 'text-sky-300') : 'text-amber-300'}`}>
                      {!c.enabled ? 'Disabled' : c.configured ? (c.running ? 'Live' : 'Ready') : 'Incomplete'}
                    </span>
                    {!allowFeedView && <span className="ml-2 text-[10px] text-slate-500">live view off</span>}
                    {previewable && <button type="button" onClick={() => setPreviewFor(c)} className="ml-2 text-[10px] font-semibold text-sky-300 hover:text-sky-200">Enlarge</button>}
                  </div>
                </div>
                );
              })}
            </div>
            <div className="space-y-2">
              <p className="text-[11px] text-slate-300">Latest CCTV recognition events:</p>
              {sightings.length === 0
                ? <p className="text-[11px] text-slate-500">No events yet.</p>
                : <ul className="space-y-1">{sightings.slice(0, 6).map(d => (
                    <li key={d.id} className="text-[11px] text-slate-200 flex justify-between gap-2">
                      <span className="truncate">{d.name || 'Unknown / QR'}{d.camera ? <span className="text-slate-500"> · {d.camera}</span> : null}</span>
                      <span className="text-slate-500">{new Date((d.tsStart || 0) * 1000).toLocaleTimeString()}</span>
                    </li>
                  ))}</ul>}
              <Link href="/employer/cctv-setup" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-300 hover:text-sky-200"><Settings2 size={13}/> Manage CCTV cameras</Link>
            </div>
          </div>
        )}
      </div>

      {previewFor && previewFor.id != null && allowFeedView && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => setPreviewFor(null)}>
          <div role="dialog" aria-modal="true" aria-label="Camera preview" className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{previewFor.label}{previewFor.area && previewFor.area !== previewFor.label ? ` · ${previewFor.area}` : ''}</p>
                <p className="text-[11px] text-slate-400">{running ? 'Live CCTV preview — updates every ~1.5s' : 'Preview (attendance engine idle)'}</p>
              </div>
              <button type="button" onClick={() => setPreviewFor(null)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-slate-800"><X size={18}/></button>
            </div>
            <div className="p-4">
              <CameraPreview cameraId={previewFor.id} label={previewFor.label} className="w-full aspect-video" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
