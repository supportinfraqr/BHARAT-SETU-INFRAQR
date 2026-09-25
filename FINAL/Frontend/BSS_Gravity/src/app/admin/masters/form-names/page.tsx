"use client";

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { INDIA_STATES } from '@/data/indiaStates';

type Checkpoint = { key?: string; type: string; label: string; value?: string; required?: boolean };
type ExtraForm = { id: number; state: string; name: string; mandatory: boolean; requiresDocument: boolean; frequency: string; description: string; scope: string; ocrCheckpoints?: Checkpoint[] };

export default function AdminFormNamesPage() {
  const [state, setState] = useState(INDIA_STATES[0] ?? '');
  const [rows, setRows] = useState<ExtraForm[]>([]);
  const [catalog, setCatalog] = useState<Checkpoint[]>([]);
  const [selectedCps, setSelectedCps] = useState<Record<string, { checked: boolean; required: boolean }>>({});
  const [customKeyword, setCustomKeyword] = useState('');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/form-names?state=${encodeURIComponent(state)}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: ExtraForm[]; checkpoints?: Checkpoint[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'Forms could not be loaded.');
      setRows(body.data ?? []); setCatalog(body.checkpoints ?? []); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Forms could not be loaded.'); }
    finally { setLoading(false); }
  }, [state]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reload when state changes
  useEffect(() => { void load(); }, [load]);

  function resetCheckpoints() {
    setSelectedCps({}); setCustomKeyword('');
  }

  async function add() {
    if (!name.trim()) return;
    setBusy(true); setError(''); setNotice('');
    const formName = name.trim();
    const ocrCheckpoints: Checkpoint[] = catalog
      .filter(cp => selectedCps[cp.key ?? cp.type]?.checked)
      .map(cp => ({ key: cp.key, type: cp.type, label: cp.label, required: selectedCps[cp.key ?? cp.type]?.required ?? true }));
    if (customKeyword.trim()) ocrCheckpoints.push({ type: 'keyword', label: customKeyword.trim(), value: customKeyword.trim(), required: true });
    try {
      const response = await fetch('/api/admin/form-names', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ state, name: formName, frequency: frequency.trim(), ocrCheckpoints }),
      });
      const body = await response.json().catch(() => ({})) as { error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The form could not be added.');
      setName(''); setFrequency(''); resetCheckpoints(); setShowAdd(false);
      await load();
      setNotice(`Added “${formName}” to the ${state} catalog.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The form could not be added.'); }
    finally { setBusy(false); }
  }

  async function remove(id: number) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/form-names/${id}`, { method:'DELETE' });
      if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?:string }; throw new Error(body.error ?? 'The form could not be removed.'); }
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The form could not be removed.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Masters</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Additional Forms</h1>
      <p className="text-sm text-gray-500 mt-1">A per-state <strong>catalog</strong> of form names with <strong>no register template</strong> — contractors submit them directly. Catalog forms are always <strong>non-mandatory</strong>; each employer selects which apply and marks mandatory on their CLRA Registers page.</p>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-gray-950">Catalog for the state</h2><p className="text-xs text-gray-400 mt-0.5">Available to every employer in the state.</p></div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">State
            <select value={state} onChange={e => setState(e.target.value)} className="ml-2 h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white">{INDIA_STATES.map(s => <option key={s}>{s}</option>)}</select>
          </label>
          <button type="button" onClick={() => { setShowAdd(true); setError(''); }} className="h-9 px-3 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5"><Plus size={14}/>Add form</button>
        </div>
      </header>
      <div className="p-5">
        {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-6"><Loader2 size={16} className="animate-spin"/>Loading…</p>
          : rows.length
            ? <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">{rows.map(f => <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs"><span className="text-gray-800">{f.name}{f.frequency && <span className="ml-2 text-gray-400">{f.frequency}</span>}{f.ocrCheckpoints?.length ? <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{f.ocrCheckpoints.length} OCR check{f.ocrCheckpoints.length === 1 ? '' : 's'}</span> : null}</span><button type="button" onClick={() => void remove(f.id)} className="text-gray-400 hover:text-red-600" aria-label="Remove"><X size={14}/></button></li>)}</ul>
            : <p className="text-xs text-gray-400">No catalog forms for {state} yet.</p>}
      </div>
    </section>

    {showAdd && <div className="fixed inset-0 z-[70] bg-black/50 grid place-items-center p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Add catalog form" className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="text-sm font-semibold">Add catalog form — {state}</h2><button onClick={() => setShowAdd(false)} aria-label="Close"><X size={16}/></button></header>
      <div className="p-5 space-y-3">
        <label className="block text-xs font-semibold text-gray-700">Form name *<input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g., Police Verification" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
        <label className="block text-xs font-semibold text-gray-700">Frequency<select value={frequency} onChange={e => setFrequency(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-2 text-sm bg-white"><option value="">—</option>{['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'One-time'].map(f => <option key={f}>{f}</option>)}</select></label>
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900">Verification checkpoints (OCR)</p>
          <p className="mt-0.5 text-[11px] text-gray-500">Tick what the uploaded document must contain — verified by OCR when the contractor uploads it. <em>Signature/seal are matched by their printed label, not the handwriting.</em></p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {catalog.map(cp => {
              const key = cp.key ?? cp.type;
              const sel = selectedCps[key];
              return <div key={key} className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1.5 flex-1 min-w-0">
                  <input type="checkbox" checked={!!sel?.checked} onChange={e => setSelectedCps(s => ({ ...s, [key]: { checked: e.target.checked, required: s[key]?.required ?? true } }))} className="accent-[#073B67]"/>
                  <span className="truncate text-gray-700">{cp.label}</span>
                </label>
                {sel?.checked && <label className="flex items-center gap-1 text-[10px] text-gray-500 whitespace-nowrap"><input type="checkbox" checked={sel.required} onChange={e => setSelectedCps(s => ({ ...s, [key]: { checked: true, required: e.target.checked } }))} className="accent-[#073B67]"/>required</label>}
              </div>;
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input value={customKeyword} onChange={e => setCustomKeyword(e.target.value)} placeholder="Custom keyword to require (optional)" className="flex-1 h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
          </div>
        </div>
        <p className="text-[11px] text-gray-400">Catalog forms are non-mandatory — employers choose which to apply and whether they are mandatory for their contractors.</p>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
      <footer className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2"><button type="button" onClick={() => setShowAdd(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button><button type="button" onClick={() => void add()} disabled={busy || !name.trim()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">{busy ? 'Adding…' : 'Add form'}</button></footer>
    </section></div>}
  </div>;
}
