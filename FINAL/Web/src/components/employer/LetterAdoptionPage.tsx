"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Image as ImageIcon, Loader2, Lock, Pencil, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import DocumentStudioEditor, { type StudioToken } from '@/components/admin/DocumentStudioEditor';

type CatalogRow = { id: number; name: string; state: string };
type Adoption = {
  baseTemplateId: number | null;
  baseTemplateName: string;
  baseTemplateState: string;
  textColor: string;
  headingColor: string;
  logoUrl: string;
  headerHtml: string;
  footerHtml: string;
  clausesHtml: string;
  active: boolean;
  updatedAt: string;
};
type Draft = {
  baseTemplateId: string;
  textColor: string;
  headingColor: string;
  logoUrl: string;
  editorHtml: string;
  baseHtml: string;
  lockedBody: string;
  headerFrag: string;
  footerFrag: string;
};

const DEFAULT_LOGO = 'https://login.bharatshramsetu.com/bss-brand/bharatshramsetu-logo.png';
const DISPLAY_LOGO = '/bss-brand/bharatshramsetu-logo.png';
const proxyLogo = (url: string) => (url === DEFAULT_LOGO ? DISPLAY_LOGO : url);

const DEFAULT_SRC_RE = new RegExp(`src=(["'])${DEFAULT_LOGO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'gi');
const logoToToken = (html: string) => html
  .replace(new RegExp(`src=(["'])${DISPLAY_LOGO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'gi'), 'src="{{logoUrl}}"')
  .replace(DEFAULT_SRC_RE, 'src="{{logoUrl}}"');

const SAMPLE: Record<string, string> = {
  letterTitle: 'Appointment Letter', refNo: 'BSSA0000000000', issueDate: 'DD/MM/YYYY',
  workerName: 'Worker Name', workerBssId: 'BSS Worker ID', fatherName: "Father's Name",
  dob: 'DD/MM/YYYY', gender: '—', mobile: 'Mobile Number', address: 'Worker Address',
  designation: 'Designation', department: 'Department', doj: 'DD/MM/YYYY', wage: '₹—',
  ctc: '₹—', costSheetName: 'Cost Sheet Name',
  costSheetCode: 'Cost Sheet Code', contractorName: 'Contractor / Service Provider',
  contractorBssId: 'Contractor BSS ID', contractorAddress: 'Contractor Address',
  employerName: 'Principal Employer', employerBssId: 'Employer BSS ID',
  siteName: 'Project Site', siteAddress: 'Site Address',
  salaryBreakdownTable: '<table style="width:100%;border-collapse:collapse;font-size:11px;margin:6px 0;border:1px solid #9aa4b2"><thead><tr style="background:#F0F4FA;color:#073B67"><th style="border:1px solid #9aa4b2;padding:5px">Component</th><th style="border:1px solid #9aa4b2;padding:5px">Monthly (₹)</th><th style="border:1px solid #9aa4b2;padding:5px">Annual (₹)</th></tr></thead><tbody><tr><td style="border:1px solid #9aa4b2;padding:5px">Basic</td><td style="border:1px solid #9aa4b2;padding:5px">—</td><td style="border:1px solid #9aa4b2;padding:5px">—</td></tr></tbody></table>',
  costSheetSection: '', formXVTable: '',
};

const STUDIO_TOKENS: StudioToken[] = [
  { value: '{{workerName}}', label: 'Worker name', group: 'Worker' },
  { value: '{{workerBssId}}', label: 'BSS Worker ID', group: 'Worker' },
  { value: '{{designation}}', label: 'Designation', group: 'Worker' },
  { value: '{{doj}}', label: 'Date of joining', group: 'Worker' },
  { value: '{{contractorName}}', label: 'Contractor name', group: 'Contractor' },
  { value: '{{contractorBssId}}', label: 'Contractor BSS ID', group: 'Contractor' },
  { value: '{{employerName}}', label: 'Employer name', group: 'Employer' },
  { value: '{{siteName}}', label: 'Site name', group: 'Site' },
  { value: '{{refNo}}', label: 'Reference no.', group: 'Document' },
  { value: '{{issueDate}}', label: 'Date', group: 'Document' },
  { value: '{{logoUrl}}', label: 'Logo (header)', group: 'Branding' },
];

function substituteTokens(html: string, logo: string): string {
  let out = html;
  const values = { ...SAMPLE, logoUrl: proxyLogo(logo || DEFAULT_LOGO) };
  for (const [key, value] of Object.entries(values)) out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value);
  return out.replace(/\{\{[^}]+\}\}/g, '');
}

function withColors(html: string, textColor: string, headingColor: string): string {
  let css = '';
  if (textColor) css += `\n  body, .page, .page p, .page td, .page span, .page div { color:${textColor}; }`;
  if (headingColor) css += `\n  h1, h3, .brand strong, .brand-title strong, .kv td:first-child { color:${headingColor}; }`;
  return css ? html.replace(/<\/head>/i, `<style>/* employer-letter-adoption */${css}</style></head>`) : html;
}

function extractFragments(html: string): { header: string; footer: string; lockedBody: string } {
  if (!html) return { header: '', footer: '', lockedBody: '' };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const brand = doc.querySelector('.bss-letter-brand, .brand');
  const foot = doc.querySelector('.foot');
  const header = brand ? brand.outerHTML : '';
  const footer = foot ? foot.outerHTML : '';
  const clone = doc.cloneNode(true) as Document;
  clone.querySelector('.bss-letter-brand, .brand')?.remove();
  clone.querySelector('.foot')?.remove();
  const body = clone.querySelector('.page')?.innerHTML || clone.body.innerHTML;
  return { header, footer, lockedBody: substituteTokens(body, '') };
}

const CONTENTEDITABLE_RE = /\s+contenteditable=["'][^"']*["']/gi;
const DATA_REGION_RE = /\s+data-(?:region|locked)=["'][^"']*["']/gi;
function extractRegions(html: string): { header: string; clauses: string; footer: string } {
  if (!html) return { header: '', clauses: '', footer: '' };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const clean = (s: string) => s.replace(CONTENTEDITABLE_RE, '').replace(DATA_REGION_RE, '');
  const get = (r: string) => { const el = doc.querySelector(`[data-region="${r}"]`); return el ? clean(el.innerHTML) : ''; };
  return { header: get('header'), clauses: get('clauses'), footer: get('footer') };
}

function buildEditorHtml(d: Pick<Draft, 'headerFrag' | 'footerFrag' | 'lockedBody'>, baseHtml: string, clausesHtml: string, headerHtml?: string, footerHtml?: string): string {
  const doc = new DOMParser().parseFromString(baseHtml, 'text/html');
  const page = doc.querySelector('.page') || doc.body;
  const header = headerHtml ?? d.headerFrag;
  const footer = footerHtml ?? d.footerFrag;
  page.innerHTML =
    `<div data-region="header" contenteditable="true">${header}</div>` +
    `<div data-region="body" data-locked="true" contenteditable="false">${d.lockedBody}</div>` +
    `<div data-region="clauses" contenteditable="true">${clausesHtml || '<h3>Additional Clauses</h3><p></p>'}</div>` +
    `<div data-region="footer" contenteditable="true">${footer}</div>`;
  return '<!doctype html>' + doc.documentElement.outerHTML;
}

const input = 'w-full h-10 rounded-lg border border-bss-border px-3 text-sm bg-white';

export default function LetterAdoptionPage() {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [siteStates, setSiteStates] = useState<string[]>([]);
  const [adoption, setAdoption] = useState<Adoption | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchHtml = useCallback(async (id: string) => {
    if (!id) return '';
    try {
      const r = await fetch(`/api/employer/letter-adoption?templateId=${id}`, { cache: 'no-store' });
      const b = await r.json().catch(() => ({})) as { html?: string };
      return b.html ?? '';
    } catch { return ''; }
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/employer/letter-adoption', { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { adoption?: Adoption | null; catalog?: CatalogRow[]; siteStates?: string[]; error?: string };
      if (!res.ok) throw new Error(body.error || 'Could not load the adoption.');
      setCatalog(body.catalog ?? []);
      setSiteStates(body.siteStates ?? []);
      setAdoption(body.adoption ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the adoption.');
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  function makeDraft(baseId: string, html: string, a: Adoption | null): Draft {
    const frag = extractFragments(html);
    const base: Draft = {
      baseTemplateId: baseId, textColor: '', headingColor: '',
      logoUrl: a?.logoUrl ?? '', editorHtml: '', baseHtml: html,
      lockedBody: frag.lockedBody, headerFrag: frag.header, footerFrag: frag.footer,
    };
    return { ...base, editorHtml: buildEditorHtml(base, html, a?.clausesHtml ?? '', a?.headerHtml || undefined, a?.footerHtml || undefined) };
  }

  async function openAdopt(row: CatalogRow) {
    const html = await fetchHtml(String(row.id));
    setDraft(makeDraft(String(row.id), html, null));
  }

  async function openEdit() {
    if (!adoption?.baseTemplateId) return;
    const html = await fetchHtml(String(adoption.baseTemplateId));
    setDraft(makeDraft(String(adoption.baseTemplateId), html, adoption));
  }

  async function pickTemplate(id: string) {
    const html = await fetchHtml(id);
    if (!draft) return;
    const frag = extractFragments(html);
    const next: Draft = { ...draft, baseTemplateId: id, baseHtml: html, lockedBody: frag.lockedBody, headerFrag: frag.header, footerFrag: frag.footer };
    next.editorHtml = buildEditorHtml(next, html, '');
    setDraft(next);
  }

  function onLogo(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft(d => d ? { ...d, logoUrl: String(reader.result || '') } : d);
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!draft?.baseTemplateId) { setError('Choose an appointment letter template.'); return; }
    setBusy(true); setError(''); setNotice('');
    const reg = extractRegions(draft.editorHtml);
    try {
      const res = await fetch('/api/employer/letter-adoption', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseTemplateId: Number(draft.baseTemplateId), textColor: draft.textColor, headingColor: draft.headingColor,
          logoUrl: draft.logoUrl, headerHtml: logoToToken(reg.header), footerHtml: logoToToken(reg.footer), clausesHtml: logoToToken(reg.clauses),
        }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error || 'Could not save the adoption.');
      setDraft(null);
      setNotice('Appointment letter adopted. Your contractors now issue this letter to their workers.');
      void load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the adoption.');
    } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/employer/letter-adoption', { method: 'DELETE' });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error || 'Could not remove the adoption.');
      setAdoption(null); setNotice('Adoption removed. You can adopt a fresh appointment letter.'); void load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not remove the adoption.');
    } finally { setBusy(false); }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? catalog.filter(c => `${c.name} ${c.state}`.toLowerCase().includes(q)) : catalog;
  }, [catalog, query]);

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Letters</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-text-primary mt-1">Appointment Letter Adoption</h1>
          <p className="text-sm text-bss-text-muted mt-1">Adopt an appointment-letter template for your site jurisdiction, then edit it in the studio — the letter <strong className="text-bss-text-primary">body is locked</strong>; change the header, add clauses and the footer. Contractors at your sites issue it as-is.</p>{siteStates.length ? <p className="text-[11px] font-semibold text-bss-text-secondary mt-1">Showing templates for: {siteStates.map(s => s === 'Central' ? 'Central' : s).join(', ')}</p> : null}
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="h-10 px-3.5 rounded-lg border border-bss-border bg-white text-xs font-semibold text-bss-text-secondary flex items-center gap-1.5 hover:bg-bss-bg disabled:opacity-60"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>Reload</button>
      </header>

      {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
      {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

      {loading && !catalog.length
        ? <p className="flex items-center gap-2 text-sm text-bss-text-muted py-10"><Loader2 size={16} className="animate-spin"/>Loading…</p>
        : <>
            {adoption?.active ? (
              <section className="bss-reveal bss-card rounded-2xl p-5 border-l-4 border-bss-green">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-bss-green bg-bss-soft-green rounded-full px-2.5 py-1"><CheckCircle2 size={12}/>Adopted</span>
                      <h2 className="text-base font-semibold text-bss-text-primary truncate">{adoption.baseTemplateName || 'Adopted template'}</h2>
                      {adoption.baseTemplateState ? <span className="text-[11px] font-mono bg-bss-bg text-bss-text-secondary rounded px-1.5 py-0.5">{adoption.baseTemplateState}</span> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-bss-text-secondary">
                      <span className="flex items-center gap-1.5">Text <i className="w-3 h-3 rounded-full border border-bss-border inline-block" style={{ background: adoption.textColor || '#111827' }}/>{adoption.textColor || 'default'}</span>
                      <span className="flex items-center gap-1.5">Heading <i className="w-3 h-3 rounded-full border border-bss-border inline-block" style={{ background: adoption.headingColor || '#073B67' }}/>{adoption.headingColor || 'default'}</span>
                      {adoption.headerHtml ? <span>Custom header</span> : null}
                      {adoption.clausesHtml ? <span>Extra clauses</span> : null}
                      {adoption.footerHtml ? <span>Custom footer</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => void openEdit()} className="h-10 px-4 rounded-lg bg-bss-navy text-white text-sm font-semibold flex items-center gap-1.5"><Pencil size={14}/>Edit</button>
                    <button type="button" onClick={() => void remove()} disabled={busy} className="h-10 px-4 rounded-lg border border-bss-border text-bss-error text-sm font-semibold flex items-center gap-1.5 hover:bg-bss-soft-orange disabled:opacity-60"><Trash2 size={14}/>Delete</button>
                  </div>
                </div>
              </section>
            ) : (
              <p className="bss-card rounded-2xl p-4 text-sm text-bss-text-muted">No appointment letter adopted yet — pick a template below and <strong className="text-bss-text-primary">Adopt</strong> it.</p>
            )}

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-sm font-semibold text-bss-text-primary">Available appointment templates</h2><p className="text-[11px] text-bss-text-muted mt-0.5">From the BSS admin catalog · {filtered.length} of {catalog.length}</p></div>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search template or state" className="h-10 w-64 rounded-lg border border-bss-border px-3 text-sm bg-white"/>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map(row => {
                  const isCurrent = adoption?.active && adoption.baseTemplateId === row.id;
                  return <article key={row.id} className="bss-card rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-bss-text-primary truncate">{row.name}</h3>
                        <span className="inline-block mt-1 text-[10px] font-mono bg-bss-bg text-bss-text-secondary rounded px-1.5 py-0.5">{row.state || '—'}</span>
                      </div>
                      {isCurrent && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-bss-green bg-bss-soft-green rounded-full px-2 py-0.5 shrink-0"><CheckCircle2 size={11}/>Adopted</span>}
                    </div>
                    <button type="button" onClick={() => void openAdopt(row)} className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${isCurrent ? 'border border-bss-border text-bss-text-secondary hover:bg-bss-bg' : 'bg-bss-navy text-white hover:opacity-90'}`}>
                      {isCurrent ? <><Pencil size={13}/>Customise</> : <><CheckCircle2 size={13}/>Adopt</>}
                    </button>
                  </article>;
                })}
                {!filtered.length && <p className="text-sm text-bss-text-muted py-6 col-span-full">{catalog.length ? `No templates match “${query}”.` : `No appointment-letter templates are available for ${siteStates.length ? siteStates.join(', ') : 'your sites'}. Ask BSS Admin to publish one for this jurisdiction.`}</p>}
              </div>
            </section>
          </>}

      {draft && <div className="fixed inset-0 z-[95] bg-bss-navy/40 backdrop-blur-sm grid place-items-center p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setDraft(null); }}>
        <section role="dialog" aria-modal="true" aria-label="Customise appointment letter" className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden flex flex-col">
          <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
            <div><h2 className="text-sm font-semibold text-bss-text-primary">{adoption?.active && adoption.baseTemplateId === Number(draft.baseTemplateId) ? 'Edit adopted appointment letter' : 'Adopt appointment letter'}</h2><p className="text-[11px] text-bss-text-muted mt-0.5 flex items-center gap-1"><Lock size={11}/>Body locked — edit the header, clauses and footer in the studio below.</p></div>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close" disabled={busy}><X size={16}/></button>
          </header>

          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-xs font-semibold text-bss-text-primary flex-1 min-w-[220px]">Base template <span className="text-bss-error">*</span>
                <select value={draft.baseTemplateId} onChange={e => void pickTemplate(e.target.value)} className={`${input} mt-1`}>
                  <option value="">Select a template…</option>
                  {catalog.map(c => <option key={c.id} value={c.id}>{c.name}{c.state ? ` — ${c.state}` : ''}</option>)}
                </select>
              </label>
              <div className="text-xs font-semibold text-bss-text-primary">Logo
                <div className="mt-1 flex items-center gap-2">
                  <div className="w-12 h-10 rounded-lg border border-bss-border grid place-items-center overflow-hidden bg-white shrink-0 text-bss-text-muted">
                    {draft.logoUrl ? <img src={draft.logoUrl} alt="logo" className="max-w-full max-h-full object-contain"/> : <ImageIcon size={14}/>}
                  </div>
                  <label className="inline-flex h-10 px-3 rounded-lg border border-bss-border text-[11px] font-semibold items-center gap-1 cursor-pointer hover:bg-bss-bg"><Upload size={12}/>Upload<input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e => { onLogo(e.target.files?.[0]); if (fileRef.current) fileRef.current.value=''; }}/></label>
                  {draft.logoUrl ? <button type="button" onClick={() => setDraft(d => d ? { ...d, logoUrl: '' } : d)} className="h-10 px-2 rounded-lg border border-bss-border text-[11px] font-semibold text-bss-text-muted hover:bg-bss-bg">Use default</button> : null}
                </div>
              </div>
            </div>

            <DocumentStudioEditor
              key={`${draft.baseTemplateId}-${draft.baseHtml.length}`}
              value={draft.editorHtml}
              onChange={html => setDraft(d => d ? { ...d, editorHtml: html } : d)}
              tokens={STUDIO_TOKENS}
              renderPreview={html => substituteTokens(withColors(html, draft.textColor, draft.headingColor), draft.logoUrl)}
              variant="employer"
              logoUrl={draft.logoUrl}
            />
          </div>

          <footer className="px-5 py-4 border-t border-bss-border flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} disabled={busy} className="h-10 px-4 rounded-lg border border-bss-border text-sm font-semibold text-bss-text-secondary">Cancel</button>
            <button type="button" onClick={() => void save()} disabled={busy || !draft.baseTemplateId} className="h-10 px-4 rounded-lg bg-bss-navy text-white text-sm font-semibold disabled:opacity-60">{busy ? 'Saving…' : (adoption?.active ? 'Save changes' : 'Adopt appointment letter')}</button>
          </footer>
        </section>
      </div>}
    </div>
  );
}
