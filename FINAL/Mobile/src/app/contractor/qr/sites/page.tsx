"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Clock, FileText, Info, MapPin, Star, Users } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';
import ContractorSiteDetailDialog, { type ContractorSiteDetail } from '@/components/site/ContractorSiteDetailDialog';

export default function ContractorQrSitesPage() {
  const { contractor, mutate } = useContractor();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const defaultId = contractor.defaultSite?.id ?? '';
  const pending = contractor.pendingSites ?? [];
  const [detailFor, setDetailFor] = useState<ContractorSiteDetail | null>(null);

  async function setDefault(siteId: string) {
    setBusy(siteId || 'clear');
    setError('');
    setNotice('');
    try {
      await mutate('default-site', 'POST', { siteId: siteId || null });
      const site = contractor.sites.find(s => s.id === siteId);
      setNotice(site ? `${site.name} is now your default site for worker bindings.` : 'Default site cleared.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The default site could not be saved.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">QR system</p>
        <h1 className="text-2xl font-bold mt-1 text-bss-navy">Allotted Sites</h1>
        <p className="text-sm text-bss-text-secondary mt-1">Sites your principal employers have allotted to you. You never own a site — pick the default one used when you scan a worker QR.</p>
      </header>

      {error && <p role="alert" className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-xl p-3">{error}</p>}
      {notice && <p role="status" className="text-sm text-bss-green bg-bss-soft-green border border-bss-border rounded-xl p-3">{notice}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Allotted sites" value={contractor.sites.length} icon={Building2} tone="bg-bss-blue-tint text-bss-interactive-blue" />
        <Metric label="Default site" value={contractor.defaultSite?.name ?? '—'} icon={Star} tone="bg-bss-soft-orange text-bss-orange" text />
        <Metric label="Workers on sites" value={contractor.sites.reduce((sum, s) => sum + (s.workers || 0), 0)} icon={Users} tone="bg-bss-soft-green text-bss-green" />
        <Metric label="Pending approval" value={pending.length} icon={Clock} tone="bg-bss-soft-orange text-bss-orange" />
      </div>

      {contractor.sites.length === 0 && pending.length === 0 && (
        <p className="text-sm text-bss-text-muted">No sites allotted yet — ask a principal employer to allot a site, or scan a site QR to request one.</p>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-bss-text-primary">Awaiting your approval</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pending.map(site => (
              <article key={site.id} className="bss-card bss-3d bss-scroll-rise rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="w-10 h-10 rounded-xl bg-bss-soft-orange text-bss-orange grid place-items-center"><Clock size={19} /></span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-bss-orange bg-bss-soft-orange px-2 py-1 rounded-full">Pending approval</span>
                </div>
                <h2 className="font-semibold text-bss-text-primary mt-4">{site.name}</h2>
                <p className="font-mono text-[11px] text-bss-text-muted mt-1">{site.code}</p>
                <p className="text-xs text-bss-text-secondary flex items-center gap-1 mt-3"><MapPin size={12} />{site.location || '—'}</p>
                <p className="text-xs text-bss-text-secondary mt-1.5">Principal employer: <span className="font-semibold text-bss-text-primary">{site.employer || '—'}</span></p>
                <Link href="/contractor/qr/requests" className="mt-4 h-10 rounded-lg bg-bss-interactive-blue text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-bss-deep-navy shadow-sm">Review &amp; approve</Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {contractor.sites.length > 0 && (
        <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contractor.sites.map(site => {
            const isDefault = String(site.id) === String(defaultId);
            return (
              <article key={site.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${isDefault ? 'border-bss-orange ring-1 ring-bss-orange/20' : 'border-bss-border'}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="w-10 h-10 rounded-xl bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><Building2 size={19} /></span>
                    {isDefault && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-bss-orange bg-bss-soft-orange px-2 py-1 rounded-full"><Star size={11} />Default</span>}
                  </div>
                  <h2 className="font-semibold text-bss-text-primary mt-4">{site.name}</h2>
                  <p className="font-mono text-[11px] text-bss-text-muted mt-1">{site.code}</p>
                  <p className="text-xs text-bss-text-secondary flex items-center gap-1 mt-3"><MapPin size={12} />{site.location || '—'}</p>
                  <p className="text-xs text-bss-text-secondary mt-1.5">Principal employer: <span className="font-semibold text-bss-text-primary">{site.employer || '—'}</span></p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-bss-border border-t border-bss-border">
                  <button type="button" onClick={() => setDetailFor(site)} className="h-10 text-xs font-semibold flex items-center justify-center gap-1.5 bg-bss-bg text-bss-interactive-blue hover:bg-bss-blue-tint"><Info size={14}/>View details</button>
                  {isDefault ? (
                    <button type="button" disabled className="h-10 text-xs font-semibold flex items-center justify-center gap-1.5 bg-bss-soft-orange text-bss-orange opacity-90">
                      <Star size={14} />Default
                    </button>
                  ) : (
                    <button type="button" disabled={busy === site.id} onClick={() => void setDefault(site.id)} className="h-10 text-xs font-semibold flex items-center justify-center gap-1.5 bg-bss-bg text-bss-interactive-blue hover:bg-bss-blue-tint disabled:opacity-70">
                      {busy === site.id ? 'Saving…' : <><Star size={14} />Set as default</>}
                    </button>
                  )}
                </div>
                {site.hasAgreement && (
                  <a href={`/api/site-agreement/${site.id}`} target="_blank" rel="noreferrer" className="h-10 text-xs font-semibold flex items-center justify-center gap-1.5 bg-bss-bg text-bss-interactive-blue hover:bg-bss-blue-tint border-t border-bss-border">
                    <FileText size={14} /> Site agreement (PDF)
                  </a>
                )}
              </article>
            );
          })}
        </section>
      )}
      <ContractorSiteDetailDialog open={!!detailFor} site={detailFor} onClose={() => setDetailFor(null)} />
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone, text }: { label: string; value: string | number; icon: typeof Building2; tone: string; text?: boolean }) {
  return <div className="bss-card bss-3d bss-scroll-rise rounded-2xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16} /></span><strong className={`block mt-2 text-bss-text-primary ${text ? 'text-sm truncate' : 'text-2xl'}`}>{value}</strong><p className="text-xs text-bss-text-secondary mt-1">{label}</p></div>;
}
