"use client";

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Database, Download, Loader2, QrCode, Upload, X } from 'lucide-react';
import WorkerQr from '@/components/qr/WorkerQr';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerContractor } from '@/types/portal';

type SapFieldMap = { field: string; label: string; sapFields: string[] };
type SapConfig = { configured: boolean; entity: string; fieldMap: SapFieldMap[] };

export default function EmployerQrContractorsPage() {
  const { employer } = useEmployer();
  const [selected, setSelected] = useState<EmployerContractor | null>(null);
  const [sapFor, setSapFor] = useState<EmployerContractor | null>(null);
  const [sapConfig, setSapConfig] = useState<SapConfig | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSapConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/employer/sap/config', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: SapConfig };
      if (response.ok && body.data) setSapConfig(body.data);
    } catch { /* leave config null */ }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time config load
  useEffect(() => { void loadSapConfig(); }, [loadSapConfig]);

  function openSap(row: EmployerContractor) {
    setSapFor(row);
    setIdentifier(row.bssId || '');
    setError(''); setNotice('');
  }

  async function sync(form: FormData) {
    if (!sapFor) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/employer/contractors/${encodeURIComponent(sapFor.id)}/sap-sync`, { method: 'POST', body: form });
      const body = await response.json().catch(() => ({})) as { data?: { mapped: string[]; source: string; profile: { contractorName?: string } }; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'SAP populate failed.');
      setNotice(`Populated ${body.data.profile.contractorName || sapFor.name} from ${body.data.source} — ${body.data.mapped.length} field(s) mapped: ${body.data.mapped.join(', ')}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'SAP populate failed.'); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<EmployerContractor>[] = [
    { id:'contractor', header:'Contractor', value:row => row.name, render:row => <div><strong className="text-bss-text-primary">{row.name}</strong><p className="font-mono text-[10px] text-bss-text-muted">{row.bssId}</p></div> },
    { id:'sites', header:'Sites', value:row => row.siteIds.length },
    { id:'workers', header:'Workers', value:row => row.workers },
    { id:'status', header:'Status', value:row => row.status },
    { id:'qr', header:'QR', filterable:false, value:row => row.bssId, render:row => <button onClick={() => setSelected(row)} className="inline-flex gap-1 text-bss-interactive-blue font-semibold"><QrCode size={15}/>View QR</button> },
    { id:'sap', header:'SAP', filterable:false, value:row => row.id, render:row => <button onClick={() => openSap(row)} className="inline-flex gap-1 text-bss-green font-semibold hover:underline"><Database size={14}/>Populate from SAP</button> },
  ];

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">QR system</p><h1 className="text-2xl font-bold mt-1">My Contractors</h1><p className="text-sm text-bss-text-muted mt-1">Contractors bound to your organisation with their site assignments and QR identity. Pull a contractor&apos;s master data from SAP straight into their profile.</p></header>
    <EnterpriseDataTable title="Bound contractor identities" rows={employer.contractors} columns={columns} rowKey={row => row.id} filename="employer-contractor-qr"/>

    {selected && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"><section role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-sm text-center relative"><button onClick={() => setSelected(null)} aria-label="Close" className="absolute right-4 top-4"><X/></button><h2 className="font-semibold">{selected.name}</h2><p className="text-xs font-mono text-bss-text-muted">{selected.bssId}</p><div className="relative w-56 h-56 mx-auto mt-5"><WorkerQr bssId={selected.bssId} className="w-full h-full"/><span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[44px] h-[44px] bg-white rounded-[8px] grid place-items-center shadow-sm"><img src="/bss-original-logo.png" alt="" className="w-[34px] h-[34px] object-contain"/></span></span></div><p className="text-xs text-bss-text-muted mt-4">Verification still applies server-side disclosure rules.</p></section></div>}

    {sapFor && <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-center p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Populate contractor from SAP" className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[92vh] flex flex-col overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold flex items-center gap-2"><Database size={16} className="text-bss-green"/>Populate from SAP — {sapFor.name}</h2><p className="text-xs text-bss-text-muted mt-0.5">Map the contractor&apos;s SAP master record into their BSS profile (code, name, GST/PAN, CIN, licence, address, contacts…).</p></div><div className="flex items-center gap-3 shrink-0"><a href="/api/employer/sap/setup-document" className="text-xs font-semibold text-[#01183A] hover:underline inline-flex items-center gap-1 whitespace-nowrap"><Download size={13}/>Setup &amp; IP-whitelisting guide</a><button onClick={() => setSapFor(null)} aria-label="Close"><X size={16}/></button></div></header>
      <div className="p-5 space-y-4 overflow-y-auto">
        {sapConfig && !sapConfig.configured && <p className="text-xs text-bss-orange bg-bss-soft-orange border border-bss-border rounded-lg px-3 py-2">Live SAP isn&apos;t configured on the server. You can still <strong>upload an SAP export</strong> (CSV/XLSX) below — it will be mapped the same way.</p>}
        {error && <p role="alert" className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg px-3 py-2">{error}</p>}
        {notice && <p role="status" className="text-xs text-bss-green bg-bss-soft-green border border-bss-border rounded-lg px-3 py-2 flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0"/>{notice}</p>}

        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="text-xs font-semibold text-bss-text-primary">Contractor code / CIN / Vendor no.<input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="e.g. V-100234" className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm"/></label>
          <button type="button" disabled={busy || !sapConfig?.configured || !identifier.trim()} onClick={() => { const f = new FormData(); f.set('identifier', identifier.trim()); void sync(f); }} className="h-10 px-4 rounded-lg bg-bss-green text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5">{busy ? <Loader2 size={14} className="animate-spin"/> : <Database size={14}/>}Fetch from SAP</button>
        </div>

        <label className="flex items-center justify-center gap-2 h-20 border border-dashed border-bss-border rounded-lg text-xs font-semibold text-bss-text-secondary cursor-pointer hover:bg-bss-bg"><Upload size={16}/>Upload SAP export (CSV / XLSX)<input type="file" accept=".csv,.xlsx,.xlsm" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const f = new FormData(); f.set('sap', file); if (identifier.trim()) f.set('identifier', identifier.trim()); void sync(f); } }}/></label>

        {sapConfig?.fieldMap?.length ? <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Field mapping (SAP → contractor profile)</p>
          <div className="rounded-xl border border-bss-border overflow-hidden"><table className="w-full text-[11px] text-left"><thead className="bg-bss-bg text-bss-text-muted"><tr><th className="px-3 py-2">Profile field</th><th className="px-3 py-2">SAP field(s)</th></tr></thead>
            <tbody className="divide-y divide-bss-border">{sapConfig.fieldMap.map(m => <tr key={m.field}><td className="px-3 py-1.5 text-bss-text-primary">{m.label}</td><td className="px-3 py-1.5 font-mono text-bss-text-muted">{m.sapFields.join(', ')}</td></tr>)}</tbody></table></div>
        </div> : null}
      </div>
    </section></div>}
  </div>;
}
