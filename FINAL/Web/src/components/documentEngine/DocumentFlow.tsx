"use client";

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Eye, FileDown, FileText, Lock, Printer, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { DocumentType, OwnerScope, GeneratedDocument, today, uid, formatDate, docTypeLabel, documentTypesFor, isGatePassType } from '@/lib/documentEngine/types';
import { buildGatePassHtml } from '@/lib/documentEngine/gatePass';
import { templateService, documentService, renderNumbering } from '@/lib/documentEngine/services';
import { resolveWorkerTokens, missingForTemplate, type PortalView, type WorkerLike } from '@/lib/documentEngine/workerDataService';
import { renderDocumentHtml, openPrintHtml } from '@/lib/documentEngine/render';
import { findTokens } from '@/lib/documentEngine/tokens';
import { TokenChip } from './FieldTokenPicker';
import { DocModal, DocStatusBadge, btnSecondary, inputCls, textareaCls } from './DocPrimitives';

const DOC_INSTANCE_FIELDS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'document.issueDate', label: 'Issue date', hint: 'date' },
  { key: 'document.validFrom', label: 'Valid from', hint: 'date' },
  { key: 'document.validTo', label: 'Valid to', hint: 'date' },
  { key: 'document.place', label: 'Place of issue', hint: 'text' },
  { key: 'document.referenceNumber', label: 'Reference / PO number', hint: 'text' },
  { key: 'document.reason', label: 'Reason (temporary pass)', hint: 'text' },
  { key: 'document.days', label: 'Number of days', hint: 'text' },
  { key: 'document.workDescription', label: 'Work description / relieving narrative', hint: 'textarea' },
];

function plusDays(fromIso: string, days: number): string {
  const date = new Date(`${fromIso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return today();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function defaultOverrides(type: DocumentType, validToDays: number, place: string): Record<string, string> {
  const base: Record<string, string> = { 'document.issueDate': today(), 'document.validFrom': today(), 'document.validTo': plusDays(today(), validToDays), 'document.place': place || 'Mumbai' };
  if (type === 'temporary-gate-pass') base['document.days'] = '1';
  return base;
}

/** Full modal flow: resolve → validate → preview → limited edit → finalize → print/download. */
export function DocumentGeneratorModal({ owner, view, workers, type: initialType, initialWorkerId, onClose }: {
  owner: OwnerScope;
  view: PortalView;
  workers: WorkerLike[];
  type?: DocumentType | null;
  initialWorkerId?: string | null;
  onClose: () => void;
}) {
  const [type, setType] = useState<DocumentType | null>(initialType ?? null);
  const [worker, setWorker] = useState<WorkerLike | null>(() => workers.find(item => item.bssId === initialWorkerId) ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialWorkerId ? [initialWorkerId] : []);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<GeneratedDocument | null>(null);
  const [multiWorker, setMultiWorker] = useState(false);

  // Templates are employer-governed: when a contractor generates, resolve the
  // template from the worker's principal employer, not the contractor.
  const templateOwner = useMemo<OwnerScope>(() => {
    if (owner.ownerType !== 'contractor') return owner;
    const employerName = worker?.employer ?? workers[0]?.employer;
    const emp = view.employers.find(item => (item.name ?? '') === employerName);
    if (!emp || !emp.bssId) return owner;
    return { ...owner, ownerType: 'employer', ownerId: emp.bssId, ownerName: emp.name, bssId: emp.bssId };
  }, [owner, worker, workers, view.employers]);
  const template = type ? templateService.renderTemplate(templateOwner, type) : null;

  const filteredWorkers = useMemo(() => workers.filter(item => {
    const term = search.trim().toLowerCase();
    return !term || `${item.name} ${item.bssId} ${item.designation ?? ''} ${item.site ?? ''} ${item.employer ?? ''}`.toLowerCase().includes(term);
  }), [workers, search]);

  const activeWorker = worker;
  const baseTokens = useMemo(() => {
    if (!activeWorker) return null;
    return resolveWorkerTokens(view, activeWorker).tokens;
  }, [view, activeWorker]);
  const docOverrides: Record<string, string> = useMemo(() => {
    if (!template || !baseTokens) return {};
    const sequence = documentService.all().length + 1;
    const number = renderNumbering(template.numberingPattern, baseTokens, sequence);
    const defaults = defaultOverrides(type ?? 'appointment-letter', type === 'permanent-gate-pass' ? 365 : type === 'temporary-gate-pass' ? 30 : 365, baseTokens['site.address'] ?? '');
    return { ...defaults, ...overrides, 'document.number': overrides['document.number'] || number, 'document.referenceNumber': overrides['document.referenceNumber'] || number };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id, type, baseTokens, overrides]);
  const mergedTokens: Record<string, string> = useMemo(() => baseTokens ? { ...baseTokens, ...docOverrides } : {}, [baseTokens, docOverrides]);
  const workerRowTokens = useMemo(() => {
    if (!type || type !== 'temporary-gate-pass' || !selectedIds.length) return undefined;
    return workers.filter(item => selectedIds.includes(item.bssId)).map(item => resolveWorkerTokens(view, item).tokens);
  }, [type, selectedIds, workers, view]);

  const workerRowsForRender = workerRowTokens && workerRowTokens.length > 1 ? workerRowTokens : undefined;

  const usedTokens = useMemo(() => template ? Array.from(new Set(template.sections.flatMap(section => findTokens(section.content)))) : [], [template]);
  const missing = useMemo(() => {
    if (!template || !baseTokens) return [];
    const inTemplate = usedTokens.filter(key => ['worker.', 'employment.', 'contractor.', 'employer.', 'site.', 'payroll.'].some(prefix => key.startsWith(prefix)));
    const resolutionMissing = resolveWorkerTokens(view, activeWorker ?? workers[0]).missing.filter(item => inTemplate.includes(item.key));
    return missingForTemplate(template, mergedTokens).length ? missingForTemplate(template, mergedTokens).filter(item => inTemplate.includes(item.key)) : resolutionMissing;
  }, [template, mergedTokens, usedTokens, baseTokens, activeWorker, view, workers]);
  const showEditable = usedTokens.filter(key => DOC_INSTANCE_FIELDS.some(field => field.key === key) || ['document.reason', 'document.workDescription'].includes(key));
  const editableKeys = (showEditable.length ? showEditable : DOC_INSTANCE_FIELDS.map(field => field.key)).filter(key => key !== 'document.number');
  const editableList = DOC_INSTANCE_FIELDS.filter(field => editableKeys.includes(field.key));

  function pickWorker(item: WorkerLike) {
    setWorker(item);
    setSelectedIds([item.bssId]);
    setIssued(null);
    setOverrides({});
  }

  function toggleMulti(item: WorkerLike) {
    setSelectedIds(current => current.includes(item.bssId) ? current.filter(id => id !== item.bssId) : [...current, item.bssId]);
    if (!activeWorker) setWorker(item);
  }

  function finalize(status: 'Issued' | 'Draft') {
    if (!template || !activeWorker || !mergedTokens) return;
    setBusy(true);
    try {
      const sequence = documentService.all().length + 1;
      const number = renderNumbering(template.numberingPattern, mergedTokens, sequence);
      const tokens: Record<string, string> = { ...mergedTokens, 'document.number': number, 'document.referenceNumber': mergedTokens['document.referenceNumber'] || number };
      const html = renderDocumentHtml({ template, tokens, workerRows: workerRowsForRender });
      const doc: GeneratedDocument = {
        id: uid('doc-'),
        templateLineageId: template.id,
        templateVersion: template.version,
        templateName: template.name,
        documentType: type!,
        documentNumber: number,
        workerId: activeWorker.bssId,
        workerName: activeWorker.name,
        contractorId: activeWorker.contractorId ?? (owner.ownerType === 'contractor' ? owner.ownerId : activeWorker.contractor),
        contractorName: tokens['contractor.legalName'],
        employerId: owner.ownerType === 'employer' ? owner.ownerId : activeWorker.employerId ?? '',
        employerName: tokens['employer.legalName'],
        siteId: activeWorker.siteId ?? activeWorker.site ?? '',
        siteName: tokens['site.name'],
        resolvedData: tokens,
        instanceOverrides: overrides,
        renderedHtml: html,
        status,
        validFrom: tokens['document.validFrom'],
        validTo: tokens['document.validTo'],
        generatedBy: 'Me',
        generatedByRole: owner.ownerType,
        generatedAt: new Date().toISOString(),
        finalizedAt: status === 'Issued' ? new Date().toISOString() : undefined,
        issuedBy: owner.ownerName,
      };
      documentService.upsert(doc);
      setIssued(doc);
      void status;
    } finally {
      setBusy(false);
    }
  }

  const previewHtml = useMemo(() => {
    if (!template) return '';
    return renderDocumentHtml({ template, tokens: mergedTokens, workerRows: workerRowsForRender });
  }, [template, mergedTokens, workerRowsForRender]);
  if (!type) {
    return (
      <DocModal title="Generate document" subtitle="Choose a document type — the Active template for that type is resolved automatically." onClose={onClose} wide>
        <div className="grid sm:grid-cols-2 gap-3">{documentTypesFor(owner.ownerType).map(item => {
          const active = templateService.renderTemplate(templateOwner, item.id);
          return <button key={item.id} onClick={() => setType(item.id)} className="text-left p-4 rounded-2xl border border-gray-200 hover:border-[#073B67] bg-white"><div className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-blue-50 text-[#073B67] grid place-items-center"><FileText size={18}/></span><div><strong className="text-sm text-gray-900">{item.short}</strong><p className="text-[11px] text-gray-400 mt-0.5">{active ? `Template ${active.version} · ${active.name}` : 'No active template'}</p></div></div></button>;
        })}</div>
      </DocModal>
    );
  }

  return (
    <DocModal title={`Generate ${docTypeLabel(type)}`} subtitle={template ? `Using template: ${template.name} ${template.version} · ${owner.ownerName}` : 'Selecting active template…'} onClose={onClose} wide>
      <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
        {/* LEFT — worker + resolution + instance fields */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <div className="flex items-center justify-between mb-1.5"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Worker</p>{type === 'temporary-gate-pass' && <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500"><input type="checkbox" checked={multiWorker} onChange={event => { setMultiWorker(event.target.checked); if (event.target.checked && !selectedIds.length) setSelectedIds([activeWorker?.bssId ?? '']); }} className="accent-[#073B67]"/>Multiple workers</label>}</div>
            <label className="relative block"><Search size={14} className="absolute left-3 top-3 text-gray-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search worker name / BSS ID / site…" className={inputCls + ' pl-9'}/></label>
            <ul className="mt-2 max-h-52 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100">
              {filteredWorkers.map(item => { const selected = selectedIds.includes(item.bssId); return (
                <li key={item.bssId}>
                  <button onClick={() => (multiWorker || type === 'temporary-gate-pass') ? toggleMulti(item) : pickWorker(item)} className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-blue-50/50 ${activeWorker?.bssId === item.bssId || selected ? 'bg-blue-50/60' : ''}`}>
                    <input type="checkbox" readOnly checked={selected} className="accent-[#073B67] w-3.5 h-3.5"/>
                    <span className="flex-1 min-w-0"><strong className="block text-xs text-gray-800 truncate">{item.name}</strong><span className="block text-[10px] text-gray-400 truncate">{item.bssId} · {item.designation ?? '—'} · {item.site ?? '—'}</span></span>
                    {activeWorker?.bssId === item.bssId && <ShieldCheck size={13} className="text-green-600"/>}
                  </button>
                </li>); })}
              {!filteredWorkers.length && <li className="px-3 py-6 text-center text-xs text-gray-400">No matching workers.</li>}
            </ul>
          </div>

          {activeWorker && (
            <>
              {/* data resolution summary */}
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1"><UserRound size={11}/>Data resolution</p>
                <dl className="space-y-1.5 text-[11px]">
                  <Row label="Worker" value={`${activeWorker.name} · ${activeWorker.bssId}`}/>
                  <Row label="Contractor" value={mergedTokens['contractor.legalName']}/>
                  <Row label="Employer" value={mergedTokens['employer.legalName']}/>
                  <Row label="Site" value={mergedTokens['site.name']}/>
                  <Row label="Employment" value={`${mergedTokens['employment.designation']}${mergedTokens['employment.skillCategory'] ? ' / ' + mergedTokens['employment.skillCategory'] : ''}`}/>
                  <Row label="Gross wage" value={mergedTokens['payroll.grossMonthlyWage']}/>
                </dl>
              </div>

              {missing.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                  <p className="text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={13}/>Missing data</p>
                  <ul className="mt-1.5 space-y-0.5 text-[11px]">{missing.slice(0, 6).map(item => <li key={item.key}>⚠ {item.label} — <code className="font-mono">{item.key}</code></li>)}</ul>
                  <p className="mt-2 text-[10px] text-amber-700">Complete the worker profile, or continue and save as Draft — <strong>system identity fields are locked</strong> and will never be retyped manually.</p>
                </div>
              )}

              {/* instance fields */}
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">✎ Editable instance fields</p>
                <div className="space-y-2">{editableList.map(field => (
                <InstanceField key={field.key} field={field} value={docOverrides[field.key] ?? ''} onChange={value => setOverrides(current => ({ ...current, [field.key]: value }))}/>
              ))}</div>
                <p className="mt-2 text-[10px] text-gray-400 flex items-center gap-1"><Lock size={10}/>Identity, employer, contractor, site and payroll values are auto-fetched and locked.</p>
              </div>
            </>
          )}
        </div>

        {/* RIGHT — preview + actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Preview · {docTypeLabel(type)}</p>
            <div className="flex gap-2">
              <button className={btnSecondary + ' !h-9 !px-3 !text-xs'} disabled={!activeWorker} onClick={() => finalize('Draft')}><SaveDraftIcon/>Save Draft</button>
              <button className="h-9 px-4 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!activeWorker || busy} onClick={() => finalize('Issued')}><ShieldCheck size={14}/>{busy ? 'Working…' : 'Finalize & Issue'}</button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-inner">
            <iframe title="Document preview" srcDoc={previewHtml} className="w-full h-[640px] border-0 bg-white" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary + ' !h-9 !text-xs'} disabled={!issued} onClick={() => issued && openPrintHtml(issued.renderedHtml ?? '', issued.documentNumber)}><Printer size={14}/>Print</button>
            <button className={btnSecondary + ' !h-9 !text-xs'} disabled={!issued} onClick={() => issued && openPrintHtml(issued.renderedHtml ?? '', issued.documentNumber)}><FileDown size={14}/>Download PDF (print → Save as PDF)</button>
            {issued && <span className="text-[11px] text-green-700 self-center font-semibold flex items-center gap-1"><CheckCircle2 size={12}/>{issued.documentNumber} · {issued.status}</span>}
          </div>
          <p className="text-[10px] text-gray-400">After issuance the document is stored as an immutable historical copy with its template version. Further changes create a new revision.</p>
        </div>
      </div>
    </DocModal>
  );
}

function InstanceField({ field, value, onChange }: { field: { key: string; label: string; hint: string }; value: string; onChange: (value: string) => void }) {
  const isDate = field.hint === 'date';
  return <label className="block"><span className="text-[10px] font-semibold text-gray-500">{field.label}</span>{field.hint === 'textarea' ? <textarea rows={2} className={textareaCls + ' text-xs mt-1'} value={value} onChange={event => onChange(event.target.value)}/> : <input type={isDate ? 'date' : 'text'} className={inputCls + ' text-xs mt-1'} value={value} onChange={event => onChange(event.target.value)}/>}</label>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-gray-400 shrink-0">{label}</dt><dd className="font-semibold text-gray-800 text-right">{value || '—'}</dd></div>;
}
function SaveDraftIcon() { return <FileText size={14}/>; }

/** Worker documents panel: statuses per document type + history (issued copies never change). */
export function WorkerDocumentsDrawer({ owner, view, worker, onClose }: { owner: OwnerScope; view: PortalView; worker: WorkerLike; onClose: () => void }) {
  const [generate, setGenerate] = useState<DocumentType | null>(null);
  const [preview, setPreview] = useState<GeneratedDocument | null>(null);
  const [passPreview, setPassPreview] = useState<{ html: string; title: string } | null>(null);
  const history = useMemo(() => documentService.forWorker(worker.bssId), [worker.bssId]);
  const latestFor = (type: DocumentType) => history.find(item => item.documentType === type);

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex justify-end" role="presentation">
      <section role="dialog" aria-modal="true" className="bg-white w-full max-w-2xl h-full overflow-y-auto animate-in slide-in-from-right-4 duration-200">
        <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Worker documents</p><h2 className="font-semibold text-gray-950 mt-0.5">{worker.name}</h2><p className="text-xs text-gray-500 font-mono mt-0.5">{worker.bssId}</p></div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={17}/></button>
        </header>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documentTypesFor(owner.ownerType).map(item => { const latest = latestFor(item.id); const gatePass = isGatePassType(item.id); return (
              <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-2"><strong className="text-sm text-gray-900">{item.short}</strong><DocStatusBadge status={latest?.status ?? (gatePass ? 'Auto' : 'Not Generated')}/></div>
                {latest && <p className="text-[11px] text-gray-400 mt-1.5 font-mono">{latest.documentNumber} · {latest.templateVersion} · {formatDate(latest.finalizedAt ?? latest.generatedAt)}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {gatePass ? (
                    <button className="h-8 px-3 rounded-lg bg-[#0F172A] text-white text-[11px] font-semibold inline-flex items-center gap-1" onClick={() => { void (async () => { const html = await buildGatePassHtml(owner, view, worker, item.id); setPassPreview({ html, title: `${worker.name} · ${item.short}` }); })(); }}><Eye size={12}/>View pass</button>
                  ) : (
                    <>
                      <button className="h-8 px-3 rounded-lg bg-[#0F172A] text-white text-[11px] font-semibold inline-flex items-center gap-1" onClick={() => setGenerate(item.id)}><FileText size={12}/>Generate</button>
                      {latest && ['Issued', 'Draft'].includes(latest.status) && <button className="h-8 px-3 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1" onClick={() => setPreview(latest)}><Eye size={12}/>View</button>}
                      {latest && ['Issued', 'Draft'].includes(latest.status) && <button className="h-8 px-3 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1" onClick={() => latest.renderedHtml && openPrintHtml(latest.renderedHtml, latest.documentNumber)}><Printer size={12}/>Print</button>}
                    </>
                  )}
                </div>
              </div>
            ); })}
          </div>

          <div>
            <p className="text-xs font-bold text-gray-900 mb-2">Document history</p>
            {history.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[560px]"><thead className="bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wider"><tr><th className="px-3 py-2">Document</th><th className="px-3 py-2">Number</th><th className="px-3 py-2">Template</th><th className="px-3 py-2">Issued by</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{history.map(doc => <tr key={doc.id}><td className="px-3 py-2 font-semibold text-gray-800">{docTypeLabel(doc.documentType)}</td><td className="px-3 py-2 font-mono text-[10px] text-[#073B67]">{doc.documentNumber}</td><td className="px-3 py-2 text-gray-500">{doc.templateVersion}</td><td className="px-3 py-2 text-gray-500">{doc.generatedByRole}</td><td className="px-3 py-2 text-gray-500">{formatDate(doc.finalizedAt ?? doc.generatedAt)}</td><td className="px-3 py-2"><DocStatusBadge status={doc.status}/></td><td className="px-3 py-2"><div className="flex gap-1.5"><button title="View" onClick={() => setPreview(doc)} className="w-7 h-7 grid place-items-center rounded-md border text-gray-500 hover:text-blue-700"><Eye size={13}/></button><button title="Download PDF" onClick={() => doc.renderedHtml && openPrintHtml(doc.renderedHtml, doc.documentNumber)} className="w-7 h-7 grid place-items-center rounded-md border text-gray-500 hover:text-green-700"><Download size={13}/></button></div></td></tr>)}</tbody></table></div> : <p className="text-xs text-gray-400 rounded-xl border border-dashed border-gray-200 p-6 text-center">No documents yet — generate the first one from the cards above.</p>}
          </div>
        </div>
      </section>
      {generate && <DocumentGeneratorModal owner={owner} view={view} workers={[worker]} type={generate} initialWorkerId={worker.bssId} onClose={() => setGenerate(null)}/>}
      {preview && <DocModal title={preview.documentNumber} subtitle={docTypeLabel(preview.documentType)} onClose={() => setPreview(null)} wide><iframe title="Document" srcDoc={preview.renderedHtml ?? ''} className="w-full h-[760px] border-0 bg-white"/></DocModal>}
      {passPreview && <DocModal title={passPreview.title} subtitle="Gate pass — auto-generated from the worker ID card" onClose={() => setPassPreview(null)} wide><iframe title="Gate pass" srcDoc={passPreview.html} className="w-full h-[760px] border-0 bg-white"/></DocModal>}
    </div>
  );
}

export function DocumentTypeBadgeList({ value }: { value: string }) { return <TokenChip tokenKey={value}/>; }
