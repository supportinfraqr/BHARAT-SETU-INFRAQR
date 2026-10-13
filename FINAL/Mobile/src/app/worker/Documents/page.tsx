"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, CheckCircle2, Clock, AlertTriangle, Upload, Eye, XCircle, Download, RefreshCcw, Trash2, ChevronLeft, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorker } from '@/contexts/WorkerContext';
import PageHero from '@/components/portal/PageHero';
import { buildGatePassHtml } from '@/lib/documentEngine/gatePass';
import { GatePassViewer } from '@/components/documentEngine/GatePassViewer';
import type { OwnerScope } from '@/lib/documentEngine/types';
import type { PortalView, WorkerLike } from '@/lib/documentEngine/workerDataService';
import EnterpriseDataTable, { DataColumn } from '@/components/worker/EnterpriseDataTable';

type DocumentRow = {
  id: number | null;
  name: string;
  code: string;
  mandatory: boolean;
  owner: string;
  status: string;
  date: string | null;
  expiry: string | null;
  fileName: string;
  downloadUrl: string;
  locked?: boolean;
  source?: string;
  ocrFailed?: boolean;
  ocrFindings?: string;
};

const STATUS_LABELS: Record<string, string> = {
  MISSING: 'Missing',
  UPLOADED: 'Uploaded',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  UNDER_VERIFICATION: 'Under Verification',
  EXPIRED: 'Expired',
  ISSUED: 'Issued',
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DocumentsModule() {
  const { t } = useLanguage();
  const router = useRouter();
  const { worker } = useWorker();
  const gatePasses = worker.gatePasses ?? [];
  const [passPreview, setPassPreview] = useState<{ html: string; title: string } | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploadTarget, setUploadTarget] = useState<{ code: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/worker/documents', { cache: 'no-store' });
      const json = await response.json() as { data?: DocumentRow[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'Documents could not be loaded.');
      // Auto-issued documents (letters, gate passes) live under "My Issued Letters".
      setDocuments((json.data ?? []).filter(doc => doc.owner !== 'System'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Documents could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
  useEffect(() => { void load(); }, [load]);

  const docView = useMemo(() => {
    const employment = worker.employment;
    const owner: OwnerScope = { ownerType: 'employer', ownerId: employment.employerDetails?.code ?? '', ownerName: employment.employer, bssId: employment.employerDetails?.code ?? '' };
    const workerLike: WorkerLike = { name: worker.identity.name, bssId: worker.identity.bssId, site: employment.site, designation: employment.designation, employer: employment.employer, contractor: employment.contractor, doj: employment.doj, gender: worker.identity.gender, photoUrl: worker.identity.photoUrl, status: employment.status };
    const view: PortalView = {
      owner,
      workers: [workerLike],
      sites: [{ name: employment.site, code: employment.siteDetails?.code, address: employment.siteDetails?.location }],
      contractors: [{ name: employment.contractor, bssId: employment.contractorDetails?.code ?? '', address: employment.contractorDetails?.address }],
      employers: [{ name: employment.employer, bssId: employment.employerDetails?.code ?? '', address: employment.employerDetails?.address }],
    };
    return { owner, view, workerLike };
  }, [worker]);

  async function viewPass(pass: { type: string; number: string; validFrom: string; validTo: string; blocked?: boolean; branding?: { companyName?: string; logoUrl?: string; header?: string } }) {
    const html = await buildGatePassHtml(docView.owner, docView.view, docView.workerLike, pass.type === 'Permanent' ? 'permanent-gate-pass' : 'temporary-gate-pass', { validFrom: pass.validFrom, validTo: pass.validTo, number: pass.number, branding: pass.branding });
    setPassPreview({ html, title: `${docView.workerLike.name} · ${pass.type} Gate Pass` });
  }

  const chooseFile = (doc: DocumentRow) => {
    if (!worker.identity.aadhaarVerified && !worker.identity.aadhaar) {
      setError('Aadhaar verification record is required before uploading documents. Please complete Aadhaar verification first.');
      return;
    }
    setUploadTarget({ code: doc.code, name: doc.name });
    inputRef.current?.click();
  };

  const receiveFile = async (file?: File) => {
    if (!file || !uploadTarget) return;
    if (file.size > 10 * 1024 * 1024) { setError('Document must be 10 MB or smaller.'); return; }
    const target = uploadTarget;
    setBusy(target.code);
    setError('');
    setNotice('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('code', target.code);
      form.append('name', target.name);
      const response = await fetch('/api/worker/documents', { method: 'POST', body: form });
      const json = await response.json() as { error?: string; points?: { label?: string; passed?: boolean }[] };
      if (!response.ok) {
        const failed = (json.points || []).filter(p => !p.passed && p.label).map(p => p.label as string);
        throw new Error((json.error || 'Upload failed.') + (failed.length ? ` (${failed.join('; ')})` : ''));
      }
      setNotice(`${target.name} uploaded — pending verification.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(null);
      setUploadTarget(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (doc: DocumentRow) => {
    if (!doc.id) return;
    if (!window.confirm(`Delete the uploaded ${doc.name}?`)) return;
    setBusy(doc.code);
    setError('');
    try {
      const response = await fetch(`/api/worker/documents/${doc.id}`, { method: 'DELETE' });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error || 'Delete failed.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusy(null);
    }
  };

  const openDocument = (doc: DocumentRow) => {
    if (!doc.id) return;
    window.open(`/api/worker/documents/${doc.id}/file`, '_blank', 'noopener,noreferrer');
  };

  const label = (status: string) => STATUS_LABELS[status] ?? status;

  // Auto-generated gate-pass rows in the register link to the rendered pass.
  // Only the applicable type is issued (Permanent if eligible, else Temporary);
  // the other type is shown as Disabled.
  const isGatePassRow = (d: DocumentRow) => d.owner === 'System' && /gate pass/i.test(d.name);
  const gatePassRowType = (d: DocumentRow): 'Permanent' | 'Temporary' => /permanent/i.test(d.name) ? 'Permanent' : 'Temporary';
  const issuedGatePassType = gatePasses[0]?.type as 'Permanent' | 'Temporary' | undefined;
  const gatePassFor = (d: DocumentRow) => {
    if (!isGatePassRow(d) || gatePassRowType(d) !== issuedGatePassType) return null;
    return gatePasses.find(pass => pass.type === gatePassRowType(d)) ?? null;
  };
  const gatePassDisabled = (d: DocumentRow) => Boolean(isGatePassRow(d) && issuedGatePassType && gatePassRowType(d) !== issuedGatePassType);

  const getStatusConfig = (status: string) => {
    switch (label(status)) {
      case 'Verified': return { bg: 'bg-bss-soft-green', text: 'text-bss-green', icon: <CheckCircle2 size={14} /> };
      case 'Uploaded': return { bg: 'bg-bss-blue-tint', text: 'text-bss-interactive-blue', icon: <FileText size={14} /> };
      case 'Under Verification': return { bg: 'bg-bss-blue-tint', text: 'text-bss-interactive-blue', icon: <Clock size={14} /> };
      case 'Rejected': return { bg: 'bg-bss-soft-orange', text: 'text-bss-error', icon: <XCircle size={14} /> };
      case 'Expired': return { bg: 'bg-bss-soft-orange', text: 'text-bss-orange', icon: <AlertTriangle size={14} /> };
      case 'Missing': return { bg: 'bg-bss-bg', text: 'text-bss-text-muted', icon: <FileText size={14} /> };
      case 'Issued': return { bg: 'bg-sky-100', text: 'text-sky-700', icon: <FileText size={14} /> };
      default: return { bg: 'bg-bss-bg', text: 'text-bss-text-muted', icon: <FileText size={14} /> };
    }
  };

  const columns: DataColumn<DocumentRow>[] = [
    { id: 'name', header: 'Document name', value: d => d.name, render: d => <span className="font-semibold text-bss-text-primary">{d.name}{d.mandatory && <span className="text-bss-error ml-1">*</span>}</span> },
    { id: 'type', header: 'Mandatory / Optional', value: d => d.mandatory ? 'Mandatory' : 'Optional', render: d => <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.mandatory ? 'bg-bss-soft-orange text-[#E45D24]' : 'bg-bss-bg text-bss-text-muted'}`}>{d.mandatory ? 'Mandatory' : 'Optional'}</span> },
    { id: 'owner', header: 'Document Owner', value: d => d.owner, render: d => d.owner === 'System' ? <span className="text-[10px] font-bold bg-[#01183A]/10 text-[#01183A] px-2 py-0.5 rounded">Auto-Generated</span> : d.owner },
    { id: 'status', header: 'Document Status', value: d => gatePassFor(d)?.status ?? (gatePassDisabled(d) ? 'Disabled' : label(d.status)), render: d => { const gp = gatePassFor(d); if (gp) { const tone = gp.status === 'Approved' ? 'bg-bss-soft-green text-bss-green' : gp.status === 'Blocked' ? 'bg-bss-bg text-bss-text-secondary' : 'bg-bss-soft-orange text-bss-orange'; return <span className={`text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1.5 ${tone}`}><CheckCircle2 size={14}/>{gp.status}</span>; } if (gatePassDisabled(d)) return <span className="text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1.5 bg-bss-bg text-bss-text-muted">Disabled</span>; const config = getStatusConfig(d.status); return <span className="inline-flex flex-col items-start gap-1"><span className={`text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1.5 ${config.bg} ${config.text}`}>{config.icon}{label(d.status)}</span></span>; } },
    { id: 'date', header: 'Date', value: d => gatePassFor(d)?.validFrom ?? formatDate(d.date) ?? '-' },
    { id: 'expiry', header: 'Expiry Date', value: d => gatePassFor(d)?.validTo ?? formatDate(d.expiry) ?? '-', render: d => { const gp = gatePassFor(d); const value = gp ? gp.validTo : formatDate(d.expiry); return value ? <span className="text-xs font-semibold text-bss-text-secondary">{value}</span> : <span className="text-bss-text-muted">—</span>; } },
    {
      id: 'actions', header: 'Actions', filterable: false, value: d => label(d.status), render: d => {
        const gp = gatePassFor(d);
        if (gp) return <button onClick={() => { void viewPass(gp); }} disabled={gp.blocked} className="h-8 px-3 rounded-lg bg-[#01183A] text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"><Eye size={13}/>View pass</button>;
        if (gatePassDisabled(d)) return <span className="text-[11px] font-semibold text-bss-text-muted">Not applicable</span>;
        const locked = Boolean(d.locked);
        return <div className="flex gap-1.5 items-center">
          {d.id && label(d.status) !== 'Missing' && <button onClick={() => openDocument(d)} className="p-1.5 text-bss-text-muted hover:text-[#01183A] bg-bss-bg rounded border" title="View Document"><Eye size={15} /></button>}
          {d.id && <a href={`/api/worker/documents/${d.id}/file`} download className="p-1.5 text-bss-text-muted hover:text-[#01183A] bg-bss-bg rounded border" title="Download"><Download size={15} /></a>}
          {locked ? (
            d.source === 'digilocker'
              ? <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-1 rounded" title="Fetched from DigiLocker — upload and delete disabled">DigiLocker</span>
              : <span className="text-[10px] font-bold text-[#01183A] bg-[#01183A]/10 px-2 py-1 rounded" title="System-generated credential — upload and delete disabled">System</span>
          ) : (
            <>
              {d.owner !== 'System' && !d.id && <button onClick={() => chooseFile(d)} disabled={busy === d.code} className="bg-[#01183A] text-white px-2.5 py-1 rounded font-bold text-[10px] whitespace-nowrap flex items-center gap-1 disabled:opacity-60"><Upload size={12} />{busy === d.code ? 'Uploading…' : 'Upload'}</button>}
            </>
          )}
          {!d.locked && d.owner !== 'System' && d.id && <button onClick={() => remove(d)} className="p-1.5 text-bss-text-muted hover:text-bss-error bg-bss-bg rounded border" title="Delete Document"><Trash2 size={15} /></button>}
        </div>;
      },
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHero
        title={t('nav.documents')}
        subtitle="Manage all your mandatory KYC, compliance, and system-generated credentials."
        actions={<>
          <button
            type="button"
            onClick={() => { if (window.history.length > 1) router.back(); else router.push('/worker/Profile'); }}
            aria-label="Go back"
            className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => void load()} className="whitespace-nowrap inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-colors">
            <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </>}
      />

      <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={e => void receiveFile(e.target.files?.[0])} />

      {error && <div className="rounded-xl border border-bss-border bg-bss-soft-orange px-4 py-3 text-sm text-bss-error">{error}</div>}
      {notice && <div className="rounded-xl border border-bss-border bg-bss-soft-green px-4 py-3 text-sm text-bss-green">{notice}</div>}

      <section className="bss-scroll-rise flex items-start gap-3 rounded-2xl border border-bss-border bg-bss-blue-tint/60 p-4">
        <span className="w-9 h-9 rounded-xl bg-white border border-bss-border text-bss-interactive-blue grid place-items-center flex-shrink-0"><Info size={17}/></span>
        <p className="text-xs text-bss-text-secondary leading-relaxed">
          Upload each mandatory document as <strong>PDF, JPEG or PNG</strong> (max 10 MB). Uploads are saved to your BSS record and move to <strong>Under Verification</strong> until reviewed — a manual upload is never marked <strong>Verified</strong>. Documents marked <strong>Auto-Generated</strong> (e.g. gate passes) are issued by the system after employer/contractor approvals and cannot be uploaded here.
        </p>
      </section>

      {loading && documents.length === 0 ? (
        <p className="text-sm text-bss-text-muted">Loading documents…</p>
      ) : (
        <div id="missing-documents" className="bss-scroll-rise">
          <EnterpriseDataTable title="Document records" rows={documents} columns={columns} rowKey={d => `${d.code}-${d.id ?? 'x'}`} filename="bss-worker-documents" defaultPageSize={15} mobileCards />
        </div>
      )}

      {passPreview && <GatePassViewer html={passPreview.html} title={passPreview.title} onClose={() => setPassPreview(null)} />}
    </div>
  );
}
