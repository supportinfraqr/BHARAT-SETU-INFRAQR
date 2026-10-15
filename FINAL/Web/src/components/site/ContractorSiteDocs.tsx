"use client";

import { useRef, useState } from 'react';
import { CheckCircle2, FileText, Loader2, RotateCw, Upload, XCircle } from 'lucide-react';
import type { SiteDoc, SiteDocAudit, SiteDocs } from '@/types/portal';

const ROWS: Array<{ key: 'agreement' | 'po'; docType: 'AGREEMENT' | 'PO'; label: string }> = [
  { key: 'agreement', docType: 'AGREEMENT', label: 'Signed Agreement' },
  { key: 'po', docType: 'PO', label: 'Purchase Order / Work Order' },
];

function statusMeta(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'passed':
      return { label: 'Audit passed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'failed':
      return { label: 'Audit failed', cls: 'bg-red-50 text-red-700 border-red-200' };
    case 'review':
      return { label: 'Needs review', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'pending':
      return { label: 'Auditing…', cls: 'bg-bss-blue-tint text-bss-interactive-blue border-bss-border' };
    case 'unavailable':
      return { label: 'Audit unavailable', cls: 'bg-slate-50 text-slate-600 border-slate-200' };
    case 'error':
      return { label: 'Audit error', cls: 'bg-slate-50 text-slate-600 border-slate-200' };
    default:
      return null;
  }
}

/**
 * The signed-agreement and purchase-order/work-order documents for one
 * contractor↔site pair. Either the principal employer or the contractor may
 * upload; both can view. A re-upload adds a new version (never deletes).
 * Each document is AI-audited against its own step list on upload, and can be
 * re-audited on demand.
 */
export default function ContractorSiteDocs({
  role, siteId, contractorId, documents, onChanged,
}: {
  role: 'employer' | 'contractor';
  siteId: string | number;
  contractorId?: string | number;
  documents: SiteDocs;
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState('');
  const [reaudit, setReaudit] = useState('');
  const [error, setError] = useState('');
  const [local, setLocal] = useState<Record<string, SiteDoc>>({});
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  function docFor(key: string): SiteDoc {
    if (key in local) return local[key];
    return (documents as Record<string, SiteDoc>)?.[key] ?? null;
  }

  async function upload(docType: string, file: File) {
    setBusy(docType);
    setError('');
    try {
      const fd = new FormData();
      fd.append('docType', docType);
      fd.append('siteId', String(siteId));
      if (contractorId !== undefined && contractorId !== null) fd.append('contractorId', String(contractorId));
      fd.append('file', file);
      const res = await fetch(`/api/${role}/site-documents`, { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({})) as { data?: SiteDoc; error?: string };
      if (!res.ok) throw new Error(body.error || 'The document could not be uploaded.');
      if (body.data) setLocal(prev => ({ ...prev, [docType === 'AGREEMENT' ? 'agreement' : 'po']: body.data as SiteDoc }));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The document could not be uploaded.');
    } finally {
      setBusy('');
    }
  }

  async function runAudit(doc: NonNullable<SiteDoc>, rowKey: string) {
    setReaudit(rowKey);
    setError('');
    setLocal(prev => ({ ...prev, [rowKey]: { ...doc, aiStatus: 'pending' } }));
    try {
      const res = await fetch(`/api/site-documents/${doc.id}/audit`, { method: 'POST' });
      const body = await res.json().catch(() => ({})) as { data?: SiteDoc; error?: string };
      if (!res.ok) throw new Error(body.error || 'The audit could not be run.');
      if (body.data) setLocal(prev => ({ ...prev, [rowKey]: body.data as SiteDoc }));
    } catch (e) {
      setLocal(prev => ({ ...prev, [rowKey]: doc }));
      setError(e instanceof Error ? e.message : 'The audit could not be run.');
    } finally {
      setReaudit('');
    }
  }

  return (
    <div className="space-y-2">
      {ROWS.map(row => {
        const doc = docFor(row.key);
        const audit: SiteDocAudit | undefined = doc?.ai;
        const meta = statusMeta(doc?.aiStatus);
        const auditing = reaudit === row.key || doc?.aiStatus === 'pending';
        return (
          <div key={row.key} className="rounded-xl border border-bss-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-bss-text-primary flex items-center gap-1.5"><FileText size={13} />{row.label}</p>
                {doc ? (
                  <p className="text-[11px] text-bss-text-muted truncate">
                    {doc.fileName} · v{doc.version}{doc.uploadedBy ? ` · by ${doc.uploadedBy}` : ''}{doc.uploadedAt ? ` · ${doc.uploadedAt}` : ''}
                  </p>
                ) : (
                  <p className="text-[11px] text-bss-text-muted">Not uploaded yet.</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {doc && (
                  <a href={doc.url} target="_blank" rel="noreferrer" className="h-8 px-3 rounded-lg border border-bss-border text-[11px] font-bold text-bss-interactive-blue hover:bg-bss-blue-tint">View</a>
                )}
                {doc && (
                  <button
                    type="button"
                    onClick={() => void runAudit(doc, row.key)}
                    disabled={auditing || busy === row.docType}
                    title="Re-run AI audit"
                    className="h-8 px-2.5 rounded-lg border border-bss-border text-bss-text-secondary hover:bg-bss-surface-alt inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {auditing ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => refs.current[row.key]?.click()}
                  disabled={busy === row.docType}
                  className="h-8 px-3 rounded-lg bg-[#01183A] text-white text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-60"
                >
                  {busy === row.docType ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {doc ? 'Replace' : 'Upload'}
                </button>
                <input
                  ref={el => { refs.current[row.key] = el; }}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) void upload(row.docType, f); e.target.value = ''; }}
                />
              </div>
            </div>

            {meta && (
              <div className="mt-2 space-y-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.cls}`}>
                  {doc?.aiStatus === 'passed' ? <CheckCircle2 size={11} /> : doc?.aiStatus === 'failed' ? <XCircle size={11} /> : null}
                  {meta.label}
                  {audit?.model ? <span className="font-normal opacity-70">· {audit.model}</span> : null}
                </span>
                {audit?.summary && <p className="text-[11px] text-bss-text-secondary">{audit.summary}</p>}
                {audit?.message && <p className="text-[11px] text-bss-text-muted">{audit.message}</p>}
                {!!audit?.steps?.length && (
                  <ul className="space-y-0.5">
                    {audit.steps.map((s, i) => (
                      <li key={i} className="text-[11px] text-bss-text-secondary flex items-start gap-1.5">
                        <span className={
                          /pass/i.test(s.status) ? 'text-emerald-600'
                            : /fail/i.test(s.status) ? 'text-red-600'
                              : /partial/i.test(s.status) ? 'text-amber-600' : 'text-bss-text-muted'
                        }>•</span>
                        <span><span className="font-semibold">{s.step}</span>{s.observation ? ` — ${s.observation}` : ''}{s.risk ? ` (${s.risk} risk)` : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
      {error && <p role="alert" className="text-[11px] text-bss-error">{error}</p>}
    </div>
  );
}
