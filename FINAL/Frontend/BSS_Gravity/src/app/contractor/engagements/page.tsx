"use client";

import { useState } from 'react';
import { Building2, Check, CheckCircle2, Clock3, Link2, MapPin, RefreshCw, X } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';
import type { EmployerEngagement } from '@/types/portal';

const statusTone: Record<EmployerEngagement['status'], string> = {
  Pending: 'bg-orange-50 text-orange-700',
  Accepted: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Cancelled: 'bg-gray-100 text-gray-600',
};

export default function ContractorEngagementsPage() {
  const { contractor, replaceContractor } = useContractor();
  const [engagements, setEngagements] = useState<EmployerEngagement[]>(contractor.engagements ?? []);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function act(engagement: EmployerEngagement, action: 'approve-binding' | 'reject') {
    setBusy(`${engagement.id}:${action}`);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/contractor/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bindingId: Number(engagement.id), action }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'The engagement could not be updated.');
      const next = engagements.map(item => item.id === engagement.id
        ? { ...item, status: (action === 'approve-binding' ? 'Accepted' : 'Rejected') as EmployerEngagement['status'], consentContractor: action === 'approve-binding' ? true : item.consentContractor }
        : item);
      setEngagements(next);
      replaceContractor({ ...contractor, engagements: next });
      setNotice(`Engagement ${engagement.ref} ${action === 'approve-binding' ? 'accepted' : 'declined'}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The engagement could not be updated.');
    } finally {
      setBusy('');
    }
  }

  return <div className="space-y-6 pb-24">
    <header className="flex flex-wrap justify-between items-end gap-3">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">E·C·S·W</p><h1 className="text-2xl font-bold mt-1">My Engagements</h1><p className="text-sm text-gray-500 mt-1">Principal employers you are engaged with, and the sites they have allotted to you. You can only bind workers at an allotted site.</p></div>
      <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 h-10 px-4 border border-gray-300 rounded-lg text-sm font-semibold"><RefreshCw size={15}/>Refresh</button>
    </header>

    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}

    {!engagements.length && <section className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400"><Building2 size={40} className="mx-auto mb-3"/><p className="text-sm">Scan a principal employer or site QR to request engagement.</p></section>}

    <div className="space-y-4">{engagements.map(engagement => <section key={engagement.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-start gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg grid place-items-center bg-blue-50 text-blue-700"><Building2 size={18}/></span>
          <div><h2 className="font-bold text-gray-900">{engagement.employer}</h2><p className="font-mono text-[10px] text-gray-400 mt-0.5">{engagement.employerCode} · {engagement.ref}</p></div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold ${statusTone[engagement.status]}`}>{engagement.status === 'Accepted' ? <CheckCircle2 size={11}/> : <Clock3 size={11}/>}{engagement.status}</span>
      </header>
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold ${engagement.consentContractor ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}><Check size={11}/>Your consent</span>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold ${engagement.consentEmployer ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}><Check size={11}/>Employer consent</span>
        </div>

        {engagement.allotments.length > 0 && <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
          {engagement.allotments.map(allotment => <div key={allotment.id} className="p-3 flex items-center justify-between gap-2">
            <div><p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><MapPin size={13} className="text-gray-400"/>{allotment.site}</p><p className="font-mono text-[10px] text-gray-400 mt-0.5">{allotment.siteCode}</p></div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${allotment.status === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>{allotment.status}</span>
          </div>)}
        </div>}

        {engagement.status === 'Pending' && !engagement.consentContractor && <div className="flex gap-2">
          <button disabled={busy !== ''} onClick={() => act(engagement, 'approve-binding')} className="flex-1 h-10 rounded-xl bg-[#073B67] text-white text-sm font-bold disabled:opacity-50">{busy === `${engagement.id}:approve-binding` ? 'Accepting…' : 'Accept engagement'}</button>
          <button disabled={busy !== ''} onClick={() => act(engagement, 'reject')} className="h-10 px-4 border border-gray-300 rounded-xl text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"><X size={14}/>Decline</button>
        </div>}
        {engagement.status === 'Pending' && engagement.consentContractor && <p className="text-xs text-gray-500 inline-flex items-center gap-1.5"><Link2 size={13}/>Waiting for the employer to approve the engagement.</p>}
      </div>
    </section>)}</div>
  </div>;
}
