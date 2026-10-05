"use client";

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileCheck2 } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { openPrintHtml } from '@/lib/documentEngine/render';
import BatchDrilldown from '@/components/compliance/BatchDrilldown';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerSubmission } from '@/types/portal';

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

/** The financial-year key ("2026-27") for a submission, from its stored year or
 *  parsed out of the free-text period ("September 2026-27" / "September 2026"). */
function fyKey(row: EmployerSubmission): string {
  const stored = (row.financialYear || '').replace(/^FY\s*/i, '').trim();
  if (stored) return stored;
  const text = (row.period || '').trim();
  const range = text.match(/(20\d{2})\s*[-–]\s*(\d{2,4})/);
  if (range) return `${range[1]}-${range[2].length === 2 ? range[2] : range[2].slice(-2)}`;
  const year = text.match(/(20\d{2})/);
  const month = (row.month || text.match(/^([A-Za-z]+)/)?.[1] || '').trim();
  if (year) {
    const idx = MONTHS.findIndex(m => m.toLowerCase() === month.toLowerCase());
    const y = Number(year[1]);
    const endYear = idx >= 9 ? y : y + 1;
    return `${endYear - 1}-${String(endYear).slice(-2)}`;
  }
  return '';
}

function monthOf(row: EmployerSubmission): string {
  return (row.month || row.period?.match(/^([A-Za-z]+)/)?.[1] || '').trim();
}

export default function EmployerComplianceSubmissionPage() {
  const { employer, replaceEmployer, mutate } = useEmployer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [freqFilter, setFreqFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [batchView, setBatchView] = useState<string | null>(null);
  const [tab, setTab] = useState<'records' | 'reports'>('records');
  const [rejectRow, setRejectRow] = useState<EmployerSubmission | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const years = useMemo(() => {
    const set = new Set<string>();
    employer.submissions.forEach(s => { const k = fyKey(s); if (k) set.add(k); });
    return Array.from(set).sort().reverse();
  }, [employer.submissions]);

  // Only the frequencies that actually occur are offered — never a fixed list.
  const frequencies = useMemo(() => {
    const set = new Set<string>();
    employer.submissions.forEach(s => { if (s.frequency) set.add(s.frequency); });
    return Array.from(set).sort();
  }, [employer.submissions]);

  const filtered = useMemo(() => employer.submissions.filter(s => {
    if (siteFilter !== 'all' && !s.site.split(',').map(x => x.trim()).includes(siteFilter)) return false;
    if (yearFilter !== 'all' && fyKey(s) !== yearFilter) return false;
    if (freqFilter !== 'all' && (s.frequency || '') !== freqFilter) return false;
    if (periodFilter !== 'all' && monthOf(s) !== periodFilter) return false;
    return true;
  }), [employer.submissions, siteFilter, yearFilter, freqFilter, periodFilter]);

  const registers = filtered.filter(s => s.kind === 'package' || s.kind === 'register' || s.kind === 'form');

  async function review(row: EmployerSubmission, status: 'Verified' | 'Rejected', note = '') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await mutate('submissions', 'PATCH', { id: row.id, status, note });
      replaceEmployer({ ...employer, submissions: employer.submissions.map(item => item.id === row.id ? { ...item, status, note } : item) });
      setNotice(`${row.type} ${status === 'Verified' ? 'accepted' : 'rejected'}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Submission could not be updated.'); }
    finally { setBusy(false); }
  }

  async function viewEvidence(id: string) {
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/employer/submissions/${id}/token`, { method: 'POST' });
      const json = await response.json() as { token?: string; error?: string };
      if (!response.ok || !json.token) throw new Error(json.error || 'No secure preview link.');
      window.open(`/api/employer/submissions/file/${encodeURIComponent(json.token)}`, '_blank', 'noopener,noreferrer');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Evidence could not be opened.');
    }
  }

  async function viewAiReport(row: EmployerSubmission) {
    setError(''); setNotice('');
    try {
      const response = await fetch(`/api/employer/submissions/${row.id}/ai-report`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: { html?: string }; error?: string };
      if (!response.ok || !body.data?.html) throw new Error(body.error || 'The AI report could not be generated.');
      openPrintHtml(body.data.html, `${row.type} — BSS AI Audit Report`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The AI report could not be generated.');
    }
  }

  async function viewBatchReport(batchId: string) {
    setError(''); setNotice('');
    try {
      const response = await fetch(`/api/employer/compliance-batches/${batchId}/verification-report`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: { html?: string }; error?: string };
      if (!response.ok || !body.data?.html) throw new Error(body.error || 'The report could not be generated.');
      openPrintHtml(body.data.html, 'BSS Contractor Compliance & Verification Report');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The report could not be generated.');
    }
  }

  const aiReportCell = (row: EmployerSubmission) => {
    if (row.kind === 'package') {
      return row.batchId ? (
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => void viewBatchReport(row.batchId as string)} className="text-[11px] text-[#073B67] font-semibold hover:underline text-left">View report</button>
          <a href={`/api/employer/compliance-batches/${row.batchId}/verification-report?download=pdf`} className="text-[11px] text-blue-700 font-semibold hover:underline">Download PDF</a>
        </div>
      ) : <span className="text-gray-400 text-xs">—</span>;
    }
    return (
      <div className="flex flex-col gap-1">
        <button type="button" onClick={() => void viewAiReport(row)} className="text-[11px] text-[#073B67] font-semibold hover:underline text-left">View report</button>
        <a href={`/api/employer/submissions/${row.id}/ai-report?format=pdf`} className="text-[11px] text-blue-700 font-semibold hover:underline">Download PDF</a>
      </div>
    );
  };

  const contractorCell = (row: EmployerSubmission) => <div><strong className="text-gray-900">{row.contractor || '—'}</strong>{row.contractorId && <p className="font-mono text-[10px] text-gray-400">{row.contractorId}</p>}</div>;  const statusCell = (row: EmployerSubmission) => <Status value={row.status}/>;
  const actionCell = (row: EmployerSubmission) => row.status === 'Pending review'
    ? <div className="flex gap-3"><button disabled={busy} onClick={() => void review(row, 'Verified')} className="text-green-700 font-semibold hover:underline whitespace-nowrap">Accept all</button><button disabled={busy} onClick={() => { setRejectNote(''); setRejectRow(row); }} className="text-red-700 font-semibold hover:underline">Reject</button></div>
    : <span className="text-gray-400">No action</span>;

  const auditBadge = (status?: string) => {
    const s = status || 'pending';
    const tone = s === 'passed' ? 'bg-green-50 text-green-700 border-green-200'
      : s === 'failed' ? 'bg-red-50 text-red-700 border-red-200'
      : s === 'unavailable' ? 'bg-slate-100 text-slate-500 border-slate-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';
    const label = s === 'passed' ? 'Passed' : s === 'failed' ? 'Issues' : s === 'unavailable' ? 'No provider' : s === 'review' ? 'Review' : 'Auditing…';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${tone}`}>{label}</span>;
  };

  const reportColumns: DataColumn<EmployerSubmission>[] = [
    { id:'contractor', header:'Contractor', value:row => row.contractor, render:contractorCell },
    { id:'site', header:'Site', value:row => row.site },
    { id:'type', header:'Submission', value:row => row.type },
    { id:'period', header:'Period', value:row => row.period },
    { id:'submitted', header:'Submitted', value:row => row.submittedAt.slice(0, 10) },
    { id:'status', header:'Status', value:row => row.status, render:statusCell },
    { id:'aiReport', header:'Detailed AI report', filterable:false, value:row => row.id, render:aiReportCell },
  ];

  const pending = filtered.filter(item => item.status === 'Pending review');
  const verified = filtered.filter(item => item.status === 'Verified').length;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Governance controls</p><h1 className="text-2xl font-bold mt-1">Compliance Submission</h1><p className="text-sm text-gray-500 mt-1">Review the CLRA registers and additional forms submitted by connected contractors. Marking a submission accepted verifies it for the contractor.</p></header>

    <div className="grid grid-cols-3 gap-3"><Metric label="Submissions" value={filtered.length} icon={FileCheck2} tone="bg-blue-50 text-blue-700"/><Metric label="Pending review" value={pending.length} icon={Clock3} tone="bg-orange-50 text-orange-700"/><Metric label="Accepted" value={verified} icon={CheckCircle2} tone="bg-green-50 text-green-700"/></div>

    {/* Filters — same shape as the contractor submissions page */}
    <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex-shrink-0">Site:</span>
        <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white font-semibold">
          <option value="all">All Sites</option>
          {employer.sites.map(s => <option key={s.id} value={s.name}>{s.name}{s.state ? ` — ${s.state}` : ''}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
        <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex-shrink-0">Financial Year:</span>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setYearFilter('all')} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${yearFilter === 'all' ? 'bg-[#073B67] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All Years</button>
          {years.map(yr => <button key={yr} onClick={() => setYearFilter(yr)} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${yearFilter === yr ? 'bg-[#073B67] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>FY {yr}</button>)}
        </div>
      </div>

      {frequencies.length > 0 && <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
        <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex-shrink-0">Frequency:</span>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFreqFilter('all')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${freqFilter === 'all' ? 'bg-[#073B67] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
          {frequencies.map(f => <button key={f} onClick={() => setFreqFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${freqFilter === f ? 'bg-[#073B67] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{f}</button>)}
        </div>
      </div>}

      <div className="flex items-center gap-3 pt-3 border-t border-gray-100 overflow-x-auto">
        <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex-shrink-0">Period:</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPeriodFilter('all')} className={`px-3.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${periodFilter === 'all' ? 'bg-blue-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All Periods</button>
          {MONTHS.map(p => <button key={p} onClick={() => setPeriodFilter(p)} className={`px-3.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${periodFilter === p ? 'bg-blue-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p}</button>)}
        </div>
      </div>
    </div>

    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">{notice}</p>}

    <div className="flex border-b overflow-x-auto">
      {([['records', 'Compliance Records'], ['reports', 'Reports']] as Array<['records' | 'reports', string]>).map(([id, label]) => (
        <button key={id} onClick={() => setTab(id)} className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap ${tab === id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>
      ))}
    </div>

    {tab === 'records' && <div className="space-y-4">
      {registers.length === 0
        ? <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded-2xl p-5">No contractor submissions yet.</p>
        : registers.map(row => (
          <section key={row.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="text-gray-900">{row.contractor || row.type || '—'}</strong>
                  {row.contractorId && <span className="font-mono text-[10px] text-gray-400">{row.contractorId}</span>}
                  <Status value={row.status}/>
                </div>
                <p className="text-xs text-gray-500 mt-1">{row.period}{row.site ? ` · ${row.site}` : ''}{row.kind === 'package' ? ` · ${row.registerCount ?? 0} register batch(es) · ${row.formCount ?? 0} form(s)` : ''}</p>
                {row.note && <p className="text-[11px] text-red-600 mt-1">Note: {row.note}</p>}
              </div>
              <div className="shrink-0">{actionCell(row)}</div>
            </header>
            {row.batches && row.batches.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-50 border-b border-gray-200 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Site</th><th className="py-2.5 px-3">Month / Year</th><th className="py-2.5 px-3">Workers</th><th className="py-2.5 px-3">Registers</th><th className="py-2.5 px-3">AI Audit</th><th className="py-2.5 px-3">Master File</th><th className="py-2.5 px-3">Status</th><th className="py-2.5 px-3">Action</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {row.batches.map(b => <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3"><p className="font-semibold text-gray-900">{b.site || '—'}</p>{b.siteCode && <p className="font-mono text-[10px] text-gray-400">{b.siteCode}</p>}</td>
                      <td className="py-2.5 px-3 text-gray-600">{b.month} {b.year}</td>
                      <td className="py-2.5 px-3 font-bold text-[#073B67]">{b.employeeCount}</td>
                      <td className="py-2.5 px-3">{b.registerCount ?? 0}</td>
                      <td className="py-2.5 px-3">{auditBadge(b.auditStatus)}</td>
                      <td className="py-2.5 px-3"><a href={`/api/employer/compliance-batches/${b.id}/master`} download className="text-blue-700 font-semibold hover:underline">Download</a></td>
                      <td className="py-2.5 px-3 text-gray-600">{b.status}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap"><button type="button" onClick={() => setBatchView(String(b.id))} className="text-[11px] text-blue-600 font-semibold hover:underline">View documents</button><a href={`/api/employer/compliance-batches/${b.id}/file`} className="text-[11px] text-blue-600 hover:underline ml-2">Download ZIP</a></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            )}
            {row.forms && row.forms.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Additional forms ({row.forms.length})</p>
                <div className="flex flex-wrap gap-1.5">{row.forms.map(f => <button key={f.id} type="button" onClick={() => void viewEvidence(f.id)} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200">{f.name}</button>)}</div>
              </div>
            )}
            {row.source === 'evidence' && <div className="px-5 py-3 border-t border-gray-100"><button type="button" onClick={() => void viewEvidence(row.id)} className="text-[11px] text-blue-600 hover:underline">View evidence</button></div>}
          </section>
        ))}
    </div>}

    {tab === 'reports' && <EnterpriseDataTable title={`Detailed AI reports (${filtered.length})`} rows={filtered} columns={reportColumns} rowKey={row => row.id} filename="employer-ai-reports"/>}

    {rejectRow && <div className="fixed inset-0 z-[90] bg-black/50 grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setRejectRow(null); }}>
      <section role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        <header className="p-5 border-b border-gray-100"><h2 className="font-semibold text-gray-950">Reject submission</h2><p className="text-xs text-gray-500 mt-1">{rejectRow.contractor || 'Contractor'} · {rejectRow.site} · {rejectRow.period}</p></header>
        <div className="p-5">
          <label htmlFor="reject-note" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Reason / notes for the contractor</label>
          <textarea id="reject-note" value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={4} placeholder="Describe what needs fixing so they can correct and resubmit…" className="mt-1.5 w-full rounded-lg border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
          <p className="text-[11px] text-gray-400 mt-2">This rejects the whole submission (CLRA registers + additional forms) for this period. The contractor can fix it and resubmit.</p>
        </div>
        <footer className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={() => setRejectRow(null)} className="h-9 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button>
          <button type="button" disabled={busy} onClick={() => { const row = rejectRow; setRejectRow(null); void review(row as EmployerSubmission, 'Rejected', rejectNote.trim()); }} className="h-9 px-4 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-40">Reject submission</button>
        </footer>
      </section>
    </div>}

    {batchView && <BatchDrilldown batchId={batchView} role="employer" onClose={() => setBatchView(null)} />}
  </div>;
}

function Status({ value }: { value: EmployerSubmission['status'] }) { const tone = value === 'Verified' ? 'bg-green-50 text-green-700' : value === 'Pending review' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'; return <span className={`px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap ${tone}`}>{value === 'Verified' ? 'Accepted' : value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof FileCheck2; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
