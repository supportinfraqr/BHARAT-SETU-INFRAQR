"use client";

/** BSS Staff · Medical Form Studio.
 *  One health form per Indian state / UT, defaulting to the Gazette replica.
 *  HTML (left) and its live render (right) sit side by side. The code is locked
 *  by default; unlock to edit (auto-saved as a draft), lock to freeze a version,
 *  then push the frozen form to the employer sites located in that state. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Code2, Eye, FileText, History, Lock, LockOpen, MapPin, RotateCcw, Send, Snowflake } from 'lucide-react';
import { FilterChips, SearchBox, TABLE_HEAD, TABLE_ROW } from '@/components/employer/DashboardUI';
import { medicalApi, type DispatchSummary, type StateFormSummary } from './api';
import { fmtDateTime, normaliseState } from './catalog';
import { formSlots } from './formEngine';
import { OSH_FORM_HTML, OSH_TEMPLATE_TITLE } from './oshFormTemplate';
import type { DirectoryEmployer, StateForm } from './types';
import { BTN_ACCENT, BTN_GHOST, BTN_PRIMARY, FormFrame, Pill, TEXTAREA, useToast } from './ui';

type RailFilter = 'all' | 'edited' | 'frozen' | 'sent';

export default function MedicalFormStudio() {
  const { toast, node: toastNode } = useToast();
  const [forms, setForms] = useState<StateFormSummary[]>([]);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState('Uttar Pradesh');
  const [form, setForm] = useState<StateForm | null>(null);
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [q, setQ] = useState('');
  const [rail, setRail] = useState<RailFilter>('all');

  const onSendError = useCallback((m: string) => toast(m, 'red'), [toast]);
  const reloadList = useCallback(() => medicalApi.listForms().then(setForms).then(() => setListError('')).catch(e => setListError(e.message)), []);
  useEffect(() => { reloadList(); }, [reloadList]);

  // Open a state: always locked first.
  function openState(name: string) {
    if (name === selected) return;
    setForm(null); setEditing(false); setSaveState('idle'); setSelected(name);
  }
  useEffect(() => {
    let live = true;
    medicalApi.getForm(selected).then(f => { if (!live) return; setForm(f); setCode(f.html); setPreview(f.html); }).catch(e => toast(e.message, 'red'));
    return () => { live = false; };
  }, [selected, toast]);

  // Live render follows the code with a short debounce.
  useEffect(() => { const t = setTimeout(() => setPreview(code), 250); return () => clearTimeout(t); }, [code]);

  // While unlocked, edits auto-save as a draft.
  const lastSaved = useRef('');
  useEffect(() => { if (form) lastSaved.current = form.html; }, [form]);
  useEffect(() => {
    if (!editing || !form || code === lastSaved.current) return;
    setSaveState('saving');
    const t = setTimeout(() => {
      medicalApi.saveForm(selected, code, 'draft').then(f => { lastSaved.current = f.html; setForm(f); setSaveState('saved'); reloadList(); })
        .catch(e => { setSaveState('idle'); toast(e.message, 'red'); });
    }, 900);
    return () => clearTimeout(t);
  }, [code, editing, form, selected, reloadList, toast]);

  async function freeze() {
    setBusy(true);
    try {
      const f = await medicalApi.saveForm(selected, code, 'frozen');
      setForm(f); lastSaved.current = f.html; setEditing(false); setSaveState('idle');
      toast(`${selected} form locked as v${f.version}.`);
      reloadList();
    } catch (e) { toast((e as Error).message, 'red'); } finally { setBusy(false); }
  }
  async function reset() {
    if (!window.confirm(`Restore the ${selected} form to the original Gazette replica? Your edits to this state will be discarded.`)) return;
    setBusy(true);
    try { const f = await medicalApi.resetForm(selected); setForm(f); setCode(f.html); setEditing(false); toast(`${selected} restored to the Gazette replica.`); reloadList(); }
    catch (e) { toast((e as Error).message, 'red'); } finally { setBusy(false); }
  }

  const railList = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return forms.filter(f => (!needle || `${f.state} ${f.code}`.toLowerCase().includes(needle))
      && (rail === 'all' || (rail === 'edited' && f.status === 'draft') || (rail === 'frozen' && f.status === 'frozen') || (rail === 'sent' && f.dispatches > 0)));
  }, [forms, q, rail]);
  const slots = useMemo(() => formSlots(preview), [preview]);
  const isDefault = code === OSH_FORM_HTML;
  const canSend = !!form && !editing && form.status === 'frozen' && code === form.html;

  return <div className="space-y-5">
    {toastNode}
    {/* Intro */}
    <div className="rounded-3xl border border-[#DBE3EF] bg-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-11 h-11 rounded-full bg-[#E45D24] text-white grid place-items-center shrink-0"><FileText size={18} /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E45D24]">BSS Staff · Medical Form Studio</p>
          <h3 className="text-base font-extrabold text-[#01183A]">State health forms for employer Medical Officers</h3>
          <p className="text-xs text-bss-text-muted">Every state starts as an exact replica of the Gazette Form-VIII / Form-IX. Unlock to edit the HTML, lock to freeze a version, then issue it to the employer&apos;s sites in that state.</p>
        </div>
      </div>
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-bss-text-secondary">
        {['Pick state', 'Unlock & edit', 'Lock = freeze', 'Send to site'].map((s, i) => <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F6FC] border border-[#DBE3EF] px-2.5 py-1"><span className="w-4 h-4 rounded-full bg-[#01183A] text-white text-[9px] grid place-items-center">{i + 1}</span>{s}</li>)}
      </ol>
    </div>

    <div className="grid xl:grid-cols-[250px_minmax(0,1fr)] gap-5 items-start">
      {/* State rail */}
      <aside className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden xl:sticky xl:top-[calc(var(--bss-header-height,0px)+8.5rem)]">
        <div className="p-3 border-b border-[#DBE3EF] space-y-2">
          <SearchBox value={q} onChange={setQ} placeholder="Search state or UT" />
          <FilterChips value={rail} onChange={setRail} options={[
            { value: 'all', label: 'All', count: forms.length },
            { value: 'edited', label: 'Draft', count: forms.filter(f => f.status === 'draft').length },
            { value: 'frozen', label: 'Locked', count: forms.filter(f => f.status === 'frozen').length },
            { value: 'sent', label: 'Sent', count: forms.filter(f => f.dispatches > 0).length },
          ]} />
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
                  {f.status === 'default' ? 'Gazette replica' : f.status === 'draft' ? 'Draft · unlocked edits' : `Locked v${f.version}`}{f.dispatches ? ` · sent to ${f.sites} site${f.sites === 1 ? '' : 's'}` : ''}
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
              <h3 className="text-lg font-extrabold text-[#01183A]">{selected}</h3>
              {form && (editing ? <Pill tone="orange">Unlocked · editing</Pill>
                : form.status === 'frozen' ? <Pill tone="green">Locked · v{form.version}</Pill>
                : form.status === 'draft' ? <Pill tone="orange">Draft not frozen</Pill>
                : <Pill tone="blue">Gazette replica · not frozen</Pill>)}
              {isDefault ? <Pill tone="navy" dot={false}>Unedited</Pill> : <Pill tone="navy" dot={false}>Edited for {selected}</Pill>}
            </div>
            <p className="text-[11px] text-bss-text-muted mt-0.5 truncate">{OSH_TEMPLATE_TITLE}{form?.updatedAt ? ` · last change ${fmtDateTime(form.updatedAt)} by ${form.updatedBy}` : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={reset} disabled={busy || !form || (isDefault && form.status === 'default')} className={BTN_GHOST}><RotateCcw size={13} /> Restore replica</button>
            <LockSwitch locked={!editing} disabled={busy || !form} onToggle={() => { if (editing) freeze(); else { setEditing(true); } }} />
            {!editing && form && form.status !== 'frozen' && <button type="button" onClick={freeze} disabled={busy} className={BTN_PRIMARY}><Snowflake size={13} /> Freeze as v{(form.version || 0) + 1}</button>}
          </div>
        </div>

        {/* Code ⟷ render, side by side */}
        <div className="grid md:grid-cols-2 gap-4">
          <section className="rounded-3xl overflow-hidden border border-[#0B2246] bg-[#01183A] flex flex-col min-w-0">
            <header className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-white/10 text-white">
              <span className="flex items-center gap-2 text-xs font-bold"><Code2 size={14} className="text-[#E45D24]" /> HTML source</span>
              <span className="text-[10px] text-white/55 flex items-center gap-1.5">
                {editing ? (saveState === 'saving' ? 'Saving draft…' : saveState === 'saved' ? 'Draft saved' : 'Editing') : <><Lock size={11} /> Read-only — unlock to edit</>}
              </span>
            </header>
            <CodeEditor value={code} onChange={setCode} readOnly={!editing || !form} />
            <footer className="px-4 py-2 border-t border-white/10 text-[10px] text-white/55 flex flex-wrap gap-x-3 gap-y-1">
              <span>{slots.length} fill-in slots (<code className="text-white/80">data-field</code>) the Medical Officer&apos;s entries flow into</span>
              <span>{(code.length / 1024).toFixed(1)} KB</span>
            </footer>
          </section>
          <section className="rounded-3xl overflow-hidden border border-[#DBE3EF] bg-white flex flex-col min-w-0">
            <header className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-[#DBE3EF]">
              <span className="flex items-center gap-2 text-xs font-bold text-[#01183A]"><Eye size={14} className="text-[#14843C]" /> Live render</span>
              <span className="text-[10px] text-bss-text-muted">Exactly what the employer&apos;s Medical Officer receives</span>
            </header>
            {preview ? <FormFrame html={preview} title={`${selected} form preview`} className="h-[72vh] min-h-[460px]" /> : <div className="h-[72vh] grid place-items-center text-xs text-bss-text-muted">Loading form…</div>}
          </section>
        </div>

        <SendPanel key={selected} state={selected} form={form} canSend={canSend} editing={editing} onSent={() => { reloadList(); toast('Form sent. The employer Medical Officer can now use it.'); }} onError={onSendError} />
      </div>
    </div>
  </div>;
}

function LockSwitch({ locked, onToggle, disabled }: { locked: boolean; onToggle: () => void; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={!locked} aria-label={locked ? 'Unlock HTML for editing' : 'Lock and freeze HTML'} onClick={onToggle} disabled={disabled}
    className={`h-9 pl-1 pr-3.5 rounded-full border inline-flex items-center gap-2 text-xs font-bold transition-colors disabled:opacity-50 ${locked ? 'bg-[#01183A] border-[#01183A] text-white' : 'bg-[#FDF0EA] border-[#F5C6B2] text-[#C94D18]'}`}>
    <span className={`relative w-12 h-7 rounded-full transition-colors ${locked ? 'bg-white/15' : 'bg-[#E45D24]'}`}>
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white grid place-items-center transition-all ${locked ? 'left-1 text-[#01183A]' : 'left-6 text-[#E45D24]'}`}>{locked ? <Lock size={11} /> : <LockOpen size={11} />}</span>
    </span>
    {locked ? 'Locked · unlock to edit' : 'Unlocked · lock to freeze'}
  </button>;
}

/** Lightweight code editor: monospace textarea with a synced line-number gutter. */
function CodeEditor({ value, onChange, readOnly }: { value: string; onChange: (v: string) => void; readOnly: boolean }) {
  const gutter = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => value.split('\n').length, [value]);
  return <div className="relative flex h-[72vh] min-h-[460px] font-mono text-[11.5px] leading-[1.6]">
    <div ref={gutter} aria-hidden className="select-none overflow-hidden py-3 pl-3 pr-2 text-right text-white/25 bg-black/15 min-w-[3.2rem]">
      {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
    </div>
    <textarea value={value} readOnly={readOnly} spellCheck={false} wrap="off" aria-label="Form HTML source"
      onChange={e => onChange(e.target.value)} onScroll={e => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop; }}
      onKeyDown={e => {
        if (e.key !== 'Tab' || readOnly) return;
        e.preventDefault();
        const t = e.currentTarget, s = t.selectionStart, end = t.selectionEnd;
        onChange(`${value.slice(0, s)}  ${value.slice(end)}`);
        requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2; });
      }}
      className={`flex-1 resize-none bg-transparent py-3 px-3 outline-none whitespace-pre overflow-auto ${readOnly ? 'text-[#C9D6EE]/70 cursor-not-allowed' : 'text-[#E8EEF9] caret-[#E45D24]'}`} />
    {readOnly && <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-sans font-semibold text-white/70"><Lock size={10} /> Locked</span>}
  </div>;
}

function SendPanel({ state, form, canSend, editing, onSent, onError }: { state: string; form: StateForm | null; canSend: boolean; editing: boolean; onSent: () => void; onError: (m: string) => void }) {
  const [employers, setEmployers] = useState<DirectoryEmployer[]>([]);
  const [employerId, setEmployerId] = useState('');
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<DispatchSummary[]>([]);

  useEffect(() => { medicalApi.listEmployers().then(list => { setEmployers(list); setEmployerId(id => id || list[0]?.id || ''); }).catch(e => onError(e.message)); }, [onError]);
  const [historyTick, setHistoryTick] = useState(0);
  useEffect(() => {
    let live = true;
    medicalApi.history(state).then(h => { if (live) setHistory(h); }).catch(() => { if (live) setHistory([]); });
    return () => { live = false; };
  }, [state, historyTick]);

  const employer = employers.find(e => e.id === employerId);
  const inState = (employer?.sites ?? []).filter(s => normaliseState(s.state) === state);
  const elsewhere = (employer?.sites ?? []).filter(s => normaliseState(s.state) !== state);
  const employersInState = employers.filter(e => e.sites.some(s => normaliseState(s.state) === state));

  async function send() {
    if (!employer) return;
    setSending(true);
    try { await medicalApi.send({ state, employerId: employer.id, siteIds, note }); setSiteIds([]); setNote(''); setHistoryTick(t => t + 1); onSent(); }
    catch (e) { onError((e as Error).message); } finally { setSending(false); }
  }

  return <section className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden">
    <header className="px-5 py-4 border-b border-[#DBE3EF] flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-[#14843C] text-white grid place-items-center"><Send size={15} /></span>
        <div><h3 className="text-sm font-bold text-[#01183A]">Issue {state} form to an employer site</h3>
          <p className="text-[11px] text-bss-text-muted">Forms are state specific — only the employer&apos;s sites in {state} can receive it. The employer sees the rendered form, never the code.</p></div>
      </div>
      {form?.status === 'frozen' && <Pill tone="green">Ready to send · v{form.version}</Pill>}
    </header>
    <div className="p-5 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-5">
      <div className="space-y-3">
        {!canSend && <div className="rounded-2xl border border-[#F5C6B2] bg-[#FDF0EA]/70 p-3 text-[11px] text-[#9A3412] flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {editing ? 'The HTML is unlocked. Lock it to freeze this version before sending.' : 'This form is not frozen yet. Use “Freeze” (or unlock → lock) to cut a version before sending.'}</div>}
        <label className="block"><span className="block text-[11px] font-semibold text-bss-text-secondary mb-1">Employer</span>
          <select value={employerId} onChange={e => { setEmployerId(e.target.value); setSiteIds([]); }} className="w-full h-10 rounded-xl border border-[#DBE3EF] bg-white px-3 text-sm text-[#01183A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15">
            {employers.map(e => { const n = e.sites.filter(s => normaliseState(s.state) === state).length; return <option key={e.id} value={e.id}>{e.name} · {n ? `${n} site${n === 1 ? '' : 's'} in ${state}` : `no site in ${state}`}</option>; })}
          </select>
          {employers.length > 0 && <span className="block mt-1 text-[10px] text-bss-text-muted">{employersInState.length} of {employers.length} employers have a site in {state}.</span>}
        </label>
        <fieldset>
          <legend className="text-[11px] font-semibold text-bss-text-secondary mb-1">Sites in {state}</legend>
          {inState.length === 0 ? <p className="rounded-2xl border border-dashed border-[#DBE3EF] p-3 text-[11px] text-bss-text-muted">{employer?.name ?? 'This employer'} has no site in {state}. Pick another employer or state.</p>
            : <ul className="space-y-1.5">{inState.map(s => {
                const on = siteIds.includes(s.id);
                return <li key={s.id}><label className={`flex items-center gap-3 rounded-2xl border px-3 py-2 cursor-pointer transition-colors ${on ? 'border-[#14843C] bg-[#EAF5EE]' : 'border-[#DBE3EF] hover:bg-[#F2F6FC]'}`}>
                  <input type="checkbox" checked={on} onChange={() => setSiteIds(ids => on ? ids.filter(x => x !== s.id) : [...ids, s.id])} className="w-4 h-4 accent-[#14843C]" />
                  <MapPin size={13} className="text-[#E45D24] shrink-0" />
                  <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-[#01183A] truncate">{s.name}</span><span className="block text-[10px] text-bss-text-muted">{s.location}, {s.state}</span></span>
                </label></li>;
              })}</ul>}
          {elsewhere.length > 0 && <p className="mt-2 text-[10px] text-bss-text-muted flex items-start gap-1"><Building2 size={11} className="mt-0.5 shrink-0" /> Not eligible (other states): {elsewhere.map(s => `${s.name} (${s.state})`).join(', ')}</p>}
        </fieldset>
        <label className="block"><span className="block text-[11px] font-semibold text-bss-text-secondary mb-1">Note to Medical Officer (optional)</span>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={TEXTAREA} placeholder="e.g. Revised as per state notification dated …" /></label>
        <button type="button" onClick={send} disabled={!canSend || !siteIds.length || sending} className={`${BTN_ACCENT} w-full justify-center h-10`}>
          <Send size={14} /> {sending ? 'Sending…' : `Send v${form?.version || '—'} to ${siteIds.length || 'selected'} site${siteIds.length === 1 ? '' : 's'}`}
        </button>
      </div>
      <div className="min-w-0">
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#01183A] flex items-center gap-1.5 mb-2"><History size={13} className="text-[#1E3A8A]" /> Send history · {state}</h4>
        <div className="rounded-2xl border border-[#DBE3EF] overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className={TABLE_HEAD}><tr><th className="px-3 py-2">Sent</th><th className="px-3 py-2">Employer · sites</th><th className="px-3 py-2 text-center">Version</th></tr></thead>
            <tbody className="divide-y divide-[#DBE3EF]">
              {history.length === 0 ? <tr><td colSpan={3} className="px-3 py-6 text-center text-bss-text-muted">Not sent to any site yet.</td></tr>
                : history.map(d => <tr key={d.id} className={TABLE_ROW}>
                  <td className="px-3 py-2 whitespace-nowrap text-bss-text-secondary">{fmtDateTime(d.sentAt)}</td>
                  <td className="px-3 py-2"><span className="font-semibold text-[#01183A]">{d.employerName}</span><span className="block text-[10px] text-bss-text-muted">{d.siteNames.join(', ')}{d.note ? ` · “${d.note}”` : ''}</span></td>
                  <td className="px-3 py-2 text-center"><span className="inline-flex items-center gap-1 rounded-full bg-[#EAF5EE] text-[#14843C] px-2 py-0.5 text-[10px] font-bold"><CheckCircle2 size={10} />v{d.version}</span></td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>;
}
