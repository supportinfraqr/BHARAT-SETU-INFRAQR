"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, CheckCircle2, Clock, AlertTriangle, Upload, Eye, XCircle, Download, RefreshCcw, Trash2, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
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
};

const STATUS_LABELS: Record<string, string> = {
  MISSING: 'Missing',
  UPLOADED: 'Uploaded',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  UNDER_VERIFICATION: 'Under Verification',
  EXPIRED: 'Expired',
};

// Document types that BSS pulls automatically from DigiLocker — manual upload is
// disabled for these (the file comes from the linked DigiLocker account).
const DIGILOCKER_FETCHED_CODES = new Set(['AADHAR', 'PAN', 'UAN', 'EDU']);

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DocumentsModule() {
  const { t } = useLanguage();
  const router = useRouter();
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
      setDocuments(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Documents could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const chooseFile = (doc: DocumentRow) => {
    setUploadTarget({ code: doc.code, name: doc.name });
    inputRef.current?.click();
  };

  const receiveFile = async (file?: File) => {
    if (!file || !uploadTarget) return;
    if (file.size > 10 * 1024 * 1024) { setError('Document must be 10 MB or smaller.'); return; }
    setBusy(uploadTarget.code);
    setError('');
    setNotice('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('code', uploadTarget.code);
      form.append('name', uploadTarget.name);
      const response = await fetch('/api/worker/documents', { method: 'POST', body: form });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error || 'Upload failed.');
      setNotice(`${uploadTarget.name} uploaded — pending verification.`);
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

  const getStatusConfig = (status: string) => {
    switch (label(status)) {
      case 'Verified': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 size={14} /> };
      case 'Uploaded': return { bg: 'bg-blue-50', text: 'text-blue-600', icon: <FileText size={14} /> };
      case 'Under Verification': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock size={14} /> };
      case 'Rejected': return { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={14} /> };
      case 'Expired': return { bg: 'bg-orange-100', text: 'text-orange-700', icon: <AlertTriangle size={14} /> };
      case 'Missing': return { bg: 'bg-gray-100', text: 'text-gray-500', icon: <FileText size={14} /> };
      default: return { bg: 'bg-gray-100', text: 'text-gray-500', icon: <FileText size={14} /> };
    }
  };

  const columns: DataColumn<DocumentRow>[] = [
    { id: 'name', header: 'Document name', value: d => d.name, render: d => <span className="font-semibold text-gray-800">{d.name}{d.mandatory && <span className="text-red-500 ml-1">*</span>}</span> },
    { id: 'type', header: 'Mandatory / Optional', value: d => d.mandatory ? 'Mandatory' : 'Optional', render: d => <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.mandatory ? 'bg-orange-50 text-[#F47A32]' : 'bg-gray-100 text-gray-500'}`}>{d.mandatory ? 'Mandatory' : 'Optional'}</span> },
    { id: 'owner', header: 'Document Owner', value: d => d.owner, render: d => d.owner === 'System' ? <span className="text-[10px] font-bold bg-[#073B67]/10 text-[#073B67] px-2 py-0.5 rounded">Auto-Generated</span> : d.owner },
    { id: 'status', header: 'Document Status', value: d => label(d.status), render: d => { const config = getStatusConfig(d.status); return <span className={`text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1.5 ${config.bg} ${config.text}`}>{config.icon}{label(d.status)}</span>; } },
    { id: 'date', header: 'Upload Date', value: d => formatDate(d.date) ?? '-' },
    { id: 'expiry', header: 'Expiry Date', value: d => formatDate(d.expiry) ?? '-', render: d => d.expiry ? <span className={`text-xs font-semibold ${label(d.status) === 'Expired' ? 'text-orange-600' : 'text-gray-700'}`}>{formatDate(d.expiry)}</span> : <span className="text-gray-300">—</span> },
    {
      id: 'actions', header: 'Actions', filterable: false, value: d => label(d.status), render: d => {
        const locked = Boolean(d.locked) || DIGILOCKER_FETCHED_CODES.has(d.code);
        return <div className="flex gap-1.5 items-center">
          {d.id && label(d.status) !== 'Missing' && <button onClick={() => openDocument(d)} className="p-1.5 text-gray-400 hover:text-[#073B67] bg-gray-50 rounded border" title="View Document"><Eye size={15} /></button>}
          {d.id && <a href={`/api/worker/documents/${d.id}/file`} download className="p-1.5 text-gray-400 hover:text-[#073B67] bg-gray-50 rounded border" title="Download"><Download size={15} /></a>}
          {locked ? (
            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-1 rounded" title="Fetched from DigiLocker — upload and delete disabled">DigiLocker</span>
          ) : (
            <>
              {d.owner !== 'System' && d.id && <button onClick={() => chooseFile(d)} className="p-1.5 text-gray-400 hover:text-[#073B67] bg-gray-50 rounded border" title="Replace Document"><RefreshCcw size={15} /></button>}
              {d.owner !== 'System' && !d.id && <button onClick={() => chooseFile(d)} disabled={busy === d.code} className="bg-[#073B67] text-white px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1 disabled:opacity-60"><Upload size={14} />{busy === d.code ? 'Uploading…' : 'Upload'}</button>}
            </>
          )}
          {!d.locked && d.owner !== 'System' && d.id && <button onClick={() => remove(d)} className="p-1.5 text-gray-300 hover:text-red-600 bg-gray-50 rounded border" title="Delete Document"><Trash2 size={15} /></button>}
        </div>;
      },
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => { if (window.history.length > 1) router.back(); else router.push('/worker/Profile'); }}
            aria-label="Go back"
            className="mt-1 w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-[#073B67] hover:border-[#073B67] transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#062D4F]">{t('nav.documents')}</h1>
            <p className="text-sm text-gray-500 mt-1">Manage all your mandatory KYC, compliance, and system-generated credentials.</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-gray-300">
          <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={e => void receiveFile(e.target.files?.[0])} />

      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>}

      <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-xs text-gray-600">
          Upload each mandatory document as <strong>PDF, JPEG or PNG</strong> (max 10 MB). Uploads are saved to your BSS record and move to <strong>Under Verification</strong> until reviewed. <strong>Aadhaar, PAN, UAN and Educational certificates are fetched automatically from your linked DigiLocker account</strong> and cannot be uploaded manually. Documents marked <strong>Auto-Generated</strong> (e.g. gate passes) are issued by the system after employer/contractor approvals and cannot be uploaded here.
        </p>
      </section>

      {loading && documents.length === 0 ? (
        <p className="text-sm text-gray-500">Loading documents…</p>
      ) : (
        <div id="missing-documents">
          <EnterpriseDataTable title="Document records" rows={documents} columns={columns} rowKey={d => `${d.code}-${d.id ?? 'x'}`} filename="bss-worker-documents" defaultPageSize={15} showShare={false} />
        </div>
      )}
    </div>
  );
}
