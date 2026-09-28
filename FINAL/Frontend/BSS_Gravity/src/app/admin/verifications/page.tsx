"use client";

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, Loader2, XCircle } from 'lucide-react';

type Doc = { id: number; docType: string; fileName: string; uploadedAt: string };
type Row = {
  userId: number; role: string; name: string; username: string; gstin: string; legalName: string;
  stage: 'PENDING' | 'AWAITING_DOCUMENTS' | 'AWAITING_ENTITYLOCKER';
  manualStatus: string; declined: boolean; documents: Doc[];
};
const STAGE: Record<Row['stage'], { label: string; tone: string }> = {
  PENDING: { label: 'Ready to review', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  AWAITING_DOCUMENTS: { label: 'Awaiting documents', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  AWAITING_ENTITYLOCKER: { label: 'Awaiting EntityLocker answer', tone: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function AdminVerificationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/verification/queue', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: Row[]; error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not load the queue.');
      setRows(body.data ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the queue.');
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  async function review(row: Row, status: 'VERIFIED' | 'REJECTED') {
    setBusy(row.userId); setError('');
    try {
      const response = await fetch('/api/admin/verification/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: row.userId, role: row.role, status, note: notes[row.userId] || '' }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not save the decision.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the decision.');
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Admin</p>
        <h1 className="text-2xl font-bold mt-1">Manual identity verifications</h1>
        <p className="text-sm text-gray-500 mt-1">Employers / contractors not on EntityLocker who submitted documents for review.</p>
      </header>

      {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">No employers or contractors are awaiting identity verification.</p>
      ) : (
        <div className="space-y-4">
          {rows.map(row => (
            <section key={`${row.role}-${row.userId}`} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">{row.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{row.role} · GSTIN {row.gstin || '—'}{row.legalName ? ` · ${row.legalName}` : ''}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${STAGE[row.stage].tone}`}>{STAGE[row.stage].label}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.documents.map(doc => (
                  <a key={doc.id} href={`/api/admin/verification/document/${doc.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#073B67] border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
                    <Download size={12}/>{doc.docType}
                  </a>
                ))}
              </div>
              <input
                value={notes[row.userId] ?? ''}
                onChange={e => setNotes(prev => ({ ...prev, [row.userId]: e.target.value }))}
                placeholder="Note (optional)"
                className="w-full h-9 border border-gray-200 rounded-lg px-3 text-xs bg-white"
              />
              {row.stage === 'PENDING' ? (
                <div className="flex gap-2 justify-end">
                  <button type="button" disabled={busy === row.userId} onClick={() => void review(row, 'REJECTED')} className="h-9 px-4 rounded-lg border border-red-200 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60 inline-flex items-center gap-1.5"><XCircle size={13}/>Reject</button>
                  <button type="button" disabled={busy === row.userId} onClick={() => void review(row, 'VERIFIED')} className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-1.5">
                    {busy === row.userId ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}Verify
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 text-right">
                  No action yet — {row.stage === 'AWAITING_ENTITYLOCKER'
                    ? 'the entity must answer the EntityLocker question'
                    : 'the entity must submit their documents'}.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
