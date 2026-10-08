"use client";

import { useEffect, useState } from 'react';
import { Laptop, Loader2, Smartphone } from 'lucide-react';
import { deviceInfo, getDeviceId } from '@/lib/devices';

type Device = { id: number; deviceId: string; label: string; platform: string; lastSeen: string; createdAt: string };

function when(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Registers the current device on the server and lists the account's devices. */
export default function RegisteredDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const thisId = getDeviceId();

  useEffect(() => {
    let active = true;
    const info = deviceInfo();
    void fetch('/api/worker/devices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(info),
    })
      .then(r => (r.ok ? r.json() : null))
      .then((body: { data?: Device[] } | null) => { if (active && body?.data) setDevices(body.data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-2">
      {loading && <p className="text-xs text-gray-400 flex items-center gap-2"><Loader2 size={13} className="animate-spin" />Loading registered devices…</p>}
      {!loading && !devices.length && <p className="text-xs text-gray-400">No devices recorded yet.</p>}
      {devices.map(d => {
        const current = d.deviceId === thisId;
        const Icon = d.platform === 'Android' || d.platform === 'iOS' ? Smartphone : Laptop;
        return (
          <div key={d.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${current ? 'border-[#073B67]/25 bg-[#073B67]/[0.04]' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-gray-50 text-[#073B67] grid place-items-center flex-shrink-0"><Icon size={15} /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{d.label || 'Device'}{current && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100">This device</span>}</p>
                <p className="text-[10px] text-gray-400">Registered {when(d.createdAt)} · Last active {when(d.lastSeen)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
