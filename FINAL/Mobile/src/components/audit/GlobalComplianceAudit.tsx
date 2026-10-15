"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileBarChart2, Loader2, Sparkles } from 'lucide-react';
import { openPrintHtml } from '@/lib/documentEngine/render';
import type { GlobalAuditReport } from '@/types/portal';

function statusTone(status: string) {
  switch ((status || '').toUpperCase()) {
    case 'READY': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'FAILED': return 'bg-red-50 text-red-700 border-red-200';
    case 'RUNNING': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

/**
 * Global compliance AI audit — generates a report from a private workspace
 * (source_documents/ + groundtruth_data/) handed to a multimodal AI agent.
 * Generation is asynchronous; the list polls while a job is running.
 */
export default function GlobalComplianceAudit({
  endpoint, title, subtitle,
}: {
  endpoint: string;
  title: string;
  subtitle: string;
}) {
  const [rows, setRows] = useState<GlobalAuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { data?: GlobalAuditReport[]; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error || 'The audit reports could not be loaded.');
      setRows(body.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The audit reports could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  // Poll while any report is still generating.
  useEffect(() => {
    const active = rows.some(r => r.status === 'PENDING' || r.status === 'RUNNING');
    if (!active) return;
    timer.current = window.setTimeout(() => { void load(); }, 5000);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [rows, load]);

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const body = await res.json().catch(() => ({})) as { data?: GlobalAuditReport; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error || 'The audit report could not be generated.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The audit report could not be generated.');
    } finally {
      setBusy(false);
    }
  }

  async function view(row: GlobalAuditReport) {
    setError('');
    try {
      const res = await fetch(`/api/audit/global/${row.id}`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { data?: GlobalAuditReport; error?: string };
      if (!res.ok || !body.data?.html) throw new Error(body.error || 'The report is not ready yet.');
      openPrintHtml(body.data.html, `Global Compliance AI Audit #${row.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The report could not be opened.');
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bss-navy via-bss-deep-navy to-bss-interactive-blue text-white p-5 sm:p-6 shadow-lg">
        <div aria-hidden className="absolute -right-8 -top-10 w-44 h-44 rounded-full bg-white/5 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60 flex items-center gap-1.5"><FileBarChart2 size={13}/> AI audit</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">{title}</h1>
            <p className="text-sm text-white/75 mt-1 max-w-2xl">{subtitle}</p>
          </div>
          <button type="button" disabled={busy} onClick={() => void generate()} className="h-10 px-4 rounded-xl bg-white/15 border border-white/20 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/25 disabled:opacity-60">
            {busy ? <><Loader2 size={15} className="animate-spin"/>Generating…</> : <><Sparkles size={15}/>Generate global compliance</>}
          </button>
        </div>
      </header>

      {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-bss-text-muted py-10"><Loader2 size={16} className="animate-spin"/>Loading reports…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-bss-border bg-white p-6 text-sm text-bss-text-muted">No global compliance reports yet — click “Generate global compliance”.</p>
      ) : (
        <div className="rounded-2xl border border-bss-border bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-bss-bg text-[10px] uppercase tracking-wider text-bss-text-muted">
              <tr><th className="px-4 py-3">Report</th><th className="px-4 py-3">Requested by</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Verdict</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-bss-border">
              {rows.map(r => <tr key={r.id} className="hover:bg-bss-bg">
                <td className="px-4 py-3 font-semibold text-bss-text-primary">GLOBAL-{String(r.id).padStart(4, '0')}</td>
                <td className="px-4 py-3 text-bss-text-secondary">{r.requestedBy || '—'}</td>
                <td className="px-4 py-3 text-bss-text-muted">{r.createdAt ? r.createdAt.slice(0, 10) : '—'}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone(r.status)}`}>{r.status}</span></td>
                <td className="px-4 py-3 text-bss-text-secondary">{r.verdict || r.error || '—'}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {r.status === 'READY' && <>
                    <button onClick={() => void view(r)} className="text-bss-interactive-blue font-semibold hover:underline mr-3">View</button>
                    <a href={`/api/audit/global/${r.id}?download=pdf`} className="text-bss-text-secondary font-semibold hover:underline">PDF</a>
                  </>}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
