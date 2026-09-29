"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Radio, Video } from 'lucide-react';

type SiteOption = { id: string; name: string; code?: string };
type Sighting = { id: number; name: string | null; tsStart: number };

/**
 * Video (camera) attendance control — shared by the Contractor and Employer
 * portals. A single "Start" turns the site's face-recognition session on AND
 * opens the device camera, so the camera starts and attendance begins
 * immediately; "Stop" closes the camera and ends the session.
 */
export default function VideoAttendancePanel({
  role,
  sites,
}: {
  role: 'contractor' | 'employer';
  sites: SiteOption[];
}) {
  const api = role === 'contractor' ? '/api/contractor/attendance/camera' : '/api/employer/attendance/camera';

  const [siteId, setSiteId] = useState('');
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [marked, setMarked] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [frameNames, setFrameNames] = useState<Array<{ name: string; known: boolean }>>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const effectiveSite = siteId || String(sites[0]?.id ?? '');

  const closeCamera = useCallback(() => {
    setLive(false);
    setFrameNames([]);
    setStream(prev => { prev?.getTracks().forEach(track => track.stop()); return null; });
  }, []);

  const openCamera = useCallback(async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
      });
      setStream(media);
      setLive(true);
      return true;
    } catch {
      setError('Camera permission denied — the session is running but no device camera is feeding it.');
      return false;
    }
  }, []);

  const start = useCallback(async () => {
    if (!effectiveSite) { setError('Select a site first.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(api, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: Number(effectiveSite), action: 'start' }),
      });
      const body = await response.json().catch(() => ({})) as {
        data?: { running: boolean; siteName: string; sightings: Sighting[]; markedToday: number }; error?: string;
      };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not start the attendance camera.');
      setSiteId(effectiveSite);
      setRunning(body.data.running);
      setSightings(body.data.sightings ?? []);
      setMarked(body.data.markedToday ?? 0);
      const opened = await openCamera();
      setNotice(opened
        ? `Attendance started for ${body.data.siteName} — camera on, recognised workers are being marked.`
        : `Attendance session started for ${body.data.siteName}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start the attendance camera.');
    } finally { setBusy(false); }
  }, [api, effectiveSite, openCamera]);

  const stop = useCallback(async () => {
    setBusy(true); setError(''); setNotice('');
    closeCamera();
    try {
      const response = await fetch(api, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: Number(effectiveSite), action: 'stop' }),
      });
      const body = await response.json().catch(() => ({})) as { data?: { running: boolean; siteName: string }; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not stop the attendance camera.');
      setRunning(body.data.running);
      setNotice(`Attendance stopped for ${body.data.siteName}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not stop the attendance camera.');
    } finally { setBusy(false); }
  }, [api, effectiveSite, closeCamera]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Stop the webcam when leaving the page so the light never lingers.
  useEffect(() => () => { stream?.getTracks().forEach(track => track.stop()); }, [stream]);

  // While a session is running, poll the pipeline for detections.
  useEffect(() => {
    if (!running || !effectiveSite) return;
    let active = true;
    const tick = async () => {
      try {
        const response = await fetch(api, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: Number(effectiveSite), action: 'sync' }),
        });
        const body = await response.json().catch(() => ({})) as { data?: { sightings: Sighting[]; markedToday: number } };
        if (active && body.data) { setSightings(body.data.sightings ?? []); setMarked(body.data.markedToday ?? 0); }
      } catch { /* transient; retry next tick */ }
    };
    void tick();
    const timer = setInterval(tick, 10_000);
    return () => { active = false; clearInterval(timer); };
  }, [running, effectiveSite, api]);

  // While the camera is live, send a frame every few seconds for recognition.
  useEffect(() => {
    if (!live) return;
    let active = true;
    const tick = async () => {
      const video = videoRef.current, canvas = canvasRef.current;
      if (!video || !canvas || !video.videoWidth) return;
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL('image/jpeg', 0.7);
      try {
        const response = await fetch(api, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: Number(effectiveSite), action: 'frame', image }),
        });
        const body = await response.json().catch(() => ({})) as {
          data?: { sightings: Sighting[]; markedToday: number; frame?: { detections?: Array<{ name: string; known: boolean }> } };
        };
        if (active && body.data) {
          setSightings(body.data.sightings ?? []);
          setMarked(body.data.markedToday ?? 0);
          setFrameNames(body.data.frame?.detections ?? []);
        }
      } catch { /* transient; retry next tick */ }
    };
    void tick();
    const timer = setInterval(tick, 2500);
    return () => { active = false; clearInterval(timer); };
  }, [live, effectiveSite, api]);

  return (
    <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl border border-slate-700 text-white p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className={`text-xs font-extrabold uppercase tracking-widest ${running ? 'text-emerald-400' : 'text-slate-400'}`}>{running ? 'Live — tracking' : 'Video attendance'}</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">Camera / Video Attendance</h2>
          <p className="text-xs text-slate-300 mt-1">Pick a site and start the system — the camera turns on and recognised workers are marked present automatically.</p>
        </div>
        <button
          type="button"
          disabled={busy || sites.length === 0}
          onClick={() => void (running ? stop() : start())}
          className={`h-11 px-5 rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all self-start sm:self-auto disabled:opacity-50 ${running ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'}`}
        >
          {running ? <><CameraOff size={16}/> Stop Attendance Camera</> : <><Camera size={16}/> Start Attendance Camera</>}
        </button>
      </div>

      {notice && <p className="text-xs text-emerald-300">{notice}</p>}
      {error && <p className="text-xs text-rose-300">{error}</p>}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Site</span>
          <select value={effectiveSite} onChange={e => setSiteId(e.target.value)} disabled={running} className="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-2 text-xs font-semibold text-slate-200 focus:outline-none disabled:opacity-60">
            {sites.length === 0 && <option value="">No sites available</option>}
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` · ${s.code}` : ''}</option>)}
          </select>
          <p className="text-[10px] text-slate-400">Status: <span className={running ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>{running ? 'Running' : 'Stopped'}</span></p>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recognised events</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-white">{sightings.length}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">This site</span>
          </div>
          <p className="text-[10px] text-emerald-300">Workers marked today: <strong>{marked}</strong></p>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latest events</span>
          {sightings.length === 0
            ? <p className="text-[11px] text-slate-500">No events yet.</p>
            : <ul className="space-y-1">{sightings.slice(0, 4).map(d => (
                <li key={d.id} className="text-[11px] text-slate-200 flex justify-between gap-2">
                  <span>{d.name || 'Unknown / QR'}</span>
                  <span className="text-slate-500">{new Date((d.tsStart || 0) * 1000).toLocaleTimeString()}</span>
                </li>
              ))}</ul>}
        </div>
      </div>

      <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Video size={12}/> Camera (this device)</span>
          {live
            ? <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300"><Radio size={12}/> Live</span>
            : <span className="text-[10px] font-bold text-slate-500">Off</span>}
        </div>
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            {!live && <div className="absolute inset-0 grid place-items-center text-slate-500 text-xs">Camera off — press Start</div>}
          </div>
          <div className="space-y-2">
            <p className="text-[11px] text-slate-300">Now in frame:</p>
            {frameNames.length === 0
              ? <p className="text-[11px] text-slate-500">No face detected yet.</p>
              : <ul className="space-y-1">{frameNames.map((d, i) => (
                  <li key={i} className={`text-[11px] font-semibold ${d.known ? 'text-emerald-300' : 'text-amber-300'}`}>{d.known ? `✓ ${d.name}` : 'Unknown face'}</li>
                ))}</ul>}
            <p className="text-[11px] text-slate-400">Workers marked today: <strong className="text-emerald-300">{marked}</strong></p>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      </div>
    </section>
  );
}
