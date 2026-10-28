"use client";

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Download, FileText, Loader2, RefreshCw, XCircle } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { exportRowsToXlsx } from '@/lib/exportXlsx';

type Doc = { id:number; code:string; name:string; status:string; fileName:string; uploadedAt:string; hasFile:boolean };
type KycRow = {
  id:number; name:string; bssId:string; mobile:string; site:string; sites:string[]; contractor:string; contractors:string[];
  aadhaar:string; aadhaarVerified:boolean; pan:string; panVerified:boolean; uan:string; uanVerified:boolean;
  esic:string; esicVerified:boolean; bankName:string; accountHolder:string; bankAccount:string; ifsc:string; bankVerified:boolean;
  documents:Doc[];
};

const ok = (value:boolean) => value
  ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-bss-green"><BadgeCheck size={12}/>Verified</span>
  : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-bss-text-muted"><XCircle size={12}/>Pending</span>;

const docStatus = (status:string) => {
  const s = String(status || '').toUpperCase();
  const tone = s === 'VERIFIED' ? 'bg-bss-soft-green text-bss-green' : s === 'REJECTED' || s === 'EXPIRED' ? 'bg-bss-soft-orange text-bss-error' : 'bg-bss-bg text-bss-text-secondary';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${tone}`}>{status || 'UPLOADED'}</span>;
};

export default function WorkerKycPage() {
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyDoc, setBusyDoc] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/employer/worker-kyc', { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { rows?:KycRow[]; error?:string };
      if (!response.ok) throw new Error(body.error || 'Worker KYC data could not be loaded.');
      setRows(body.rows ?? []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Worker KYC data could not be loaded.'); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  async function viewDoc(doc: Doc) {
    setBusyDoc(doc.id); setError('');
    try {
      const response = await fetch(`/api/employer/worker-documents/${doc.id}/token`, { method:'POST' });
      const body = await response.json().catch(() => ({})) as { token?:string; error?:string };
      if (!response.ok || !body.token) throw new Error(body.error || 'Could not open the document.');
      window.open(`/api/employer/worker-documents/file/${encodeURIComponent(body.token)}`, '_blank', 'noopener,noreferrer');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not open the document.'); }
    finally { setBusyDoc(null); }
  }

  const columns: DataColumn<KycRow>[] = [
    { id:'name', header:'Worker', value:r => r.name, render:r => <div><strong className="text-bss-text-primary">{r.name || '—'}</strong><p className="font-mono text-[10px] text-bss-text-muted">{r.bssId}</p></div> },
    { id:'site', header:'Site', value:r => r.site, export:{ split:',' } },
    { id:'contractor', header:'Contractor', value:r => r.contractor },
    { id:'aadhaar', header:'Aadhaar', value:r => r.aadhaar, render:r => <div><p className="font-mono">{r.aadhaar || '—'}</p>{ok(r.aadhaarVerified)}</div> },
    { id:'pan', header:'PAN', value:r => r.pan, render:r => <div><p className="font-mono">{r.pan || '—'}</p>{ok(r.panVerified)}</div> },
    { id:'uan', header:'UAN', value:r => r.uan, render:r => <div><p className="font-mono">{r.uan || '—'}</p>{ok(r.uanVerified)}</div> },
    { id:'esic', header:'ESIC', value:r => r.esic, render:r => <div><p className="font-mono">{r.esic || '—'}</p>{ok(r.esicVerified)}</div> },
    { id:'bank', header:'Bank', value:r => [r.bankName, r.bankAccount, r.ifsc].filter(Boolean).join(' · '), render:r => <div className="min-w-[160px]"><p className="font-semibold text-bss-text-primary">{r.bankName || '—'}</p><p className="font-mono text-[10px] text-bss-text-muted">{r.bankAccount || '—'} · {r.ifsc || '—'}</p><p className="text-[10px] text-bss-text-muted">{r.accountHolder || ''}</p>{ok(r.bankVerified)}</div> },
    { id:'documents', header:'Documents', value:r => r.documents.map(d => `${d.name}: ${d.status}`).join('; '), render:r => r.documents.length
      ? <div className="flex flex-col gap-1.5">{r.documents.map(d => <button key={d.id} type="button" disabled={busyDoc === d.id || !d.hasFile} onClick={() => void viewDoc(d)} title={d.fileName} className="inline-flex items-center gap-1.5 text-left text-[10px] font-semibold text-bss-interactive-blue hover:underline disabled:opacity-50 disabled:no-underline"><FileText size={12}/>{d.name}{docStatus(d.status)}</button>)}</div>
      : <span className="text-[10px] text-bss-text-muted">No Aadhaar/PAN/Bank file</span> },
  ];

  const verifiedAadhaar = rows.filter(r => r.aadhaarVerified).length;
  const verifiedPan = rows.filter(r => r.panVerified).length;
  const verifiedBank = rows.filter(r => r.bankVerified).length;

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Compliance</p>
        <h1 className="mt-1 text-2xl font-bold text-bss-text-primary">Worker KYC &amp; Bank</h1>
        <p className="mt-1 max-w-3xl text-sm text-bss-text-muted">Aadhaar, PAN, UAN, ESIC and bank details for workers bound to your sites. Numbers are masked; use the document links for the uploaded evidence.</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-bss-border bg-white px-3 text-xs font-bold text-bss-text-primary hover:bg-bss-bg disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>Refresh</button>
        <button type="button" onClick={() => exportRowsToXlsx({ filename:`worker-kyc-bank-${new Date().toISOString().slice(0,10)}`, columns: columns.map(c => ({ header:c.header, value:c.value, split:c.export?.split })), rows, sheetName:'Worker KYC' })} disabled={!rows.length} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-bss-navy px-3 text-xs font-bold text-white disabled:opacity-50"><Download size={14}/>Export Excel</button>
      </div>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="Workers" value={rows.length} />
      <Metric label="Aadhaar verified" value={`${verifiedAadhaar}/${rows.length}`} />
      <Metric label="PAN verified" value={`${verifiedPan}/${rows.length}`} />
      <Metric label="Bank verified" value={`${verifiedBank}/${rows.length}`} />
    </div>
    {loading && !rows.length
      ? <p className="flex items-center gap-2 py-10 text-sm text-bss-text-muted"><Loader2 size={16} className="animate-spin"/>Loading…</p>
      : <EnterpriseDataTable title="Worker KYC & bank register" rows={rows} columns={columns} rowKey={r => String(r.id)} filename="worker-kyc-bank" defaultPageSize={25} />}
  </div>;
}

function Metric({ label, value }: { label:string; value:string|number }) {
  return <div className="rounded-2xl border border-bss-border bg-white p-4"><span className="text-[10px] font-bold uppercase tracking-wide text-bss-text-muted">{label}</span><strong className="mt-1 block text-xl font-extrabold text-bss-text-primary tabular-nums">{value}</strong></div>;
}
