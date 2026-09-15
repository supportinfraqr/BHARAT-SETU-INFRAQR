"use client";

import { useMemo, useState } from 'react';
import { CheckCircle2, FileDown, Search, ShieldCheck, XCircle } from 'lucide-react';
import { DOCUMENT_TYPES, DocumentType, OwnerScope, GeneratedDocument, uid, documentTypesFor } from '@/lib/documentEngine/types';
import { templateService, documentService, renderNumbering } from '@/lib/documentEngine/services';
import { resolveWorkerTokens, type PortalView, type WorkerLike } from '@/lib/documentEngine/workerDataService';
import { renderDocumentHtml, openPrintHtml } from '@/lib/documentEngine/render';
import { missingForTemplate } from '@/lib/documentEngine/workerDataService';
import { DocModal, DocStatusBadge, btnPrimary, btnSecondary, inputCls } from './DocPrimitives';

type BulkRow = {
  worker: WorkerLike;
  state: 'ready' | 'missing';
  reason?: string;
  document?: GeneratedDocument;
};

/**
 * Bulk generation:
 *  - Appointment Letter / Experience Letter / Permanent Gate Pass: one document per worker.
 *  - Temporary Gate Pass: single pass covering all selected workers (dynamic worker table).
 */
export default function BulkGenerateModal({ owner, view, workers, onClose }: { owner: OwnerScope; view: PortalView; workers: WorkerLike[]; onClose: () => void }) {
  const [type, setType] = useState<DocumentType>('appointment-letter');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rows, setRows] = useState<BulkRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const template = templateService.activeFor(owner, type);
  const templateName = template ? `${template.name} ${template.version}` : 'No active template';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return workers.filter(worker => !term || `${worker.name} ${worker.bssId} ${worker.site ?? ''}`.toLowerCase().includes(term));
  }, [workers, search]);

  const isMultiPass = type === 'temporary-gate-pass';
  const selectedWorkers = workers.filter(worker => selectedIds.includes(worker.bssId));

  function generate() {
    if (!template || !selectedWorkers.length) return;
    setBusy(true);
    const nextRows: BulkRow[] = [];

    // Temporary Gate Pass: ONE pass covering all selected workers (dynamic worker table).
    if (type === 'temporary-gate-pass' && selectedWorkers.length > 1) {
      const primary = selectedWorkers[0];
      const resolution = resolveWorkerTokens(view, primary);
      const sequence = documentService.all().length + 1;
      const number = renderNumbering(template.numberingPattern, resolution.tokens, sequence);
      const tokens: Record<string, string> = { ...resolution.tokens, 'document.number': number, 'document.referenceNumber': resolution.tokens['document.referenceNumber'] || number };
      const workerRows = selectedWorkers.map(item => resolveWorkerTokens(view, item).tokens);
      const document: GeneratedDocument = {
        id: uid('doc-'), templateLineageId: template.id, templateVersion: template.version, templateName: template.name,
        documentType: type, documentNumber: number, workerId: primary.bssId, workerName: `${selectedWorkers.length} workers (${primary.name} and others)`,
        contractorId: owner.ownerType === 'contractor' ? owner.ownerId : primary.contractorId, contractorName: tokens['contractor.legalName'],
        employerName: tokens['employer.legalName'], employerId: owner.ownerType === 'employer' ? owner.ownerId : primary.employerId,
        siteId: primary.siteId ?? primary.site, siteName: tokens['site.name'],
        resolvedData: tokens, instanceOverrides: {}, status: 'Draft', generatedBy: 'Me', generatedByRole: owner.ownerType,
        generatedAt: new Date().toISOString(), validFrom: tokens['document.validFrom'], validTo: tokens['document.validTo'], issuedBy: owner.ownerName,
      };
      document.renderedHtml = renderDocumentHtml({ template, tokens, workerRows });
      documentService.upsert(document);
      for (const worker of selectedWorkers) nextRows.push({ worker, state: 'ready', document });
      setRows(nextRows);
      setBusy(false);
      return;
    }

    for (const worker of selectedWorkers) {
      const resolution = resolveWorkerTokens(view, worker);
      const missing = missingForTemplate(template, resolution.tokens);
      if (missing.length) {
        nextRows.push({ worker, state: 'missing', reason: missing.map(item => item.label).join(', ') });
        continue;
      }
      const sequence = documentService.all().length + 1;
      const number = renderNumbering(template.numberingPattern, resolution.tokens, sequence);
      const tokens: Record<string, string> = { ...resolution.tokens, 'document.number': number, 'document.referenceNumber': resolution.tokens['document.referenceNumber'] || number };
      const document: GeneratedDocument = {
        id: uid('doc-'), templateLineageId: template.id, templateVersion: template.version, templateName: template.name,
        documentType: type, documentNumber: number, workerId: worker.bssId, workerName: worker.name,
        contractorId: worker.contractorId ?? (owner.ownerType === 'contractor' ? owner.ownerId : worker.contractor),
        contractorName: tokens['contractor.legalName'], employerName: tokens['employer.legalName'], employerId: owner.ownerType === 'employer' ? owner.ownerId : worker.employerId,
        siteId: worker.siteId ?? worker.site, siteName: tokens['site.name'],
        resolvedData: tokens, instanceOverrides: {}, status: 'Draft', generatedBy: 'Me', generatedByRole: owner.ownerType,
        generatedAt: new Date().toISOString(), validFrom: tokens['document.validFrom'], validTo: tokens['document.validTo'], issuedBy: owner.ownerName,
      };
      document.renderedHtml = renderDocumentHtml({ template, tokens, workerRows: undefined });
      documentService.upsert(document);
      nextRows.push({ worker, state: 'ready', document });
    }
    setRows(nextRows);
    setBusy(false);
    const ready = nextRows.filter(row => row.state === 'ready').length;
    setNotice(`${nextRows.length} processed · ${ready} ready · ${nextRows.length - ready} with missing data.`);
  }

  function finalizeAll() {
    if (!rows) return;
    const updated = rows.map(row => row.document ? { ...row, document: { ...row.document, status: 'Issued' as const, finalizedAt: new Date().toISOString() } } : row);
    updated.forEach(row => { if (row.document) documentService.upsert(row.document); });
    setRows(updated);
    setNotice('Issued all ready documents — each one is now stored immutably with its template version.');
  }

  return (
    <DocModal title="Bulk document generation" subtitle="One template → many workers. Resolve → validate → generate → finalize." onClose={onClose} wide>
      <div className="space-y-5">
        <div className="grid sm:grid-cols-4 gap-2">{documentTypesFor(owner.ownerType).map(item => <button key={item.id} onClick={() => { setType(item.id); setRows(null); setSelectedIds([]); }} className={`p-3 rounded-xl border text-left text-xs font-semibold ${type === item.id ? 'border-[#073B67] bg-blue-50 text-[#073B67]' : 'border-gray-200 text-gray-600'}`}>{item.short}{item.id === 'temporary-gate-pass' && <span className="block text-[10px] font-normal text-gray-400 mt-0.5">one pass · many workers</span>}</button>)}</div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-900">Using template: <strong>{templateName}</strong> · {owner.ownerName}</div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{isMultiPass ? `Select workers covered by the single ${type === 'temporary-gate-pass' ? 'Temporary Gate Pass' : 'document'}` : 'Select workers'}</p>
          <label className="relative block"><Search size={14} className="absolute left-3 top-3 text-gray-400"/><input value={search} onChange={event => setSearch(event.target.value)} className={inputCls + ' pl-9'} placeholder="Search workers…"/></label>
          <div className="mt-2 border border-gray-100 rounded-xl max-h-56 overflow-y-auto divide-y divide-gray-100">
            {filtered.map(worker => { const checked = selectedIds.includes(worker.bssId); return <label key={worker.bssId} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={checked} onChange={() => setSelectedIds(current => checked ? current.filter(id => id !== worker.bssId) : [...current, worker.bssId])} className="accent-[#073B67]"/><span className="flex-1 min-w-0"><strong className="block text-xs text-gray-800">{worker.name}</strong><span className="block text-[10px] text-gray-400 truncate">{worker.bssId} · {worker.designation ?? ''} · {worker.site ?? ''}</span></span></label>; })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} disabled={!selectedWorkers.length || busy} onClick={generate}><ShieldCheck size={15}/>{busy ? 'Generating…' : `Generate ${selectedIds.length || 'selected'} document${selectedIds.length === 1 ? '' : 's'}`}</button>
          {rows && <button className={btnSecondary} disabled={!rows.some(row => row.state === 'ready')} onClick={finalizeAll}><CheckCircle2 size={15}/>Finalize {rows.filter(row => row.state === 'ready').length} ready</button>}
        </div>

        {notice && <p role="status" className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}

        {rows && <div className="overflow-x-auto border border-gray-100 rounded-xl"><table className="w-full text-left text-xs min-w-[640px]"><thead className="bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wider"><tr><th className="px-3 py-2">Worker</th><th className="px-3 py-2">BSS ID</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Document</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Action</th></tr></thead><tbody className="divide-y divide-gray-100">{rows.map((row, index) => <tr key={row.worker.bssId + index}><td className="px-3 py-2 font-semibold text-gray-800">{row.worker.name}</td><td className="px-3 py-2 font-mono text-[10px] text-gray-500">{row.worker.bssId}</td><td className="px-3 py-2">{row.state === 'ready' ? <span className="inline-flex items-center gap-1 text-green-700 font-bold"><CheckCircle2 size={13}/>Ready</span> : <span className="inline-flex items-center gap-1 text-amber-700 font-bold"><XCircle size={13}/>Missing data</span>}</td><td className="px-3 py-2 font-mono text-[10px] text-[#073B67]">{row.document?.documentNumber ?? '—'}</td><td className="px-3 py-2">{row.document && <DocStatusBadge status={row.document.status}/>}</td><td className="px-3 py-2">{row.state === 'missing' ? <span className="text-[10px] text-amber-700">⚠ {row.reason}</span> : row.document?.renderedHtml ? <button className="h-7 px-2 rounded-md border text-[10px] font-semibold inline-flex items-center gap-1" onClick={() => openPrintHtml(row.document!.renderedHtml!, row.document!.documentNumber)}><FileDown size={11}/>Print / PDF</button> : '—'}</td></tr>)}</tbody></table></div>}
      </div>
    </DocModal>
  );
}
