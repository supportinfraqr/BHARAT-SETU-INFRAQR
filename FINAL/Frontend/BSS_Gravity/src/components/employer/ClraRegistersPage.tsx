"use client";

import { useCallback, useEffect, useState } from 'react';
import { Building2, CheckCircle2, Copy, Loader2, Plus, ShieldCheck, X } from 'lucide-react';

type RegisterForm = {
  id: number; formCode: string; title: string;
  criticality?: string; templateType?: string;
  columns: string[]; adopted: boolean; isMandatory?: boolean;
};
type SiteBoard = {
  siteId: number; siteName: string; siteCode: string; state: string;
  adoptedCount: number; total: number; gated: boolean; forms: RegisterForm[];
};
type Checkpoint = { key?: string; type: string; label: string; value?: string; required?: boolean };
type ExtraForm = { id: number; state: string; name: string; mandatory: boolean; requiresDocument: boolean; frequency: string; description: string; scope: string; selected?: boolean; aiChecks?: Checkpoint[] };
type ExtraDraft = {
  adds: { name: string; frequency: string; mandatory: boolean; requiresDocument: boolean; description: string; aiChecks: Checkpoint[] }[];
  removes: number[];
  catalog: Record<number, { selected: boolean; mandatory: boolean }>;
};
const emptyDraft = (): ExtraDraft => ({ adds: [], removes: [], catalog: {} });

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
  const [drafts, setDrafts] = useState<Record<number, ExtraDraft>>({});
  const [efName, setEfName] = useState('');
  const [efMandatory, setEfMandatory] = useState(false);
  const [efFrequency, setEfFrequency] = useState('');
  const [efRequiresDocument, setEfRequiresDocument] = useState(true);
  const [efDescription, setEfDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [cpCatalog, setCpCatalog] = useState<Checkpoint[]>([]);
  const [selectedCps, setSelectedCps] = useState<Record<string, { checked: boolean; required: boolean }>>({});
  const [customLabel, setCustomLabel] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [customRequired, setCustomRequired] = useState(true);
  const [customChecks, setCustomChecks] = useState<Array<{ label: string; value?: string; required: boolean }>>([]);

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
      await flushExtras(board.siteId);
      await loadExtra();
      setDrafts(current => ({ ...current, [board.siteId]: emptyDraft() }));
      setNotice(`Saved — the CLRA registers and additional forms for ${board.siteName} are now live at this site.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The adoption could not be saved.'); }
    finally { setBusy(false); }
  }

  async function flushExtras(siteId: number) {
    const draft = drafts[siteId];
    if (!draft) return;
    const site = boards.find(item => item.siteId === siteId);
    for (const [formId, state] of Object.entries(draft.catalog)) {
      const response = await fetch('/api/employer/form-names', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ formNameId: Number(formId), siteId, selected: state.selected, mandatory: state.mandatory }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?:string };
        throw new Error(body.error ?? 'A catalog form could not be saved.');
      }
    }
    for (const add of draft.adds) {
      const response = await fetch('/api/employer/form-names', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ state: site?.state ?? '', siteId, name: add.name, mandatory: add.mandatory, frequency: add.frequency, requiresDocument: add.requiresDocument, description: add.description, aiChecks: add.aiChecks ?? [] }),
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
      setDrafts(current => ({ ...current, [board.siteId]: emptyDraft() }));
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
      setNotice(`Adopted all registers for ${boards.length} site${boards.length === 1 ? '' : 's'}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Adoption failed.'); }
    finally { setBusy(false); }
  }

  async function copyToStateSites() {
    if (!board) return;
    const sameStateSites = boards.filter(b => b.state.toLowerCase() === board.state.toLowerCase());
    const targetSites = sameStateSites.filter(b => b.siteId !== board.siteId);
    if (!targetSites.length) {
      setError(`No other sites registered in ${board.state} to copy to.`);
      return;
    }
    if (!window.confirm(`Copy register adoptions & additional forms of "${board.siteName}" to all ${targetSites.length} other site(s) in ${board.state}?`)) return;

    setBusy(true); setError(''); setNotice('');
    try {
      const activeSelectedTemplateIds = selection[board.siteId] ?? [];
      const activeDraft = siteDraft(board.siteId);

      // Copy registers and additional forms for each site in this state
      for (const target of targetSites) {
        // 1. Copy CLRA registers selection
        const resReg = await fetch('/api/employer/register-templates', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: target.siteId, templateIds: activeSelectedTemplateIds }),
        });
        if (!resReg.ok) {
          const body = await resReg.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `Registers copy failed for ${target.siteName}.`);
        }

        // 2. Copy staged or active extra catalog form selections
        for (const [formId, cState] of Object.entries(activeDraft.catalog)) {
          await fetch('/api/employer/form-names', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formNameId: Number(formId), siteId: target.siteId, selected: cState.selected, mandatory: cState.mandatory }),
          });
        }
        for (const f of extraForms.filter(ef => ef.scope === 'admin')) {
          if (!(f.id in activeDraft.catalog)) {
            const isSel = catalogIsSelected(f);
            const isMan = catalogIsMandatory(f);
            if (isSel || isMan) {
              await fetch('/api/employer/form-names', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formNameId: f.id, siteId: target.siteId, selected: isSel, mandatory: isMan }),
              });
            }
          }
        }

        // 3. Copy employer's custom extra forms to target site
        const existingEmployerForms = extraForms.filter(f => f.scope === 'employer' && !activeDraft.removes.includes(f.id));
        for (const ef of existingEmployerForms) {
          await fetch('/api/employer/form-names', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              state: board.state, siteId: target.siteId, name: ef.name,
              mandatory: ef.mandatory, frequency: ef.frequency,
              requiresDocument: ef.requiresDocument, description: ef.description,
              aiChecks: ef.aiChecks ?? [],
            }),
          });
        }
        for (const add of activeDraft.adds) {
          await fetch('/api/employer/form-names', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              state: board.state, siteId: target.siteId, name: add.name,
              mandatory: add.mandatory, frequency: add.frequency,
              requiresDocument: add.requiresDocument, description: add.description,
              aiChecks: add.aiChecks ?? [],
            }),
          });
        }
      }

      await load();
      setNotice(`Successfully copied register adoptions and forms from "${board.siteName}" to all ${targetSites.length} site(s) in ${board.state}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Copying to state sites failed.');
    } finally {
      setBusy(false);
    }
  }

  const loadExtra = useCallback(async () => {
    const board = boards.find(b => b.siteId === active);
    const state = board?.state ?? '';
    if (!state || !board) { setExtraForms([]); return; }
    try {
      const response = await fetch(`/api/employer/form-names?state=${encodeURIComponent(state)}&siteId=${board.siteId}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: ExtraForm[]; checkpoints?: Checkpoint[] };
      setExtraForms(response.ok ? (body.data ?? []) : []);
      setCpCatalog(body.checkpoints ?? []);
    } catch { setExtraForms([]); }
  }, [active, boards]);

  // reload additional forms when the active site (state) changes
  useEffect(() => { void loadExtra(); }, [loadExtra]);

  function siteDraft(siteId: number): ExtraDraft {
    return drafts[siteId] ?? emptyDraft();
  }

  function stageAddExtraForm() {
    if (!board || !activeState || !efName.trim()) return;
    const name = efName.trim();
    const draft = siteDraft(board.siteId);
    const existing = new Set([
      ...extraForms.filter(f => f.scope === 'employer' && !draft.removes.includes(f.id)).map(f => f.name.toLowerCase()),
      ...draft.adds.map(a => a.name.toLowerCase()),
    ]);
    if (existing.has(name.toLowerCase())) {
      setError('A form with this name is already added for this site.');
      return;
    }
    const aiChecks: Checkpoint[] = cpCatalog
      .filter(cp => selectedCps[cp.key ?? cp.type]?.checked)
      .map(cp => ({ key: cp.key, type: cp.type, label: cp.label, required: selectedCps[cp.key ?? cp.type]?.required ?? true }));
    for (const c of customChecks) aiChecks.push({ type: 'custom', label: c.label, value: c.value, required: c.required });
    setDrafts(current => ({
      ...current,
      [board.siteId]: {
        ...draft,
        adds: [...draft.adds, { name, frequency: efFrequency.trim(), mandatory: efMandatory, requiresDocument: efRequiresDocument, description: efDescription.trim(), aiChecks }],
      },
    }));
    setEfName(''); setEfMandatory(false); setEfFrequency(''); setEfRequiresDocument(true); setEfDescription(''); setSelectedCps({}); setCustomLabel(''); setCustomValue(''); setCustomRequired(true); setCustomChecks([]);
    setShowAddForm(false);
    setError('');
    setNotice(`“${name}” staged for ${board.siteName} — saved with the next Save adoption.`);
  }

  function cancelStagedAdd(name: string) {
    if (!board) return;
    const draft = siteDraft(board.siteId);
    setDrafts(current => ({
      ...current,
      [board.siteId]: { ...draft, adds: draft.adds.filter(a => a.name !== name) },
    }));
  }

  function stageRemoveExtraForm(id: number) {
    if (!board) return;
    const draft = siteDraft(board.siteId);
    if (draft.removes.includes(id)) return;
    setDrafts(current => ({
      ...current,
      [board.siteId]: { ...draft, removes: [...draft.removes, id] },
    }));
  }

  function stageCatalog(formNameId: number, selected: boolean, mandatory: boolean) {
    if (!board) return;
    const draft = siteDraft(board.siteId);
    setDrafts(current => ({
      ...current,
      [board.siteId]: { ...draft, catalog: { ...draft.catalog, [formNameId]: { selected, mandatory } } },
    }));
  }

  function catalogIsSelected(f: ExtraForm): boolean {
    const override = siteDraft(board?.siteId ?? -1).catalog[f.id];
    return override ? override.selected : !!f.selected;
  }

  function catalogIsMandatory(f: ExtraForm): boolean {
    const override = siteDraft(board?.siteId ?? -1).catalog[f.id];
    return override ? override.mandatory : f.mandatory;
  }

  function hasExtraChanges(siteId: number): boolean {
    const draft = siteDraft(siteId);
    return draft.adds.length > 0 || draft.removes.length > 0 || Object.keys(draft.catalog).length > 0;
  }

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Governance controls</p>
        <h1 className="text-2xl font-bold mt-1">CLRA Registers</h1>
        <p className="text-sm text-gray-500 mt-1">Adopt the CLRA registers <strong>per site</strong>. Contractors at a site can only upload once that site is adopted; use <strong>Remove adoption</strong> to revoke a site.</p>
      </div>
      <button type="button" onClick={() => void adoptAllSites()} disabled={busy || !boards.length} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5 self-start whitespace-nowrap"><CheckCircle2 size={14}/>Adopt all registers (all sites)</button>
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
            <div><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><ShieldCheck size={16} className="text-[#073B67]"/>{board.siteName} · {board.state}</h2><p className="text-xs text-gray-400 mt-0.5">Set the registers and additional forms for this site, then hit <strong>Save adoption</strong> to store both together. Contractors at the site see the ticked registers (plus every <span className="font-semibold text-red-700">Mandatory</span> one) and the forms below.</p></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => void copyToStateSites()} disabled={busy || boards.filter(b => b.state.toLowerCase() === board.state.toLowerCase()).length <= 1} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 inline-flex items-center gap-1.5" title={`Copy active site forms and register adoptions to all sites in ${board.state}`}><Copy size={13}/>Copy to all sites of this state</button>
              <button type="button" onClick={() => selectAll(board.forms)} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">Select all</button>
              <button type="button" onClick={clearOptional} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">Clear optional</button>
              <button type="button" onClick={() => void revokeSite()} disabled={busy || !board.gated} className="h-9 px-3 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">Remove adoption</button>
            </div>
          </header>

          <div className="px-5 pt-4 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between"><span>1 · CLRA registers</span><span className="text-gray-300 font-semibold">{selected.size} of {board.total} adopted</span></p>
          </div>
          {board.forms.length
            ? <div className="px-5 pb-4 overflow-x-auto"><table className="w-full text-sm text-left rounded-xl border border-gray-100 overflow-hidden">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100"><tr><th className="px-4 py-3 w-14">Adopt</th><th className="px-4 py-3">Form</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Criticality</th><th className="px-4 py-3">Columns</th></tr></thead>
                <tbody className="divide-y divide-gray-100">{board.forms.map(form => <tr key={form.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(form.id) || !!form.isMandatory} disabled={!!form.isMandatory} onChange={() => toggle(form.id)} className="accent-[#073B67] w-4 h-4 disabled:opacity-80" title={form.isMandatory ? 'Mandatory — always adopted' : ''}/></td>
                  <td className="px-4 py-3 font-mono font-semibold text-[#073B67]"><span className="inline-flex items-center gap-1.5">{form.formCode}{form.isMandatory && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700">Mandatory</span>}</span></td>
                  <td className="px-4 py-3 text-gray-700">{form.title || '—'}</td>
                  <td className="px-4 py-3">{form.criticality ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${form.criticality === 'High' ? 'bg-red-50 text-red-700' : form.criticality === 'Medium' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{form.criticality}</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{form.columns.length}</td>
                </tr>)}</tbody>
              </table></div>
            : <p className="px-5 pb-2 text-xs text-gray-400">No CLRA register templates are configured for {board.state} yet.</p>}

          <div className="border-t border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500"><span>2 · Additional forms</span>{hasExtraChanges(board.siteId) && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Changes staged</span>}</p>
              <button type="button" onClick={() => { setShowAddForm(true); setError(''); }} className="h-8 px-3 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5"><Plus size={13}/>Add form</button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Extra forms contractors submit <strong>directly</strong> (no generated register) for this site. Saved together with the registers.</p>
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Your forms ({extraForms.filter(f => f.scope === 'employer' && !siteDraft(board.siteId).removes.includes(f.id)).length + siteDraft(board.siteId).adds.length})</p>
                {(() => {
                  const draft = siteDraft(board.siteId);
                  const rows = [
                    ...extraForms.filter(f => f.scope === 'employer' && !draft.removes.includes(f.id)).map(f => ({ key: `e-${f.id}`, name: f.name, mandatory: f.mandatory, frequency: f.frequency, requiresDocument: f.requiresDocument, description: f.description, pending: false, aiCount: f.aiChecks?.length ?? 0, cancel: () => stageRemoveExtraForm(f.id) })),
                    ...draft.adds.map(a => ({ key: `n-${a.name}`, name: a.name, mandatory: a.mandatory, frequency: a.frequency, requiresDocument: a.requiresDocument, description: a.description, pending: true, aiCount: a.aiChecks?.length ?? 0, cancel: () => cancelStagedAdd(a.name) })),
                  ];
                  return rows.length
                    ? <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">{rows.map(r => <li key={r.key} className="flex items-center justify-between gap-3 px-3 py-2 text-xs"><span className="text-gray-800">{r.name}{r.pending && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">New</span>}{r.aiCount > 0 && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{r.aiCount} AI checkpoint{r.aiCount === 1 ? '' : 's'}</span>}{r.mandatory ? <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700">Mandatory</span> : <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Optional</span>}{r.frequency && <span className="ml-2 text-gray-400">{r.frequency}</span>}{r.requiresDocument === false && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Submission only</span>}{r.description && <span className="ml-2 text-gray-400" title={r.description}>{r.description}</span>}</span><button type="button" onClick={r.cancel} className="text-gray-400 hover:text-red-600" aria-label="Remove"><X size={14}/></button></li>)}</ul>
                    : <p className="text-[11px] text-gray-400">None yet — use <strong>Add form</strong>.</p>;
                })()}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Admin catalog for {activeState}</p>
                {extraForms.filter(f => f.scope === 'admin').length
                  ? <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">{extraForms.filter(f => f.scope === 'admin').map(f => <li key={`c-${f.id}`} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-xs">
                    <label className="flex items-center gap-2 text-gray-800 cursor-pointer"><input type="checkbox" checked={catalogIsSelected(f)} onChange={e => stageCatalog(f.id, e.target.checked, catalogIsMandatory(f))} className="accent-[#073B67] w-4 h-4"/>{f.name}{!f.requiresDocument && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Submission only</span>}{f.frequency && <span className="text-gray-400">{f.frequency}</span>}</label>
                    <label className={`flex items-center gap-1.5 font-semibold ${catalogIsSelected(f) ? 'text-gray-700' : 'text-gray-300'}`}><input type="checkbox" disabled={!catalogIsSelected(f)} checked={catalogIsMandatory(f)} onChange={e => stageCatalog(f.id, true, e.target.checked)} className="accent-[#b91c1c] w-4 h-4"/>Mandatory</label>
                  </li>)}</ul>
                  : <p className="text-[11px] text-gray-400">No admin catalog forms for {activeState}.</p>}
              </div>
            </div>
          </div>

          <footer className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-gray-400">{selected.size} of {board.total} register{board.total === 1 ? '' : 's'} adopted{hasExtraChanges(board.siteId) && ' · additional forms staged'} · <span className="font-semibold text-red-700">Mandatory</span> registers are always adopted and cannot be removed.</p>
            <button type="button" onClick={() => void save()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>{busy ? 'Saving…' : 'Save adoption'}</button>
          </footer>
          <p className="px-5 pb-4 text-[11px] text-gray-400 -mt-1"><strong>Save adoption</strong> stores the CLRA registers <em>and</em> the additional forms for {board.siteName} together.</p>
        </section>}
      </div>}

    {board && showAddForm && <div className="fixed inset-0 z-[70] bg-black/50 grid place-items-center p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Add additional form" className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="text-sm font-semibold">Add form — {board.siteName}</h2><button onClick={() => setShowAddForm(false)} aria-label="Close"><X size={16}/></button></header>
      <div className="p-5 space-y-3">
        <label className="block text-xs font-semibold text-gray-700">Form name *<input value={efName} onChange={e => setEfName(e.target.value)} autoFocus placeholder="e.g., Police Verification" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
        <label className="block text-xs font-semibold text-gray-700">Frequency<select value={efFrequency} onChange={e => setEfFrequency(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-2 text-sm bg-white"><option value="">—</option>{['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'One-time'].map(f => <option key={f}>{f}</option>)}</select></label>
        <label className="block text-xs font-semibold text-gray-700">Required format<select value={efRequiresDocument ? 'upload' : 'submission'} onChange={e => setEfRequiresDocument(e.target.value === 'upload')} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-2 text-sm bg-white"><option value="upload">PDF / JPEG / PNG (document upload)</option><option value="submission">Submission only (no file)</option></select></label>
        <label className="block text-xs font-semibold text-gray-700">Note<input value={efDescription} onChange={e => setEfDescription(e.target.value)} placeholder="Optional guidance shown to contractors" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700"><input type="checkbox" checked={efMandatory} onChange={e => setEfMandatory(e.target.checked)} className="accent-[#073B67] w-4 h-4"/>Mandatory</label>
        {cpCatalog.length > 0 && <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900">AI checkpoints</p>
          <p className="mt-0.5 text-[11px] text-gray-500">Tick the conditions the AI must verify when the contractor uploads it. <em>Signature/seal are matched by their printed label, not the handwriting.</em></p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {cpCatalog.map(cp => {
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
                  <span className="text-gray-800 truncate">{c.label}{c.value ? ` — expects “${c.value}”` : ''}{c.required ? '' : ' (optional)'}</span>
                  <button type="button" onClick={() => setCustomChecks(list => list.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600" aria-label="Remove checkpoint"><X size={12}/></button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 space-y-1.5">
            <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="Add a custom checkpoint the AI must verify" className="w-full h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
            <div className="flex items-center gap-2">
              <input value={customValue} onChange={e => setCustomValue(e.target.value)} placeholder="Expected text (optional)" className="flex-1 h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
              <label className="flex items-center gap-1 text-[11px] text-gray-600 whitespace-nowrap"><input type="checkbox" checked={customRequired} onChange={e => setCustomRequired(e.target.checked)} className="accent-[#073B67]"/>required</label>
              <button type="button" onClick={() => { const label = customLabel.trim(); if (!label) return; setCustomChecks(list => [...list, { label, value: customValue.trim() || undefined, required: customRequired }]); setCustomLabel(''); setCustomValue(''); setCustomRequired(true); }} disabled={!customLabel.trim()} className="h-9 px-3 rounded-lg border border-[#073B67] text-[#073B67] text-xs font-bold disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>}
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
      <footer className="sticky bottom-0 px-5 py-4 border-t border-gray-100 bg-white flex justify-end gap-2"><button type="button" onClick={() => setShowAddForm(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button><button type="button" onClick={() => stageAddExtraForm()} disabled={!efName.trim()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">Add form</button></footer>
    </section></div>}
  </div>;
}
