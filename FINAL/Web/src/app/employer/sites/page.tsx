"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, CalendarDays, MapPin, Plus, QrCode, ShieldCheck, Star, Users, X } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerSite } from '@/types/portal';
import SiteCreateForm from '@/components/employer/SiteCreateForm';
import { SiteQrPanel } from '@/components/qr/WorkerQr';
import { formatDate } from '@/lib/date';

export default function EmployerSitesPage() {
  const { employer, mutate } = useEmployer();
  const [open, setOpen] = useState(false);
  const [qrSite, setQrSite] = useState<EmployerSite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [defaultBusy, setDefaultBusy] = useState(false);
  const [defaultNotice, setDefaultNotice] = useState('');
  const [defaultError, setDefaultError] = useState('');

  async function setDefaultSite(siteId: string) {
    setDefaultBusy(true);
    setDefaultNotice('');
    setDefaultError('');
    try {
      await mutate('default-site', 'POST', { siteId: siteId || null });
      const site = employer.sites.find(s => s.id === siteId);
      setDefaultNotice(site ? `Default site set to ${site.name}.` : 'Default site cleared.');
    } catch (reason) {
      setDefaultError(reason instanceof Error ? reason.message : 'The default site could not be saved.');
    } finally {
      setDefaultBusy(false);
    }
  }

  async function submit(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      await mutate('sites', 'POST', payload);
      // The portal is re-fetched automatically by mutate(), so the new card
      // shows its server-derived QR token, BSS id and default state.
      setOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Site could not be created.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row justify-between gap-4"><div><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Project network</p><h1 className="text-2xl font-bold mt-1">Sites</h1><p className="text-sm text-bss-text-muted mt-1">Projects linking your contractors, workers, and compliance records.</p></div><button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg bg-bss-navy text-white text-sm font-semibold flex items-center justify-center gap-2"><Plus size={16}/>Add site</button></header>

    <section className="bss-card rounded-2xl p-5">
      <div className="flex items-center gap-2"><Star size={16} className="text-[#E45D24]"/><h2 className="font-semibold text-sm">Default site for contractor allotments</h2></div>
      <p className="text-xs text-bss-text-muted mt-1 mb-3">Pre-selected when you allot sites to a contractor. You can still change it per allotment.</p>
      <select value={employer.defaultSite?.id ?? (employer.sites[0]?.id ?? '')} onChange={e => void setDefaultSite(e.target.value)} disabled={defaultBusy || !employer.sites.length} className="w-full sm:w-96 h-10 rounded-lg border border-bss-border px-3 text-sm bg-white disabled:opacity-60">
        {employer.sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.bssId ? ` (${s.bssId})` : ''}</option>)}
      </select>
      {!employer.sites.length && <p className="mt-2 text-xs text-bss-text-muted">Add a site first — the first site becomes the default automatically.</p>}
      {defaultNotice && <p role="status" className="mt-2 text-xs text-bss-green bg-bss-soft-green border border-bss-border rounded-lg px-3 py-2">{defaultNotice}</p>}
      {defaultError && <p role="alert" className="mt-2 text-xs text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg px-3 py-2">{defaultError}</p>}
    </section>

    <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {employer.sites.map(site => {
        const isDefault = String(employer.defaultSite?.id) === String(site.id);
        return <article key={site.id} className={`bg-white border rounded-2xl overflow-hidden ${isDefault ? 'border-[#E45D24] ring-1 ring-[#E45D24]/20' : 'border-bss-border'}`}>
        <div className="p-5 border-b border-bss-border"><div className="flex items-start justify-between gap-3"><span className="w-10 h-10 rounded-xl bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><Building2 size={19}/></span><div className="flex items-center gap-1.5">{isDefault && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E45D24] bg-bss-soft-orange px-2 py-1 rounded"><Star size={11}/>Default</span>}<span className={`text-[10px] font-bold px-2 py-1 rounded ${site.status === 'Active' ? 'bg-bss-soft-green text-bss-green' : site.status === 'Planned' ? 'bg-bss-blue-tint text-bss-interactive-blue' : 'bg-bss-bg text-bss-text-secondary'}`}>{site.status}</span></div></div><h2 className="font-semibold text-bss-text-primary mt-4">{site.name}</h2><p className="font-mono text-[11px] text-bss-text-muted mt-1">{site.bssId}</p><p className="text-xs text-bss-text-muted flex items-center gap-1 mt-3"><MapPin size={12}/>{site.location}, {site.state}</p></div>
        <div className="grid grid-cols-3 divide-x divide-bss-border border-b border-bss-border"><SmallMetric icon={Users} value={site.workers} label="Workers"/><SmallMetric icon={Building2} value={site.contractorIds.length} label="Contractors"/><SmallMetric icon={ShieldCheck} value={`${site.compliance}%`} label="Compliance"/></div>
        <div className="p-4 text-[11px] text-bss-text-muted flex items-center gap-2"><CalendarDays size={13}/><span>{formatDate(site.startDate)}</span></div>
        <div className="grid grid-cols-3 divide-x divide-bss-border border-t border-bss-border">
          <Link href={`/employer/sites/${site.id}`} className="h-9 bg-bss-bg text-[11px] font-semibold text-[#01183A] flex items-center justify-center gap-1 hover:bg-bss-bg">View <ArrowRight size={13}/></Link>
          <button type="button" onClick={() => setQrSite(site)} disabled={!site.qrToken} className="h-9 bg-bss-bg text-[11px] font-semibold text-[#01183A] flex items-center justify-center gap-1 hover:bg-bss-bg disabled:opacity-50"><QrCode size={13}/>QR</button>
          <button type="button" onClick={() => void setDefaultSite(site.id)} disabled={defaultBusy || isDefault} className={`h-9 text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-70 ${isDefault ? 'bg-bss-soft-orange text-[#E45D24]' : 'bg-bss-bg text-[#01183A] hover:bg-bss-bg'}`}><Star size={13}/>{isDefault ? 'Default' : 'Default'}</button>
        </div>
      </article>;
      })}
    </section>

    {open && <SiteCreateForm busy={busy} error={error} onSubmit={submit} onClose={() => setOpen(false)} />}

    {qrSite && (
      <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Site QR">
        <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
          <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
            <h2 className="font-semibold text-bss-text-primary">Site QR</h2>
            <button onClick={() => setQrSite(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full text-bss-text-muted hover:bg-bss-bg"><X size={16}/></button>
          </header>
          <div className="p-5">
            {qrSite.qrToken ? <SiteQrPanel siteToken={qrSite.qrToken} bssId={qrSite.bssId} name={qrSite.name}/> : <p className="text-sm text-bss-text-muted">No QR token for this site yet.</p>}
          </div>
        </div>
      </div>
    )}
  </div>;
}

function SmallMetric({ icon:Icon, value, label }: { icon:typeof Users; value:string | number; label:string }) { return <div className="p-3 text-center"><Icon size={13} className="mx-auto text-bss-text-muted"/><strong className="block text-sm mt-1">{value}</strong><span className="text-[9px] uppercase tracking-wider text-bss-text-muted">{label}</span></div>; }
