"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileBarChart2, RefreshCw, Sparkles, Eye, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';

type ReportRow = {
  id: number; scopeType: string; employer: string; contractor: string;
  financialYear: string; quarter: number; periodStart: string; periodEnd: string;
  reportTypes: string[]; summary: Record<string, number>; hasFile: boolean;
  generatedAt: string; generatedBy: string;
};
type QuarterOpt = { fy: number; quarter: number; label: string };
type Filters = { role: string; canGenerate: boolean; quarters: QuarterOpt[] };

export default function AdminAuditReportsPage() {
  const [filters, setFilters] = useState<Filters | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [sel, setSel] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<{ row: ReportRow; parameters: Array<Record<string, number | string>> } | null>(null);

  const load = useCallback(async () => {
    const [f, l] = await Promise.all([
      fetch('/api/audit-reports/filters', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/audit-reports', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (f?.data) setFilters(f.data);
    if (l?.data) setReports(l.data);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch('/api/audit-reports/filters', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/audit-reports', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([f, l]) => {
      if (!active) return;
      if (f?.data) setFilters(f.data);
      if (l?.data) setReports(l.data);
    });
    return () => { active = false; };
  }, []);

  const quarters = filters?.quarters ?? [];
  const selectedLabel = sel || (quarters[0]?.label ?? '');

  async function generate() {
    const opt = quarters.find(q => q.label === selectedLabel);
    if (!opt) { setError('Pick a quarter.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/audit-reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fy: opt.fy, quarter: opt.quarter }),
      });
      const body = await response.json().catch(() => ({})) as { data?: { generated: number }; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Generation failed.');
      setNotice(`Generated ${body.data.generated} report(s) for ${opt.label}.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Generation failed.'); }
    finally { setBusy(false); }
  }

  async function openPreview(row: ReportRow) {
    setError('');
    const response = await fetch(`/api/audit-reports/${row.id}`, { cache: 'no-store' });
    const body = await response.json().catch(() => ({})) as { data?: ReportRow & { parameters?: Array<Record<string, number | string>> }; error?: string };
    if (!response.ok || !body.data) { setError(body.error ?? 'Preview failed.'); return; }
    setPreview({ row, parameters: body.data.parameters ?? [] });
  }

  const columns: DataColumn<ReportRow>[] = [
    { id: 'scope', header: 'Scope', value: r => r.scopeType, render: r => <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{r.scopeType}</span> },
    { id: 'party', header: 'Employer / Contractor', value: r => r.employer || r.contractor },
    { id: 'period', header: 'Period', value: r => `${r.periodStart} → ${r.periodEnd}`, render: r => <span>Q{r.quarter} FY {r.financialYear}</span> },
    { id: 'compliance', header: 'Compliance %', value: r => r.summary?.compliance_pct ?? 0, render: r => <span className="font-semibold text-[#073B67]">{r.summary?.compliance_pct ?? 0}%</span> },
    { id: 'critical', header: 'Critical', value: r => r.summary?.open_critical ?? 0, render: r => <span className={(r.summary?.open_critical ?? 0) > 0 ? 'text-red-700 font-semibold' : 'text-gray-500'}>{r.summary?.open_critical ?? 0}</span> },
    { id: 'high', header: 'High', value: r => r.summary?.open_high ?? 0 },
    { id: 'generated', header: 'Generated', value: r => r.generatedAt, render: r => `${new Date(r.generatedAt).toLocaleDateString('en-IN')} · ${r.generatedBy}` },
    { id: 'action', header: 'Action', filterable: false, value: r => r.id, render: r => (
      <div className="flex items-center gap-3">
        <button onClick={() => void openPreview(r)} className="text-xs font-semibold text-gray-600 hover:text-[#073B67] inline-flex items-center gap-1"><Eye size={13}/>Preview</button>
        {r.hasFile && <a href={`/api/audit-reports/${r.id}/file`} className="text-blue-700 font-semibold text-xs inline-flex items-center gap-1 hover:underline"><Download size={13}/>XLSX</a>}
      </div>
    ) },
  ];

  const counts = useMemo(() => ({
    total: reports.length,
    critical: reports.reduce((s, r) => s + (r.summary?.open_critical ?? 0), 0),
  }), [reports]);

  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Compliance governance</p>
        <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><FileBarChart2 size={22} className="text-[#073B67]"/>Audit &amp; Verification Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Generate the quarterly Compliance Officer, Management Board and Auditor reports for all employers and contractors.</p>
      </div>
      <button onClick={() => void load()} className="h-10 px-3 rounded-lg border border-gray-200 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50"><RefreshCw size={15}/>Refresh</button>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-950">Generate reports</h2>
      <p className="text-xs text-gray-500 mt-1">Select a quarter and click Generate — reports are produced for every employer and contractor, then listed below for the respective users.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-gray-700">Quarter
          <select value={selectedLabel} onChange={e => setSel(e.target.value)} className="mt-1 block h-10 min-w-[260px] rounded-lg border border-gray-200 px-3 text-sm bg-white">
            {quarters.map(q => <option key={q.label} value={q.label}>{q.label}</option>)}
            {!quarters.length && <option value="">Loading…</option>}
          </select>
        </label>
        <button onClick={() => void generate()} disabled={busy || !filters?.canGenerate} className="h-10 px-5 rounded-lg bg-[#073B67] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
          <Sparkles size={15}/>{busy ? 'Generating…' : 'Generate reports'}
        </button>
        <span className="text-[11px] text-gray-400 self-center">{filters?.canGenerate ? 'BSS Admin' : 'Read-only'} · {counts.total} report(s) · {counts.critical} open critical</span>
      </div>
    </section>

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <EnterpriseDataTable title="Generated audit reports" rows={reports} columns={columns} rowKey={r => String(r.id)} filename="audit-reports" />
    </section>

    {preview && <div className="fixed inset-0 z-[95] bg-black/50 grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setPreview(null); }}>
      <section className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
        <header className="sticky top-0 bg-white p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-950">Report preview — {preview.row.scopeType}</h2>
            <p className="text-xs text-gray-500 mt-1">{preview.row.employer || preview.row.contractor} · Q{preview.row.quarter} FY {preview.row.financialYear} ({preview.row.periodStart} → {preview.row.periodEnd})</p>
          </div>
          <button onClick={() => setPreview(null)} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-gray-50" aria-label="Close"><X size={16}/></button>
        </header>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['Compliance', `${preview.row.summary?.compliance_pct ?? 0}%`], ['Critical', String(preview.row.summary?.open_critical ?? 0)], ['High', String(preview.row.summary?.open_high ?? 0)], ['Pending', `${preview.row.summary?.pending_pct ?? 0}%`]].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-gray-100 p-3"><p className="text-[11px] text-gray-500">{k}</p><p className="text-lg font-bold text-[#073B67]">{v}</p></div>
          ))}
        </div>
        <div className="px-5 pb-5 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-2">Parameter</th><th className="px-3 py-2">Applicable</th><th className="px-3 py-2">Verified</th><th className="px-3 py-2">C1</th><th className="px-3 py-2">C2</th><th className="px-3 py-2">C3</th><th className="px-3 py-2">C4</th><th className="px-3 py-2">C5</th><th className="px-3 py-2">C6</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {preview.parameters.map((p, i) => <tr key={i}><td className="px-3 py-2 font-medium text-gray-800">{p.name}</td><td className="px-3 py-2">{p.applicable}</td><td className="px-3 py-2">{p.verified}</td><td className="px-3 py-2">{p.c1}</td><td className="px-3 py-2">{p.c2}</td><td className="px-3 py-2">{p.c3}</td><td className="px-3 py-2">{p.c4}</td><td className="px-3 py-2">{p.c5}</td><td className="px-3 py-2">{p.c6}</td></tr>)}
            </tbody>
          </table>
        </div>
        <footer className="px-5 py-4 border-t border-gray-100 flex justify-end">
          <a href={`/api/audit-reports/${preview.row.id}/file`} className="h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-2"><Download size={14}/>Download XLSX</a>
        </footer>
      </section>
    </div>}
  </div>;
}
