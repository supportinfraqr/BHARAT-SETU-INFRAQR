"use client";

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Building2, History, MapPin, Pencil, QrCode, Save, Trash2, UserRound, X } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerSite } from '@/types/portal';
import { parseCoordinate } from '@/components/employer/siteGeo';
import { formatDate } from '@/lib/date';
import { SiteQr, SiteQrPanel } from '@/components/qr/WorkerQr';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [letterTemplates, setLetterTemplates] = useState<Array<{ id:number; name:string; state:string; letterType:'APPOINTMENT'|'EXPERIENCE'; letterTypeLabel:string }>>([]);
  const site = employer.sites.find(item => item.id === siteId);

  useEffect(() => {
    fetch('/api/employer/letter-templates', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((j: { rows?: typeof letterTemplates } | null) => setLetterTemplates(j?.rows ?? []))
      .catch(() => {});
  }, []);


  if (!site) return <div className="space-y-6"><h1 className="text-2xl font-bold">Site not found</h1><p className="text-sm text-bss-text-muted mt-1">This site does not belong to your organisation or has been removed.</p><Link href="/employer/sites" className="inline-flex items-center gap-1 text-sm text-bss-interactive-blue font-semibold"><ArrowLeft size={15}/>Back to sites</Link></div>;

  const current: EmployerSite = site;
  const data = (current.data ?? {}) as Record<string, unknown>;
  const contractors = employer.contractors.filter(c => c.siteIds?.some(id => String(id) === String(current.id)));
  const siteWorkers = employer.workers.filter(w => String(w.siteId) === String(current.id));

  function startEdit() {
    setDraft({ ...data, experienceLetterTemplateId: current.experienceLetterTemplateId ?? '' });
    setEditing(true);
    setError('');
  }

  async function saveInline() {
    setBusy(true); setError('');
    try {
      const payload: Record<string, unknown> = { id: current.id };
      // Edit spans every tab: save any changed field across the whole site master.
      for (const name of Object.values(TAB_FIELDS).flat()) {
        if (draft[name] !== data[name]) payload[name] = draft[name];
      }
      if (String(draft.experienceLetterTemplateId ?? '') !== String(current.experienceLetterTemplateId ?? '')) {
        payload.experienceLetterTemplateId = draft.experienceLetterTemplateId ?? '';
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
    setBusy(true); setError('');
    try {
      await mutate('sites', 'DELETE', { id: current.id });
      replaceEmployer({ ...employer, sites: employer.sites.filter(s => s.id !== current.id) });
      router.push('/employer/sites');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Site could not be deleted.');
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  function fieldValue(name: string, isDate = false): string {
    const v = data[name];
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (isDate) return formatDate(String(v));
    return String(v);
  }


  return <div className="space-y-6">
    <Link href="/employer/sites" className="inline-flex items-center gap-1 text-xs font-semibold text-bss-interactive-blue hover:underline"><ArrowLeft size={14}/>Back to My Sites</Link>
    <header><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{current.name}</h1><Status value={current.status}/></div><p className="font-mono text-xs text-bss-text-muted mt-1">{current.code}</p><p className="text-sm text-bss-text-secondary flex items-center gap-1 mt-2"><MapPin size={13}/>{current.location}, {current.state}</p></div><div className="flex gap-2">
      <button onClick={() => setQrOpen(true)} className="h-10 px-4 rounded-lg border border-bss-border text-bss-text-primary text-sm font-semibold flex items-center gap-2 hover:bg-bss-bg"><QrCode size={15}/>Site QR</button>
      {editing ? <><button onClick={() => setEditing(false)} className="h-10 px-4 rounded-lg border border-bss-border text-bss-text-primary text-sm font-semibold">Cancel</button><button onClick={saveInline} disabled={busy} className="h-10 px-4 rounded-lg bg-bss-navy text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"><Save size={15}/>{busy ? 'Saving…' : 'Save changes'}</button></> : <button onClick={startEdit} className="h-10 px-4 rounded-lg bg-bss-navy text-white text-sm font-semibold flex items-center gap-2"><Pencil size={15}/>Edit</button>}
      <button onClick={() => setConfirmDelete(true)} disabled={busy} className="h-10 px-4 rounded-lg border border-bss-border text-bss-error text-sm font-semibold flex items-center gap-2 hover:bg-bss-soft-orange"><Trash2 size={15}/>Delete</button>
    </div></div></header>


    <nav className="flex gap-1 overflow-x-auto bss-card rounded-2xl p-2">{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === id ? 'bg-bss-navy text-white' : 'text-bss-text-secondary hover:bg-bss-bg'}`}><Icon size={16}/>{label}</button>)}</nav>

    <section className="bss-card rounded-2xl p-6">
      {error && <p role="alert" className="mb-4 text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-3">{error}</p>}
      <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">{TAB_FIELDS[tab].map(name => {
        const def = FIELD_DEFS[name] ?? { label: LABELS[name] ?? name };
        const isLockedCode = name === 'site_code';
        const isColour = name === 'assign_color';
        const labelText = isLockedCode ? 'Site code' : (def.label ?? name);
        return <div key={name}>
          <dt className="text-[11px] uppercase font-semibold text-bss-text-muted">{labelText}{isLockedCode && editing ? <span className="ml-1 normal-case tracking-normal text-bss-text-muted">(locked)</span> : null}</dt>
          {editing ? (
            isLockedCode ? (
              <input value={String(current.code ?? draft[name] ?? '')} readOnly disabled title="The site code cannot be changed" className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-bss-bg text-bss-text-muted cursor-not-allowed"/>
            ) : isColour ? (
              <div className="mt-1 flex items-center gap-3">
                <input type="color" value={String(draft[name] || '#E45D24')} onChange={e => setDraft(d => ({ ...d, [name]: e.target.value }))} className="h-10 w-16 rounded-lg border border-bss-border bg-white p-1 cursor-pointer"/>
                <span className="text-xs font-mono text-bss-text-muted">{String(draft[name] || '#E45D24').toUpperCase()}</span>
              </div>
            ) : def.type === 'checkbox' ? (
              <label className="mt-1 flex items-center gap-2 text-sm text-bss-text-primary"><input type="checkbox" checked={Boolean(draft[name])} onChange={e => setDraft(d => ({ ...d, [name]: e.target.checked }))} className="w-4 h-4 rounded border-bss-border"/>{draft[name] ? 'Yes' : 'No'}</label>
            ) : def.type === 'select' ? (
              <select value={String(draft[name] ?? '')} onChange={e => setDraft(d => ({ ...d, [name]: e.target.value }))} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 bg-white text-sm">{(def.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}</select>
            ) : (
              <input type={def.type === 'date' ? 'date' : def.type === 'number' ? 'number' : 'text'} step={def.type === 'number' ? 'any' : undefined} value={draft[name] == null ? '' : String(draft[name])} onChange={e => setDraft(d => ({ ...d, [name]: e.target.value }))} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm text-bss-text-primary"/>
            )
          ) : isColour ? (
            <dd className="text-sm font-medium mt-1 text-bss-text-primary flex items-center gap-2"><span className="inline-block w-5 h-5 rounded border border-bss-border" style={{ background: data[name] ? String(data[name]) : '#E45D24' }}/>{fieldValue(name, def.type === 'date')}</dd>
          ) : <dd className="text-sm font-medium mt-1 text-bss-text-primary break-words">{fieldValue(name, def.type === 'date')}</dd>}
        </div>;
      })}</dl>

      <div className="border-t border-bss-border mt-6 pt-5">
        <h3 className="text-xs font-semibold text-bss-text-muted uppercase tracking-wider mb-3">Worker letters</h3>
        <p className="text-xs text-bss-text-muted mb-4">Experience (releasing) letters for every worker at this site are rendered from these state-wise templates. Leave blank to use the state / all-India default. Appointment letters are issued automatically by BSS.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] uppercase font-semibold text-bss-text-muted">Experience / releasing letter template</p>
            {editing ? (
              <select value={String(draft.experienceLetterTemplateId ?? '')} onChange={e => setDraft(d => ({ ...d, experienceLetterTemplateId: e.target.value }))} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 bg-white text-sm">
                <option value="">Default (state / all-India)</option>
                {letterTemplates.filter(t => t.letterType === 'EXPERIENCE').map(t => <option key={t.id} value={t.id}>{t.name}{t.state ? ` — ${t.state}` : ' — All India'}</option>)}
              </select>
            ) : <p className="text-sm font-medium mt-1 text-bss-text-primary">{current.experienceLetterTemplateName || 'Default (state / all-India)'}</p>}
          </div>
        </div>
      </div>

      {tab === 'address' && (() => { const lat = parseCoordinate(data.latitude as string | number | null | undefined); const lng = parseCoordinate(data.longitude as string | number | null | undefined); if (lat === null || lng === null) return null; return <div className="mt-8 pt-6 border-t border-bss-border"><p className="text-[11px] uppercase font-semibold text-bss-text-muted mb-3 flex items-center gap-1.5"><MapPin size={12}/>Map preview — OpenStreetMap</p><SiteMapView lat={lat} lng={lng} name={current.name}/></div>; })()}

      {tab === 'address' && current.qrToken && (
        <div className="mt-8 pt-6 border-t border-bss-border">
          <p className="text-[11px] uppercase font-semibold text-bss-text-muted mb-3 flex items-center gap-1.5"><QrCode size={12}/>Site QR — contractors scan this to request binding</p>
          <div className="relative w-44 h-44 bg-white p-2 rounded-xl border border-bss-border">
            <SiteQr siteToken={current.qrToken} siteCode={current.code} bssId={current.bssId} className="w-full h-full"/>
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[38px] h-[38px] bg-white rounded-[7px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[30px] h-[30px] object-contain"/></span></span>
          </div>
          <p className="text-xs text-bss-text-muted mt-2 font-mono">{current.code}</p>
        </div>
      )}

      <div className="border-t border-bss-border mt-6 pt-5"><h3 className="text-xs font-semibold text-bss-text-muted uppercase tracking-wider mb-4">Connected relationships</h3>
        <div className="grid md:grid-cols-2 gap-4"><div className="border border-bss-border rounded-xl p-4"><p className="text-[11px] uppercase text-bss-text-muted font-bold flex items-center gap-1"><Building2 size={12}/>Contractors at this site</p><div className="mt-2 space-y-2">{contractors.length ? contractors.map(c => <div key={c.id} className="flex justify-between text-xs"><span className="text-bss-text-primary">{c.name}</span><span className={`font-semibold ${c.status === 'Active' ? 'text-bss-green' : 'text-bss-orange'}`}>{c.status}</span></div>) : <p className="text-xs text-bss-text-muted">No contractors assigned.</p>}</div></div>
          <div className="border border-bss-border rounded-xl p-4"><p className="text-[11px] uppercase text-bss-text-muted font-bold flex items-center gap-1"><UserRound size={12}/>Workers at this site</p><div className="mt-2 space-y-2">{siteWorkers.length ? siteWorkers.map(w => <div key={w.id} className="flex justify-between text-xs"><span className="text-bss-text-primary">{w.name}</span><span className="text-bss-text-muted">{w.contractor}</span></div>) : <p className="text-xs text-bss-text-muted">No workers assigned.</p>}</div></div></div>
      </div>

      {!!current.pastContractors?.length && (
        <details className="border-t border-bss-border mt-6 pt-5 group">
          <summary className="flex items-center gap-1.5 text-xs font-semibold text-bss-text-muted uppercase tracking-wider cursor-pointer select-none">
            <History size={12}/>Past relationships ({current.pastContractors.length})
            <span className="text-bss-text-muted transition-transform group-open:rotate-90">›</span>
          </summary>
          <div className="mt-3 space-y-2">
            {current.pastContractors.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 text-xs border border-bss-border rounded-lg px-3 py-2">
                <span className="text-bss-text-primary truncate">{c.name}<span className="ml-2 font-mono text-[10px] text-bss-text-muted">{c.bssId}</span></span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-bss-text-muted">{formatDate(c.endedAt)}</span>
                  <span className="font-semibold text-bss-text-muted">{c.status}</span>
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>

    {qrOpen && (
      <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Site QR">
        <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
          <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
            <h2 className="font-semibold text-bss-text-primary">Site QR</h2>
            <button onClick={() => setQrOpen(false)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full text-bss-text-muted hover:bg-bss-bg"><X size={16}/></button>
          </header>
          <div className="p-5">
            {current.qrToken
              ? <SiteQrPanel siteToken={current.qrToken} siteCode={current.code} bssId={current.bssId} name={current.name}/>
              : <p className="text-sm text-bss-text-muted">This site has no QR token yet — save the site once to generate it.</p>}
          </div>
        </div>
      </div>
    )}

    <ConfirmDialog
      open={confirmDelete}
      tone="negative"
      title="Delete this site?"
      description={`"${current.name}" and its site master details will be removed. This cannot be undone.`}
      details={[
        { label: 'Site', value: current.name },
        { label: 'Site code', value: current.code },
        { label: 'BSS ID', value: current.bssId ?? '—' },
      ]}
      confirmLabel="Delete site"
      busy={busy}
      onCancel={() => setConfirmDelete(false)}
      onConfirm={() => void remove()}
    />
  </div>;
}

function Status({ value }: { value:string }) { const tone = value === 'Active' ? 'bg-bss-soft-green text-bss-green' : value === 'Planned' ? 'bg-bss-blue-tint text-bss-interactive-blue' : 'bg-bss-bg text-bss-text-secondary'; return <span className={`text-[10px] font-bold px-2 py-1 rounded ${tone}`}>{value}</span>; }
