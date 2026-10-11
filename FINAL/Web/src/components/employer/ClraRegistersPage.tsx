"use client";

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Plus, ShieldCheck, X } from 'lucide-react';

type RegisterForm = {
  id: number; formCode: string; title: string;
  criticality?: string; templateType?: string;
  columns: string[]; adopted: boolean; isMandatory?: boolean;
  jurisdiction?: string; formatVariant?: string;
};
type StateBoard = {
  state: string; siteCount: number;
  adoptedCount: number; total: number; gated: boolean; forms: RegisterForm[];
};
type Checkpoint = { key?: string; type: string; label: string; value?: string; required?: boolean };
type ExtraForm = { id: number; state: string; jurisdiction?: string; formatVariant?: string; name: string; mandatory: boolean; requiresDocument: boolean; frequency: string; description: string; scope: string; selected?: boolean; aiChecks?: Checkpoint[] };
type ExtraDraft = {
  adds: { name: string; frequency: string; mandatory: boolean; requiresDocument: boolean; description: string; aiChecks: Checkpoint[] }[];
  removes: number[];
  catalog: Record<number, { selected: boolean; mandatory: boolean }>;
};
const emptyDraft = (): ExtraDraft => ({ adds: [], removes: [], catalog: {} });

function selectionFrom(boards: StateBoard[]): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const board of boards) map[board.state] = board.forms.filter(f => f.adopted).map(f => f.id);
  return map;
}

export default function ClraRegistersPage() {
  const [boards, setBoards] = useState<StateBoard[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [extraForms, setExtraForms] = useState<ExtraForm[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ExtraDraft>>({});
  const [efName, setEfName] = useState('');
  const [efMandatory, setEfMandatory] = useState(false);
  const [efFrequency, setEfFrequency] = useState('');
  const [efRequiresDocument, setEfRequiresDocument] = useState(true);
  const [efDescription, setEfDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [cpCatalog, setCpCatalog] = useState<Checkpoint[]>([]);
  const [selectedCps, setSelectedCps] = useState<Record<string, { checked: boolean; required: boolean }>>({});
  const [customLabel, setCustomLabel] = useState('');
  const [customChecks, setCustomChecks] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employer/register-templates', { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { states?:StateBoard[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'CLRA registers could not be loaded.');
      const next = body.states ?? [];
      setBoards(next);
      setSelection(selectionFrom(next));
      setActive(current => (current && next.some(board => board.state === current)) ? current : (next[0]?.state ?? null));
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'CLRA registers could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial adoption board load
  useEffect(() => { void load(); }, [load]);

  const board = boards.find(item => item.state === active) ?? null;
  const activeState = board?.state ?? '';
  const selected = new Set(board ? (selection[board.state] ?? []) : []);
  const adminCatalogForms = extraForms.filter(f => f.scope === 'admin');
  const selectedCatalogCount = adminCatalogForms.filter(f => catalogIsSelected(f)).length;

  function toggle(formId: number) {
    if (!board) return;
    if (board.forms.find(form => form.id === formId)?.isMandatory) return; // mandatory — locked
    setSelection(current => {
      const ids = new Set(current[board.state] ?? []);
      if (ids.has(formId)) ids.delete(formId); else ids.add(formId);
      return { ...current, [board.state]: [...ids] };
    });
    setNotice('');
  }

  function selectAll(forms: RegisterForm[]) {
    if (!board) return;
    setSelection(current => ({ ...current, [board.state]: forms.map(form => form.id) }));
    setNotice('');
  }

  function clearOptional() {
    if (!board) return;
    setSelection(current => ({ ...current, [board.state]: board.forms.filter(form => form.isMandatory).map(form => form.id) }));
    setNotice('');
  }

  // Bulk select/clear for the admin additional-forms catalog (adoption).
  function selectAllCatalog(selected: boolean) {
    if (!board) return;
    const forms = extraForms.filter(f => f.scope === 'admin');
    setDrafts(current => {
      const draft = current[board.state] ?? emptyDraft();
      const catalog = { ...draft.catalog };
      for (const f of forms) {
        catalog[f.id] = { selected, mandatory: selected ? catalogIsMandatory(f) : false };
      }
      return { ...current, [board.state]: { ...draft, catalog } };
    });
    setNotice('');
  }

  async function save() {
    if (!board) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/register-templates', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ state: board.state, templateIds: selection[board.state] ?? [] }),
      });
      const body = await response.json().catch(() => ({})) as { states?:StateBoard[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The CLRA register adoption could not be saved.');
      const next = body.states ?? boards;
      setBoards(next);
      setSelection(selectionFrom(next));
      await flushExtras(board.state);
      await loadExtra();
      setDrafts(current => ({ ...current, [board.state]: emptyDraft() }));
      setNotice(`Saved — the CLRA registers and additional forms for ${board.state} are now live at all its sites.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The adoption could not be saved.'); }
    finally { setBusy(false); }
  }

  async function flushExtras(state: string) {
    const draft = drafts[state];
    if (!draft) return;
    for (const [formId, cState] of Object.entries(draft.catalog)) {
      const response = await fetch('/api/employer/form-names', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ formNameId: Number(formId), state, selected: cState.selected, mandatory: cState.mandatory }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?:string };
        throw new Error(body.error ?? 'A catalog form could not be saved.');
      }
    }
    for (const add of draft.adds) {
      const response = await fetch('/api/employer/form-names', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ state, name: add.name, mandatory: add.mandatory, frequency: add.frequency, requiresDocument: add.requiresDocument, description: add.description, aiChecks: add.aiChecks ?? [] }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?:string };
        throw new Error(body.error ?? `The form “${add.name}” could not be added.`);
      }
    }
    for (const id of draft.removes) {
      const response = await fetch(`/api/employer/form-names/${id}`, { method:'DELETE' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?:string };
        throw new Error(body.error ?? 'A form could not be removed.');
      }
    }
  }

  async function revokeState() {
    if (!board) return;
    if (!window.confirm(`Remove the adopted forms for ${board.state}? Contractors at every site in ${board.state} won't be able to upload CLRA registers until you adopt again.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/register-templates', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ state: board.state, revoke: true }),
      });
      const body = await response.json().catch(() => ({})) as { states?:StateBoard[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The adoption could not be removed.');
      const next = body.states ?? boards;
      setBoards(next);
      setSelection(current => ({ ...current, [board.state]: [] }));
      setDrafts(current => ({ ...current, [board.state]: emptyDraft() }));
      setNotice(`Removed the CLRA adoption for ${board.state}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The adoption could not be removed.'); }
    finally { setBusy(false); }
  }

  async function adoptAllForState() {
    if (!board) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/register-templates', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ state: board.state, templateIds: board.forms.map(f => f.id) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?:string };
        throw new Error(body.error ?? `Adoption failed for ${board.state}.`);
      }
      await load();
      setNotice(`Adopted all registers for ${board.state} — live at all ${board.siteCount} site${board.siteCount === 1 ? '' : 's'}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Adoption failed.'); }
    finally { setBusy(false); }
  }

  const loadExtra = useCallback(async () => {
    const board = boards.find(b => b.state === active);
    const state = board?.state ?? '';
    if (!state) { setExtraForms([]); return; }
    try {
      const response = await fetch(`/api/employer/form-names?state=${encodeURIComponent(state)}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: ExtraForm[]; checkpoints?: Checkpoint[] };
      setExtraForms(response.ok ? (body.data ?? []) : []);
      setCpCatalog(body.checkpoints ?? []);
    } catch { setExtraForms([]); }
  }, [active, boards]);

  // reload additional forms when the active state changes
  useEffect(() => { void loadExtra(); }, [loadExtra]);

  function stateDraft(state: string): ExtraDraft {
    return drafts[state] ?? emptyDraft();
  }

  function stageAddExtraForm() {
    if (!board || !activeState || !efName.trim()) return;
    const name = efName.trim();
    const draft = stateDraft(board.state);
    const existing = new Set([
      ...extraForms.filter(f => f.scope === 'employer' && !draft.removes.includes(f.id)).map(f => f.name.toLowerCase()),
      ...draft.adds.map(a => a.name.toLowerCase()),
    ]);
    if (existing.has(name.toLowerCase())) {
      setError('A form with this name is already added for this state.');
      return;
    }
    const aiChecks: Checkpoint[] = cpCatalog
      .filter(cp => selectedCps[cp.key ?? cp.type]?.checked)
      .map(cp => ({ key: cp.key, type: cp.type, label: cp.label, required: selectedCps[cp.key ?? cp.type]?.required ?? true }));
    for (const label of customChecks) aiChecks.push({ type: 'custom', label, required: true });
    setDrafts(current => ({
      ...current,
      [board.state]: {
        ...draft,
        adds: [...draft.adds, { name, frequency: efFrequency.trim(), mandatory: efMandatory, requiresDocument: efRequiresDocument, description: efDescription.trim(), aiChecks }],
      },
    }));
    setEfName(''); setEfMandatory(false); setEfFrequency(''); setEfRequiresDocument(true); setEfDescription(''); setSelectedCps({}); setCustomLabel(''); setCustomChecks([]);
    setShowAddForm(false);
    setError('');
    setNotice(`“${name}” staged for ${board.state} — saved with the next Save adoption.`);
  }

  function cancelStagedAdd(name: string) {
    if (!board) return;
    const draft = stateDraft(board.state);
    setDrafts(current => ({
      ...current,
      [board.state]: { ...draft, adds: draft.adds.filter(a => a.name !== name) },
    }));
  }

  function stageRemoveExtraForm(id: number) {
    if (!board) return;
    const draft = stateDraft(board.state);
    if (draft.removes.includes(id)) return;
    setDrafts(current => ({
      ...current,
      [board.state]: { ...draft, removes: [...draft.removes, id] },
    }));
  }

  function stageCatalog(formNameId: number, selected: boolean, mandatory: boolean) {
    if (!board) return;
    const draft = stateDraft(board.state);
    setDrafts(current => ({
      ...current,
      [board.state]: { ...draft, catalog: { ...draft.catalog, [formNameId]: { selected, mandatory } } },
    }));
  }

  function catalogIsSelected(f: ExtraForm): boolean {
    const override = stateDraft(board?.state ?? '').catalog[f.id];
    return override ? override.selected : !!f.selected;
  }

  function catalogIsMandatory(f: ExtraForm): boolean {
    const override = stateDraft(board?.state ?? '').catalog[f.id];
    return override ? override.mandatory : f.mandatory;
  }

  function hasExtraChanges(state: string): boolean {
    const draft = stateDraft(state);
    return draft.adds.length > 0 || draft.removes.length > 0 || Object.keys(draft.catalog).length > 0;
  }

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Governance controls</p>
        <h1 className="text-2xl font-bold mt-1">CLRA Registers</h1>
        <p className="text-sm text-bss-text-muted mt-1">Adopt the CLRA registers <strong>per state</strong>. Once a state is adopted, contractors at <strong>every site in that state</strong> can upload; use <strong>Remove adoption</strong> to revoke the state.</p>
      </div>
      <button type="button" onClick={() => void adoptAllForState()} disabled={busy || !board} className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5 self-start whitespace-nowrap"><CheckCircle2 size={14}/>Adopt all registers{board ? ` (${board.state})` : ''}</button>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-bss-text-muted py-10"><Loader2 size={16} className="animate-spin"/>Loading CLRA registers…</p>
      : !boards.length ? <div className="bss-card rounded-2xl p-8 text-center">
          <ShieldCheck size={28} className="mx-auto text-bss-text-muted"/>
          <p className="text-sm font-semibold text-bss-text-primary mt-3">No sites available yet</p>
          <p className="text-xs text-bss-text-muted mt-1">States appear here once you have a registered site with a state. Add a site to adopt CLRA registers.</p>
        </div>
      : <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        <section className="bss-card rounded-2xl overflow-hidden h-fit">
          <header className="px-5 py-4 border-b border-bss-border"><h2 className="text-sm font-semibold text-bss-text-primary">Your states</h2><p className="text-xs text-bss-text-muted mt-0.5">Adoption is configured per state.</p></header>
          <div className="divide-y divide-bss-border">{boards.map(item => <button key={item.state} type="button" onClick={() => setActive(item.state)} className={`w-full text-left px-5 py-3 flex items-center justify-between gap-3 ${item.state === active ? 'bg-[#01183A]/5' : 'hover:bg-bss-bg'}`}>
            <div><p className={`text-sm font-semibold ${item.state === active ? 'text-[#01183A]' : 'text-bss-text-primary'}`}>{item.state}</p><p className="text-[11px] text-bss-text-muted">{item.siteCount} site{item.siteCount === 1 ? '' : 's'} · {item.adoptedCount} of {item.total} adopted</p></div>
            {item.gated ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-soft-green text-bss-green">Gated</span> : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-bg text-bss-text-muted">Open</span>}
          </button>)}</div>
        </section>

        {board && <section className="bss-card rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-bss-border flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-bss-text-primary flex items-center gap-2"><ShieldCheck size={16} className="text-[#01183A]"/>{board.state}</h2><p className="text-xs text-bss-text-muted mt-0.5">Set the registers and additional forms for this state, then hit <strong>Save adoption</strong> to store both together. Contractors at every site in {board.state} see the ticked registers (plus every <span className="font-semibold text-bss-error">Mandatory</span> one) and the forms below.</p></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => selectAll(board.forms)} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold text-bss-text-secondary">Select all</button>
              <button type="button" onClick={clearOptional} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold text-bss-text-secondary">Clear all</button>
              <button type="button" onClick={() => void revokeState()} disabled={busy || !board.gated} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold text-bss-error hover:bg-bss-soft-orange disabled:opacity-40">Remove adoption</button>
            </div>
          </header>

          <div className="px-5 pt-4 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-bss-text-muted flex items-center justify-between"><span>1 · CLRA registers</span><span className="text-bss-text-muted font-semibold">{selected.size} of {board.total} adopted</span></p>
          </div>
          {board.forms.length
            ? <div className="px-5 pb-4 overflow-x-auto"><table className="w-full text-sm text-left rounded-xl border border-bss-border overflow-hidden">
                <thead className="bg-bss-bg text-xs text-bss-text-muted font-semibold border-b border-bss-border"><tr><th className="px-4 py-3 w-14">Adopt</th><th className="px-4 py-3">Form</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Criticality</th><th className="px-4 py-3">Columns</th></tr></thead>
                <tbody className="divide-y divide-bss-border">{board.forms.map(form => <tr key={form.id} className="hover:bg-bss-bg">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(form.id) || !!form.isMandatory} disabled={!!form.isMandatory} onChange={() => toggle(form.id)} className="accent-[#01183A] w-4 h-4 disabled:opacity-80" title={form.isMandatory ? 'Mandatory — always adopted' : ''}/></td>
                  <td className="px-4 py-3 font-mono font-semibold text-[#01183A]"><span className="inline-flex items-center gap-1.5">{form.formCode}{form.isMandatory && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-soft-orange text-bss-error">Mandatory</span>}{form.jurisdiction === 'central' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-blue-tint text-bss-interactive-blue border border-bss-border" title="Central — applies to every state">Central</span>}{form.formatVariant === 'old' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-soft-orange text-bss-orange">Old format</span>}</span></td>
                  <td className="px-4 py-3 text-bss-text-primary">{form.title || '—'}</td>
                  <td className="px-4 py-3">{form.criticality ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${form.criticality === 'High' ? 'bg-bss-soft-orange text-bss-error' : form.criticality === 'Medium' ? 'bg-bss-soft-orange text-bss-orange' : 'bg-bss-bg text-bss-text-secondary'}`}>{form.criticality}</span> : <span className="text-bss-text-muted">—</span>}</td>
                  <td className="px-4 py-3 text-bss-text-muted">{form.columns.length}</td>
                </tr>)}</tbody>
              </table></div>
            : <p className="px-5 pb-2 text-xs text-bss-text-muted">No CLRA register templates are configured for {board.state} yet.</p>}

          <div className="border-t border-bss-border px-5 py-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-bss-text-muted"><span>2 · Additional forms</span>{hasExtraChanges(board.state) && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-blue-tint text-bss-interactive-blue">Changes staged</span>}</p>
              <button type="button" onClick={() => { setShowAddForm(true); setError(''); }} className="h-8 px-3 rounded-lg bg-[#01183A] text-white text-xs font-bold inline-flex items-center gap-1.5"><Plus size={13}/>Add form</button>
            </div>
            <p className="text-xs text-bss-text-muted mb-4">Extra forms contractors submit <strong>directly</strong> (no generated register) at every site in {board.state}. Saved together with the registers.</p>
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Your forms ({extraForms.filter(f => f.scope === 'employer' && !stateDraft(board.state).removes.includes(f.id)).length + stateDraft(board.state).adds.length})</p>
                {(() => {
                  const draft = stateDraft(board.state);
                  const rows = [
                    ...extraForms.filter(f => f.scope === 'employer' && !draft.removes.includes(f.id)).map(f => ({ key: `e-${f.id}`, name: f.name, mandatory: f.mandatory, frequency: f.frequency, requiresDocument: f.requiresDocument, description: f.description, pending: false, aiCount: f.aiChecks?.length ?? 0, cancel: () => stageRemoveExtraForm(f.id) })),
                    ...draft.adds.map(a => ({ key: `n-${a.name}`, name: a.name, mandatory: a.mandatory, frequency: a.frequency, requiresDocument: a.requiresDocument, description: a.description, pending: true, aiCount: a.aiChecks?.length ?? 0, cancel: () => cancelStagedAdd(a.name) })),
                  ];
                  return rows.length
                    ? <ul className="divide-y divide-bss-border rounded-xl border border-bss-border overflow-hidden">{rows.map(r => <li key={r.key} className="flex items-center justify-between gap-3 px-3 py-2 text-xs"><span className="text-bss-text-primary">{r.name}{r.pending && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-blue-tint text-bss-interactive-blue">New</span>}{r.aiCount > 0 && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-bss-blue-tint text-bss-interactive-blue">{r.aiCount} AI checkpoint{r.aiCount === 1 ? '' : 's'}</span>}{r.mandatory ? <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-soft-orange text-bss-error">Mandatory</span> : <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-bg text-bss-text-secondary">Optional</span>}{r.frequency && <span className="ml-2 text-bss-text-muted">{r.frequency}</span>}{r.requiresDocument === false && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-bg text-bss-text-secondary">Submission only</span>}{r.description && <span className="ml-2 text-bss-text-muted" title={r.description}>{r.description}</span>}</span><button type="button" onClick={r.cancel} className="text-bss-text-muted hover:text-bss-error" aria-label="Remove"><X size={14}/></button></li>)}</ul>
                    : <p className="text-[11px] text-bss-text-muted">None yet — use <strong>Add form</strong>.</p>;
                })()}
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-bss-text-muted">Admin catalog for {activeState}{adminCatalogForms.length > 0 && <span className="ml-2 font-semibold normal-case tracking-normal text-bss-text-muted">{selectedCatalogCount} of {adminCatalogForms.length}</span>}</p>
                  {adminCatalogForms.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => selectAllCatalog(true)} className="text-[11px] font-bold text-[#01183A] hover:underline">Select all</button>
                      <button type="button" onClick={() => selectAllCatalog(false)} className="text-[11px] font-bold text-bss-text-muted hover:underline">Clear all</button>
                    </div>
                  )}
                </div>
                {extraForms.filter(f => f.scope === 'admin').length
                  ? <ul className="divide-y divide-bss-border rounded-xl border border-bss-border overflow-hidden">{extraForms.filter(f => f.scope === 'admin').map(f => <li key={`c-${f.id}`} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-xs">
                    <label className="flex items-center gap-2 text-bss-text-primary cursor-pointer"><input type="checkbox" checked={catalogIsSelected(f)} onChange={e => stageCatalog(f.id, e.target.checked, catalogIsMandatory(f))} className="accent-[#01183A] w-4 h-4"/>{f.name}{f.jurisdiction === 'central' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-blue-tint text-bss-interactive-blue border border-bss-border" title="Central — applies to every state">Central</span>}{f.formatVariant === 'old' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-soft-orange text-bss-orange">Old format</span>}{!f.requiresDocument && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-bg text-bss-text-secondary">Submission only</span>}{f.frequency && <span className="text-bss-text-muted">{f.frequency}</span>}</label>
                    <label className={`flex items-center gap-1.5 font-semibold ${catalogIsSelected(f) ? 'text-bss-text-primary' : 'text-bss-text-muted'}`}><input type="checkbox" disabled={!catalogIsSelected(f)} checked={catalogIsMandatory(f)} onChange={e => stageCatalog(f.id, true, e.target.checked)} className="accent-[#C94D18] w-4 h-4"/>Mandatory</label>
                  </li>)}</ul>
                  : <p className="text-[11px] text-bss-text-muted">No admin catalog forms for {activeState}.</p>}
              </div>
            </div>
          </div>

          <footer className="px-5 py-4 border-t border-bss-border flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-bss-text-muted">{selected.size} of {board.total} register{board.total === 1 ? '' : 's'} adopted{hasExtraChanges(board.state) && ' · additional forms staged'} · <span className="font-semibold text-bss-error">Mandatory</span> registers are always adopted and cannot be removed.</p>
            <button type="button" onClick={() => void save()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>{busy ? 'Saving…' : 'Save adoption'}</button>
          </footer>
          <p className="px-5 pb-4 text-[11px] text-bss-text-muted -mt-1"><strong>Save adoption</strong> stores the CLRA registers <em>and</em> the additional forms for {board.state} together.</p>
        </section>}
      </div>}

    {board && showAddForm && <div className="fixed inset-0 z-[70] bg-black/50 grid place-items-center p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Add additional form" className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
      <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between"><h2 className="text-sm font-semibold">Add form — {board.state}</h2><button onClick={() => setShowAddForm(false)} aria-label="Close"><X size={16}/></button></header>
      <div className="p-5 space-y-3">
        <label className="block text-xs font-semibold text-bss-text-primary">Form name *<input value={efName} onChange={e => setEfName(e.target.value)} autoFocus placeholder="e.g., Police Verification" className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm"/></label>
        <label className="block text-xs font-semibold text-bss-text-primary">Frequency<select value={efFrequency} onChange={e => setEfFrequency(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-2 text-sm bg-white"><option value="">—</option>{['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'One-time'].map(f => <option key={f}>{f}</option>)}</select></label>
        <label className="block text-xs font-semibold text-bss-text-primary">Required format<select value={efRequiresDocument ? 'upload' : 'submission'} onChange={e => setEfRequiresDocument(e.target.value === 'upload')} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-2 text-sm bg-white"><option value="upload">PDF / JPEG / PNG (document upload)</option><option value="submission">Submission only (no file)</option></select></label>
        <label className="block text-xs font-semibold text-bss-text-primary">Note<input value={efDescription} onChange={e => setEfDescription(e.target.value)} placeholder="Optional guidance shown to contractors" className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm"/></label>
        <label className="flex items-center gap-2 text-xs font-semibold text-bss-text-primary"><input type="checkbox" checked={efMandatory} onChange={e => setEfMandatory(e.target.checked)} className="accent-[#01183A] w-4 h-4"/>Mandatory</label>
        {cpCatalog.length > 0 && <div className="rounded-lg border border-bss-border bg-bss-blue-tint/50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-bss-text-primary">AI checkpoints</p>
          <p className="mt-0.5 text-[11px] text-bss-text-muted">Tick the conditions the AI must verify when the contractor uploads it. <em>Signature/seal are matched by their printed label, not the handwriting.</em></p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {cpCatalog.map(cp => {
              const key = cp.key ?? cp.type;
              const sel = selectedCps[key];
              return <div key={key} className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1.5 flex-1 min-w-0">
                  <input type="checkbox" checked={!!sel?.checked} onChange={e => setSelectedCps(s => ({ ...s, [key]: { checked: e.target.checked, required: s[key]?.required ?? true } }))} className="accent-[#01183A]"/>
                  <span className="truncate text-bss-text-primary">{cp.label}</span>
                </label>
                {sel?.checked && <label className="flex items-center gap-1 text-[10px] text-bss-text-muted whitespace-nowrap"><input type="checkbox" checked={sel.required} onChange={e => setSelectedCps(s => ({ ...s, [key]: { checked: true, required: e.target.checked } }))} className="accent-[#01183A]"/>required</label>}
              </div>;
            })}
          </div>
          {customChecks.length > 0 && (
            <ul className="mt-2 space-y-1">
              {customChecks.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-bss-border bg-white px-2 py-1 text-[11px]">
                  <span className="text-bss-text-primary truncate">{c}</span>
                  <button type="button" onClick={() => setCustomChecks(list => list.filter((_, j) => j !== i))} className="text-bss-text-muted hover:text-bss-error" aria-label="Remove checkpoint"><X size={12}/></button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-center gap-2">
            <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const label = customLabel.trim(); if (label) { setCustomChecks(list => [...list, label]); setCustomLabel(''); } } }} placeholder="Add a custom checkpoint the AI must verify (free text)" className="flex-1 h-9 border border-bss-border rounded-lg px-2 text-xs"/>
            <button type="button" onClick={() => { const label = customLabel.trim(); if (!label) return; setCustomChecks(list => [...list, label]); setCustomLabel(''); }} disabled={!customLabel.trim()} className="h-9 px-3 rounded-lg border border-[#01183A] text-[#01183A] text-xs font-bold disabled:opacity-50">Add</button>
          </div>
        </div>}
        {error && <p className="text-xs text-bss-error">{error}</p>}
      </div>
      <footer className="sticky bottom-0 px-5 py-4 border-t border-bss-border bg-white flex justify-end gap-2"><button type="button" onClick={() => setShowAddForm(false)} className="h-10 px-4 rounded-lg border border-bss-border text-xs font-bold text-bss-text-secondary">Cancel</button><button type="button" onClick={() => stageAddExtraForm()} disabled={!efName.trim()} className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold disabled:opacity-60">Add form</button></footer>
    </section></div>}
  </div>;
}
