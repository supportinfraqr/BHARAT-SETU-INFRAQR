"use client";

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Building2, MapPin, Pencil, QrCode, Save, Trash2, UserRound, X } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerSite } from '@/types/portal';
import { parseCoordinate } from '@/components/employer/SiteMap';
import { SiteQr, SiteQrPanel } from '@/components/qr/WorkerQr';
import { tabs, type Tab, TAB_FIELDS, LABELS, FIELD_DEFS } from '@/components/site/siteDetailFields';

const SiteMapView = dynamic(() => import('@/components/employer/SiteMap').then(m => m.SiteMapView), { ssr: false });

export default function SiteDetailPage({ params }: { params: Promise<{ siteId:string }> }) {
  const { siteId } = use(params);
  const router = useRouter();
  const { employer, replaceEmployer, mutate } = useEmployer();
  const [tab, setTab] = useState<Tab>('basic');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [qrOpen, setQrOpen] = useState(false);
  const site = employer.sites.find(item => item.id === siteId);

  if (!site) return <div className="space-y-6"><h1 className="text-2xl font-bold">Site not found</h1><p className="text-sm text-gray-500 mt-1">This site does not belong to your organisation or has been removed.</p><Link href="/employer/sites" className="inline-flex items-center gap-1 text-sm text-blue-700 font-semibold"><ArrowLeft size={15}/>Back to sites</Link></div>;

  const current: EmployerSite = site;
  const data = (current.data ?? {}) as Record<string, unknown>;
  const contractors = employer.contractors.filter(c => c.siteIds?.includes(current.id));
  const siteWorkers = employer.workers.filter(w => w.siteId === current.id);

  function startEdit() {
    setDraft({ ...data });
    setEditing(true);
    setError('');
  }

  async function saveInline() {
    setBusy(true); setError('');
    try {
      const payload: Record<string, unknown> = { id: current.id };
      for (const name of TAB_FIELDS[tab]) {
        if (draft[name] !== data[name]) payload[name] = draft[name];
      }
      if (Object.keys(payload).length === 1) { setEditing(false); return; }
      await mutate('sites', 'PATCH', payload);
      const newData = { ...data, ...payload };
      replaceEmployer({ ...employer, sites: employer.sites.map(s => s.id === current.id ? { ...s, data: newData, name: String(payload.site_name ?? s.name) } : s) });
      setEditing(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Site could not be updated.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm(`Delete site "${current.name}"? This cannot be undone.`)) return;
    setBusy(true); setError('');
    try {
      await mutate('sites', 'DELETE', { id: current.id });
      replaceEmployer({ ...employer, sites: employer.sites.filter(s => s.id !== current.id) });
      router.push('/employer/sites');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Site could not be deleted.'); setBusy(false); }
  }

  function fieldValue(name: string): string {
    const v = data[name];
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  }

  return <div className="space-y-6">
    <Link href="/employer/sites" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"><ArrowLeft size={14}/>Back to My Sites</Link>
    <header><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{current.name}</h1><Status value={current.status}/></div><p className="font-mono text-xs text-gray-500 mt-1">{current.code}</p><p className="text-sm text-gray-600 flex items-center gap-1 mt-2"><MapPin size={13}/>{current.location}, {current.state}</p></div><div className="flex gap-2">
      <button onClick={() => setQrOpen(true)} className="h-10 px-4 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50"><QrCode size={15}/>Site QR</button>
      {editing ? <><button onClick={() => setEditing(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold">Cancel</button><button onClick={saveInline} disabled={busy} className="h-10 px-4 rounded-lg bg-gray-950 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"><Save size={15}/>{busy ? 'Saving…' : 'Save changes'}</button></> : <button onClick={startEdit} className="h-10 px-4 rounded-lg bg-gray-950 text-white text-sm font-semibold flex items-center gap-2"><Pencil size={15}/>Edit</button>}
      <button onClick={remove} disabled={busy} className="h-10 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-semibold flex items-center gap-2 hover:bg-red-50"><Trash2 size={15}/>Delete</button>
    </div></div></header>

    <nav className="flex gap-1 overflow-x-auto bg-white border border-gray-200 rounded-2xl p-2">{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => { setTab(id); setEditing(false); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === id ? 'bg-gray-950 text-white' : 'text-gray-600 hover:bg-gray-50'}`}><Icon size={16}/>{label}</button>)}</nav>

    <section className="bg-white border border-gray-200 rounded-2xl p-6">
      {error && <p role="alert" className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}
      <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">{TAB_FIELDS[tab].map(name => {
        const def = FIELD_DEFS[name] ?? { label: LABELS[name] ?? name };
        return <div key={name}>
          <dt className="text-[11px] uppercase font-semibold text-gray-400">{def.label ?? name}</dt>
          {editing ? (
            def.type === 'checkbox' ? (
              <label className="mt-1 flex items-center gap-2 text-sm text-gray-800"><input type="checkbox" checked={Boolean(draft[name])} onChange={e => setDraft(d => ({ ...d, [name]: e.target.checked }))} className="w-4 h-4 rounded border-gray-300"/>{draft[name] ? 'Yes' : 'No'}</label>
            ) : def.type === 'select' ? (
              <select value={String(draft[name] ?? '')} onChange={e => setDraft(d => ({ ...d, [name]: e.target.value }))} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm">{(def.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}</select>
            ) : (
              <input type={def.type === 'date' ? 'date' : def.type === 'number' ? 'number' : 'text'} step={def.type === 'number' ? 'any' : undefined} value={draft[name] == null ? '' : String(draft[name])} onChange={e => setDraft(d => ({ ...d, [name]: e.target.value }))} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm text-gray-800"/>
            )
          ) : <dd className="text-sm font-medium mt-1 text-gray-800 break-words">{fieldValue(name)}</dd>}
        </div>;
      })}</dl>

      {tab === 'address' && (() => { const lat = parseCoordinate(data.latitude as string | number | null | undefined); const lng = parseCoordinate(data.longitude as string | number | null | undefined); if (lat === null || lng === null) return null; return <div className="mt-8 pt-6 border-t border-gray-100"><p className="text-[11px] uppercase font-semibold text-gray-400 mb-3 flex items-center gap-1.5"><MapPin size={12}/>Map preview — OpenStreetMap</p><SiteMapView lat={lat} lng={lng} name={current.name}/></div>; })()}

      {tab === 'address' && current.qrToken && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-[11px] uppercase font-semibold text-gray-400 mb-3 flex items-center gap-1.5"><QrCode size={12}/>Site QR — contractors scan this to request binding</p>
          <div className="relative w-44 h-44 bg-white p-2 rounded-xl border border-gray-200">
            <SiteQr siteToken={current.qrToken} siteCode={current.code} bssId={current.bssId} className="w-full h-full"/>
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[38px] h-[38px] bg-white rounded-[7px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[30px] h-[30px] object-contain"/></span></span>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-mono">{current.code}</p>
        </div>
      )}

      <div className="border-t border-gray-100 mt-6 pt-5"><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Connected relationships</h3>
        <div className="grid md:grid-cols-2 gap-4"><div className="border border-gray-100 rounded-xl p-4"><p className="text-[11px] uppercase text-gray-400 font-bold flex items-center gap-1"><Building2 size={12}/>Contractors at this site</p><div className="mt-2 space-y-2">{contractors.length ? contractors.map(c => <div key={c.id} className="flex justify-between text-xs"><span className="text-gray-700">{c.name}</span><span className={`font-semibold ${c.status === 'Active' ? 'text-green-700' : 'text-orange-700'}`}>{c.status}</span></div>) : <p className="text-xs text-gray-400">No contractors assigned.</p>}</div></div>
          <div className="border border-gray-100 rounded-xl p-4"><p className="text-[11px] uppercase text-gray-400 font-bold flex items-center gap-1"><UserRound size={12}/>Workers at this site</p><div className="mt-2 space-y-2">{siteWorkers.length ? siteWorkers.map(w => <div key={w.id} className="flex justify-between text-xs"><span className="text-gray-700">{w.name}</span><span className="text-gray-400">{w.contractor}</span></div>) : <p className="text-xs text-gray-400">No workers assigned.</p>}</div></div></div>
      </div>
    </section>

    {qrOpen && (
      <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Site QR">
        <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
          <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Site QR</h2>
            <button onClick={() => setQrOpen(false)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full text-gray-400 hover:bg-gray-100"><X size={16}/></button>
          </header>
          <div className="p-5">
            {current.qrToken
              ? <SiteQrPanel siteToken={current.qrToken} siteCode={current.code} bssId={current.bssId} name={current.name}/>
              : <p className="text-sm text-gray-500">This site has no QR token yet — save the site once to generate it.</p>}
          </div>
        </div>
      </div>
    )}
  </div>;
}

function Status({ value }: { value:string }) { const tone = value === 'Active' ? 'bg-green-50 text-green-700' : value === 'Planned' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'; return <span className={`text-[10px] font-bold px-2 py-1 rounded ${tone}`}>{value}</span>; }
