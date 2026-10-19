"use client";

/** BSS Admin · Medical Form Studio.
 *  Two Gazette health forms per Indian state / UT (plus Central) — Form-VIII
 *  (factories) and Form-IX (mines). HTML (left) and its live render (right)
 *  sit side by side. Edit the HTML, save as a draft, and publish the version
 *  employers' Medical Officers will use. */

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { CheckCircle2, Code2, Download, Eye, FileText, Pencil, RotateCcw } from 'lucide-react';
import { FilterChips, SearchBox } from '@/components/employer/DashboardUI';
import { medicalApi, type StateFormSummary } from './api';
import { fmtDateTime } from './catalog';
import { ALL_SYSTEM_TOKENS, buildTokenDictionaryHtml, customTokens, previewPlaceholders } from './tokens';
import { FORM_LABEL, FORM_TYPES, documentFor, type FormType } from './formSections';
import { OSH_FORM_HTML, OSH_TEMPLATE_TITLE } from './oshFormTemplate';
import type { StateForm } from './types';
import { BTN_GHOST, BTN_PRIMARY, Field, FormFrame, INPUT, Modal, Pill, useToast } from './ui';

type RailFilter = 'unpublished' | 'draft' | 'published';

export default function MedicalFormStudio() {
  const { toast, node: toastNode } = useToast();
  const [forms, setForms] = useState<StateFormSummary[]>([]);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState('Uttar Pradesh');
  const [formType, setFormType] = useState<FormType>('VIII');
  const [form, setForm] = useState<StateForm | null>(null);
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [q, setQ] = useState('');
  const codeRef = useRef<HTMLTextAreaElement | null>(null);
  const caretRef = useRef<{ start: number; end: number } | null>(null);
  const [rail, setRail] = useState<RailFilter>('draft');
  const [customOpen, setCustomOpen] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customError, setCustomError] = useState('');
  const [bulk, setBulk] = useState<null | 'publish-all' | 'reset-all'>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const reloadList = useCallback(() => medicalApi.listForms(formType).then(setForms).then(() => setListError('')).catch(e => setListError(e.message)), [formType]);
  useEffect(() => { reloadList(); }, [reloadList]);

  // Open a state in view mode first.
  function openState(name: string) {
    if (name === selected) return;
    setForm(null); setEditing(false); setSaveState('idle'); setSelected(name);
  }
  useEffect(() => {
    let live = true;
    medicalApi.getForm(selected, formType).then(f => { if (!live) return; const html = f.html || documentFor(OSH_FORM_HTML, formType); setForm(f); setCode(html); setPreview(previewPlaceholders(html)); caretRef.current = null; }).catch(e => toast(e.message, 'red'));
    return () => { live = false; };
  }, [selected, formType, toast]);

  // Live render follows the code with a short debounce.
  useEffect(() => { const t = setTimeout(() => setPreview(previewPlaceholders(code)), 250); return () => clearTimeout(t); }, [code]);

  // While editing, changes auto-save as a draft.
  const lastSaved = useRef('');
  useEffect(() => { if (form) lastSaved.current = form.html; }, [form]);
  useEffect(() => {
    if (!editing || !form) return;
    if (code === lastSaved.current) return;
    setSaveState('saving');
    const t = setTimeout(() => {
      medicalApi.saveForm(selected, formType, code, 'draft').then(f => { lastSaved.current = f.html; setForm(f); setSaveState('saved'); reloadList(); })
        .catch(e => { setSaveState('idle'); toast(e.message, 'red'); });
    }, 900);
    return () => clearTimeout(t);
  }, [code, editing, form, formType, selected, reloadList, toast]);

  async function saveDraft() {
    if (!form) return;
    setBusy(true);
    try {
      const f = await medicalApi.saveForm(selected, formType, code, 'draft');
      setForm(f); lastSaved.current = f.html; setEditing(false); setSaveState('idle');
      toast(`${selected} Form-${formType} saved as draft.`);
      reloadList();
    } catch (e) { toast((e as Error).message, 'red'); } finally { setBusy(false); }
  }
  async function publish() {
    if (!form) return;
    setBusy(true);
    try {
      const f = await medicalApi.saveForm(selected, formType, code, 'frozen');
      setForm(f); lastSaved.current = f.html; setEditing(false); setSaveState('idle');
      toast(`${selected} Form-${formType} published as v${f.version}.`);
      reloadList();
    } catch (e) { toast((e as Error).message, 'red'); } finally { setBusy(false); }
  }
  async function reset() {
    if (!window.confirm(`Restore the ${selected} form to the original Gazette replica? Your edits to this state will be discarded.`)) return;
    setBusy(true);
    try { const f = await medicalApi.resetForm(selected, formType); const html = f.html || documentFor(OSH_FORM_HTML, formType); setForm(f); setCode(html); setPreview(previewPlaceholders(html)); setEditing(false); toast(`${selected} Form-${formType} restored to the Gazette replica.`); reloadList(); }
    catch (e) { toast((e as Error).message, 'red'); } finally { setBusy(false); }
  }

  const tokenGroups = useMemo(() => {
    const groups: Record<string, typeof ALL_SYSTEM_TOKENS> = {};
    for (const t of ALL_SYSTEM_TOKENS) (groups[t.category] ||= []).push(t);
    return groups;
  }, []);

  function insertToken(token: string) {
    const text = `{{${token}}}`;
    const el = codeRef.current;
    // Insert at the last caret position in the HTML source; if the editor has
    // never been focused, append to the end of the document.
    const fallback = code.length;
    const start = caretRef.current?.start ?? fallback;
    const end = caretRef.current?.end ?? fallback;
    setCode(c => `${c.slice(0, start)}${text}${c.slice(end)}`);
    const next = start + text.length;
    caretRef.current = { start: next, end: next };
    requestAnimationFrame(() => { el?.focus(); if (el) el.selectionStart = el.selectionEnd = next; });
    toast(`Inserted ${text} at the cursor.`);
  }

  function addCustomToken() {
    const key = customKey.trim();
    if (!/^[A-Za-z0-9_]+$/.test(key)) { setCustomError('Use letters, numbers and underscores only (e.g. item_name).'); return; }
    insertToken(`custom.${key}${customLabel.trim() ? `|${customLabel.trim()}` : ''}`);
    setCustomOpen(false); setCustomKey(''); setCustomLabel(''); setCustomError('');
  }

  function downloadDictionary() {
    const html = buildTokenDictionaryHtml(code, `${selected} · Form-${formType} — token dictionary`);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bss-medical-tokens-${selected.replace(/\s+/g, '-').toLowerCase()}-${formType}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runBulk() {
    if (!bulk) return;
    setBulkBusy(true);
    try {
      if (bulk === 'publish-all') {
        const r = await medicalApi.publishAll(formType);
        toast(`Published Form-${formType} for ${r.published} states / UTs.`);
      } else {
        await medicalApi.resetAll(formType);
        toast(`Reset Form-${formType} to the Gazette default for all states / UTs.`);
      }
      setBulk(null);
      reloadList();
      const f = await medicalApi.getForm(selected, formType);
      const html = f.html || documentFor(OSH_FORM_HTML, formType);
      setForm(f); setEditing(false); setCode(html); setPreview(previewPlaceholders(html));
    } catch (e) { toast((e as Error).message, 'red'); }
    finally { setBulkBusy(false); }
  }

  function switchType(t: FormType) {
    if (t === formType) return;
    setEditing(false);
    setForm(null);
    caretRef.current = null;
    setFormType(t);
  }

  const unpublished = forms.filter(f => f.status === 'default');
  const drafts = forms.filter(f => f.status === 'draft');
  const published = forms.filter(f => f.status === 'frozen');
  const railList = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return forms.filter(f => {
      const inBucket = rail === 'published' ? f.status === 'frozen'
        : rail === 'draft' ? f.status === 'draft' : f.status === 'default';
      return inBucket && (!needle || `${f.state} ${f.code}`.toLowerCase().includes(needle));
    });
  }, [forms, q, rail]);
  const tokenCount = useMemo(() => (code.match(/\{\{[^}]*\}\}/g) ?? []).length, [code]);
  const customCount = useMemo(() => customTokens(code).length, [code]);
  const defaultHtml = useMemo(() => documentFor(OSH_FORM_HTML, formType), [formType]);
  const isDefault = !form?.html || form.html === defaultHtml;

  return <div className="space-y-5">
    {toastNode}
    {/* Intro */}
    <div className="rounded-3xl border border-[#DBE3EF] bg-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-11 h-11 rounded-full bg-[#E45D24] text-white grid place-items-center shrink-0"><FileText size={18} /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E45D24]">BSS Admin · Medical Form Studio</p>
          <h3 className="text-base font-extrabold text-[#01183A]">State health forms for employer Medical Officers</h3>
          <p className="text-xs text-bss-text-muted">Every state has two Gazette forms — Form-VIII (factories) and Form-IX (mines) — starting from the exact replica. The form for each state moves through Unpublished → Draft → Published (one status at a time). Click Edit, then Save draft or Publish. Every Publish bumps the version and becomes the one employers&apos; Medical Officers use for the state (Central applies to Central-jurisdiction sites).</p>
        </div>
      </div>
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-bss-text-secondary">
        {['Pick state & form', 'Edit the HTML', 'Save draft or Publish'].map((s, i) => <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F6FC] border border-[#DBE3EF] px-2.5 py-1"><span className="w-4 h-4 rounded-full bg-[#01183A] text-white text-[9px] grid place-items-center">{i + 1}</span>{s}</li>)}
      </ol>
    </div>

    {/* Form-type + bulk actions (above the state list) */}
    <div className="rounded-3xl border border-[#DBE3EF] bg-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-bss-text-muted">Form</span>
        <div className="inline-flex rounded-full border border-[#DBE3EF] bg-[#F2F6FC] p-0.5">
          {FORM_TYPES.map(t => <button key={t} type="button" onClick={() => switchType(t)} className={`h-8 rounded-full px-3 text-[11px] font-bold transition-colors ${formType === t ? 'bg-[#01183A] text-white' : 'text-[#01183A] hover:bg-white'}`}>{FORM_LABEL[t]}</button>)}
        </div>
        <span className="text-[11px] text-bss-text-muted">{forms.length} states / UTs · Form-{formType}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setBulk('publish-all')} className={BTN_PRIMARY}>Publish all · Form-{formType}</button>
        <button type="button" onClick={() => setBulk('reset-all')} className={`${BTN_GHOST} !text-[#DC2626]`}>Reset all · Form-{formType}</button>
      </div>
    </div>

    <div className="grid xl:grid-cols-[250px_minmax(0,1fr)] gap-5 items-start">
      {/* State rail */}
      <aside className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden xl:sticky xl:top-[calc(var(--bss-header-height,0px)+8.5rem)]">
        <div className="p-3 border-b border-[#DBE3EF] space-y-2">
          <SearchBox value={q} onChange={setQ} placeholder="Search state or UT" />
          <FilterChips value={rail} onChange={setRail} options={[
            { value: 'unpublished', label: 'Unpublished', count: unpublished.length },
            { value: 'draft', label: 'Draft', count: drafts.length },
            { value: 'published', label: 'Published', count: published.length },
          ]} />
          <p className="px-1 text-[10px] text-bss-text-muted">{forms.length} states / UTs · Form-{formType} is Unpublished, Draft or Published per state</p>
        </div>
        {listError && <p className="p-3 text-xs text-[#DC2626]">{listError}</p>}
        <ul className="max-h-[260px] xl:max-h-[calc(100vh-var(--bss-header-height,0px)-17rem)] overflow-y-auto p-2 space-y-1">
          {railList.map(f => {
            const on = f.state === selected;
            return <li key={f.state}><button type="button" onClick={() => openState(f.state)} aria-current={on || undefined}
              className={`w-full text-left rounded-2xl px-3 py-2 flex items-center gap-2.5 transition-colors ${on ? 'bg-[#01183A] text-white' : 'hover:bg-[#F2F6FC] text-[#01183A]'}`}>
              <span className={`w-8 h-8 rounded-full grid place-items-center text-[10px] font-extrabold shrink-0 ${on ? 'bg-[#E45D24] text-white' : 'bg-[#F2F6FC] text-[#1E3A8A]'}`}>{f.code}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold truncate">{f.state}</span>
                <span className={`block text-[10px] truncate ${on ? 'text-white/60' : 'text-bss-text-muted'}`}>
                  {f.status === 'frozen' ? `Published v${f.version}` : f.status === 'draft' ? 'Draft' : 'Unpublished'}
                </span>
              </span>
              <span className={`w-2 h-2 rounded-full shrink-0 ${f.status === 'frozen' ? 'bg-[#14843C]' : f.status === 'draft' ? 'bg-[#E45D24]' : on ? 'bg-white/40' : 'bg-[#DBE3EF]'}`} />
            </button></li>;
          })}
          {forms.length > 0 && railList.length === 0 && <li className="p-4 text-center text-xs text-bss-text-muted">No states match.</li>}
        </ul>
      </aside>

      <div className="space-y-5 min-w-0">
        {/* Toolbar */}
        <div className="rounded-3xl bg-white border border-[#DBE3EF] p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-extrabold text-[#01183A]">{selected} · Form-{formType}</h3>
              {form && (editing ? <Pill tone="orange">Editing</Pill>
                : form.status === 'frozen' ? <Pill tone="green">Published · v{form.version}</Pill>
                : form.status === 'draft' ? <Pill tone="orange">Draft</Pill>
                : <Pill tone="blue">Unpublished</Pill>)}
              {isDefault ? <Pill tone="navy" dot={false}>Unedited</Pill> : <Pill tone="navy" dot={false}>Edited for {selected}</Pill>}
            </div>
            <p className="text-[11px] text-bss-text-muted mt-0.5 truncate">{OSH_TEMPLATE_TITLE}{form?.updatedAt ? ` · last change ${fmtDateTime(form.updatedAt)} by ${form.updatedBy}` : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Insert token" defaultValue="" disabled={!editing} onChange={e => { const v = e.currentTarget.value; e.currentTarget.value = ''; if (v) insertToken(v); }}
              className="h-9 rounded-full border border-[#DBE3EF] bg-white px-3 text-[11px] font-semibold text-[#01183A] disabled:opacity-50">
              <option value="">Insert token…</option>
              {Object.entries(tokenGroups).map(([cat, list]) => <optgroup key={cat} label={cat}>{list.map(t => <option key={t.token} value={t.token}>{`{{${t.token}}} · ${t.label}`}</option>)}</optgroup>)}
            </select>
            <button type="button" disabled={!editing} onClick={() => { setCustomKey(''); setCustomLabel(''); setCustomError(''); setCustomOpen(true); }} className={`${BTN_GHOST} disabled:opacity-50`}>+ Custom token</button>
            <button type="button" onClick={downloadDictionary} className={BTN_GHOST}><Download size={13} /> Token dictionary</button>
            <button type="button" onClick={reset} disabled={busy || !form || (isDefault && form.status === 'default')} className={BTN_GHOST}><RotateCcw size={13} /> Reset to default</button>
            {editing ? <>
              <button type="button" onClick={saveDraft} disabled={busy} className={BTN_GHOST}>{busy ? 'Saving…' : 'Save draft'}</button>
              <button type="button" onClick={publish} disabled={busy} className={BTN_PRIMARY}><CheckCircle2 size={13} /> {busy ? 'Publishing…' : 'Publish'}</button>
            </> : <button type="button" onClick={() => setEditing(true)} disabled={busy || !form} className={BTN_PRIMARY}><Pencil size={13} /> Edit</button>}
          </div>
        </div>

        {/* Code ⟷ render, side by side */}
        <div className="grid md:grid-cols-2 gap-4">
          <section className="rounded-3xl overflow-hidden border border-[#0B2246] bg-[#01183A] flex flex-col min-w-0">
            <header className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-white/10 text-white">
              <span className="flex items-center gap-2 text-xs font-bold"><Code2 size={14} className="text-[#E45D24]" /> HTML source</span>
              <span className="text-[10px] text-white/55 flex items-center gap-1.5">
                {editing ? (saveState === 'saving' ? 'Saving draft…' : saveState === 'saved' ? 'Draft saved' : 'Editing') : <>Click Edit to make changes</>}
              </span>
            </header>
            <CodeEditor value={code} onChange={setCode} readOnly={!editing || !form} textareaRef={codeRef} onSelectRange={(start, end) => { caretRef.current = { start, end }; }} />
            <footer className="px-4 py-2 border-t border-white/10 text-[10px] text-white/55 flex flex-wrap gap-x-3 gap-y-1">
              <span>{tokenCount} tokens ({customCount} custom) — system tokens auto-fill; custom tokens are asked in the medical form</span>
              <span>{(code.length / 1024).toFixed(1)} KB</span>
            </footer>
          </section>
          <section className="rounded-3xl overflow-hidden border border-[#DBE3EF] bg-white flex flex-col min-w-0">
            <header className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-[#DBE3EF]">
              <span className="flex items-center gap-2 text-xs font-bold text-[#01183A]"><Eye size={14} className="text-[#14843C]" /> Live render</span>
              <span className="text-[10px] text-bss-text-muted">Exactly what the employer&apos;s Medical Officer receives</span>
            </header>
            {preview ? <FormFrame html={preview} title={`${selected} Form-${formType} preview`} className="h-[72vh] min-h-[460px]" /> : <div className="h-[72vh] grid place-items-center text-xs text-bss-text-muted">Loading form…</div>}
          </section>
        </div>
      </div>
    </div>
      {bulk && (
        <Modal size="md" onClose={() => { if (!bulkBusy) setBulk(null); }}
          title={bulk === 'publish-all' ? `Publish Form-${formType} for all states` : `Reset Form-${formType} for all states`}
          footer={<><button type="button" className={BTN_GHOST} disabled={bulkBusy} onClick={() => setBulk(null)}>Cancel</button>
            <button type="button" disabled={bulkBusy} onClick={runBulk}
              className={bulk === 'reset-all' ? 'h-9 px-4 rounded-full bg-[#DC2626] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50' : BTN_PRIMARY}>
              {bulkBusy ? 'Working…' : bulk === 'publish-all' ? 'Publish all' : 'Reset all'}
            </button></>}>
          {bulk === 'publish-all'
            ? <p className="text-xs text-bss-text-secondary">This publishes Form-{formType} for <b>all {forms.length} states / UTs</b>. States with a draft publish their edits; unedited states publish the Gazette default. Each state&apos;s version is bumped.</p>
            : <div className="space-y-3">
                <p className="text-xs text-bss-text-secondary">This <b>deletes every draft and published version</b> of Form-{formType} for all {forms.length} states / UTs and restores the Gazette default (unpublished).</p>
                <p className="text-xs font-bold text-[#DC2626] bg-[#FDECEC] border border-[#F8C9C9] rounded-lg p-2">Warning: this cannot be undone.</p>
              </div>}
        </Modal>
      )}

      {customOpen && (
        <Modal size="md" onClose={() => setCustomOpen(false)} title="Insert custom token"
          subtitle="Custom tokens are asked from the Medical Officer when the exam is recorded (optional)."
          footer={<><button type="button" className={BTN_GHOST} onClick={() => setCustomOpen(false)}>Cancel</button>
            <button type="button" className={BTN_PRIMARY} onClick={addCustomToken}>Insert token</button></>}>
          <div className="space-y-3">
            <Field label="Token key (required)"><input autoFocus className={INPUT} value={customKey} placeholder="e.g. item_name" onChange={e => { setCustomKey(e.target.value); setCustomError(''); }} /></Field>
            <Field label="Prompt label (optional)"><input className={INPUT} value={customLabel} placeholder="e.g. Item Name" onChange={e => setCustomLabel(e.target.value)} /></Field>
            <p className="text-[11px] text-bss-text-muted">Inserts <code className="font-mono text-[#01183A]">{`{{custom.${customKey.trim() || 'key'}${customLabel.trim() ? `|${customLabel.trim()}` : ''}}}`}</code> at the cursor.</p>
            {customError && <p className="text-[11px] font-semibold text-[#DC2626]">{customError}</p>}
          </div>
        </Modal>
      )}
  </div>;
}

/** Lightweight code editor: monospace textarea with a synced line-number gutter. */
function CodeEditor({ value, onChange, readOnly, textareaRef, onSelectRange }: { value: string; onChange: (v: string) => void; readOnly: boolean; textareaRef?: RefObject<HTMLTextAreaElement | null>; onSelectRange?: (start: number, end: number) => void }) {
  const gutter = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => value.split('\n').length, [value]);
  return <div className="relative flex h-[72vh] min-h-[460px] font-mono text-[11.5px] leading-[1.6]">
    <div ref={gutter} aria-hidden className="select-none overflow-hidden py-3 pl-3 pr-2 text-right text-white/25 bg-black/15 min-w-[3.2rem]">
      {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
    </div>
    <textarea ref={textareaRef} value={value} readOnly={readOnly} spellCheck={false} wrap="off" aria-label="Form HTML source"
      onChange={e => onChange(e.target.value)} onScroll={e => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop; }}
      onSelect={e => onSelectRange?.(e.currentTarget.selectionStart, e.currentTarget.selectionEnd)}
      onClick={e => onSelectRange?.(e.currentTarget.selectionStart, e.currentTarget.selectionEnd)}
      onKeyUp={e => onSelectRange?.(e.currentTarget.selectionStart, e.currentTarget.selectionEnd)}
      onKeyDown={e => {
        if (e.key !== 'Tab' || readOnly) return;
        e.preventDefault();
        const t = e.currentTarget, s = t.selectionStart, end = t.selectionEnd;
        onChange(`${value.slice(0, s)}  ${value.slice(end)}`);
        requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2; });
      }}
      className={`flex-1 resize-none bg-transparent py-3 px-3 outline-none whitespace-pre overflow-auto ${readOnly ? 'text-[#C9D6EE]/70 cursor-not-allowed' : 'text-[#E8EEF9] caret-[#E45D24]'}`} />
  </div>;
}
