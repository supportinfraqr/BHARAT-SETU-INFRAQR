"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';

type AttendanceRow = {
  id: string; date: string; worker?: string; bssId?: string; site: string;
  status?: string; statusCode?: string; capture?: string; source?: string;
  verification?: string; checkIn?: string; checkOut?: string;
  camera?: string; cameraArea?: string; confidence?: number | null;
  geofenceOk?: boolean | null; distanceM?: number | null; accuracyM?: number | null; remarks?: string;
};
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
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

  // Month-wise, per-site records (all sources).
  const [recMonth, setRecMonth] = useState(() => currentMonth());
  const [recSite, setRecSite] = useState('');
  const [recRows, setRecRows] = useState<AttendanceRow[]>([]);
  const [recBusy, setRecBusy] = useState(false);
  const [recSelected, setRecSelected] = useState<AttendanceRow | null>(null);

  const sites = contractor.sites;

  const loadRecords = useCallback(() => {
    let active = true;
    setRecBusy(true);
    const query = new URLSearchParams();
    if (recMonth) query.set('month', recMonth);
    if (recSite) query.set('siteId', recSite);
    void fetch(`/api/contractor/attendance/records?${query}`, { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: AttendanceRow[] } | null) => { if (active && body?.data) setRecRows(body.data); })
      .catch(() => {})
      .finally(() => { if (active) setRecBusy(false); });
    return () => { active = false; };
  }, [recMonth, recSite]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + filter reload
  useEffect(() => loadRecords(), [loadRecords, result]);

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

  const recColumns: DataColumn<AttendanceRow>[] = [
    { id: 'date', header: 'Date', value: r => r.date, render: r => displayDate(r.date) },
    { id: 'worker', header: 'Worker', value: r => r.worker || '' },
    { id: 'bssId', header: 'BSS ID', value: r => r.bssId || '—', render: r => <span className="font-mono text-[11px]">{r.bssId || '—'}</span> },
    { id: 'site', header: 'Site', value: r => r.site || '—', render: r => r.site || '—' },
    { id: 'in', header: 'In', value: r => r.checkIn || '—', render: r => r.checkIn || '—' },
    { id: 'out', header: 'Out', value: r => r.checkOut || '—', render: r => r.checkOut || '—' },
    { id: 'status', header: 'Status', value: r => STATUS_LABEL[r.statusCode || r.status || ''] ?? (r.statusCode || r.status || '—'), render: r => <span className={(r.statusCode || r.status) === 'PRESENT' ? 'text-green-700' : (r.statusCode || r.status) === 'ABSENT' ? 'text-red-700' : 'text-orange-700'}>{STATUS_LABEL[r.statusCode || r.status || ''] ?? (r.statusCode || r.status || '—')}</span> },
    { id: 'source', header: 'Source', value: r => r.source || r.capture || '', render: r => <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{r.source || r.capture}</span> },
    { id: 'view', header: '', value: () => '', render: r => <button type="button" onClick={() => setRecSelected(r)} className="text-[11px] font-bold text-[#073B67] hover:underline">Details</button> },
  ];

  const presentCount = useMemo(() => recRows.filter(r => (r.statusCode || r.status) === 'PRESENT').length, [recRows]);

  return <div className="space-y-6 pb-12">
    <header className="bss-page-header flex-col sm:flex-row">
      <div><p className="bss-eyebrow">Contractor operations</p><h1 className="bss-page-title mt-1">Attendance</h1><p className="bss-page-description">View your workers&apos; attendance month-wise and per site — every source (QR, RFID, CCTV, Self GPS, uploaded sheet) with full detail — and upload a filled sheet when needed.</p></div>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-2"><CalendarDays size={16} className="text-[#073B67]"/><div><h2 className="text-sm font-semibold text-gray-950">Attendance records</h2><p className="text-xs text-gray-400 mt-0.5">{recRows.length} entr{recRows.length === 1 ? 'y' : 'ies'} · {presentCount} present this month</p></div></header>
      <div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold">Month<input type="month" value={recMonth} onChange={e => setRecMonth(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white"/></label>
          <label className="text-xs font-semibold">Site<select value={recSite} onChange={e => setRecSite(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white"><option value="">All my sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` · ${s.code}` : ''}</option>)}</select></label>
        </div>
        {recBusy && <p className="text-[11px] text-gray-400">Loading attendance…</p>}
        <EnterpriseDataTable title="Attendance records" rows={recRows} columns={recColumns} rowKey={r => r.id} filename={`attendance-records-${recMonth}`} />
      </div>
    </section>

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#073B67]"/><div><h2 className="text-sm font-semibold text-gray-950">Upload attendance sheet</h2><p className="text-xs text-gray-400 mt-0.5">Choose the site and date range, download the CSV, fill it and upload it back.</p></div></header>
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
      </div>
    </section>

    {recSelected && (
      <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4" onClick={() => setRecSelected(null)}>
        <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
          <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Attendance Detail</p>
              <h3 className="text-sm font-extrabold text-gray-900">{displayDate(recSelected.date)} · {recSelected.worker}</h3>
            </div>
            <button type="button" onClick={() => setRecSelected(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg text-gray-500 hover:bg-gray-100"><X size={18}/></button>
          </header>
          <div className="p-4 space-y-2 text-xs">
            <Detail label="BSS ID" value={recSelected.bssId || '—'} mono />
            <Detail label="Site" value={recSelected.site || '—'} />
            <Detail label="Status" value={STATUS_LABEL[recSelected.statusCode || recSelected.status || ''] ?? (recSelected.statusCode || recSelected.status || '—')} />
            <Detail label="Source" value={recSelected.source || recSelected.capture || '—'} />
            <Detail label="Verification" value={recSelected.verification || '—'} />
            <div className="grid grid-cols-2 gap-2">
              <Detail label="Check In" value={recSelected.checkIn || '—'} />
              <Detail label="Check Out" value={recSelected.checkOut || '—'} />
            </div>
            {recSelected.camera && <Detail label="CCTV Camera" value={`${recSelected.camera}${recSelected.cameraArea && recSelected.cameraArea !== recSelected.camera ? ` · ${recSelected.cameraArea}` : ''}`} />}
            {(recSelected.geofenceOk !== undefined && recSelected.geofenceOk !== null) && (
              <Detail label="Geo-fence" value={`${recSelected.geofenceOk ? 'Within site' : 'Flagged outside'}${recSelected.distanceM != null ? ` · ${recSelected.distanceM} m` : ''}`} />
            )}
            {typeof recSelected.confidence === 'number' && <Detail label="Match Confidence" value={`${recSelected.confidence}%`} />}
            {recSelected.remarks && <Detail label="Remarks" value={recSelected.remarks} />}
          </div>
          <div className="p-4 pt-0">
            <button type="button" onClick={() => setRecSelected(null)} className="w-full h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold">Close</button>
          </div>
        </div>
      </div>
    )}
  </div>;
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
      <span className="text-gray-500 font-semibold">{label}</span>
      <span className={`font-bold text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
