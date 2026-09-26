"use client";

import { useCallback, useEffect, useState } from 'react';
import { Building2, CheckCircle2, Loader2, Plus, ShieldCheck, X } from 'lucide-react';

type RegisterForm = {
  id: number; formCode: string; title: string;
  criticality?: string; templateType?: string;
  columns: string[]; adopted: boolean; isMandatory?: boolean;
};
type SiteBoard = {
  siteId: number; siteName: string; siteCode: string; state: string;
  adoptedCount: number; total: number; gated: boolean; forms: RegisterForm[];
};
type ExtraForm = { id: number; state: string; name: string; mandatory: boolean; requiresDocument: boolean; frequency: string; description: string; scope: string; selected?: boolean };

function selectionFrom(boards: SiteBoard[]): Record<number, number[]> {
  const map: Record<number, number[]> = {};
  for (const board of boards) map[board.siteId] = board.forms.filter(f => f.adopted).map(f => f.id);
  return map;
}

export default function ClraRegistersPage() {
  const [boards, setBoards] = useState<SiteBoard[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [selection, setSelection] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [extraForms, setExtraForms] = useState<ExtraForm[]>([]);
  const [efName, setEfName] = useState('');
  const [efMandatory, setEfMandatory] = useState(false);
  const [efFrequency, setEfFrequency] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employer/register-templates', { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { sites?:SiteBoard[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'CLRA registers could not be loaded.');
      const next = body.sites ?? [];
      setBoards(next);
      setSelection(selectionFrom(next));
      setActive(current => (current && next.some(board => board.siteId === current)) ? current : (next[0]?.siteId ?? null));
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'CLRA registers could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial adoption board load
  useEffect(() => { void load(); }, [load]);

  const board = boards.find(item => item.siteId === active) ?? null;
  const activeState = board?.state ?? '';
  const selected = new Set(board ? (selection[board.siteId] ?? []) : []);

  function toggle(formId: number) {
    if (!board) return;
    if (board.forms.find(form => form.id === formId)?.isMandatory) return; // mandatory — locked
    setSelection(current => {
      const ids = new Set(current[board.siteId] ?? []);
      if (ids.has(formId)) ids.delete(formId); else ids.add(formId);
      return { ...current, [board.siteId]: [...ids] };
    });
    setNotice('');
  }

  function selectAll(forms: RegisterForm[]) {
    if (!board) return;
    setSelection(current => ({ ...current, [board.siteId]: forms.map(form => form.id) }));
    setNotice('');
  }

  function clearOptional() {
    if (!board) return;
    setSelection(current => ({ ...current, [board.siteId]: board.forms.filter(form => form.isMandatory).map(form => form.id) }));
    setNotice('');
  }

  async function save() {
    if (!board) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/register-templates', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ siteId: board.siteId, templateIds: selection[board.siteId] ?? [] }),
      });
      const body = await response.json().catch(() => ({})) as { sites?:SiteBoard[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The CLRA register adoption could not be saved.');
      const next = body.sites ?? boards;
      setBoards(next);
      setSelection(selectionFrom(next));
      setNotice(`Saved — contractors at ${board.siteName} now see these registers.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The CLRA register adoption could not be saved.'); }
    finally { setBusy(false); }
  }

  async function revokeSite() {
    if (!board) return;
    if (!window.confirm(`Remove the adopted forms for ${board.siteName}? Contractors at this site won't be able to upload CLRA registers until you adopt again.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/register-templates', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ siteId: board.siteId, revoke: true }),
      });
      const body = await response.json().catch(() => ({})) as { sites?:SiteBoard[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The adoption could not be removed.');
      const next = body.sites ?? boards;
      setBoards(next);
      setSelection(current => ({ ...current, [board.siteId]: [] }));
      setNotice(`Removed the CLRA adoption for ${board.siteName}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The adoption could not be removed.'); }
    finally { setBusy(false); }
  }

  async function adoptAllSites() {
    if (!boards.length) return;
    setBusy(true); setError(''); setNotice('');
    try {
      for (const item of boards) {
        const response = await fetch('/api/employer/register-templates', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ siteId: item.siteId, templateIds: item.forms.map(f => f.id) }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({})) as { error?:string };
          throw new Error(body.error ?? `Adoption failed for ${item.siteName}.`);
        }
      }
      await load();
      setNotice(`Adopted all forms for ${boards.length} site${boards.length === 1 ? '' : 's'}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Adoption failed.'); }
    finally { setBusy(false); }
  }

  const loadExtra = useCallback(async () => {
    const state = boards.find(b => b.siteId === active)?.state ?? '';
    if (!state) { setExtraForms([]); return; }
    try {
      const response = await fetch(`/api/employer/form-names?state=${encodeURIComponent(state)}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: ExtraForm[] };
      setExtraForms(response.ok ? (body.data ?? []) : []);
    } catch { setExtraForms([]); }
  }, [active, boards]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reload when the site (state) changes
  useEffect(() => { void loadExtra(); }, [loadExtra]);

  async function addExtraForm() {
    if (!activeState || !efName.trim()) return;
    const name = efName.trim();
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/form-names', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ state: activeState, name, mandatory: efMandatory, frequency: efFrequency.trim() }),
      });
      const body = await response.json().catch(() => ({})) as { error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The form could not be added.');
      setEfName(''); setEfMandatory(false); setEfFrequency(''); setShowAddForm(false);
      await loadExtra();
      setNotice(`Added form “${name}” for ${activeState}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The form could not be added.'); }
    finally { setBusy(false); }
  }

  async function removeExtraForm(id: number) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/employer/form-names/${id}`, { method:'DELETE' });
      if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?:string }; throw new Error(body.error ?? 'The form could not be removed.'); }
      await loadExtra();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The form could not be removed.'); }
    finally { setBusy(false); }
  }

  async function setCatalog(formNameId: number, selected: boolean, mandatory: boolean) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/employer/form-names', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ formNameId, selected, mandatory }),
      });
      if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?:string }; throw new Error(body.error ?? 'Could not update the form.'); }
      await loadExtra();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the form.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Governance controls</p>
        <h1 className="text-2xl font-bold mt-1">CLRA Registers</h1>
        <p className="text-sm text-gray-500 mt-1">Adopt the CLRA registers <strong>per site</strong>. Contractors at a site can only upload once that site is adopted; use <strong>Remove adoption</strong> to revoke a site.</p>
      </div>
      <button type="button" onClick={() => void adoptAllSites()} disabled={busy || !boards.length} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5 self-start whitespace-nowrap"><CheckCircle2 size={14}/>Adopt all forms (all sites)</button>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading CLRA registers…</p>
      : !boards.length ? <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Building2 size={28} className="mx-auto text-gray-300"/>
          <p className="text-sm font-semibold text-gray-700 mt-3">No sites available yet</p>
          <p className="text-xs text-gray-500 mt-1">Sites appear here once you have a registered site with a state. Add a site to adopt CLRA registers.</p>
        </div>
      : <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden h-fit">
          <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Your sites</h2><p className="text-xs text-gray-400 mt-0.5">Adoption is configured per site.</p></header>
          <div className="divide-y divide-gray-100">{boards.map(item => <button key={item.siteId} type="button" onClick={() => setActive(item.siteId)} className={`w-full text-left px-5 py-3 flex items-center justify-between gap-3 ${item.siteId === active ? 'bg-[#073B67]/5' : 'hover:bg-gray-50'}`}>
            <div><p className={`text-sm font-semibold ${item.siteId === active ? 'text-[#073B67]' : 'text-gray-800'}`}>{item.siteName}</p><p className="text-[11px] text-gray-400">{item.state || 'No state'} · {item.adoptedCount} of {item.total} adopted</p></div>
            {item.gated ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Gated</span> : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Open</span>}
          </button>)}</div>
        </section>

        {board && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><ShieldCheck size={16} className="text-[#073B67]"/>{board.siteName} · {board.state}</h2><p className="text-xs text-gray-400 mt-0.5">Tick the forms to adopt for this site. Contractors at the site see the ticked forms plus every <span className="font-semibold text-red-700">Mandatory</span> form.</p></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => selectAll(board.forms)} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">Select all</button>
              <button type="button" onClick={clearOptional} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">Clear optional</button>
              <button type="button" onClick={() => void revokeSite()} disabled={busy || !board.gated} className="h-9 px-3 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">Remove adoption</button>
            </div>
          </header>
          {board.forms.length
            ? <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100"><tr><th className="px-5 py-3 w-14">Adopt</th><th className="px-5 py-3">Form</th><th className="px-5 py-3">Title</th><th className="px-5 py-3">Criticality</th><th className="px-5 py-3">Columns</th></tr></thead>
                <tbody className="divide-y divide-gray-100">{board.forms.map(form => <tr key={form.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3"><input type="checkbox" checked={selected.has(form.id) || !!form.isMandatory} disabled={!!form.isMandatory} onChange={() => toggle(form.id)} className="accent-[#073B67] w-4 h-4 disabled:opacity-80" title={form.isMandatory ? 'Mandatory — always adopted' : ''}/></td>
                  <td className="px-5 py-3 font-mono font-semibold text-[#073B67]"><span className="inline-flex items-center gap-1.5">{form.formCode}{form.isMandatory && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700">Mandatory</span>}</span></td>
                  <td className="px-5 py-3 text-gray-700">{form.title || '—'}</td>
                  <td className="px-5 py-3">{form.criticality ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${form.criticality === 'High' ? 'bg-red-50 text-red-700' : form.criticality === 'Medium' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{form.criticality}</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3 text-gray-500">{form.columns.length}</td>
                </tr>)}</tbody>
              </table></div>
            : <p className="p-5 text-xs text-gray-400">No CLRA register templates are configured for {board.state} yet.</p>}
          <footer className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-gray-400">{selected.size} of {board.total} form{board.total === 1 ? '' : 's'} adopted · <span className="font-semibold text-red-700">Mandatory</span> forms are always adopted and cannot be removed.</p>
            <button type="button" onClick={() => void save()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>{busy ? 'Saving…' : 'Save adoption'}</button>
          </footer>
        </section>}
      </div>}

    {board && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-gray-950">Additional forms for {activeState} — no template</h2><p className="text-xs text-gray-400 mt-0.5">Extra forms contractors submit <strong>directly</strong> (no generated register). Choose “submission only” when no document/PDF is required.</p></div>
        <button type="button" onClick={() => { setShowAddForm(true); setError(''); }} className="h-9 px-3 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5"><Plus size={14}/>Add form</button>
      </header>
      <div className="p-5 space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Your forms ({extraForms.filter(f => f.scope === 'employer').length})</p>
          {extraForms.filter(f => f.scope === 'employer').length
            ? <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">{extraForms.filter(f => f.scope === 'employer').map(f => <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs"><span className="text-gray-800">{f.name}{f.mandatory && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700">Mandatory</span>}{f.frequency && <span className="ml-2 text-gray-400">{f.frequency}</span>}</span><button type="button" onClick={() => void removeExtraForm(f.id)} className="text-gray-400 hover:text-red-600" aria-label="Remove"><X size={14}/></button></li>)}</ul>
            : <p className="text-[11px] text-gray-400">None yet — use <strong>Add form</strong>.</p>}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Admin catalog for {activeState}</p>
          {extraForms.filter(f => f.scope === 'admin').length
            ? <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">{extraForms.filter(f => f.scope === 'admin').map(f => <li key={`c-${f.id}`} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-xs">
                <label className="flex items-center gap-2 text-gray-800 cursor-pointer"><input type="checkbox" checked={!!f.selected} disabled={busy} onChange={e => void setCatalog(f.id, e.target.checked, f.mandatory)} className="accent-[#073B67] w-4 h-4"/>{f.name}{!f.requiresDocument && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Submission only</span>}{f.frequency && <span className="text-gray-400">{f.frequency}</span>}</label>
                <label className={`flex items-center gap-1.5 font-semibold ${f.selected ? 'text-gray-700' : 'text-gray-300'}`}><input type="checkbox" disabled={busy || !f.selected} checked={!!f.mandatory} onChange={e => void setCatalog(f.id, true, e.target.checked)} className="accent-[#b91c1c] w-4 h-4"/>Mandatory</label>
              </li>)}</ul>
            : <p className="text-[11px] text-gray-400">No admin catalog forms for {activeState}.</p>}
        </div>
      </div>
    </section>}

    {board && showAddForm && <div className="fixed inset-0 z-[70] bg-black/50 grid place-items-center p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Add additional form" className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="text-sm font-semibold">Add form — {activeState}</h2><button onClick={() => setShowAddForm(false)} aria-label="Close"><X size={16}/></button></header>
      <div className="p-5 space-y-3">
        <label className="block text-xs font-semibold text-gray-700">Form name *<input value={efName} onChange={e => setEfName(e.target.value)} autoFocus placeholder="e.g., Police Verification" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
        <label className="block text-xs font-semibold text-gray-700">Frequency<select value={efFrequency} onChange={e => setEfFrequency(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-2 text-sm bg-white"><option value="">—</option>{['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'One-time'].map(f => <option key={f}>{f}</option>)}</select></label>
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700"><input type="checkbox" checked={efMandatory} onChange={e => setEfMandatory(e.target.checked)} className="accent-[#073B67] w-4 h-4"/>Mandatory</label>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
      <footer className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2"><button type="button" onClick={() => setShowAddForm(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button><button type="button" onClick={() => void addExtraForm()} disabled={busy || !efName.trim()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">{busy ? 'Adding…' : 'Add form'}</button></footer>
    </section></div>}
  </div>;
}
