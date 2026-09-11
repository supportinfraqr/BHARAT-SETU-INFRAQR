"use client";

import { useState } from 'react';
import { Building2, Check, CheckCircle2, Clock3, Link2, MapPin, RefreshCw, X } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerEngagement } from '@/types/portal';

const statusTone: Record<EmployerEngagement['status'], string> = {
  Pending: 'bg-orange-50 text-orange-700',
  Accepted: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Cancelled: 'bg-gray-100 text-gray-600',
};

export default function EmployerEngagementsPage() {
  const { employer, replaceEmployer } = useEmployer();
  const [engagements, setEngagements] = useState<EmployerEngagement[]>(employer.engagements ?? []);
  const [selectedSites, setSelectedSites] = useState<Record<string, number[]>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const siteCode = (siteId: string | number) => employer.sites.find(site => String(site.id) === String(siteId))?.code ?? '—';

  async function refresh() {
    const response = await fetch('/api/employer/engagements', { cache: 'no-store' });
    const result = await response.json().catch(() => ({})) as { data?: EmployerEngagement[]; error?: string };
    if (response.ok && Array.isArray(result.data)) {
      setEngagements(result.data);
      replaceEmployer({ ...employer, engagements: result.data });
    }
  }

  async function act(engagement: EmployerEngagement, action: 'approve-binding' | 'approve-site' | 'allot' | 'reject', extra: Record<string, unknown> = {}) {
    setBusy(`${engagement.id}:${action}${extra.siteId ?? ''}`);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/employer/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bindingId: Number(engagement.id), action, ...extra }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'The engagement could not be updated.');
      await refresh();
      setNotice(`Engagement ${engagement.ref} updated.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The engagement could not be updated.');
    } finally {
      setBusy('');
    }
  }

  function toggleSite(engagementId: string, siteId: number) {
    setSelectedSites(current => {
      const list = current[engagementId] ?? [];
      return { ...current, [engagementId]: list.includes(siteId) ? list.filter(id => id !== siteId) : [...list, siteId] };
    });
  }

  const pending = engagements.filter(item => item.status === 'Pending');
  const accepted = engagements.filter(item => item.status === 'Accepted');
  const approvedSites = engagements.reduce((total, item) => total + item.allotments.filter(a => a.status === 'Approved').length, 0);

  return <div className="space-y-6 pb-24">
    <header className="flex flex-wrap justify-between items-end gap-3">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">E·C·S·W</p><h1 className="text-2xl font-bold mt-1">Contractor Engagements</h1><p className="text-sm text-gray-500 mt-1">Contractors request engagement by scanning your QR or a site QR. Approve the binding, then allot the sites they may operate at. Workers can only be bound to a site that is allotted.</p></div>
      <button onClick={refresh} className="inline-flex items-center gap-2 h-10 px-4 border border-gray-300 rounded-lg text-sm font-semibold"><RefreshCw size={15}/>Refresh</button>
    </header>

    <div className="grid grid-cols-3 gap-3">
      <Metric label="Pending" value={pending.length} icon={Clock3} tone="bg-orange-50 text-orange-700"/>
      <Metric label="Accepted" value={accepted.length} icon={Link2} tone="bg-blue-50 text-blue-700"/>
      <Metric label="Sites allotted" value={approvedSites} icon={MapPin} tone="bg-green-50 text-green-700"/>
    </div>

    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}

    {!engagements.length && <section className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400"><Building2 size={40} className="mx-auto mb-3"/><p className="text-sm">No contractor has requested engagement yet.</p></section>}

    <div className="space-y-4">{engagements.map(engagement => {
      const chosen = selectedSites[engagement.id] ?? [];
      const allottedIds = new Set(engagement.allotments.map(a => Number(a.siteId)));
      const available = employer.sites.filter(site => !allottedIds.has(Number(site.id)));
      return <section key={engagement.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg grid place-items-center bg-blue-50 text-blue-700"><Building2 size={18}/></span>
            <div><h2 className="font-bold text-gray-900">{engagement.contractor}</h2><p className="font-mono text-[10px] text-gray-400 mt-0.5">{engagement.contractorCode} · {engagement.ref}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">via {engagement.source || 'QR'}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold ${statusTone[engagement.status]}`}>{engagement.status === 'Accepted' ? <CheckCircle2 size={11}/> : <Clock3 size={11}/>}{engagement.status}</span>
          </div>
        </header>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold ${engagement.consentContractor ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}><Check size={11}/>Contractor consent</span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold ${engagement.consentEmployer ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}><Check size={11}/>Employer consent</span>
          </div>

          {engagement.allotments.length > 0 && <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
            {engagement.allotments.map(allotment => <div key={allotment.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><MapPin size={13} className="text-gray-400"/>{allotment.site}</p><p className="font-mono text-[10px] text-gray-400 mt-0.5">{allotment.siteCode || siteCode(allotment.siteId)}</p></div>
              {allotment.status === 'Approved'
                ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700"><CheckCircle2 size={11}/>Approved</span>
                : <div className="flex gap-2">
                    <button disabled={busy !== ''} onClick={() => act(engagement, 'approve-site', { allotmentId: Number(allotment.id) })} className="h-8 px-3 bg-[#073B67] text-white rounded-lg text-[11px] font-semibold disabled:opacity-50">Approve site</button>
                    <button disabled={busy !== ''} onClick={() => act(engagement, 'reject', { allotmentId: Number(allotment.id) })} className="h-8 px-3 border border-gray-300 rounded-lg text-[11px] font-semibold disabled:opacity-50">Reject</button>
                  </div>}
            </div>)}
          </div>}

          {engagement.status === 'Pending' && !engagement.consentEmployer && <button disabled={busy !== ''} onClick={() => act(engagement, 'approve-binding')} className="w-full h-10 rounded-xl bg-[#073B67] text-white text-sm font-bold disabled:opacity-50">{busy.startsWith(`${engagement.id}:approve-binding`) ? 'Approving…' : 'Approve engagement'}</button>}

          {engagement.status === 'Accepted' && <div className="border-t border-gray-100 pt-4">
            <p className="text-[11px] uppercase font-semibold text-gray-400 mb-2">Allot a site</p>
            {available.length ? <>
              <div className="flex flex-wrap gap-2">{available.map(site => <button key={site.id} onClick={() => toggleSite(engagement.id, Number(site.id))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${chosen.includes(Number(site.id)) ? 'bg-[#073B67] text-white border-[#073B67]' : 'bg-white text-gray-700 border-gray-300'}`}>{site.name}</button>)}</div>
              <button disabled={busy !== '' || !chosen.length} onClick={() => act(engagement, 'allot', { siteIds: chosen }).then(() => setSelectedSites(current => ({ ...current, [engagement.id]: [] })))} className="mt-3 h-9 px-4 bg-[#073B67] text-white rounded-lg text-xs font-semibold disabled:opacity-50">{busy.startsWith(`${engagement.id}:allot`) ? 'Allotting…' : `Allot ${chosen.length || ''} site${chosen.length === 1 ? '' : 's'}`}</button>
            </> : <p className="text-xs text-gray-400">All your sites are already allotted to this contractor.</p>}
          </div>}

          {engagement.status === 'Pending' && <button disabled={busy !== ''} onClick={() => act(engagement, 'reject')} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600"><X size={12}/>Reject engagement</button>}
        </div>
      </section>;
    })}</div>
  </div>;
}

function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Clock3; tone:string }) {
  return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>;
}
