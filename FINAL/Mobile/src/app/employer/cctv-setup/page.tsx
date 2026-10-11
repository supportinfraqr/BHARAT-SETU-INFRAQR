"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Loader2, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import CameraPreview from '@/components/employer/CameraPreview';
import VideoAttendancePanel from '@/components/attendance/VideoAttendancePanel';

type CameraRow = {
  id: number;
  siteId: number;
  label: string;
  area: string;
  sourceType: 'RTSP' | 'HTTP' | 'FILE' | 'OTHER';
  host: string;
  port: number | null;
  channel: string;
  username: string;
  hasPassword: boolean;
  url: string;
  enabled: boolean;
  configured: boolean;
  feed: string;
};

type FormState = {
  id?: number;
  label: string;
  area: string;
  sourceType: 'RTSP' | 'HTTP' | 'FILE' | 'OTHER';
  host: string;
  port: string;
  channel: string;
  username: string;
  password: string;
  clearPassword: boolean;
  hasPassword: boolean;
  url: string;
  enabled: boolean;
};

const EMPTY: FormState = {
  label: '', area: '', sourceType: 'RTSP', host: '', port: '', channel: '/Streaming/Channels/101',
  username: '', password: '', clearPassword: false, hasPassword: false, url: '', enabled: true,
};

function toForm(c: CameraRow): FormState {
  return {
    id: c.id, label: c.label, area: c.area, sourceType: c.sourceType,
    host: c.host, port: c.port ? String(c.port) : '', channel: c.channel,
    username: c.username, password: '', clearPassword: false, hasPassword: c.hasPassword, url: c.url, enabled: c.enabled,
  };
}

export default function CctvSetupPage() {
  const { employer } = useEmployer();
  const sites = employer.sites;
  const [siteId, setSiteId] = useState('');
  const effectiveSite = siteId || String(sites[0]?.id ?? '');

  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormState | null>({ ...EMPTY });
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!effectiveSite) return;
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/employer/cctv/cameras?siteId=${encodeURIComponent(effectiveSite)}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: { cameras: CameraRow[] }; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not load cameras.');
      setCameras(body.data.cameras);
      // No cameras for this site yet — open the config form so the IP/feed fields are immediately available.
      if (!body.data.cameras.length) setForm(current => current ?? { ...EMPTY });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load cameras.');
    } finally { setLoading(false); }
  }, [effectiveSite]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial camera load per site
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!form) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        siteId: Number(effectiveSite),
        label: form.label, area: form.area, sourceType: form.sourceType,
        host: form.host, port: form.port ? Number(form.port) : null, channel: form.channel,
        username: form.username, password: form.password || undefined, clearPassword: form.clearPassword,
        url: form.url, enabled: form.enabled,
      };
      const url = form.id ? `/api/employer/cctv/cameras/${form.id}` : '/api/employer/cctv/cameras';
      const response = await fetch(url, {
        method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({})) as { data?: CameraRow; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not save the camera.');
      setForm(null); setTestResult(null);
      setNotice(form.id ? 'Camera updated.' : 'Camera added.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the camera.');
    } finally { setBusy(false); }
  };

  const remove = async (camera: CameraRow) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/employer/cctv/cameras/${camera.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({})) as { data?: unknown; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not delete the camera.');
      setNotice('Camera removed.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete the camera.');
    } finally { setBusy(false); }
  };

  const test = async () => {
    if (!form) return;
    setBusy(true); setTestResult(null); setError('');
    try {
      const payload = form.id
        ? { cameraId: form.id }
        : {
            siteId: Number(effectiveSite), label: form.label, sourceType: form.sourceType,
            host: form.host, port: form.port ? Number(form.port) : null, channel: form.channel,
            username: form.username, password: form.password || undefined, url: form.url,
          };
      const response = await fetch('/api/employer/cctv/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({})) as { data?: { ok: boolean; width?: number; height?: number; error?: string }; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Test failed.');
      const data = body.data ?? {} as { ok?: boolean; width?: number; height?: number; error?: string };
      setTestResult(data.ok
        ? { ok: true, text: `Connected — video ${data.width || '?'}×${data.height || '?'}` }
        : { ok: false, text: data.error || 'Could not open this feed.' });
    } catch (reason) {
      setTestResult({ ok: false, text: reason instanceof Error ? reason.message : 'Test failed.' });
    } finally { setBusy(false); }
  };

  const siteName = useMemo(() => sites.find(s => String(s.id) === effectiveSite)?.name ?? '', [sites, effectiveSite]);

  const input = 'w-full h-10 rounded-lg border border-bss-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200';
  const label = 'text-[11px] font-bold uppercase tracking-wider text-bss-text-muted mb-1 block';

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Principal employer · Operations</p>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><Camera size={22} /> CCTV Setup</h1>
          <p className="text-sm text-bss-text-muted mt-1">Add the CCTV cameras installed at each site. Attendance is captured from these feeds only — no laptop/mobile camera.</p>
        </div>
        <button
          type="button"
          onClick={() => { setForm({ ...EMPTY }); setTestResult(null); }}
          className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black self-start sm:self-auto"
        >
          <Plus size={16} /> Add camera
        </button>
      </header>

      <VideoAttendancePanel sites={sites} />

      <div className="bss-card rounded-2xl p-4">
        <label className={label}>Site</label>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <select value={effectiveSite} onChange={e => { setSiteId(e.target.value); setForm(null); }} className={`${input} sm:max-w-md`}>
            {sites.length === 0 && <option value="">No sites available</option>}
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` · ${s.code}` : ''}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="h-10 px-3 rounded-lg border border-bss-border text-sm font-semibold text-bss-text-secondary flex items-center gap-1.5 hover:bg-bss-bg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {siteName && <span className="text-xs text-bss-text-muted">Configuring: <strong className="text-bss-text-primary">{siteName}</strong></span>}
        </div>
      </div>

      {notice && <p className="text-sm text-bss-green bg-bss-soft-green border border-bss-border rounded-lg p-3">{notice}</p>}
      {error && <p className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-3">{error}</p>}

      {form && (
        <section className="bss-card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-bss-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-bss-text-primary">{form.id ? 'Edit camera' : 'Add a camera'}</h2>
            <button type="button" onClick={() => { setForm(null); setTestResult(null); }} className="w-8 h-8 grid place-items-center rounded-full hover:bg-bss-bg"><X size={16} /></button>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className={label}>Camera name *</label><input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. Main Gate" className={input} /></div>
            <div><label className={label}>Attendance area</label><input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="e.g. Main Gate / Shop Floor" className={input} /></div>
            <div>
              <label className={label}>How the feed is accessed</label>
              <select value={form.sourceType} onChange={e => setForm({ ...form, sourceType: e.target.value as FormState['sourceType'] })} className={input}>
                <option value="RTSP">RTSP (IP camera / NVR)</option>
                <option value="HTTP">HTTP / MJPEG stream</option>
                <option value="FILE">Test file / simulated feed</option>
                <option value="OTHER">Other / direct URL</option>
              </select>
            </div>
            {(form.sourceType === 'RTSP' || form.sourceType === 'HTTP') && (
              <>
                <div><label className={label}>Camera IP address / host *</label><input value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.64" className={input} /></div>
                <div><label className={label}>Port</label><input value={form.port} onChange={e => setForm({ ...form, port: e.target.value.replace(/\D/g, '') })} placeholder={form.sourceType === 'HTTP' ? '80' : '554'} className={input} /></div>
                <div className="sm:col-span-2 lg:col-span-1"><label className={label}>Stream path / channel</label><input value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} placeholder="/Streaming/Channels/101" className={input} /></div>
                <div><label className={label}>Username</label><input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="admin" className={input} /></div>
                <div>
                  <label className={label}>Password</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value, clearPassword: false })} placeholder={form.hasPassword ? '•••••• (leave blank to keep)' : 'password'} className={input} />
                  {form.hasPassword && <button type="button" onClick={() => setForm({ ...form, password: '', clearPassword: true })} className="mt-1 text-[11px] text-bss-text-muted hover:text-bss-error">Remove stored password</button>}
                </div>
              </>
            )}
            {(form.sourceType === 'FILE' || form.sourceType === 'OTHER') && (
              <div className="sm:col-span-2 lg:col-span-3"><label className={label}>Feed URL / file path *</label><input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder={form.sourceType === 'FILE' ? 'tests/assets/cctv_sim.mp4' : 'rtsp://…'} className={input} /></div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <input id="cam-enabled" type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} className="w-4 h-4" />
              <label htmlFor="cam-enabled" className="text-sm text-bss-text-secondary">Enabled (used for attendance)</label>
            </div>
          </div>
          {testResult && <p className={`px-4 pb-2 text-sm ${testResult.ok ? 'text-bss-green' : 'text-bss-error'}`}>{testResult.ok ? '✓ ' : '✕ '}{testResult.text}</p>}
          <div className="px-4 py-3 border-t border-bss-border flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => void test()} disabled={busy} className="h-10 px-4 rounded-lg border border-bss-border text-sm font-semibold text-bss-text-primary flex items-center gap-2 hover:bg-bss-bg disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />} Test connection
            </button>
            <button type="button" onClick={() => void save()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black disabled:opacity-50">
              <Save size={15} /> {form.id ? 'Save changes' : 'Add camera'}
            </button>
          </div>
        </section>
      )}

      <section className="bss-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-bss-border">
          <h2 className="text-sm font-bold text-bss-text-primary">Cameras at this site</h2>
          <p className="text-[11px] text-bss-text-muted mt-0.5">{cameras.length} camera{cameras.length === 1 ? '' : 's'} configured</p>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-bss-text-muted flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Loading…</p>
        ) : cameras.length === 0 ? (
          <p className="p-6 text-sm text-bss-text-muted">No cameras yet. Use “Add camera” to configure this site&apos;s CCTV feeds.</p>
        ) : (
          <ul className="divide-y divide-bss-border">
            {cameras.map(c => (
              <li key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CameraPreview cameraId={c.id} label={c.label} />
                  <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-bss-text-primary">{c.label || '(unnamed)'}</span>
                    {c.area && c.area !== c.label && <span className="text-[11px] text-bss-text-muted">· {c.area}</span>}
                    {c.enabled
                      ? (c.configured ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-bss-green bg-bss-soft-green border border-bss-border rounded-full px-2 py-0.5"><CheckCircle2 size={11}/>Ready</span>
                                       : <span className="text-[10px] font-bold text-bss-orange bg-bss-soft-orange border border-bss-border rounded-full px-2 py-0.5">Incomplete</span>)
                      : <span className="text-[10px] font-bold text-bss-text-muted bg-bss-bg rounded-full px-2 py-0.5">Disabled</span>}
                  </div>
                  <p className="text-[11px] text-bss-text-muted mt-1 font-mono truncate">{c.feed || c.sourceType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => { setForm(toForm(c)); setTestResult(null); }} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold text-bss-text-primary hover:bg-bss-bg">Edit</button>
                  <button type="button" onClick={() => void remove(c)} disabled={busy} className="h-9 w-9 rounded-lg border border-bss-border text-bss-text-muted hover:text-bss-error hover:border-bss-border grid place-items-center disabled:opacity-50" aria-label="Delete camera"><Trash2 size={15}/></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
