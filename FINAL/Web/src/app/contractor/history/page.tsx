"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, History } from 'lucide-react';
import { formatApprovalDate } from '@/lib/workerDocumentWorkflow';

type HistoryRow = {
  id: number; sequence?: number; ref: string;
  worker: string; workerBssId: string;
  contractor: string; contractorCode: string;
  employer: string; employerCode: string;
  site: string; siteId: string;
  designation: string; department: string; shift: string; wage: number;
  startDate: string; endDate: string; durationDays: number; durationLabel: string;
  status: string; current: boolean;
};

function fmt(value?: string) { return value ? (formatApprovalDate(value) || value) : ''; }

export default function ContractorHistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [fSite, setFSite] = useState('');
  const [fStatus, setFStatus] = useState('');

  const load = useCallback(() => {
    let active = true;
    setBusy(true); setError('');
    void fetch('/api/contractor/workforce-history', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Workforce history could not be loaded.'))))
      .then((body: { data?: HistoryRow[] }) => { if (active) setRows(body.data ?? []); })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Workforce history could not be loaded.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data load on mount
  useEffect(() => load(), [load]);

  const sites = useMemo(() => Array.from(new Set(rows.map(r => r.site).filter(Boolean))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter(r =>
    (!fSite || r.site === fSite) && (!fStatus || r.status === fStatus)
  ), [rows, fSite, fStatus]);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/contractor" className="mt-1 w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-[#073B67] hover:border-[#073B67] transition-all" aria-label="Go back"><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-[#062D4F] flex items-center gap-2"><History size={22} />Workforce History</h1>
          <p className="text-sm text-gray-500 mt-1">A chronological record of every worker you have engaged — active at the top, older engagements below — with duration, employer, site and terms. Rejected or expired requests are not shown.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {busy ? (
        <p className="text-sm text-gray-500 text-center py-10">Loading history…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">No workforce history yet.</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-600">Site
              <select value={fSite} onChange={e => setFSite(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-2 text-sm bg-white">
                <option value="">All sites</option>
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-600">Status
              <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-2 text-sm bg-white">
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Ended">Ended</option>
                <option value="Site Changed">Site Changed</option>
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No engagements match these filters.</p>
          ) : (
            <ol className="relative border-s border-gray-200 ms-3 space-y-5">
              {filtered.map((h, index) => (
                <li key={h.id} className="ms-6">
                  <span className="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#073B67] text-white text-[10px] font-bold ring-4 ring-white">{h.sequence ?? index + 1}</span>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[14px] font-bold text-[#1D1D1F]">{h.worker}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.current ? 'bg-green-50 text-green-700' : h.status === 'Site Changed' ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-600'}`}>{h.status}</span>
                          {h.durationLabel && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 inline-flex items-center gap-1"><Clock size={10} />{h.durationLabel}</span>}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">{h.employer}{h.site ? ` · ${h.site}` : ''} · {h.ref}</p>
                      </div>
                      <p className="text-[11px] text-gray-500">{fmt(h.startDate) || '—'} → {h.endDate ? fmt(h.endDate) : 'Present'}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-[12px]">
                      <div><p className="text-gray-400">Worker BSS ID</p><p className="font-mono font-semibold text-gray-800">{h.workerBssId || '—'}</p></div>
                      <div><p className="text-gray-400">Employer BSS ID</p><p className="font-mono font-semibold text-gray-800">{h.employerCode || '—'}</p></div>
                      <div><p className="text-gray-400">Site ID</p><p className="font-mono font-semibold text-gray-800">{h.siteId || '—'}</p></div>
                      <div><p className="text-gray-400">Duration</p><p className="font-semibold text-gray-800">{h.durationLabel || '—'}</p></div>
                      <div><p className="text-gray-400">Designation</p><p className="font-semibold text-gray-800">{h.designation || '—'}</p></div>
                      <div><p className="text-gray-400">Department</p><p className="font-semibold text-gray-800">{h.department || '—'}</p></div>
                      <div><p className="text-gray-400">Shift</p><p className="font-semibold text-gray-800">{h.shift || '—'}</p></div>
                      <div><p className="text-gray-400">Wage</p><p className="font-semibold text-gray-800">{h.wage ? `₹${h.wage.toLocaleString('en-IN')}` : '—'}</p></div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
