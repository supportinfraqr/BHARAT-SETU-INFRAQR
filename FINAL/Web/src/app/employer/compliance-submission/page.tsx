"use client";

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileCheck2 } from 'lucide-react';
import BatchDrilldown from '@/components/compliance/BatchDrilldown';
import VersionHistory from '@/components/compliance/VersionHistory';
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
  const [contractorFilter, setContractorFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [freqFilter, setFreqFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [batchView, setBatchView] = useState<string | null>(null);
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

  // Distinct contractors that appear in the submissions (keyed by code when present).
  const contractors = useMemo(() => {
    const map = new Map<string, string>();
    employer.submissions.forEach(s => {
      const key = (s.contractorId || s.contractor || '').trim();
      if (key && !map.has(key)) map.set(key, s.contractor || s.contractorId || key);
    });
    return Array.from(map, ([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [employer.submissions]);

  const filtered = useMemo(() => employer.submissions.filter(s => {
    if (siteFilter !== 'all' && !s.site.split(',').map(x => x.trim()).includes(siteFilter)) return false;
    if (contractorFilter !== 'all' && (s.contractorId || s.contractor || '').trim() !== contractorFilter) return false;
    if (yearFilter !== 'all' && fyKey(s) !== yearFilter) return false;
    if (freqFilter !== 'all' && (s.frequency || '') !== freqFilter) return false;
    if (periodFilter !== 'all' && monthOf(s) !== periodFilter) return false;
    return true;
  }), [employer.submissions, siteFilter, contractorFilter, yearFilter, freqFilter, periodFilter]);

  const registers = filtered.filter(s => s.kind === 'package');

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

  const auditBadge = (status?: string) => {
    const s = status || 'pending';
    const tone = s === 'passed' ? 'bg-bss-soft-green text-bss-green border-bss-border'
      : s === 'failed' ? 'bg-bss-soft-orange text-bss-error border-bss-border'
      : s === 'unavailable' ? 'bg-bss-bg text-bss-text-muted border-bss-border'
      : 'bg-bss-soft-orange text-bss-orange border-bss-border';
    const label = s === 'passed' ? 'Passed' : s === 'failed' ? 'Issues' : s === 'unavailable' ? 'No provider' : s === 'review' ? 'Review' : 'Auditing…';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${tone}`}>{label}</span>;
  };

  const actionCell = (row: EmployerSubmission) => row.status === 'Pending review'
    ? <div className="flex gap-3"><button disabled={busy} onClick={() => void review(row, 'Verified')} className="text-bss-green font-semibold hover:underline whitespace-nowrap">Accept all</button><button disabled={busy} onClick={() => { setRejectNote(''); setRejectRow(row); }} className="text-bss-error font-semibold hover:underline">Reject</button></div>
    : <span className="text-bss-text-muted">No action</span>;

  const pending = filtered.filter(item => item.status === 'Pending review');
  const verified = filtered.filter(item => item.status === 'Verified').length;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Governance controls</p><h1 className="text-2xl font-bold mt-1">Compliance Submission</h1><p className="text-sm text-bss-text-muted mt-1">Review the CLRA registers and additional forms submitted by connected contractors. Marking a submission accepted verifies it for the contractor.</p></header>

    <div className="grid grid-cols-3 gap-3"><Metric label="Submissions" value={filtered.length} icon={FileCheck2} tone="bg-bss-blue-tint text-bss-interactive-blue"/><Metric label="Pending review" value={pending.length} icon={Clock3} tone="bg-bss-soft-orange text-bss-orange"/><Metric label="Accepted" value={verified} icon={CheckCircle2} tone="bg-bss-soft-green text-bss-green"/></div>

    {/* Filters — same shape as the contractor submissions page */}
    <div className="bg-white p-4 rounded-2xl border border-bss-border space-y-3.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-extrabold text-bss-text-muted uppercase tracking-wider flex-shrink-0">Contractor:</span>
        <select value={contractorFilter} onChange={e => setContractorFilter(e.target.value)} className="h-9 max-w-[260px] rounded-lg border border-bss-border px-3 text-xs bg-white font-semibold">
          <option value="all">All Contractors</option>
          {contractors.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <span className="text-xs font-extrabold text-bss-text-muted uppercase tracking-wider flex-shrink-0 sm:ml-2">Site:</span>
        <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="h-9 rounded-lg border border-bss-border px-3 text-xs bg-white font-semibold">
          <option value="all">All Sites</option>
          {employer.sites.map(s => <option key={s.id} value={s.name}>{s.name}{s.state ? ` — ${s.state}` : ''}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-bss-border">
        <span className="text-xs font-extrabold text-bss-text-muted uppercase tracking-wider flex-shrink-0">Financial Year:</span>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setYearFilter('all')} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${yearFilter === 'all' ? 'bg-[#01183A] text-white shadow-md' : 'bg-bss-bg text-bss-text-primary hover:bg-bss-surface'}`}>All Years</button>
          {years.map(yr => <button key={yr} onClick={() => setYearFilter(yr)} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${yearFilter === yr ? 'bg-[#01183A] text-white shadow-md' : 'bg-bss-bg text-bss-text-primary hover:bg-bss-surface'}`}>FY {yr}</button>)}
        </div>
      </div>

      {frequencies.length > 0 && <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-bss-border">
        <span className="text-xs font-extrabold text-bss-text-muted uppercase tracking-wider flex-shrink-0">Frequency:</span>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFreqFilter('all')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${freqFilter === 'all' ? 'bg-[#01183A] text-white shadow-sm' : 'bg-bss-bg text-bss-text-primary hover:bg-bss-surface'}`}>All</button>
          {frequencies.map(f => <button key={f} onClick={() => setFreqFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${freqFilter === f ? 'bg-[#01183A] text-white shadow-sm' : 'bg-bss-bg text-bss-text-primary hover:bg-bss-surface'}`}>{f}</button>)}
        </div>
      </div>}

      <div className="flex items-center gap-3 pt-3 border-t border-bss-border overflow-x-auto">
        <span className="text-xs font-extrabold text-bss-text-muted uppercase tracking-wider flex-shrink-0">Period:</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPeriodFilter('all')} className={`px-3.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${periodFilter === 'all' ? 'bg-bss-interactive-blue text-white shadow-sm' : 'bg-bss-bg text-bss-text-secondary hover:bg-bss-surface'}`}>All Periods</button>
          {MONTHS.map(p => <button key={p} onClick={() => setPeriodFilter(p)} className={`px-3.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${periodFilter === p ? 'bg-bss-interactive-blue text-white shadow-sm' : 'bg-bss-bg text-bss-text-secondary hover:bg-bss-surface'}`}>{p}</button>)}
        </div>
      </div>
    </div>

    {error && <p role="alert" className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-xl p-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-bss-green bg-bss-soft-green border border-bss-border rounded-xl p-3">{notice}</p>}

    <div className="space-y-4">
      {registers.length === 0
        ? <p className="text-sm text-bss-text-muted bss-card rounded-2xl p-5">No contractor submissions yet.</p>
        : registers.map(row => (
          <section key={row.id} className="bss-card rounded-2xl overflow-hidden">
            <header className="px-5 py-4 border-b border-bss-border flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="text-bss-text-primary">{row.contractor || row.type || '—'}</strong>
                  {row.contractorId && <span className="font-mono text-[10px] text-bss-text-muted">{row.contractorId}</span>}
                  <Status value={row.status}/>
                </div>
                <p className="text-xs text-bss-text-muted mt-1">{row.period}{row.site ? ` · ${row.site}` : ''}{row.kind === 'package' ? ` · ${row.registerCount ?? 0} register batch(es) · ${row.formCount ?? 0} form(s)` : ''}</p>
                {row.note && <p className="text-[11px] text-bss-error mt-1">Note: {row.note}</p>}
              </div>
              <div className="shrink-0">{actionCell(row)}</div>
            </header>
            {row.batches && row.batches.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-bss-bg border-b border-bss-border text-[10px] font-extrabold text-bss-text-secondary uppercase tracking-wider">
                    <th className="py-2.5 px-3">Site</th><th className="py-2.5 px-3">Month / Year</th><th className="py-2.5 px-3">Ver</th><th className="py-2.5 px-3">Workers</th><th className="py-2.5 px-3">Registers</th><th className="py-2.5 px-3">AI Audit</th><th className="py-2.5 px-3">Master File</th><th className="py-2.5 px-3">Status</th><th className="py-2.5 px-3">Action</th>
                  </tr></thead>
                  <tbody className="divide-y divide-bss-border text-xs">
                    {row.batches.map(b => <tr key={b.id} className="hover:bg-bss-bg/70">
                      <td className="py-2.5 px-3"><p className="font-semibold text-bss-text-primary">{b.site || '—'}</p>{b.siteBssId && <p className="font-mono text-[10px] text-bss-text-muted">{b.siteBssId}</p>}</td>
                      <td className="py-2.5 px-3 text-bss-text-secondary">{b.month} {b.year}</td>
                      <td className="py-2.5 px-3"><VersionHistory versions={(b.versions || []).map(v => ({ version:v.version, isCurrent:v.isCurrent, status:v.status, date:v.generatedOn }))} /></td>
                      <td className="py-2.5 px-3 font-bold text-[#01183A]">{b.employeeCount}</td>
                      <td className="py-2.5 px-3">{b.registerCount ?? 0}</td>
                      <td className="py-2.5 px-3">{auditBadge(b.auditStatus)}</td>
                      <td className="py-2.5 px-3"><a href={`/api/employer/compliance-batches/${b.id}/master`} download className="text-bss-interactive-blue font-semibold hover:underline">Download</a></td>
                      <td className="py-2.5 px-3 text-bss-text-secondary">{b.status}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap"><button type="button" onClick={() => setBatchView(String(b.id))} className="text-[11px] text-bss-interactive-blue font-semibold hover:underline">View documents</button><a href={`/api/employer/compliance-batches/${b.id}/file`} className="text-[11px] text-bss-interactive-blue hover:underline ml-2">Download ZIP</a></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            )}
            {row.forms && row.forms.length > 0 && (
              <div className="px-5 py-3 border-t border-bss-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-1.5">Additional forms ({row.forms.length})</p>
                <div className="flex flex-wrap gap-1.5">{row.forms.map(f => <button key={f.id} type="button" onClick={() => void viewEvidence(f.id)} className="text-[11px] px-2 py-0.5 rounded bg-bss-bg border border-bss-border text-bss-text-primary hover:bg-bss-surface">{f.name}</button>)}</div>
              </div>
            )}
            {row.source === 'evidence' && <div className="px-5 py-3 border-t border-bss-border"><button type="button" onClick={() => void viewEvidence(row.id)} className="text-[11px] text-bss-interactive-blue hover:underline">View evidence</button></div>}
          </section>
        ))}
    </div>

    {rejectRow && <div className="fixed inset-0 z-[90] bg-black/50 grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setRejectRow(null); }}>
      <section role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        <header className="p-5 border-b border-bss-border"><h2 className="font-semibold text-bss-text-primary">Reject submission</h2><p className="text-xs text-bss-text-muted mt-1">{rejectRow.contractor || 'Contractor'} · {rejectRow.site} · {rejectRow.period}</p></header>
        <div className="p-5">
          <label htmlFor="reject-note" className="block text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Reason / notes for the contractor</label>
          <textarea id="reject-note" value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={4} placeholder="Describe what needs fixing so they can correct and resubmit…" className="mt-1.5 w-full rounded-lg border border-bss-border p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
          <p className="text-[11px] text-bss-text-muted mt-2">This rejects the whole submission (CLRA registers + additional forms) for this period. The contractor can fix it and resubmit.</p>
        </div>
        <footer className="px-5 py-4 border-t border-bss-border flex justify-end gap-2">
          <button type="button" onClick={() => setRejectRow(null)} className="h-9 px-4 rounded-lg border border-bss-border text-xs font-bold text-bss-text-secondary">Cancel</button>
          <button type="button" disabled={busy} onClick={() => { const row = rejectRow; setRejectRow(null); void review(row as EmployerSubmission, 'Rejected', rejectNote.trim()); }} className="h-9 px-4 rounded-lg bg-bss-error text-white text-xs font-bold disabled:opacity-40">Reject submission</button>
        </footer>
      </section>
    </div>}

    {batchView && <BatchDrilldown batchId={batchView} role="employer" onClose={() => setBatchView(null)} />}
  </div>;
}

function Status({ value }: { value: EmployerSubmission['status'] }) { const tone = value === 'Verified' ? 'bg-bss-soft-green text-bss-green' : value === 'Pending review' ? 'bg-bss-soft-orange text-bss-orange' : 'bg-bss-soft-orange text-bss-error'; return <span className={`px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap ${tone}`}>{value === 'Verified' ? 'Accepted' : value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof FileCheck2; tone:string }) { return <div className="bg-white border border-bss-border rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-bss-text-muted">{label}</p></div>; }
