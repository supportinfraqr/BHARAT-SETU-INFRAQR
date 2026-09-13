"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Clock, Info, MapPin, Star, Users } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';
import ContractorSiteDetailDialog, { type ContractorSiteDetail } from '@/components/site/ContractorSiteDetailDialog';

export default function ContractorQrSitesPage() {
  const { contractor, replaceContractor, mutate } = useContractor();
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
      replaceContractor({ ...contractor, defaultSite: site ? { id: site.id, name: site.name, code: site.code } : null });
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
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">QR system</p>
        <h1 className="text-2xl font-bold mt-1">Allotted Sites</h1>
        <p className="text-sm text-gray-500 mt-1">Sites your principal employers have allotted to you. You never own a site — pick the default one used when you scan a worker QR.</p>
      </header>

      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Allotted sites" value={contractor.sites.length} icon={Building2} tone="bg-blue-50 text-blue-700" />
        <Metric label="Default site" value={contractor.defaultSite?.name ?? '—'} icon={Star} tone="bg-orange-50 text-[#F47A32]" text />
        <Metric label="Workers on sites" value={contractor.sites.reduce((sum, s) => sum + (s.workers || 0), 0)} icon={Users} tone="bg-green-50 text-green-700" />
        <Metric label="Pending approval" value={pending.length} icon={Clock} tone="bg-amber-50 text-amber-700" />
      </div>

      {contractor.sites.length === 0 && pending.length === 0 && (
        <p className="text-sm text-gray-500">No sites allotted yet — ask a principal employer to allot a site, or scan a site QR to request one.</p>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Awaiting your approval</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pending.map(site => (
              <article key={site.id} className="bg-white border border-amber-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 grid place-items-center"><Clock size={19} /></span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">Pending approval</span>
                </div>
                <h2 className="font-semibold text-gray-950 mt-4">{site.name}</h2>
                <p className="font-mono text-[11px] text-gray-400 mt-1">{site.code}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-3"><MapPin size={12} />{site.location || '—'}</p>
                <p className="text-xs text-gray-500 mt-1.5">Principal employer: <span className="font-semibold text-gray-700">{site.employer || '—'}</span></p>
                <Link href="/contractor/qr/requests" className="mt-4 h-10 rounded-lg bg-[#073B67] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#062D4F]">Review &amp; approve</Link>
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
              <article key={site.id} className={`bg-white border rounded-2xl overflow-hidden ${isDefault ? 'border-[#F47A32] ring-1 ring-[#F47A32]/20' : 'border-gray-200'}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><Building2 size={19} /></span>
                    {isDefault && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#F47A32] bg-orange-50 px-2 py-1 rounded"><Star size={11} />Default</span>}
                  </div>
                  <h2 className="font-semibold text-gray-950 mt-4">{site.name}</h2>
                  <p className="font-mono text-[11px] text-gray-400 mt-1">{site.code}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-3"><MapPin size={12} />{site.location || '—'}</p>
                  <p className="text-xs text-gray-500 mt-1.5">Principal employer: <span className="font-semibold text-gray-700">{site.employer || '—'}</span></p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                  <button type="button" onClick={() => setDetailFor(site)} className="h-10 text-xs font-bold flex items-center justify-center gap-1.5 bg-gray-50 text-[#073B67] hover:bg-gray-100"><Info size={14}/>View details</button>
                  {isDefault ? (
                    <button type="button" disabled className="h-10 text-xs font-bold flex items-center justify-center gap-1.5 bg-orange-50 text-[#F47A32] opacity-90">
                      <Star size={14} />Default
                    </button>
                  ) : (
                    <button type="button" disabled={busy === site.id} onClick={() => void setDefault(site.id)} className="h-10 text-xs font-bold flex items-center justify-center gap-1.5 bg-gray-50 text-[#073B67] hover:bg-gray-100 disabled:opacity-70">
                      {busy === site.id ? 'Saving…' : <><Star size={14} />Set as default</>}
                    </button>
                  )}
                </div>
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
  return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16} /></span><strong className={`block mt-2 ${text ? 'text-sm' : 'text-2xl'}`}>{value}</strong><p className="text-xs text-gray-500">{label}</p></div>;
}
