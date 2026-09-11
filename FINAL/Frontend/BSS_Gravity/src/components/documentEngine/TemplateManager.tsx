"use client";

import { useEffect, useReducer, useState } from 'react';
import { Copy, FileText, History, Layers, Plus, RefreshCw, RotateCcw, ShieldCheck, Sparkles, TestTube2 } from 'lucide-react';
import { DOCUMENT_TYPES, DocumentType, OwnerScope } from '@/lib/documentEngine/types';
import type { TemplateVersionRecord } from '@/lib/documentEngine/types';
import { templateService } from '@/lib/documentEngine/services';
import TemplateEditor from './TemplateEditor';
import { TemplateStatusBadge, DocModal, btnPrimary, btnSecondary } from './DocPrimitives';

export type DocType = DocumentType;

function iconFor(type: DocumentType) {
  return type === 'appointment-letter' ? FileText : type === 'experience-letter' ? Layers : ShieldCheck;
}

export default function DocumentTemplateManager({ owner, onGenerate }: { owner: OwnerScope; onGenerate: (type: DocumentType) => void }) {
  const [refreshKey, forceRefresh] = useReducer((value: number) => value + 1, 0);
  const [editor, setEditor] = useState<{ type: DocumentType; record: TemplateVersionRecord | null } | null>(null);
  const [versionsFor, setVersionsFor] = useState<{ lineageId: string; name: string; type: DocumentType } | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const seeded = templateService.seedFor(owner, 'Admin');
    void seeded;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner.ownerType, owner.ownerId]);

  const lineages = templateService.lineages(owner);
  const byType = (type: DocumentType) => lineages.filter(lineage => lineage.documentType === type);

  function duplicate(lineageId: string, name: string) {
    templateService.duplicate(lineageId, 'Me');
    setNotice(`Duplicated "${name}" as a new Draft lineage.`);
    forceRefresh();
  }

  function activateVersion(lineageId: string, recordId: string) {
    const record = templateService.getById(recordId);
    templateService.activate(owner, lineageId, recordId, 'Me');
    setNotice(`${record?.template.version} activated — issued documents keep their historical versions.`);
    setVersionsFor(null);
    forceRefresh();
  }

  function restoreVersion(lineageId: string, recordId: string) {
    const record = templateService.restore(lineageId, recordId, 'Me');
    setNotice(`Restored ${record.template.version} as a new draft (${record.template.version}).`);
    setVersionsFor(null);
    forceRefresh();
  }

  return (
    <div className="space-y-6 pb-12">
      {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}

      <section className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs leading-5 text-blue-900">
        <strong>How templates work:</strong> design once, finalize, and the Active template auto-fills for every applicable worker using BSS data tokens
        (<code className="font-mono">{"{{worker.fullName}}"}</code>, <code className="font-mono">{"{{employment.designation}}"}</code>…). Editing an Active template forks a Draft vN+1 — issued documents are never rewritten.
        Template owner: <strong>{owner.ownerName}</strong> ({owner.ownerType}).
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {DOCUMENT_TYPES.map(meta => {
          const Icon = iconFor(meta.id);
          const items = byType(meta.id);
          const lineage = items[0];
          return (
            <article key={meta.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <header className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-blue-50 text-[#073B67] grid place-items-center"><Icon size={19}/></span>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-950">{meta.short}</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">{meta.label} template</p>
                  </div>
                </div>
                {lineage ? <TemplateStatusBadge status={lineage.status}/> : <TemplateStatusBadge status="Not created"/>}
              </header>
              <div className="p-5">
                {lineage ? (
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div><dt className="text-gray-400">Template</dt><dd className="font-semibold text-gray-800 mt-0.5 truncate">{lineage.name}</dd></div>
                    <div><dt className="text-gray-400">Version</dt><dd className="font-semibold text-gray-800 mt-0.5 font-mono">{lineage.version}</dd></div>
                    <div><dt className="text-gray-400">Last updated</dt><dd className="text-gray-700 mt-0.5">{new Date(lineage.updatedAt).toLocaleDateString('en-IN')}</dd></div>
                    <div><dt className="text-gray-400">Updated by</dt><dd className="text-gray-700 mt-0.5">{lineage.updatedBy}</dd></div>
                  </dl>
                ) : <p className="text-xs text-gray-400">No template yet — create the default and start designing.</p>}
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                  {lineage ? (
                    <>
                      <button className={btnPrimary + ' !h-9 !px-3 !text-xs'} onClick={() => setEditor({ type: meta.id, record: templateService.versions(lineage.lineageId).find(record => record.active) ?? templateService.versions(lineage.lineageId)[0] ?? null })}><Sparkles size={13}/>Edit template</button>
                      <button className={btnSecondary + ' !h-9 !px-3 !text-xs'} onClick={() => setVersionsFor({ lineageId: lineage.lineageId, name: lineage.name, type: meta.id })}><History size={13}/>Versions & restore</button>
                      <button className={btnSecondary + ' !h-9 !px-3 !text-xs'} onClick={() => duplicate(lineage.lineageId, lineage.name)}><Copy size={13}/>Duplicate</button>
                      <button className={btnSecondary + ' !h-9 !px-3 !text-xs'} onClick={() => onGenerate(meta.id)}><TestTube2 size={13}/>Test with worker</button>
                    </>
                  ) : (
                    <button className={btnPrimary + ' !h-9 !px-3 !text-xs'} onClick={() => { templateService.seedFor(owner, 'Admin'); forceRefresh(); setNotice(`Seeded the default ${meta.short} template.`); }}><Plus size={13}/>Create default</button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-400 flex items-center gap-1.5"><RefreshCw size={12}/>Tip: preview with a worker before you finalize. Issued documents store a rendered copy of the template version used at issue time.</p>

      {editor && <TemplateEditor key={`${editor.type}-${editor.record?.id ?? 'new'}-${refreshKey}`} owner={owner} record={editor.record} documentType={editor.type} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); forceRefresh(); }}/>}

      {versionsFor && <VersionHistoryDrawer lineageId={versionsFor.lineageId} type={versionsFor.type} onClose={() => setVersionsFor(null)} onActivate={activateVersion} onRestore={restoreVersion} onOpenRecord={record => { setVersionsFor(null); setEditor({ type: versionsFor.type, record }); }}/>}
    </div>
  );
}

function VersionHistoryDrawer({
  lineageId, type, onClose, onActivate, onRestore, onOpenRecord,
}: {

  lineageId: string;
  type: DocumentType;
  onClose: () => void;
  onActivate: (lineageId: string, recordId: string) => void;
  onRestore: (lineageId: string, recordId: string) => void;
  onOpenRecord: (record: TemplateVersionRecord) => void;
}) {
  const versions = templateService.versions(lineageId);
  const [busy, setBusy] = useState(false);
  return (
    <DocModal title="Template version history" subtitle={`${versions[0]?.template.name ?? 'Template'} · ${DOCUMENT_TYPES.find(item => item.id === type)?.short}`} onClose={onClose} wide>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[720px]">
        <thead className="bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wider"><tr><th className="px-4 py-3">Version</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created by</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Note</th><th className="px-4 py-3">Actions</th></tr></thead>
        <tbody className="divide-y divide-gray-100">{versions.map(record => <tr key={record.id} className={record.active ? 'bg-green-50/40' : ''}><td className="px-4 py-3 font-mono font-semibold text-gray-900">{record.template.version}</td><td className="px-4 py-3"><TemplateStatusBadge status={record.template.status}/>{record.active && <span className="ml-2 text-[9px] font-bold text-green-700 bg-green-100 rounded px-1 py-0.5">ACTIVE</span>}</td><td className="px-4 py-3 text-gray-600">{record.createdBy}</td><td className="px-4 py-3 text-gray-600">{new Date(record.createdAt).toLocaleString('en-IN')}</td><td className="px-4 py-3 text-gray-500">{record.note || '—'}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">
          <button className="h-8 px-3 rounded-lg border text-[11px] font-semibold" onClick={() => onOpenRecord(record)}><Layers size={12} className="inline mr-1"/>Open / preview</button>
          {!record.active && <button disabled={busy} className="h-8 px-3 rounded-lg bg-green-700 text-white text-[11px] font-bold" onClick={() => { setBusy(true); onActivate(lineageId, record.id); }}><ShieldCheck size={12} className="inline mr-1"/>Activate</button>}
          <button className="h-8 px-3 rounded-lg border text-[11px] font-semibold text-amber-700" onClick={() => onRestore(lineageId, record.id)}><RotateCcw size={12} className="inline mr-1"/>Restore</button>
        </div></td></tr>)}</tbody></table></div>
      <p className="text-[11px] text-gray-400 mt-3">Restoring creates a new Draft from the chosen historical version — it never overwrites issued documents or the active template.</p>
    </DocModal>
  );
}
