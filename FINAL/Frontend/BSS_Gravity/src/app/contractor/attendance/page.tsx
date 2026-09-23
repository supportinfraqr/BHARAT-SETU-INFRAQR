"use client";

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';

type AttendanceRow = { id: string; date: string; worker: string; site: string; status: string; capture: string };
type UploadResult = { created: number; updated: number; workers: number; rows: number; unknown: string[]; site: string; start: string; end: string };

const STATUS_LABEL: Record<string, string> = {
  PRESENT: 'Present', ABSENT: 'Absent', LEAVE: 'Leave', HOLIDAY: 'Holiday',
  HALF_DAY: 'Half Day', LATE: 'Late', EXPECTED: 'Expected',
};

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function displayDate(iso: string) {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}
function monthBounds() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: isoDate(first), end: isoDate(last) };
}

export default function ContractorAttendancePage() {
  const { contractor } = useContractor();
  const [site, setSite] = useState('');
  const [start, setStart] = useState(() => monthBounds().start);
  const [end, setEnd] = useState(() => monthBounds().end);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);

  const sites = contractor.sites;

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ start, end });
    void fetch(`/api/contractor/attendance?${query}`, { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: AttendanceRow[] } | null) => { if (active && body?.data) setRows(body.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [start, end, result]);

  const downloadTemplate = () => {
    setError(''); setNotice('');
    const query = new URLSearchParams({ start, end });
    if (site) query.set('site', site);
    window.open(`/api/contractor/attendance/template?${query}`, '_blank');
    setNotice(`Attendance CSV template for ${start} → ${end} downloaded — fill P (Present) / A (Absent) / L (Leave) per date and upload it back.`);
  };

  async function uploadSheet(file?: File) {
    if (!file) return;
    setBusy(true); setError(''); setNotice(''); setResult(null);
    try {
      const form = new FormData();
      form.set('sheet', file);
      form.set('start', start); form.set('end', end);
      if (site) form.set('site', site);
      const response = await fetch('/api/contractor/attendance/upload', { method: 'POST', body: form });
      const body = await response.json().catch(() => ({})) as { data?: UploadResult; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'The attendance sheet could not be uploaded.');
      setResult(body.data);
      setNotice(`Attendance synced from ${file.name}: ${body.data.created} new + ${body.data.updated} updated entries for ${body.data.workers} worker(s), marked as “from uploaded sheet”.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The attendance sheet could not be uploaded.');
    } finally { setBusy(false); }
  }

  const columns: DataColumn<AttendanceRow>[] = [
    { id: 'date', header: 'Date', value: r => r.date, render: r => displayDate(r.date) },
    { id: 'worker', header: 'Worker', value: r => r.worker },
    { id: 'site', header: 'Site', value: r => r.site || '—', render: r => r.site || '—' },
    { id: 'status', header: 'Status', value: r => STATUS_LABEL[r.status] ?? r.status, render: r => <span className={r.status === 'PRESENT' ? 'text-green-700' : r.status === 'ABSENT' ? 'text-red-700' : 'text-orange-700'}>{STATUS_LABEL[r.status] ?? r.status}</span> },
    { id: 'source', header: 'Source', value: r => r.capture, render: r => <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{r.capture}</span> },
  ];

  const presentCount = useMemo(() => rows.filter(r => r.status === 'PRESENT').length, [rows]);

  return <div className="space-y-6 pb-12">
    <header className="bss-page-header flex-col sm:flex-row">
      <div><p className="bss-eyebrow">Contractor operations</p><h1 className="bss-page-title mt-1">Attendance — Uploaded Sheet</h1><p className="bss-page-description">Pick a start and end date, download the BSS-ID / date-wise CSV template, fill P (Present) / A (Absent) / L (Leave), upload it, and the entries sync into the existing attendance system marked as “from uploaded sheet”.</p></div>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-2"><CalendarDays size={16} className="text-[#073B67]"/><div><h2 className="text-sm font-semibold text-gray-950">Attendance sheet</h2><p className="text-xs text-gray-400 mt-0.5">Choose the site and date range, download the CSV, fill it and upload it back.</p></div></header>
      <div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-xs font-semibold">Site<select value={site} onChange={e => setSite(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white"><option value="">All my sites</option>{sites.map(s => <option key={s.id} value={s.name}>{s.name}{s.code ? ` · ${s.code}` : ''}</option>)}</select></label>
          <label className="text-xs font-semibold">Start date<input type="date" value={start} onChange={e => setStart(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white"/></label>
          <label className="text-xs font-semibold">End date<input type="date" value={end} onChange={e => setEnd(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white"/></label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadTemplate} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50"><Download size={14}/>Download Attendance CSV</button>
          <label className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${busy ? 'bg-[#073B67]/60 text-white' : 'bg-[#073B67] text-white hover:bg-[#062D4F]'}`}><Upload size={14}/>{busy ? 'Uploading…' : 'Upload Filled Sheet (CSV/XLSX)'}<input type="file" accept=".csv,.xlsx" className="hidden" disabled={busy} onChange={e => { void uploadSheet(e.target.files?.[0]); e.target.value = ''; }}/></label>
          <span className="text-[11px] text-gray-400 self-center flex items-center gap-1.5"><FileSpreadsheet size={13}/>Codes: P = Present · A = Absent · L = Leave · H = Holiday</span>
        </div>
        {result && <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs text-emerald-800">
          Synced <strong>{result.rows}</strong> worker row(s) → <strong>{result.created}</strong> new + <strong>{result.updated}</strong> updated attendance entries for <strong>{result.workers}</strong> worker(s){result.site ? ` at ${result.site}` : ''} ({result.start} → {result.end}).{result.unknown.length ? ` ${result.unknown.length} BSS ID(s) not matched to your workers: ${result.unknown.slice(0, 5).join(', ')}.` : ''}
        </div>}
        <p className="text-[11px] text-gray-400">The CSV has a <strong>BSS ID</strong> column plus one column per date (<code>YYYY-MM-DD</code>). Uploaded rows are stored in the same attendance table as QR / NFC / camera punches, with capture method <strong>Uploaded sheet</strong> — so they flow into payroll and worker attendance views automatically.</p>
      </div>
    </section>

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-gray-950">Uploaded attendance — {start} → {end}</h2><p className="text-xs text-gray-400 mt-0.5">{rows.length} entr{rows.length === 1 ? 'y' : 'ies'} · {presentCount} present</p></div></header>
      <EnterpriseDataTable title={`Uploaded attendance — ${start} → ${end}`} rows={rows} columns={columns} rowKey={r => r.id} filename={`attendance-uploaded-${start}-to-${end}`} />
    </section>
  </div>;
}
