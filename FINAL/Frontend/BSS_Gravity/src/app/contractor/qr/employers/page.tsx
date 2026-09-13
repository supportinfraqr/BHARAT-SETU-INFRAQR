"use client";

import { useState } from 'react';
import { Star } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorPortalData } from '@/types/portal';

type Employer = ContractorPortalData['employers'][number];

export default function MyEmployersPage() {
  const { contractor, replaceContractor, mutate } = useContractor();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const rows = contractor.employers;
  const defaultSiteId = contractor.defaultSite?.id ?? '';

  async function setDefaultSite(siteId: string) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await mutate('default-site', 'POST', { siteId: siteId || null });
      const site = contractor.sites.find(s => s.id === siteId);
      replaceContractor({
        ...contractor,
        defaultSite: site ? { id: site.id, name: site.name, code: site.code } : null,
      });
      setNotice(site ? `Default site set to ${site.name}.` : 'Default site cleared.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The default site could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const columns: DataColumn<Employer>[] = [
    {
      id: 'name', header: 'Employer', value: r => r.name,
      render: r => <div><strong>{r.name}</strong><p className="font-mono text-[11px] text-gray-500">{r.employerId}</p></div>,
    },
    {
      id: 'sites', header: 'Allotted sites', value: r => r.sites.join(', '),
      render: r => (r.siteDetails && r.siteDetails.length
        ? <div className="space-y-1">{r.siteDetails.map(s => (
            <div key={s.id} className="text-[12px] leading-snug">
              <span className="font-semibold text-gray-800">{s.name}</span>
              {s.code && <span className="font-mono text-[10px] text-gray-400"> · {s.code}</span>}
              {s.location && <span className="text-gray-500"> · {s.location}{s.state ? `, ${s.state}` : ''}</span>}
            </div>
          ))}</div>
        : <span className="text-gray-400">No sites allotted yet</span>),
    },
    { id: 'status', header: 'Status', value: r => r.status },
    { id: 'bound', header: 'Bound since', value: r => r.boundSince || '—' },
  ];

  return <div className="space-y-6">
    <header>
      <h1 className="text-2xl font-bold">My Principal Employers</h1>
      <p className="text-sm text-gray-500 mt-1">Authorised employer relationships and the sites allotted to you — one contractor can be bound to multiple employers.</p>
    </header>

    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center gap-2"><Star size={16} className="text-[#F47A32]" /><h2 className="font-semibold text-sm">Default site for worker bindings</h2></div>
      <p className="text-xs text-gray-500 mt-1 mb-3">When you scan a worker QR, this site is pre-selected. You can still change it at scan time.</p>
      <select
        value={defaultSiteId}
        onChange={e => void setDefaultSite(e.target.value)}
        disabled={saving}
        className="w-full sm:w-96 h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white disabled:opacity-60"
      >
        <option value="">No default site</option>
        {contractor.sites.map(s => (
          <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}{s.employer ? ` — ${s.employer}` : ''}</option>
        ))}
      </select>
      {!contractor.sites.length && <p className="mt-2 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">No sites are allotted to you yet — ask a principal employer to allot a site.</p>}
      {notice && <p role="status" className="mt-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
    </section>

    <EnterpriseDataTable title="Principal employer bindings" rows={rows} columns={columns} rowKey={r => r.id} filename="principal-employers" />
  </div>;
}
