"use client";

import { useCallback, useEffect, useState } from 'react';
import { Camera, Check, Clock3, Copy, Download, Loader2, Plus, RefreshCw, Save, ShieldCheck, Trash2, Wifi, X } from 'lucide-react';

type CaptureWindow = { days: string[]; start: string; end: string };
type CameraRow = {
  id: number;
  uid: string;
  siteId: number;
  label: string;
  employerLabel: string;
  channel: number | null;
  allowedIp: string;
  timezone: string;
  timezoneLabel: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';
  online: boolean;
  createdByDeviceId: string;
  createdByDeviceName: string;
  scheduleEnabled: boolean;
  windows: CaptureWindow[];
  mode: string;
  status: string;
  lastSeenAt: string | null;
  lastSeenIp: string;
  lastEventAt: string | null;
};
type DeviceBrief = {
  deviceId: string;
  name: string;
  active: boolean;
  online: boolean;
  lastSeenAt: string | null;
  lastSeenIp: string;
  version: string;
};
type DeviceRow = DeviceBrief & {
  employerName: string;
  cameraCount: number;
  sites: Array<{ id: number; bssId: string; name: string }>;
};
type SiteRow = {
  siteId: number;
  siteName: string;
  bssId: string;
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

function deviceStatus(device: DeviceBrief) {
  if (!device.active) return { label: 'Revoked', className: 'bg-bss-soft-orange text-bss-error' };
  return device.online
    ? { label: 'Online', className: 'bg-bss-soft-green text-bss-green' }
    : { label: 'Offline', className: 'bg-bss-bg text-bss-text-muted' };
}

function cameraStatus(camera: CameraRow) {
  if (camera.approvalStatus === 'PENDING') return { label: 'Pending approval', className: 'bg-bss-soft-orange text-bss-error' };
  if (camera.approvalStatus === 'APPROVED') {
    return camera.online
      ? { label: 'Online', className: 'bg-bss-soft-green text-bss-green' }
      : { label: 'Offline', className: 'bg-bss-bg text-bss-text-muted' };
  }
  return { label: 'Removed', className: 'bg-bss-bg text-bss-text-muted' };
}

function CameraCard({ site, camera, onSaved }: { site: SiteRow; camera: CameraRow; onSaved: (message: string) => void }) {
  const [allowedIp, setAllowedIp] = useState(camera.allowedIp || '');
  const [employerLabel, setEmployerLabel] = useState(camera.employerLabel || camera.label);
  const [scheduleEnabled, setScheduleEnabled] = useState(Boolean(camera.scheduleEnabled));
  const [windows, setWindows] = useState<CaptureWindow[]>(camera.windows?.length ? camera.windows : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const approved = camera.approvalStatus === 'APPROVED';
  const pending = camera.approvalStatus === 'PENDING';

  const save = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/employer/attendance-cameras/${camera.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedIp, employerLabel, scheduleEnabled, windows }),
      });
      const body = await response.json().catch(() => ({})) as { data?: CameraRow; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not save this camera.');
      onSaved(`${camera.label} updated.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this camera.');
    } finally { setBusy(false); }
  };

  const approve = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/employer/attendance-cameras/${camera.id}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employerLabel }),
      });
      const body = await response.json().catch(() => ({})) as { data?: CameraRow; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not approve this camera.');
      onSaved(`${camera.label} approved.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not approve this camera.');
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${camera.employerLabel || camera.label}? Historical attendance will be kept.`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/employer/attendance-cameras/${camera.id}/remove`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not remove this camera.');
      onSaved(`${camera.label} removed. Historical attendance is retained.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not remove this camera.');
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

  return (
    <section className="bss-card rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-bss-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-bss-bg grid place-items-center"><Camera size={18} /></span>
          <div>
            <h3 className="text-sm font-bold text-bss-text-primary">{camera.employerLabel || camera.label}{camera.channel ? ` · CH ${camera.channel}` : ''}</h3>
            <p className="text-[11px] text-bss-text-muted">Client label: {camera.label}{camera.createdByDeviceName ? ` · added by ${camera.createdByDeviceName}` : ''}</p>
            <p className="text-[11px] text-bss-text-muted font-mono break-all">Camera ID: {camera.uid || '—'}</p>
            <p className="text-[11px] text-bss-text-muted">Last seen {when(camera.lastSeenAt)} · IP {camera.lastSeenIp || 'unknown'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${cameraStatus(camera).className}`}>
            {cameraStatus(camera).label}
          </span>
          {approved && <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${camera.mode === 'SENDING' ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-bg text-bss-text-muted'}`}>
            {MODE_LABEL[camera.mode] || camera.mode}
          </span>}
        </div>
      </div>
      <div className="p-4 space-y-4">
        {error && <p className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-3">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Employer display label</label>
            <input value={employerLabel} onChange={e => setEmployerLabel(e.target.value)} placeholder="Main Gate" className={input} />
            <p className="text-[11px] text-bss-text-muted mt-1">White-label name shown on your dashboard. The client keeps its own label.</p>
          </div>
          <div>
            <label className={label}>Allowed public IP</label>
            <input value={allowedIp} onChange={e => setAllowedIp(e.target.value)} placeholder="e.g. 203.0.113.10" className={input} />
            <p className="text-[11px] text-bss-text-muted mt-1">Exact public IPv4. The client must send from this IP.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Timezone</label>
            <p className="h-10 rounded-lg border border-bss-border bg-bss-bg px-3 flex items-center text-sm text-bss-text-secondary">IST (UTC +05:30)</p>
          </div>
          <div>
            <label className={label}>Client setup</label>
            <p className="h-10 rounded-lg border border-bss-border bg-bss-bg px-3 flex items-center text-sm text-bss-text-secondary">RTSP configured on client</p>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-bss-text-muted">Site: {site.siteName}. RTSP stays on the client machine.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void save()} disabled={busy}
              className="h-10 px-4 rounded-lg border border-bss-border text-sm font-semibold flex items-center gap-2 hover:bg-bss-bg disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
            </button>
            {pending && <button type="button" onClick={() => void approve()} disabled={busy}
              className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black disabled:opacity-50">
              <Check size={15} /> Approve camera
            </button>}
            <button type="button" onClick={() => void remove()} disabled={busy}
              className="h-10 px-4 rounded-lg border border-bss-border text-sm font-semibold text-bss-error flex items-center gap-2 hover:bg-bss-bg disabled:opacity-50">
              <Trash2 size={15} /> Remove
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function EdgeDevicesPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revoking, setRevoking] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [cameraResponse, deviceResponse] = await Promise.all([
        fetch('/api/employer/attendance-cameras', { cache: 'no-store' }),
        fetch('/api/employer/edge-devices', { cache: 'no-store' }),
      ]);
      const cameraBody = await cameraResponse.json().catch(() => ({})) as { data?: SiteRow[]; error?: string };
      const deviceBody = await deviceResponse.json().catch(() => ({})) as { data?: DeviceRow[]; error?: string };
      if (!cameraResponse.ok || !cameraBody.data) throw new Error(cameraBody.error ?? 'Could not load attendance cameras.');
      if (!deviceResponse.ok || !deviceBody.data) throw new Error(deviceBody.error ?? 'Could not load activated clients.');
      setSites(cameraBody.data);
      setDevices(deviceBody.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load attendance cameras.');
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial page load
  useEffect(() => { void load(); }, [load]);

  const revoke = async (device: DeviceBrief) => {
    if (!window.confirm(`Revoke ${device.name || 'this client'}? Its cameras will stop reporting.`)) return;
    setRevoking(device.deviceId); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/employer/edge-devices/${device.deviceId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not revoke the device.');
      setNotice('Device revoked. Its cameras will stop reporting.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not revoke the device.');
    } finally { setRevoking(''); }
  };

  const copySiteId = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setNotice('BSS Site ID copied.'); }
    catch { setNotice(`BSS Site ID: ${code}`); }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Principal employer · Attendance</p>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><ShieldCheck size={22} /> Attendance cameras</h1>
          <p className="text-sm text-bss-text-muted mt-1">Client-added cameras appear here for approval. Set the public IP and capture window, white-label the camera, or remove it. Live video never leaves the client.</p>
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

      <section className="bss-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-bss-text-muted">Activated clients</p>
            <h2 className="text-base font-bold text-bss-text-primary mt-1">Attendance devices</h2>
            <p className="text-[11px] text-bss-text-muted mt-0.5">One client can run cameras across multiple sites.</p>
          </div>
          <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-bss-bg text-bss-text-muted">{devices.length} client{devices.length === 1 ? '' : 's'}</span>
        </div>
        {devices.length === 0 ? (
          <p className="text-sm text-bss-text-muted">No client activated yet. Install the attendance client and activate it with the employer mobile.</p>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {devices.map(device => (
              <div key={device.deviceId} className="rounded-xl border border-bss-border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-bss-text-primary flex items-center gap-2"><Wifi size={14} /> {device.name || 'Attendance client'}</p>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${deviceStatus(device).className}`}>{deviceStatus(device).label}</span>
                </div>
                <p className="text-[11px] text-bss-text-muted font-mono break-all">Device ID: {device.deviceId}</p>
                <p className="text-[11px] text-bss-text-muted">Last seen {when(device.lastSeenAt)} · IP {device.lastSeenIp || 'unknown'}</p>
                <p className="text-[11px] text-bss-text-muted">Version {device.version || '—'} · {device.cameraCount} camera{device.cameraCount === 1 ? '' : 's'}</p>
                <p className="text-[11px] text-bss-text-muted">{device.sites.length ? device.sites.map(site => site.name).join(', ') : 'No sites yet'}</p>
                {device.active && <button type="button" onClick={() => void revoke(device)} disabled={revoking === device.deviceId} className="h-8 px-3 rounded-lg border border-bss-border text-xs font-bold text-bss-error hover:bg-bss-bg disabled:opacity-50">{revoking === device.deviceId ? 'Revoking…' : 'Revoke client'}</button>}
              </div>
            ))}
          </div>
        )}
      </section>

      {sites.map(site => (
        <section key={site.siteId} className="space-y-4">
          <div className="bss-card rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-bss-text-primary">{site.siteName}</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-bss-bg text-bss-text-muted">Cameras {site.cameraCount} / {site.cameraLimit}</span>
                {site.devices.length === 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-bss-soft-orange text-bss-error">No client activated</span>}
              </div>
              <p className="text-sm text-bss-text-muted mt-0.5">{site.bssId || 'No BSS site ID'} · Camera limit is controlled by BSS admin.</p>
              {site.devices.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {site.devices.map(device => (
                    <span key={device.deviceId} className="inline-flex items-center gap-2 text-[11px] text-bss-text-muted bg-bss-bg rounded-lg px-2.5 py-1">
                      <Wifi size={12} /> {device.name || 'Client'} · {deviceStatus(device).label} · last seen {when(device.lastSeenAt)}
                      {device.active && <button type="button" onClick={() => void revoke(device)} disabled={revoking === device.deviceId} className="text-bss-error font-bold ml-1 disabled:opacity-50">
                        {revoking === device.deviceId ? '…' : 'Revoke'}
                      </button>}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {site.bssId && (
              <button type="button" onClick={() => void copySiteId(site.bssId)} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold flex items-center gap-1.5 hover:bg-bss-bg self-start">
                <Copy size={14} /> BSS Site ID
              </button>
            )}
          </div>

          {site.cameras.length === 0 ? (
            <div className="bss-card rounded-2xl p-5 text-sm text-bss-text-muted flex items-center gap-2"><Clock3 size={16} /> Cameras are added from the attendance client and appear here for approval.</div>
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
