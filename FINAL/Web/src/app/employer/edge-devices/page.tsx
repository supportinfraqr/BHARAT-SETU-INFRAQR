"use client";

import { useCallback, useEffect, useState } from 'react';
import { Camera, Clock3, Copy, Download, Loader2, Plus, RefreshCw, Save, ShieldCheck, Wifi, X } from 'lucide-react';

type CaptureWindow = { days: string[]; start: string; end: string };
type CameraRow = {
  id: number;
  siteId: number;
  label: string;
  channel: number | null;
  allowedIp: string;
  timezone: string;
  scheduleEnabled: boolean;
  windows: CaptureWindow[];
  mode: string;
  status: string;
  lastSeenAt: string | null;
  lastSeenIp: string;
  lastEventAt: string | null;
  isClaimed: boolean;
  claimStatus: string;
  claimedByDeviceId: string;
  claimedByDeviceName: string;
};
type DeviceBrief = {
  deviceId: string;
  name: string;
  active: boolean;
  lastSeenAt: string | null;
  lastSeenIp: string;
  version: string;
};
type SiteRow = {
  siteId: number;
  siteName: string;
  siteCode: string;
  cameraLimit: number;
  cameraCount: number;
  cameras: CameraRow[];
  devices: DeviceBrief[];
};

const DAYS = [
  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'],
  ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun'],
] as const;
const MODE_LABEL: Record<string, string> = {
  LIVE: 'Live only', SENDING: 'Sending data', SCHEDULED_OFF: 'Scheduled off', OFFLINE: 'Offline',
};

function when(value: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleString();
}

function CameraCard({ site, camera, onSaved }: { site: SiteRow; camera: CameraRow; onSaved: (message: string) => void }) {
  const [allowedIp, setAllowedIp] = useState(camera.allowedIp || '');
  const [timezone, setTimezone] = useState(camera.timezone || 'Asia/Kolkata');
  const [scheduleEnabled, setScheduleEnabled] = useState(Boolean(camera.scheduleEnabled));
  const [windows, setWindows] = useState<CaptureWindow[]>(camera.windows?.length ? camera.windows : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/employer/attendance-cameras/${camera.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedIp, timezone, scheduleEnabled, windows }),
      });
      const body = await response.json().catch(() => ({})) as { data?: CameraRow; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not save this camera.');
      onSaved(`${camera.label} updated.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this camera.');
    } finally { setBusy(false); }
  };

  const addWindow = () => setWindows(current => [...current, { days: [...DAYS.map(([key]) => key)], start: '09:00', end: '18:00' }]);
  const removeWindow = (index: number) => setWindows(current => current.filter((_, i) => i !== index));
  const patchWindow = (index: number, patch: Partial<CaptureWindow>) => setWindows(current => current.map((window, i) => i === index ? { ...window, ...patch } : window));
  const toggleDay = (index: number, day: string) => {
    const window = windows[index];
    const days = window.days.includes(day) ? window.days.filter(d => d !== day) : [...window.days, day];
    patchWindow(index, { days });
  };

  const input = 'w-full h-10 rounded-lg border border-bss-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200';
  const label = 'text-[11px] font-bold uppercase tracking-wider text-bss-text-muted mb-1 block';
  const claimed = camera.isClaimed;

  return (
    <section className="bss-card rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-bss-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-bss-bg grid place-items-center"><Camera size={18} /></span>
          <div>
            <h3 className="text-sm font-bold text-bss-text-primary">{camera.label}{camera.channel ? ` · CH ${camera.channel}` : ''}</h3>
            <p className="text-[11px] text-bss-text-muted">Last seen {when(camera.lastSeenAt)} · IP {camera.lastSeenIp || 'unknown'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${claimed ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-soft-orange text-bss-error'}`}>
            {claimed ? `Claimed${camera.claimedByDeviceName ? ` · ${camera.claimedByDeviceName}` : ''}` : 'Not claimed'}
          </span>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${camera.mode === 'SENDING' ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-bg text-bss-text-muted'}`}>
            {MODE_LABEL[camera.mode] || camera.mode}
          </span>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {error && <p className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-3">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Allowed public IP</label>
            <input value={allowedIp} onChange={e => setAllowedIp(e.target.value)} placeholder="e.g. 203.0.113.10" className={input} />
            <p className="text-[11px] text-bss-text-muted mt-1">Exact public IPv4. The client must send from this IP.</p>
          </div>
          <div>
            <label className={label}>Camera timezone</label>
            <input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="Asia/Kolkata" className={input} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-bss-border p-3">
          <div>
            <p className="text-sm font-semibold text-bss-text-primary">Capture window</p>
            <p className="text-[11px] text-bss-text-muted">Send Data is allowed only inside these windows. Live view is local and always available.</p>
          </div>
          <button type="button" onClick={() => setScheduleEnabled(current => !current)}
            className={`h-9 px-3 rounded-lg text-xs font-bold border ${scheduleEnabled ? 'bg-[#01183A] text-white border-[#01183A]' : 'border-bss-border text-bss-text-secondary'}`}>
            {scheduleEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        {scheduleEnabled && (
          <div className="space-y-3">
            {windows.length === 0 && <p className="text-xs text-bss-text-muted">No windows yet. Add one to restrict Send Data.</p>}
            {windows.map((window, index) => (
              <div key={index} className="rounded-xl border border-bss-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-bss-text-secondary">Window {index + 1}</span>
                  <button type="button" onClick={() => removeWindow(index)} className="w-7 h-7 grid place-items-center rounded-full hover:bg-bss-bg"><X size={14} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(([key, day]) => (
                    <button key={key} type="button" onClick={() => toggleDay(index, key)}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold border ${window.days.includes(key) ? 'bg-[#01183A] text-white border-[#01183A]' : 'border-bss-border text-bss-text-secondary'}`}>
                      {day}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <div><label className={label}>Start</label><input type="time" value={window.start} onChange={e => patchWindow(index, { start: e.target.value })} className={input} /></div>
                  <div><label className={label}>End</label><input type="time" value={window.end} onChange={e => patchWindow(index, { end: e.target.value })} className={input} /></div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addWindow} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold flex items-center gap-1.5 hover:bg-bss-bg">
              <Plus size={14} /> Add window
            </button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-bss-text-muted">Site: {site.siteName} · RTSP is configured on the client.</p>
          <button type="button" onClick={() => void save()} disabled={busy}
            className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save camera
          </button>
        </div>
      </div>
    </section>
  );
}

function AddCameraForm({ site, onSaved }: { site: SiteRow; onSaved: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [channel, setChannel] = useState('');
  const [allowedIp, setAllowedIp] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const atLimit = site.cameraCount >= site.cameraLimit;

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/employer/attendance-cameras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: site.siteId, label, channel: channel || undefined, allowedIp, timezone }),
      });
      const body = await response.json().catch(() => ({})) as { data?: CameraRow; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not add this camera.');
      onSaved(`${label} added to ${site.siteName}.`);
      setLabel(''); setChannel(''); setAllowedIp(''); setTimezone('Asia/Kolkata'); setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add this camera.');
    } finally { setBusy(false); }
  };

  const input = 'w-full h-10 rounded-lg border border-bss-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200';
  const fieldLabel = 'text-[11px] font-bold uppercase tracking-wider text-bss-text-muted mb-1 block';

  if (atLimit) {
    return <div className="bss-card rounded-2xl p-4 text-sm text-bss-text-muted flex items-center gap-2"><ShieldCheck size={16} /> Camera limit reached for this site ({site.cameraCount} / {site.cameraLimit}). Ask BSS admin to raise it.</div>;
  }

  if (!open) {
    return (
      <div className="bss-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-bss-text-primary">Add a site camera</p>
          <p className="text-[11px] text-bss-text-muted mt-0.5">Create the camera, allowlist its public IP, then let the client claim it.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="h-9 px-3 rounded-lg bg-[#01183A] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-black self-start">
          <Plus size={14} /> Add camera
        </button>
      </div>
    );
  }

  return (
    <section className="bss-card rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-bss-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-bss-text-primary">Add camera to {site.siteName}</h3>
          <p className="text-[11px] text-bss-text-muted mt-0.5">The client must use this same camera label. RTSP stays on the client.</p>
        </div>
        <button type="button" onClick={() => { setOpen(false); setError(''); }} className="w-8 h-8 grid place-items-center rounded-full hover:bg-bss-bg"><X size={16} /></button>
      </div>
      <div className="p-4 space-y-3">
        {error && <p className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-3">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div><label className={fieldLabel}>Camera label *</label><input value={label} onChange={e => setLabel(e.target.value)} placeholder="Main Gate" className={input} /></div>
          <div><label className={fieldLabel}>Channel</label><input value={channel} onChange={e => setChannel(e.target.value.replace(/\D/g, ''))} placeholder="1" className={input} /></div>
          <div><label className={fieldLabel}>Allowed public IPv4</label><input value={allowedIp} onChange={e => setAllowedIp(e.target.value)} placeholder="203.0.113.10" className={input} /></div>
          <div><label className={fieldLabel}>Timezone</label><input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="Asia/Kolkata" className={input} /></div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-bss-text-muted">Add the capture window after creating the camera.</p>
          <button type="button" onClick={() => void submit()} disabled={busy || !label.trim()}
            className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add camera
          </button>
        </div>
      </div>
    </section>
  );
}

export default function EdgeDevicesPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revoking, setRevoking] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/employer/attendance-cameras', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: SiteRow[]; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not load attendance cameras.');
      setSites(body.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load attendance cameras.');
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial page load
  useEffect(() => { void load(); }, [load]);

  const revoke = async (device: DeviceBrief) => {
    if (!window.confirm(`Revoke ${device.name || 'this client'}? All its claimed cameras will be released.`)) return;
    setRevoking(device.deviceId); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/employer/edge-devices/${device.deviceId}/revoke`, { method: 'POST' });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not revoke the device.');
      setNotice('Device revoked. Its cameras are now unclaimed.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not revoke the device.');
    } finally { setRevoking(''); }
  };

  const copySiteCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setNotice('Site code copied.'); }
    catch { setNotice(`Site code: ${code}`); }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Principal employer · Attendance</p>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><ShieldCheck size={22} /> Attendance cameras</h1>
          <p className="text-sm text-bss-text-muted mt-1">Site-wise camera setup, public IP allowlists and capture windows. Live video never leaves the client.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <a href="/download/attendance" target="_blank" rel="noopener noreferrer" className="h-10 px-3 rounded-lg bg-[#01183A] text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-black">
            <Download size={15} /> Download client
          </a>
          <button type="button" onClick={() => void load()} className="h-10 px-3 rounded-lg border border-bss-border text-sm font-semibold text-bss-text-secondary flex items-center gap-1.5 hover:bg-bss-bg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      {notice && <p className="text-sm text-bss-green bg-bss-soft-green border border-bss-border rounded-lg p-3">{notice}</p>}
      {error && <p className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-3">{error}</p>}
      {loading && sites.length === 0 && <div className="bss-card rounded-2xl p-8 text-center text-sm text-bss-text-muted"><Loader2 size={18} className="animate-spin inline mr-2" /> Loading sites…</div>}
      {!loading && sites.length === 0 && <div className="bss-card rounded-2xl p-6 text-sm text-bss-text-muted">No sites are available for this employer.</div>}

      {sites.map(site => (
        <section key={site.siteId} className="space-y-4">
          <div className="bss-card rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-bss-text-primary">{site.siteName}</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-bss-bg text-bss-text-muted">Cameras {site.cameraCount} / {site.cameraLimit}</span>
                {site.devices.length === 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-bss-soft-orange text-bss-error">No client activated</span>}
              </div>
              <p className="text-sm text-bss-text-muted mt-0.5">{site.siteCode || 'No site code'} · Cameras can be configured before the client is activated.</p>
              {site.devices.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {site.devices.map(device => (
                    <span key={device.deviceId} className="inline-flex items-center gap-2 text-[11px] text-bss-text-muted bg-bss-bg rounded-lg px-2.5 py-1">
                      <Wifi size={12} /> {device.name || 'Client'} · {device.active ? 'Active' : 'Revoked'} · last seen {when(device.lastSeenAt)}
                      {device.active && <button type="button" onClick={() => void revoke(device)} disabled={revoking === device.deviceId} className="text-bss-error font-bold ml-1 disabled:opacity-50">
                        {revoking === device.deviceId ? '…' : 'Revoke'}
                      </button>}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {site.siteCode && (
              <button type="button" onClick={() => void copySiteCode(site.siteCode)} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold flex items-center gap-1.5 hover:bg-bss-bg self-start">
                <Copy size={14} /> Site code
              </button>
            )}
          </div>

          <AddCameraForm site={site} onSaved={message => { setNotice(message); void load(); }} />

          {site.cameras.length === 0 ? (
            <div className="bss-card rounded-2xl p-5 text-sm text-bss-text-muted flex items-center gap-2"><Clock3 size={16} /> No cameras added for this site yet.</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {site.cameras.map(camera => (
                <CameraCard key={camera.id} site={site} camera={camera} onSaved={message => { setNotice(message); void load(); }} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
