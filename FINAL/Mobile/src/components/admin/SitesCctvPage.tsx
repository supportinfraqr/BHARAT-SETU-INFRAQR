"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, Loader2, Lock, RefreshCw, Search, Unlock } from 'lucide-react';

type Row = {
  id: number; name: string; code: string; employer: string;
  maxCameras: number; allowFeedView: boolean; cameraCount: number;
};

export default function SitesCctvPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<number, { maxCameras: number; allowFeedView: boolean }>>({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/sites-cctv', { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { rows?: Row[]; error?: string };
      if (!res.ok) throw new Error(body.error || 'Could not load sites.');
      setRows(body.rows ?? []);
      setDraft({});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load sites.');
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r => `${r.name} ${r.code} ${r.employer}`.toLowerCase().includes(term));
  }, [rows, q]);

  function valueOf(r: Row) {
    return draft[r.id] ?? { maxCameras: r.maxCameras, allowFeedView: r.allowFeedView };
  }

  async function save(r: Row) {
    const v = valueOf(r);
    setBusyId(r.id); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/admin/sites-cctv/${r.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxCameras: v.maxCameras, allowFeedView: v.allowFeedView }),
      });
      const body = await res.json().catch(() => ({})) as { data?: { maxCameras: number; allowFeedView: boolean }; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error || 'Could not save.');
      setRows(prev => prev.map(x => x.id === r.id ? { ...x, maxCameras: body.data!.maxCameras, allowFeedView: body.data!.allowFeedView } : x));
      setDraft(d => { const n = { ...d }; delete n[r.id]; return n; });
      setNotice(`Saved — ${r.name}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save.');
    } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">CCTV</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-text-primary mt-1 flex items-center gap-2"><Camera size={22}/>Site CCTV Controls</h1>
          <p className="text-sm text-bss-text-muted mt-1">Per-site camera limit and whether the employer may view the <strong className="text-bss-text-primary">live feed</strong> (all cameras on an enabled site). Live feed viewing is <strong>off by default</strong>.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="h-10 px-3.5 rounded-lg border border-bss-border bg-white text-xs font-semibold text-bss-text-secondary flex items-center gap-1.5 hover:bg-bss-bg disabled:opacity-60"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>Reload</button>
      </header>

      {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
      {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

      <label className="relative inline-block">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bss-text-muted"/>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search site, code or employer" className="h-10 w-80 rounded-lg border border-bss-border pl-9 pr-3 text-sm bg-white"/>
      </label>

      {loading && !rows.length
        ? <p className="flex items-center gap-2 text-sm text-bss-text-muted py-10"><Loader2 size={16} className="animate-spin"/>Loading…</p>
        : <div className="bss-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-bss-bg text-[11px] uppercase tracking-wider text-bss-text-muted">
                  <tr>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Employer</th>
                    <th className="px-4 py-3">Cameras</th>
                    <th className="px-4 py-3">Limit</th>
                    <th className="px-4 py-3">Live feed view</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bss-border">
                  {filtered.map(r => {
                    const v = valueOf(r);
                    const dirty = v.maxCameras !== r.maxCameras || v.allowFeedView !== r.allowFeedView;
                    return <tr key={r.id} className="hover:bg-bss-bg/60">
                      <td className="px-4 py-3"><strong className="text-bss-text-primary">{r.name}</strong><p className="font-mono text-[10px] text-bss-text-muted mt-0.5">{r.code}</p></td>
                      <td className="px-4 py-3 text-bss-text-secondary">{r.employer || '—'}</td>
                      <td className="px-4 py-3 text-bss-text-secondary">{r.cameraCount}</td>
                      <td className="px-4 py-3">
                        <input type="number" min={1} max={50} value={v.maxCameras}
                          onChange={e => setDraft(d => ({ ...d, [r.id]: { ...v, maxCameras: Math.max(1, Math.min(50, Number(e.target.value) || 1)) } }))}
                          className="h-9 w-20 rounded-lg border border-bss-border px-2 text-sm bg-white"/>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setDraft(d => ({ ...d, [r.id]: { ...v, allowFeedView: !v.allowFeedView } }))}
                          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold border ${v.allowFeedView ? 'bg-bss-soft-green text-bss-green border-bss-border' : 'bg-bss-bg text-bss-text-muted border-bss-border'}`}>
                          {v.allowFeedView ? <><Unlock size={12}/>Allowed</> : <><Lock size={12}/>Blocked</>}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" disabled={!dirty || busyId === r.id} onClick={() => void save(r)}
                          className="h-9 px-3 rounded-lg bg-bss-navy text-white text-xs font-semibold disabled:opacity-40">
                          {busyId === r.id ? 'Saving…' : 'Save'}
                        </button>
                      </td>
                    </tr>;
                  })}
                  {!filtered.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-bss-text-muted">No sites match “{q}”.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>}
    </div>
  );
}
