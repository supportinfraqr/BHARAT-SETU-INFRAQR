"use client";

import { useState } from 'react';
import { BadgeCheck, Building2, CalendarDays, Landmark, Pencil, Plus, Trash2, TriangleAlert, X } from 'lucide-react';
import type { ContractorLicence } from '@/types/portal';

export type LicenceInput = {
  kind?: string;
  number?: string;
  authority?: string;
  issuedAt?: string;
  expiryAt?: string;
};

const KINDS: Array<[string, string]> = [
  ['EPFO', 'EPFO'], ['ESIC', 'ESIC'], ['CLRA', 'Contract Labour (CLRA)'],
  ['BOCW', 'BOCW'], ['FACTORY', 'Factory Licence'],
  ['SHOPS_EST', 'Shops & Establishments'], ['PT', 'Professional Tax'],
  ['LWF', 'Labour Welfare Fund'], ['APPRENTICE', 'Apprenticeship'], ['OTHER', 'Other'],
];

const tone: Record<ContractorLicence['status'], string> = {
  Active: 'bg-green-50 text-green-700',
  Expiring: 'bg-orange-50 text-orange-700',
  Pending: 'bg-blue-50 text-blue-700',
  Expired: 'bg-red-50 text-red-700',
};

export default function StatutoryLicences({ rows, onSave }: {
  rows: ContractorLicence[];
  onSave: (method: 'POST' | 'PATCH' | 'DELETE', body: LicenceInput & { id?: string }) => Promise<ContractorLicence | { id: string }>;
}) {
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null);
  const [values, setValues] = useState<LicenceInput>({});
  const [error, setError] = useState('');

  function open(mode: 'create' | 'edit', row?: ContractorLicence) {
    setError('');
    if (row) {
      setValues({ kind: row.kind, number: row.number, authority: row.authority, issuedAt: row.validFrom, expiryAt: row.validTo });
      setForm({ mode, id: row.id });
    } else {
      setValues({});
      setForm({ mode });
    }
  }

  const set = <K extends keyof LicenceInput>(key: K, value: string) => setValues(v => ({ ...v, [key]: value }));

  async function save() {
    if (!form) return;
    setBusy('save');
    setError('');
    try {
      const body: LicenceInput & { id?: string } = { ...values };
      if (form.id) body.id = form.id;
      if (form.mode === 'edit' && !body.kind) body.kind = 'OTHER';
      await onSave(form.mode === 'create' ? 'POST' : 'PATCH', body);
      setForm(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The licence could not be saved.'); }
    finally { setBusy(''); }
  }

  async function remove(row: ContractorLicence) {
    setBusy(row.id);
    setError('');
    try { await onSave('DELETE', { id: row.id }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The licence could not be removed.'); }
    finally { setBusy(''); }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl">
      <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap justify-between gap-2 items-center">
        <div>
          <h2 className="text-sm font-semibold text-gray-950">Registrations &amp; Licences</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">{rows.length} record(s) · EPFO, ESIC, CLRA, BOCW, Factory, Shops &amp; Est., PT, LWF</p>
        </div>
        <button onClick={() => open('create')} className="h-9 px-3 rounded-lg bg-[#0F172A] text-white text-xs font-semibold inline-flex items-center gap-1.5"><Plus size={14}/>Add licence</button>
      </header>

      {!rows.length && <p className="px-5 py-10 text-sm text-gray-400 text-center">No registrations yet. Add your first licence to populate the Active Licences KPI.</p>}

      <ul className="divide-y divide-gray-100">
        {rows.map(row => (
          <li key={row.id} className="px-5 py-3.5 flex items-center gap-3">
            <span className={`w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 ${row.status === 'Active' ? 'bg-green-50' : row.status === 'Expired' ? 'bg-red-50' : 'bg-gray-50'}`}>
              {row.status === 'Active' ? <BadgeCheck size={17} className="text-green-600"/> : row.status === 'Expired' ? <TriangleAlert size={17} className="text-red-500"/> : <Landmark size={17} className="text-gray-400"/>}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{row.name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tone[row.status]}`}>{row.status}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                <span className="font-mono">{row.number || 'No number'}</span>
                {row.authority && <span> · {row.authority}</span>}
              </p>
              {(row.validFrom || row.validTo) && <p className="text-[11px] text-gray-400 mt-0.5 inline-flex items-center gap-1"><CalendarDays size={11}/>{(row.validFrom || '—')} → {(row.validTo || '—')}</p>}
            </div>
            <button onClick={() => open('edit', row)} disabled={!!busy} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:text-blue-700 hover:bg-blue-50" aria-label={`Edit ${row.name}`}><Pencil size={15}/></button>
            <button onClick={() => remove(row)} disabled={!!busy} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" aria-label={`Remove ${row.name}`}><Trash2 size={15}/></button>
          </li>
        ))}
      </ul>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="licence-modal-title">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <header className="p-5 border-b border-gray-100 flex justify-between items-start gap-3">
              <div>
                <h2 id="licence-modal-title" className="font-semibold text-gray-950">{form.mode === 'create' ? 'Add registration / licence' : 'Edit registration / licence'}</h2>
                <p className="text-xs text-gray-500 mt-1">Stored on your entity&apos;s compliance register</p>
              </div>
              <button onClick={() => setForm(null)} disabled={!!busy} className="w-10 h-10 grid place-items-center rounded-lg hover:bg-gray-50" aria-label="Close"><X/></button>
            </header>
            <div className="p-5 space-y-4">
              <label className="block text-xs font-semibold text-gray-500">
                Registration type
                <select value={values.kind ?? ''} onChange={e => set('kind', e.target.value)} className="mt-1 block w-full h-10 border border-gray-200 rounded-lg px-3 text-sm text-gray-900">
                  <option value="">Select…</option>
                  {KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-gray-500">
                Registration / licence number
                <input value={values.number ?? ''} onChange={e => set('number', e.target.value)} placeholder="e.g. MH/CLRA/2026/000444" maxLength={80} className="mt-1 block w-full h-10 border border-gray-200 rounded-lg px-3 text-sm text-gray-900"/>
              </label>
              <label className="block text-xs font-semibold text-gray-500">
                Issuing authority
                <input value={values.authority ?? ''} onChange={e => set('authority', e.target.value)} placeholder="e.g. Department of Labour, Maharashtra" maxLength={120} className="mt-1 block w-full h-10 border border-gray-200 rounded-lg px-3 text-sm text-gray-900"/>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-500">
                  Valid from
                  <input type="date" value={values.issuedAt ?? ''} onChange={e => set('issuedAt', e.target.value)} className="mt-1 block w-full h-10 border border-gray-200 rounded-lg px-3 text-sm text-gray-900"/>
                </label>
                <label className="block text-xs font-semibold text-gray-500">
                  Valid to
                  <input type="date" value={values.expiryAt ?? ''} onChange={e => set('expiryAt', e.target.value)} className="mt-1 block w-full h-10 border border-gray-200 rounded-lg px-3 text-sm text-gray-900"/>
                </label>
              </div>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setForm(null)} className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700">Cancel</button>
                <button onClick={save} disabled={!!busy} className="h-9 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-1.5"><Building2 size={14}/>{busy ? 'Saving…' : form.mode === 'create' ? 'Add licence' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}