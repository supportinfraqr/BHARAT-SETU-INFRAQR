"use client";

import { useCallback, useEffect, useState } from 'react';
import { Camera, Copy, Download, Loader2, RefreshCw, Save, ShieldCheck, Trash2, Wifi } from 'lucide-react';

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
  approvalStatus: 'APPROVED' | 'REMOVED' | 'PENDING' | 'REJECTED';
  ipWhitelisted: boolean;
  online: boolean;
  createdByDeviceName: string;
  lastSeenAt: string | null;
  lastSeenIp: string;
  lastEventAt: string | null;
  mode: string;
  status: string;
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

const MODE_LABEL: Record<string, string> = {
  LIVE: 'Live only', SENDING: 'Attendance running', SCHEDULED_OFF: 'Scheduled off', OFFLINE: 'Offline',
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
  if (!camera.ipWhitelisted) return { label: 'IP whitelisting pending', className: 'bg-bss-soft-orange text-bss-error' };
  return camera.online
    ? { label: 'Online', className: 'bg-bss-soft-green text-bss-green' }
    : { label: 'Offline', className: 'bg-bss-bg text-bss-text-muted' };
}

function CameraCard({ camera, onSaved }: { camera: CameraRow; onSaved: (message: string) => void }) {
  const [allowedIp, setAllowedIp] = useState(camera.allowedIp || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const status = cameraStatus(camera);
  const input = 'w-full h-10 rounded-lg border border-bss-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200';
  const label = 'text-[11px] font-bold uppercase tracking-wider text-bss-text-muted mb-1 block';

  const save = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/employer/attendance-cameras/${camera.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedIp }),
      });
      const body = await response.json().catch(() => ({})) as { data?: CameraRow; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not save the IP.');
      onSaved(`${camera.employerLabel || camera.label} ${allowedIp.trim() ? 'whitelisted.' : 'IP removed.'}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the IP.');
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
      if (!response.ok) throw new Error(body.error ?? 'Could not remove the camera.');
      onSaved(`${camera.employerLabel || camera.label} removed. Historical attendance is retained.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not remove the camera.');
    } finally { setBusy(false); }
  };

  return (
    <section className="bss-card rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-bss-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-bss-bg grid place-items-center"><Camera size={18} /></span>
          <div>
            <h3 className="text-sm font-bold text-bss-text-primary">{camera.employerLabel || camera.label}{camera.channel ? ` · CH ${camera.channel}` : ''}</h3>
            <p className="text-[11px] text-bss-text-muted">Client label: {camera.label}{camera.createdByDeviceName ? ` · added by ${camera.createdByDeviceName}` : ''}</p>
            <p className="text-[11px] text-bss-text-muted font-mono break-all">Camera ID: {camera.uid || '—'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${status.className}`}>{status.label}</span>
          {camera.ipWhitelisted && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-bss-bg text-bss-text-muted">{MODE_LABEL[camera.mode] || camera.mode}</span>}
        </div>
      </div>
      <div className="p-4 space-y-4">
        {error && <p className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-3">{error}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-bss-text-muted">
          <div>Site<b className="block text-xs text-bss-text-primary mt-1">{camera.siteId ? `Site ${camera.siteId}` : '—'}</b></div>
          <div>Timezone<b className="block text-xs text-bss-text-primary mt-1">IST (UTC +05:30)</b></div>
          <div>RTSP<b className="block text-xs text-bss-text-primary mt-1">Configured on client</b></div>
          <div>Last seen<b className="block text-xs text-bss-text-primary mt-1">{when(camera.lastSeenAt)}</b></div>
        </div>
        <div className="rounded-xl border border-bss-border p-4 space-y-3">
          <div>
            <label className={label}>Allowed public IP</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={allowedIp} onChange={e => setAllowedIp(e.target.value)} placeholder="e.g. 203.0.113.10" className={input} />
              <button type="button" onClick={() => void save()} disabled={busy}
                className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50 whitespace-nowrap">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save IP
              </button>
            </div>
            <p className="text-[11px] text-bss-text-muted mt-1">Save the site&apos;s exact public IPv4. Attendance starts automatically when the client matches it.</p>
          </div>
          {!camera.ipWhitelisted && <p className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-3">Camera is waiting for you to whitelist its public IP.</p>}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-bss-text-muted">RTSP stays on the client machine. Live video never reaches BSS.</p>
          <button type="button" onClick={() => void remove()} disabled={busy}
            className="h-9 px-3 rounded-lg border border-bss-border text-xs font-bold text-bss-error flex items-center gap-1.5 hover:bg-bss-bg disabled:opacity-50 whitespace-nowrap">
            <Trash2 size={14} /> Remove
          </button>
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
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
          <p className="text-sm text-bss-text-muted mt-1">The client adds cameras and connection details. You only whitelist the site IP. Both sides can remove a camera.</p>
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
            <div className="bss-card rounded-2xl p-5 text-sm text-bss-text-muted flex items-center gap-2"><Camera size={16} /> No cameras yet. Add them from the attendance client; only IP whitelisting is needed here.</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {site.cameras.map(camera => (
                <CameraCard key={camera.id} camera={camera} onSaved={message => { setNotice(message); void load(); }} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
