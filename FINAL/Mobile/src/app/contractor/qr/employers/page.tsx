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
        defaultSite: site ? { id: site.id, name: site.name, bssId: site.bssId } : null,
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
      render: r => <div><strong>{r.name}</strong><p className="font-mono text-[11px] text-bss-text-muted">{r.employerId}</p></div>,
    },
    {
      id: 'sites', header: 'Allotted sites', value: r => r.sites.join(', '),
      render: r => (r.siteDetails && r.siteDetails.length
        ? <div className="space-y-1">{r.siteDetails.map(s => (
            <div key={s.id} className="text-[12px] leading-snug">
              <span className="font-semibold text-bss-text-primary">{s.name}</span>
              {s.bssId && <span className="font-mono text-[10px] text-bss-text-muted"> · {s.bssId}</span>}
              {s.location && <span className="text-bss-text-muted"> · {s.location}{s.state ? `, ${s.state}` : ''}</span>}
            </div>
          ))}</div>
        : <span className="text-bss-text-muted">No sites allotted yet</span>),
    },
    { id: 'status', header: 'Status', value: r => r.status },
    { id: 'bound', header: 'Bound since', value: r => r.boundSince || '—' },
  ];

  return <div className="space-y-6">
    <header>
      <h1 className="text-2xl font-bold">My Principal Employers</h1>
      <p className="text-sm text-bss-text-muted mt-1">Authorised employer relationships and the sites allotted to you — one contractor can be bound to multiple employers.</p>
    </header>

    <section className="bss-card bss-3d bss-scroll-rise rounded-2xl p-5">
      <div className="flex items-center gap-2"><Star size={16} className="text-[#E45D24]" /><h2 className="font-semibold text-sm">Default site for worker bindings</h2></div>
      <p className="text-xs text-bss-text-muted mt-1 mb-3">When you scan a worker QR, this site is pre-selected. You can still change it at scan time.</p>
      <select
        value={defaultSiteId}
        onChange={e => void setDefaultSite(e.target.value)}
        disabled={saving || !contractor.sites.length}
        className="w-full sm:w-96 h-10 rounded-lg border border-bss-border px-3 text-sm bg-white disabled:opacity-60"
      >
        {!contractor.sites.length && <option value="">No sites allotted</option>}
        {contractor.sites.map(s => (
          <option key={s.id} value={s.id}>{s.name}{s.bssId ? ` (${s.bssId})` : ''}{s.employer ? ` — ${s.employer}` : ''}</option>
        ))}
      </select>
      {!contractor.sites.length && <p className="mt-2 text-xs text-bss-orange bg-bss-soft-orange border border-bss-border rounded-lg px-3 py-2">No sites are allotted to you yet — ask a principal employer to allot a site.</p>}
      {notice && <p role="status" className="mt-2 text-xs text-bss-green bg-bss-soft-green border border-bss-border rounded-lg px-3 py-2">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg px-3 py-2">{error}</p>}
    </section>

    <EnterpriseDataTable title="Principal employer bindings" rows={rows} columns={columns} rowKey={r => r.id} filename="principal-employers" />
  </div>;
}
