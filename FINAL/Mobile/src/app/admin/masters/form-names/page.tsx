"use client";

import { useCallback, useEffect, useState } from 'react';
import { Copy, Loader2, Plus, X } from 'lucide-react';
import AdminPageHero from '@/components/admin/AdminPageHero';
import { INDIA_STATES } from '@/data/indiaStates';

type Checkpoint = { key?: string; type: string; label: string; value?: string; required?: boolean };
type ExtraForm = { id: number; state: string; jurisdiction?: string; formatVariant?: string; name: string; mandatory: boolean; requiresDocument: boolean; frequency: string; description: string; scope: string; aiChecks?: Checkpoint[] };

export default function AdminFormNamesPage() {
  const [state, setState] = useState(INDIA_STATES[0] ?? '');
  const [rows, setRows] = useState<ExtraForm[]>([]);
  const [catalog, setCatalog] = useState<Checkpoint[]>([]);
  const [selectedCps, setSelectedCps] = useState<Record<string, { checked: boolean; required: boolean }>>({});
  const [customLabel, setCustomLabel] = useState('');
  const [customChecks, setCustomChecks] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('');
  const [requiresDocument, setRequiresDocument] = useState(true);
  const [description, setDescription] = useState('');
  const [jurisdiction, setJurisdiction] = useState<'state' | 'central'>('state');
  const [formatVariant, setFormatVariant] = useState<'new' | 'old'>('new');
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

  async function copyToAllStates() {
    if (!rows.length) return;
    if (!window.confirm(`Copy all ${rows.length} catalog forms from ${state} to all other Indian states?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/form-names/copy-all-states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceState: state }),
      });
      const body = await response.json().catch(() => ({})) as { message?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Catalog forms could not be copied.');
      setNotice(body.message ?? `Copied forms from ${state} to all states.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Forms could not be copied.'); }
    finally { setBusy(false); }
  }

  function resetCheckpoints() {
    setSelectedCps({});
    setCustomChecks([]); setCustomLabel('');
  }

  function addCustomCheck() {
    const label = customLabel.trim();
    if (!label) return;
    setCustomChecks(list => [...list, label]);
    setCustomLabel('');
  }

  async function add() {
    if (!name.trim()) { setError('Enter a form name.'); return; }
    if (!frequency.trim()) { setError('Select a frequency.'); return; }
    setBusy(true); setError(''); setNotice('');
    const formName = name.trim();
    const aiChecks: Checkpoint[] = catalog
      .filter(cp => selectedCps[cp.key ?? cp.type]?.checked)
      .map(cp => ({ key: cp.key, type: cp.type, label: cp.label, required: selectedCps[cp.key ?? cp.type]?.required ?? true }));
    for (const label of customChecks) aiChecks.push({ type: 'custom', label, required: true });
    const central = jurisdiction === 'central';
    const targetState = central ? 'Central' : state;
    try {
      const response = await fetch('/api/admin/form-names', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ state: targetState, jurisdiction, formatVariant, name: formName, frequency: frequency.trim(), requiresDocument, description: description.trim(), aiChecks }),
      });
      const body = await response.json().catch(() => ({})) as { error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The form could not be added.');
      setName(''); setFrequency(''); setRequiresDocument(true); setDescription(''); setJurisdiction('state'); setFormatVariant('new'); resetCheckpoints(); setShowAdd(false);
      await load();
      setNotice(`Added “${formName}” to the ${central ? 'Central (all states)' : state} catalog.`);
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
    <AdminPageHero eyebrow="BSS Admin · Masters" title="Additional Forms" description="A per-state catalog of form names with no register template — contractors submit them directly. Catalog forms are always non-mandatory; each employer selects which apply and marks mandatory on their CLRA Registers page." />

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-gray-950">Catalog for the state</h2><p className="text-xs text-gray-400 mt-0.5">Available to every employer in the state.</p></div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">State
            <select value={state} onChange={e => setState(e.target.value)} className="ml-2 h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white">{INDIA_STATES.map(s => <option key={s}>{s}</option>)}</select>
          </label>
          <button type="button" onClick={() => void copyToAllStates()} disabled={busy || !rows.length} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1.5" title={`Copy all catalog forms of ${state} to all states`}><Copy size={13}/>Copy to all states</button>
          <button type="button" onClick={() => { setShowAdd(true); setError(''); }} className="h-9 px-3 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5"><Plus size={14}/>Add form</button>
        </div>
      </header>
      <div className="p-5">
        {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-6"><Loader2 size={16} className="animate-spin"/>Loading…</p>
          : rows.length
            ? <div className="overflow-x-auto"><table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-12">No</th>
                    <th className="py-2.5 px-3">Document Name</th>
                    <th className="py-2.5 px-3">Jurisdiction</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-3">Mandatory</th>
                    <th className="py-2.5 px-3">Required Format</th>
                    <th className="py-2.5 px-3">Note</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {rows.map((f, i) => (
                    <tr key={f.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-gray-400 font-semibold">{i + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{f.name}{f.aiChecks?.length ? <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{f.aiChecks.length} AI checkpoint{f.aiChecks.length === 1 ? '' : 's'}</span> : null}</td>
                      <td className="py-2.5 px-3">{(f.jurisdiction === 'central' || f.state === 'Central') ? <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200" title="Central — applies to every state">Central</span> : <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">State</span>}</td>
                      <td className="py-2.5 px-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${f.formatVariant === 'old' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{f.formatVariant === 'old' ? 'Old format' : 'New format'}</span></td>
                      <td className="py-2.5 px-3 text-gray-600">{f.frequency || '—'}</td>
                      <td className="py-2.5 px-3"><span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">Optional</span></td>
                      <td className="py-2.5 px-3 text-gray-600">{f.requiresDocument === false ? 'Submission only' : 'PDF / JPEG / PNG'}</td>
                      <td className="py-2.5 px-3 text-gray-500 max-w-[240px]" title={f.description}>{f.description || '—'}</td>
                      <td className="py-2.5 px-3 text-right"><button type="button" onClick={() => void remove(f.id)} className="text-gray-400 hover:text-red-600" aria-label="Remove"><X size={14}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            : <p className="text-xs text-gray-400">No catalog forms for {state} yet.</p>}
      </div>
    </section>

    {showAdd && <div className="fixed inset-0 z-[70] bg-black/50 grid place-items-center p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Add catalog form" className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="text-sm font-semibold">Add catalog form — {jurisdiction === 'central' ? 'Central (all states)' : state}</h2><button onClick={() => setShowAdd(false)} aria-label="Close"><X size={16}/></button></header>
      <div className="p-5 space-y-3">
        <label className="block text-xs font-semibold text-gray-700">Form name *<input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g., Police Verification" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-gray-700">Jurisdiction *<select value={jurisdiction} onChange={e => setJurisdiction(e.target.value as 'state' | 'central')} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-2 text-sm bg-white"><option value="state">State ({state})</option><option value="central">Central — all states</option></select></label>
          <label className="block text-xs font-semibold text-gray-700">Form format *<select value={formatVariant} onChange={e => setFormatVariant(e.target.value as 'new' | 'old')} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-2 text-sm bg-white"><option value="new">New format</option><option value="old">Old format</option></select></label>
        </div>
        {jurisdiction === 'central' && <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">This form is <strong>Central</strong> — it will appear in every state&apos;s catalog; employers still opt in per site.</p>}
        <label className="block text-xs font-semibold text-gray-700">Frequency *<select value={frequency} onChange={e => setFrequency(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-2 text-sm bg-white"><option value="">Select frequency</option>{['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'One-time'].map(f => <option key={f}>{f}</option>)}</select></label>
        <label className="block text-xs font-semibold text-gray-700">Required format<select value={requiresDocument ? 'upload' : 'submission'} onChange={e => setRequiresDocument(e.target.value === 'upload')} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-2 text-sm bg-white"><option value="upload">PDF / JPEG / PNG (document upload)</option><option value="submission">Submission only (no file)</option></select></label>
        <label className="block text-xs font-semibold text-gray-700">Note<input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional guidance shown to contractors" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900">AI checkpoints</p>
          <p className="mt-0.5 text-[11px] text-gray-500">Tick the conditions the AI must verify when the contractor uploads it. <em>Signature/seal are matched by their printed label, not the handwriting.</em></p>
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
          {customChecks.length > 0 && (
            <ul className="mt-2 space-y-1">
              {customChecks.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-white px-2 py-1 text-[11px]">
                  <span className="text-gray-800 truncate">{c}</span>
                  <button type="button" onClick={() => setCustomChecks(list => list.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600" aria-label="Remove checkpoint"><X size={12}/></button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-center gap-2">
            <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCheck(); } }} placeholder="Add a custom checkpoint the AI must verify (free text)" className="flex-1 h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
            <button type="button" onClick={addCustomCheck} disabled={!customLabel.trim()} className="h-9 px-3 rounded-lg border border-[#073B67] text-[#073B67] text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1"><Plus size={13}/>Add</button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400">Catalog forms are non-mandatory — employers choose which to apply and whether they are mandatory for their contractors.</p>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
      <footer className="sticky bottom-0 px-5 py-4 border-t border-gray-100 bg-white flex justify-end gap-2"><button type="button" onClick={() => setShowAdd(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button><button type="button" onClick={() => void add()} disabled={busy || !name.trim() || !frequency.trim()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">{busy ? 'Submitting…' : 'Submit'}</button></footer>
    </section></div>}
  </div>;
}
