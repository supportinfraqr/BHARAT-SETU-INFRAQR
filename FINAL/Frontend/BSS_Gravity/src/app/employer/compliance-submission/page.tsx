"use client";

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileCheck2 } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerSubmission } from '@/types/portal';

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

/** Submissions carry a free-text period like "September 2026-27" (evidence) or
 *  "September 2026" (register). Pull the month and the financial year out of it. */
function parsePeriod(period: string): { month: string; fy: string } {
  const text = (period || '').trim();
  const month = text.match(/^([A-Za-z]+)/)?.[1] ?? '';
  const range = text.match(/(20\d{2})\s*[-–]\s*(\d{2,4})/);
  if (range) {
    const end = range[2].length === 2 ? range[2] : range[2].slice(-2);
    return { month, fy: `FY ${range[1]}-${end}` };
  }
  const year = text.match(/(20\d{2})/);
  if (year) {
    // Jan–Mar belong to the financial year that began the previous April.
    const idx = MONTHS.findIndex(m => m.toLowerCase() === month.toLowerCase());
    const y = Number(year[1]);
    const endYear = idx >= 9 ? y : y + 1;
    return { month, fy: `FY ${endYear - 1}-${String(endYear).slice(-2)}` };
  }
  return { month, fy: '' };
}

export default function EmployerComplianceSubmissionPage() {
  const { employer, replaceEmployer, mutate } = useEmployer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  const years = useMemo(() => {
    const set = new Set<string>();
    employer.submissions.forEach(s => { const { fy } = parsePeriod(s.period); if (fy) set.add(fy); });
    return Array.from(set).sort().reverse();
  }, [employer.submissions]);

  const rows = useMemo(() => employer.submissions.filter(s => {
    const { month, fy } = parsePeriod(s.period);
    if (siteFilter !== 'all' && !s.site.split(',').map(x => x.trim()).includes(siteFilter)) return false;
    if (yearFilter !== 'all' && fy !== yearFilter) return false;
    if (periodFilter !== 'all' && month !== periodFilter) return false;
    return true;
  }), [employer.submissions, siteFilter, yearFilter, periodFilter]);

  async function review(row: EmployerSubmission, status: 'Verified' | 'Rejected') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await mutate('submissions', 'PATCH', { id: row.id, status });
      replaceEmployer({ ...employer, submissions: employer.submissions.map(item => item.id === row.id ? { ...item, status } : item) });
      setNotice(`${row.type} for ${row.site} ${status === 'Verified' ? 'marked accepted' : 'rejected'}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Submission could not be updated.'); }
    finally { setBusy(false); }
  }

  async function viewEvidence(row: EmployerSubmission) {
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/employer/submissions/${row.id}/token`, { method: 'POST' });
      const json = await response.json() as { token?: string; error?: string };
      if (!response.ok || !json.token) throw new Error(json.error || 'No secure preview link.');
      window.open(`/api/employer/submissions/file/${encodeURIComponent(json.token)}`, '_blank', 'noopener,noreferrer');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Evidence could not be opened.');
    }
  }

  const columns: DataColumn<EmployerSubmission>[] = [
    { id:'contractor', header:'Contractor', value:row => row.contractor, render:row => <div><strong className="text-gray-900">{row.contractor || '—'}</strong>{row.contractorId && <p className="font-mono text-[10px] text-gray-400">{row.contractorId}</p>}</div> },
    { id:'site', header:'Site', value:row => row.site },
    { id:'period', header:'Period', value:row => row.period },
    { id:'type', header:'Compliance type', value:row => row.type, render:row => <div><strong className="text-gray-900">{row.type}</strong>{row.source === 'evidence' && <button type="button" disabled={busy} onClick={() => viewEvidence(row)} className="block text-[11px] text-blue-600 hover:underline mt-0.5">View evidence</button>}{row.source === 'submission' && row.batchId && <a href={`/api/employer/compliance-batches/${row.batchId}/file`} className="block text-[11px] text-blue-600 hover:underline mt-0.5">Download registers</a>}</div> },
    { id:'submitted', header:'Submitted', value:row => row.submittedAt.slice(0, 10) },
    { id:'status', header:'Status', value:row => row.status, render:row => <Status value={row.status}/> },
    { id:'actions', header:'Action', filterable:false, value:row => row.status, render:row => row.status === 'Pending review' ? <div className="flex gap-3"><button disabled={busy} onClick={() => review(row, 'Verified')} className="text-green-700 font-semibold hover:underline">Mark Accepted</button><button disabled={busy} onClick={() => review(row, 'Rejected')} className="text-red-700 font-semibold hover:underline">Reject</button></div> : <span className="text-gray-400">No action</span> },
  ];

  const pending = rows.filter(item => item.status === 'Pending review');
  const verified = rows.filter(item => item.status === 'Verified').length;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Governance controls</p><h1 className="text-2xl font-bold mt-1">Compliance Submission</h1><p className="text-sm text-gray-500 mt-1">Review statutory, wage, and safety evidence submitted by connected contractors. Marking a submission accepted verifies it for the contractor.</p></header>

    <div className="grid grid-cols-3 gap-3"><Metric label="Submissions" value={rows.length} icon={FileCheck2} tone="bg-blue-50 text-blue-700"/><Metric label="Pending review" value={pending.length} icon={Clock3} tone="bg-orange-50 text-orange-700"/><Metric label="Accepted" value={verified} icon={CheckCircle2} tone="bg-green-50 text-green-700"/></div>

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
          {years.map(yr => <button key={yr} onClick={() => setYearFilter(yr)} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${yearFilter === yr ? 'bg-[#073B67] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{yr}</button>)}
        </div>
      </div>

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
    <EnterpriseDataTable title="Contractor compliance submissions" rows={rows} columns={columns} rowKey={row => row.id} filename="employer-compliance-submissions"/>
  </div>;
}

function Status({ value }: { value: EmployerSubmission['status'] }) { const tone = value === 'Verified' ? 'bg-green-50 text-green-700' : value === 'Pending review' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'; return <span className={`px-2 py-1 rounded text-[10px] font-semibold ${tone}`}>{value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof FileCheck2; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
