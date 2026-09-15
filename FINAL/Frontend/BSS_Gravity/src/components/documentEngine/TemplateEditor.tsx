"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Eye, EyeOff, Lock, Plus, Save, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import type { OwnerScope, TemplateConfig, TemplateSection, SignatureRole, DocumentType, TemplateVersionRecord } from '@/lib/documentEngine/types';
import { DOCUMENT_TYPES, isGatePassType } from '@/lib/documentEngine/types';
import { templateService, makeDefaultTemplate } from '@/lib/documentEngine/services';
import { renderDocumentHtml } from '@/lib/documentEngine/render';
import { FieldTokenPicker } from './FieldTokenPicker';
import { TemplateStatusBadge, btnSecondary, inputCls, textareaCls } from './DocPrimitives';

const SIGNATURE_ROLES: SignatureRole[] = ['Worker', 'Contractor', 'Principal Employer', 'HOD', 'HR Head', 'CSO', 'Authorized Signatory', 'Site In-charge'];

const SECTION_TYPES: Array<{ id: TemplateSection['type']; label: string }> = [
  { id: 'heading', label: 'Heading' },
  { id: 'subheading', label: 'Sub-heading' },
  { id: 'paragraph', label: 'Paragraph text' },
  { id: 'divider', label: 'Divider' },
];

export default function TemplateEditor({
  owner,
  record,
  documentType,
  onClose,
  onSaved,
  onRefresh,
}: {
  owner: OwnerScope;
  record: TemplateVersionRecord | null;
  documentType: DocumentType;
  onClose: () => void;
  onSaved: () => void;
  onRefresh?: () => void;
}) {
  const [template, setTemplate] = useState<TemplateConfig>(() => {
    const base = record?.template ?? makeDefaultTemplate(owner, documentType, 'Me');
    return { ...base, ownerType: owner.ownerType, ownerId: owner.ownerId, ownerName: owner.ownerName };
  });
  // The version currently being edited — starts at the opened record and follows
  // any Draft created by "Save Draft", so later saves update it in place.
  const [currentId, setCurrentId] = useState<string | null>(record?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(template.sections.find(section => section.editable)?.id ?? null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const caretRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // Gate passes are generated dynamically from BSS data — only appearance is editable.
  const gatePass = isGatePassType(documentType);

  const orderedSections = useMemo(() => [...template.sections].sort((a, b) => a.order - b.order), [template.sections]);
  const selected = orderedSections.find(section => section.id === selectedId) ?? null;

  // debounced preview html
  const [previewHtml, setPreviewHtml] = useState('');
  const jsonKey = JSON.stringify(template.sections) + template.styles.theme + template.styles.fontSize + template.styles.fontFamily + template.styles.headingColor + template.styles.showBrandHeader + template.styles.brandHeaderText + template.styles.footerText + template.styles.showLogo;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreviewHtml(renderDocumentHtml({ template: { ...template }, tokens: {} }));
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonKey]);

  function patchSection(id: string, patch: Partial<TemplateSection>) {
    setTemplate(current => ({ ...current, sections: current.sections.map(section => section.id === id ? { ...section, ...patch } : section) }));
  }

  function moveSection(id: string, direction: -1 | 1) {
    setTemplate(current => {
      const list = [...current.sections].sort((a, b) => a.order - b.order);
      const index = list.findIndex(section => section.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= list.length) return current;
      const copy = [...list];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return { ...current, sections: copy.map((section, order) => ({ ...section, order })) };
    });
  }

  function addSection(type: TemplateSection['type']) {
    setTemplate(current => {
      const id = `sec-${Date.now()}`;
      const section: TemplateSection = {
        id,
        type,
        title: type === 'heading' ? 'Heading' : type === 'subheading' ? 'Sub-heading' : type === 'divider' ? 'Divider' : 'Paragraph',
        content: type === 'heading' ? 'DOCUMENT TITLE' : type === 'subheading' ? 'SECTION HEADING' : type === 'divider' ? '' : 'Enter reusable wording here…',
        fields: [],
        editable: type !== 'divider',
        locked: false,
        visible: true,
        order: Math.max(0, ...current.sections.map(section => section.order)) + 1,
      };
      return { ...current, sections: [...current.sections, section] };
    });
  }

  function removeSection(id: string) {
    setTemplate(current => ({ ...current, sections: current.sections.filter(section => section.id !== id) }));
    setSelectedId(null);
  }

  function insertToken(tokenKey: string) {
    const id = selectedId ?? template.sections.find(section => section.editable)?.id;
    if (!id) return;
    const token = `{{${tokenKey}}}`;
    setTemplate(current => {
      const target = current.sections.find(section => section.id === id);
      let content = target?.content ?? '';
      const { start, end } = caretRef.current;
      content = content.slice(0, start) + token + content.slice(end);
      return { ...current, sections: current.sections.map(section => section.id === id ? { ...section, content, fields: Array.from(new Set([...(section.fields ?? []), tokenKey])) } : section) };
    });
    window.setTimeout(() => {
      const field = caretRef.current;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(field.end + token.length, field.end + token.length);
    }, 0);
  }

  function persistVersion(persist: TemplateConfig, note: string): TemplateVersionRecord | null {
    setBusy(true);
    try {
      const by = 'Me';
      const current = currentId ? templateService.getById(currentId) : null;
      if (current && !current.active && current.template.status !== 'Active') {
        // Editing an existing Draft — update in place (no new version, no skipped numbers).
        const next = templateService.updateDraft(owner, current.id, persist, by);
        if (next) { setCurrentId(next.id); setTemplate(next.template); setNotice(`Saved as ${next.template.version} (Draft).`); }
        return next ?? null;
      }
      // New template, or editing the Active version — create a Draft vN+1.
      const lineageId = current?.templateId ?? record?.templateId ?? null;
      const templateId = current?.template.id ?? record?.template.id ?? persist.id;
      const created = templateService.saveTemplate(owner, documentType, lineageId, { ...persist, id: templateId }, by, note);
      setCurrentId(created.record.id);
      setTemplate(created.record.template);
      setNotice(`Created ${created.record.template.version} (Draft).`);
      return created.record;
    } finally {
      setBusy(false);
    }
  }

  function saveDraft() {
    const stored = persistVersion({ ...template, status: 'Draft' as const }, 'Saved draft');
    // Keep the designer open and continue editing the same draft.
    if (stored) onRefresh?.();
  }

  function finalize() {
    setBusy(true);
    try {
      const persist = { ...template, status: 'Active' as const };
      const current = currentId ? templateService.getById(currentId) : null;
      let stored: TemplateVersionRecord | null = null;
      if (current && !current.active && current.template.status !== 'Active') {
        // Promote the Draft currently open — do not fork another version.
        stored = templateService.updateDraft(owner, current.id, persist, 'Me') ?? null;
      } else {
        const lineageId = current?.templateId ?? record?.templateId ?? null;
        const templateId = current?.template.id ?? record?.template.id ?? persist.id;
        stored = templateService.saveTemplate(owner, documentType, lineageId, { ...persist, id: templateId }, 'Me', 'Template finalised').record;
      }
      if (!stored) return;
      templateService.setStatus(stored.id, 'Active', 'Me', 'Finalized');
      templateService.activate(owner, stored.templateId, stored.id, 'Me');
      setCurrentId(stored.id);
      setTemplate(stored.template);
      setNotice(`${template.name} finalized and set ACTIVE — issued documents keep their own version history.`);
      window.setTimeout(onSaved, 600);
    } finally {
      setBusy(false);
    }
  }

  const canActivate = record ? template.status !== 'Active' : true;

  return (
    <div className="fixed inset-0 z-[130] bg-[#0F172A]/60 flex flex-col p-0 sm:p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Template designer" className="flex-1 min-h-0 w-full max-w-[1500px] mx-auto bg-[#F5F5F7] rounded-none sm:rounded-2xl overflow-hidden flex flex-col">
        {/* header */}
        <header className="px-4 sm:px-5 py-3 border-b border-gray-200 bg-white flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">{gatePass
                ? <span className="text-base font-semibold px-2 py-1">{template.name}</span>
                : <input value={template.name} onChange={event => setTemplate(current => ({ ...current, name: event.target.value }))} className="text-base font-semibold w-64 max-w-full border border-transparent hover:border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"/>}
                <TemplateStatusBadge status={template.status}/><span className="text-[11px] font-mono text-gray-400">{template.version}</span><span className="text-[11px] text-gray-500 hidden sm:inline">· {DOCUMENT_TYPES.find(item => item.id === documentType)?.short}</span></div>
              <p className="text-[11px] text-gray-400 mt-0.5 px-2">Template owner: {owner.ownerName} ({owner.ownerType})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className={btnSecondary} onClick={onClose}>Cancel</button>
            <button className={btnSecondary} onClick={saveDraft} disabled={busy}><Save size={15}/>Save Draft</button>
            <button className="h-10 px-4 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50" onClick={finalize} disabled={busy || !canActivate}><ShieldCheck size={15}/>Finalize &amp; Activate</button>
          </div>
        </header>

        {notice && <p className="px-5 pt-3 text-xs text-green-700 bg-green-50">{notice}</p>}

        {/* 3-pane body */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* LEFT — sections (hidden for gate passes: layout & wording are fixed) */}
          {!gatePass && <aside className="w-full lg:w-60 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white p-3 overflow-y-auto shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1"><Sparkles size={11}/>Document Sections</p>
            <ul className="space-y-1">
              {orderedSections.map(section => (
                <li key={section.id}>
                  <button onClick={() => { setSelectedId(section.id); }} className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs flex items-center gap-2 ${selectedId === section.id ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}>
                    <span className={`w-5 h-5 rounded grid place-items-center shrink-0 ${section.type === 'heading' ? 'bg-[#0F172A] text-white' : section.type === 'subheading' ? 'bg-[#073B67] text-white' : 'bg-gray-100 text-gray-500'}`}>{section.type === 'photo' ? <><EyeOff size={11}/></> : section.type === 'logo' ? <Lock size={11}/> : <ChevronRight size={11}/>}</span>
                    <span className="flex-1 min-w-0 truncate">{section.title}</span>
                    {section.locked && <Lock size={11} className="text-gray-300 shrink-0"/>}
                    {!section.visible && <EyeOff size={11} className="text-gray-300 shrink-0"/>}
                  </button>
                </li>
              ))}
            </ul>
            <div className="pt-2 mt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Add section</p>
              <div className="flex flex-wrap gap-1">{SECTION_TYPES.map(type => <button key={type.id} onClick={() => addSection(type.id)} className="px-2 py-1 rounded-md bg-gray-100 hover:bg-blue-50 text-gray-600 text-[10px] font-semibold flex items-center gap-0.5"><Plus size={11}/>{type.label}</button>)}</div>
            </div>
          </aside>}

          {/* CENTER — live preview */}
          <main className="flex-1 min-h-[40vh] lg:min-h-0 overflow-auto bg-gray-200/60 p-3 sm:p-4 relative">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Live preview · {DOCUMENT_TYPES.find(item => item.id === documentType)?.short}</p>
            <div className="bg-white rounded-lg shadow overflow-hidden mx-auto w-fit max-w-full">
              <iframe title="Template preview" srcDoc={previewHtml} className={`bg-white ${template.pageFormat === 'PGP' ? 'w-[560px] h-[360px]' : 'w-[794px] h-[900px]'} max-w-full border-0`} />
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">Tokens not yet filled appear as orange chips in the preview.</p>
          </main>

          {/* RIGHT — section properties / data fields */}
          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white p-4 overflow-y-auto shrink-0">
            {gatePass ? (
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Gate pass appearance</p>
                <label className="block text-xs font-semibold text-gray-600">Pass colour<select value={template.styles.theme} onChange={event => setTemplate(current => ({ ...current, styles: { ...current.styles, theme: event.target.value as typeof current.styles.theme } }))} className={inputCls + ' text-xs'}><option value="bss-navy">BSS Navy</option><option value="bss-midnight">Midnight Blue</option><option value="bss-green">Government Green</option><option value="bss-plain">Plain</option></select></label>
                <label className="block text-xs font-semibold text-gray-600">Text colour<input type="color" value={template.styles.headingColor} onChange={event => setTemplate(current => ({ ...current, styles: { ...current.styles, headingColor: event.target.value } }))} className="mt-1 h-9 w-full rounded-lg border border-gray-200 bg-white p-1"/></label>
                <label className="block text-xs font-semibold text-gray-600">Text style<select value={template.styles.fontFamily} onChange={event => setTemplate(current => ({ ...current, styles: { ...current.styles, fontFamily: event.target.value } }))} className={inputCls + ' text-xs'}><option value="'Arial', sans-serif">Arial</option><option value="'Segoe UI', sans-serif">Segoe UI</option><option value="Georgia, serif">Georgia (serif)</option><option value="'Times New Roman', serif">Times New Roman</option><option value="'Courier New', monospace">Courier (mono)</option></select></label>
                <label className="block text-xs font-semibold text-gray-600">Text size ({template.styles.fontSize}px)<input type="range" min={9} max={15} value={template.styles.fontSize} onChange={event => setTemplate(current => ({ ...current, styles: { ...current.styles, fontSize: Number(event.target.value) } }))} className="w-full mt-1"/></label>
                <p className="text-[11px] leading-5 text-gray-400">Gate passes are generated automatically from worker, site and validity data. Layout, wording, fields and signatories are fixed — only the appearance above can be changed.</p>
              </div>
            ) : (
              <>
                {selected && selected.type !== 'logo' && selected.type !== 'photo' && selected.type !== 'divider' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Section text — reusable wording</p>
                  <textarea
                    ref={textareaRef}
                    value={selected.content}
                    disabled={selected.locked || !selected.editable}
                    rows={9}
                    onSelect={event => { caretRef.current = { start: event.currentTarget.selectionStart ?? 0, end: event.currentTarget.selectionEnd ?? 0 }; }}
                    onChange={event => patchSection(selected.id, { content: event.target.value })}
                    className={textareaCls + ' font-mono text-xs'}
                    placeholder={selected.type === 'paragraph' ? 'This is to certify that {{worker.fullName}} …' : ''}
                  />
                  {selected.locked && <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Lock size={10}/>System block — wording is fixed.</p>}
                  {!selected.locked && <div className="mt-2"><FieldTokenPicker onInsert={insertToken}/></div>}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Fields used in this section</p>
                  <div className="flex flex-wrap gap-1.5">{selected.fields?.length ? selected.fields.map(key => <code key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-[#073B67] border border-blue-100">{key}</code>) : <span className="text-[11px] text-gray-400">None — static wording only.</span>}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-semibold text-gray-500">Visibility<select value={selected.visible ? 'yes' : 'no'} onChange={event => patchSection(selected.id, { visible: event.target.value === 'yes' })} className={inputCls + ' text-xs'}><option value="yes">Visible</option><option value="no">Hidden</option></select></label>
                  <label className="text-[10px] font-semibold text-gray-500">Alignment<select value={selected.align ?? 'left'} onChange={event => patchSection(selected.id, { align: event.target.value as TemplateSection['align'] })} className={inputCls + ' text-xs'}><option>left</option><option>center</option><option>right</option><option>justify</option></select></label>
                </div>
                <div className="flex gap-2">
                  <button className="h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1" onClick={() => moveSection(selected.id, -1)}><ArrowUp size={13}/>Up</button>
                  <button className="h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1" onClick={() => moveSection(selected.id, 1)}><ArrowDown size={13}/>Down</button>
                  <button onClick={() => patchSection(selected.id, { visible: !selected.visible })} className="h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1">{selected.visible ? <><EyeOff size={13}/>Hide</> : <><Eye size={13}/>Show</>}</button>
                  {!selected.locked && <button onClick={() => removeSection(selected.id)} className="h-8 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-semibold inline-flex items-center gap-1"><Trash2 size={13}/>Delete</button>}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Template properties</p>
                <label className="block text-xs font-semibold text-gray-600">Branding theme<select value={template.styles.theme} onChange={event => setTemplate(current => ({ ...current, styles: { ...current.styles, theme: event.target.value as typeof current.styles.theme } }))} className={inputCls + ' text-xs'}><option value="bss-navy">BSS Navy</option><option value="bss-midnight">Midnight Blue</option><option value="bss-green">Government Green</option><option value="bss-plain">Plain</option></select></label>
                <label className="block text-xs font-semibold text-gray-600">Base font size ({template.styles.fontSize}px)<input type="range" min={10} max={15} value={template.styles.fontSize} onChange={event => setTemplate(current => ({ ...current, styles: { ...current.styles, fontSize: Number(event.target.value) } }))} className="w-full mt-1"/></label>
                <label className="flex items-center justify-between text-xs font-semibold text-gray-600"><span>Show logo</span><input type="checkbox" checked={template.styles.showLogo} onChange={event => setTemplate(current => ({ ...current, styles: { ...current.styles, showLogo: event.target.checked } }))} className="accent-[#073B67] w-4 h-4"/></label>
                <label className="flex items-center justify-between text-xs font-semibold text-gray-600"><span>Show brand header</span><input type="checkbox" checked={template.styles.showBrandHeader} onChange={event => setTemplate(current => ({ ...current, styles: { ...current.styles, showBrandHeader: event.target.checked } }))} className="accent-[#073B67] w-4 h-4"/></label>
                {template.styles.showBrandHeader && <label className="block text-xs font-semibold text-gray-600">Brand header text<input value={template.styles.brandHeaderText} onChange={event => setTemplate(current => ({ ...current, styles: { ...current.styles, brandHeaderText: event.target.value } }))} className={inputCls + ' text-xs'}/></label>}
                <label className="block text-xs font-semibold text-gray-600">Document footer<textarea rows={2} value={template.styles.footerText} onChange={event => setTemplate(current => ({ ...current, styles: { ...current.styles, footerText: event.target.value } }))} className={textareaCls + ' text-xs'}/></label>
                <label className="block text-xs font-semibold text-gray-600">Numbering pattern<code className="block mt-1"><input value={template.numberingPattern} onChange={event => setTemplate(current => ({ ...current, numberingPattern: event.target.value }))} className={inputCls + ' text-xs font-mono'}/></code><span className="text-[10px] text-gray-400">Supports {'{{year}}'}, {'{{sequence}}'}, {'{{siteCode}}'}</span></label>
              </div>
            )}

            {/* signatories */}
            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Signatories on this document</p>
              <div className="flex flex-wrap gap-1.5">{SIGNATURE_ROLES.map(role => { const on = template.signatories.includes(role); return <button key={role} onClick={() => setTemplate(current => ({ ...current, signatories: on ? current.signatories.filter(item => item !== role) : [...current.signatories, role] }))} className={`px-2 py-1 rounded-full border text-[10px] font-bold ${on ? 'bg-[#073B67] text-white border-[#073B67]' : 'bg-white text-gray-500 border-gray-200'}`}>{role}</button>; })}</div>
            </div>
              </>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
