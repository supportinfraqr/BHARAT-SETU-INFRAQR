"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useContractor } from '@/contexts/ContractorContext';

type AttendanceRow = {
  id: string; date: string; worker?: string; bssId?: string; site: string;
  status?: string; statusCode?: string; capture?: string; source?: string;
  verification?: string; checkIn?: string; checkOut?: string; singleMark?: boolean;
  camera?: string; cameraArea?: string; confidence?: number | null; matchStatus?: string;
  geofenceOk?: boolean | null; distanceM?: number | null; accuracyM?: number | null; gpsAddress?: string; remarks?: string;
  events?: Array<{ source: string; sourceLabel?: string; type: string; typeLabel?: string; at: string }>;
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
    { id: 'status', header: 'Status', value: r => STATUS_LABEL[r.statusCode || r.status || ''] ?? (r.statusCode || r.status || '—'), render: r => { const s = r.statusCode || r.status; return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s === 'PRESENT' ? 'bg-bss-soft-green text-bss-green' : s === 'ABSENT' ? 'bg-bss-soft-orange text-bss-error' : 'bg-bss-soft-orange text-bss-orange'}`}>{s === 'PRESENT' ? <CheckCircle2 size={11}/> : s === 'ABSENT' ? <X size={11}/> : null}{STATUS_LABEL[s || ''] ?? (s || '—')}</span>; } },
    { id: 'source', header: 'Source', value: r => r.source || r.capture || '', render: r => <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-bss-blue-tint text-bss-interactive-blue">{r.source || r.capture}</span> },
    { id: 'view', header: '', value: () => '', render: r => <button type="button" onClick={() => setRecSelected(r)} className="text-[11px] font-semibold text-bss-interactive-blue hover:underline">Details</button> },
  ];

  const presentCount = useMemo(() => recRows.filter(r => (r.statusCode || r.status) === 'PRESENT').length, [recRows]);

  return <div className="space-y-6 pb-12">
    <header className="bss-page-header flex-col sm:flex-row">
      <div><p className="bss-eyebrow">Contractor operations</p><h1 className="bss-page-title mt-1">Attendance</h1><p className="bss-page-description">View your workers&apos; attendance month-wise and per site — every source (QR, RFID, CCTV, Self GPS, uploaded sheet) with full detail — and upload a filled sheet when needed.</p></div>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    {/* Stat cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bss-card rounded-2xl p-4"><span className="bss-kpi-icon bg-bss-blue-tint text-bss-interactive-blue"><CalendarDays size={16}/></span><strong className="block text-2xl font-bold text-bss-text-primary mt-2">{recRows.length}</strong><p className="text-xs text-bss-text-secondary mt-1">Total entries</p></div>
      <div className="bss-card rounded-2xl p-4"><span className="bss-kpi-icon bg-bss-soft-green text-bss-green"><CheckCircle2 size={16}/></span><strong className="block text-2xl font-bold text-bss-green mt-2">{presentCount}</strong><p className="text-xs text-bss-text-secondary mt-1">Present this month</p></div>
      <div className="bss-card rounded-2xl p-4"><span className="bss-kpi-icon bg-bss-soft-orange text-bss-orange"><FileSpreadsheet size={16}/></span><strong className="block text-2xl font-bold text-bss-text-primary mt-2">{sites.length}</strong><p className="text-xs text-bss-text-secondary mt-1">Sites</p></div>
      <div className="bss-card rounded-2xl p-4"><span className="bss-kpi-icon bg-bss-blue-tint text-bss-interactive-blue"><Upload size={16}/></span><strong className="block text-2xl font-bold text-bss-text-primary mt-2">{result ? result.workers : '—'}</strong><p className="text-xs text-bss-text-secondary mt-1">Last upload syncs</p></div>
    </div>

    <section className="bss-card rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border flex items-center gap-2"><span className="bss-kpi-icon bg-bss-blue-tint text-bss-interactive-blue"><CalendarDays size={16}/></span><div><h2 className="text-sm font-semibold text-bss-text-primary">Attendance records</h2><p className="text-xs text-bss-text-muted mt-0.5">{recRows.length} entr{recRows.length === 1 ? 'y' : 'ies'} · {presentCount} present this month</p></div></header>
      <div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] font-semibold text-bss-text-secondary">Month</span><input type="month" value={recMonth} onChange={e => setRecMonth(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue"/></label>
          <label className="block"><span className="text-[11px] font-semibold text-bss-text-secondary">Site</span><select value={recSite} onChange={e => setRecSite(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue"><option value="">All my sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` · ${s.code}` : ''}</option>)}</select></label>
        </div>
        {recBusy && <p className="text-[11px] text-bss-text-muted">Loading attendance…</p>}
        <EnterpriseDataTable title="Attendance records" rows={recRows} columns={recColumns} rowKey={r => r.id} filename={`attendance-records-${recMonth}`} />
      </div>
    </section>

    <section className="bss-card rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border flex items-center gap-2"><span className="bss-kpi-icon bg-bss-blue-tint text-bss-interactive-blue"><FileSpreadsheet size={16}/></span><div><h2 className="text-sm font-semibold text-bss-text-primary">Upload attendance sheet</h2><p className="text-xs text-bss-text-muted mt-0.5">Choose the site and date range, download the CSV, fill it and upload it back.</p></div></header>
      <div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block"><span className="text-[11px] font-semibold text-bss-text-secondary">Site</span><select value={site} onChange={e => setSite(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue"><option value="">All my sites</option>{sites.map(s => <option key={s.id} value={s.name}>{s.name}{s.code ? ` · ${s.code}` : ''}</option>)}</select></label>
          <label className="block"><span className="text-[11px] font-semibold text-bss-text-secondary">Start date</span><input type="date" value={start} onChange={e => setStart(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue"/></label>
          <label className="block"><span className="text-[11px] font-semibold text-bss-text-secondary">End date</span><input type="date" value={end} onChange={e => setEnd(e.target.value)} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-white text-bss-text-primary focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/30 focus:border-bss-interactive-blue"/></label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadTemplate} className="h-10 px-4 rounded-lg border border-bss-border bg-white text-xs font-semibold text-bss-text-primary flex items-center gap-1.5 hover:bg-bss-bg transition-colors shadow-xs"><Download size={14}/>Download Attendance CSV</button>
          <label className={`h-10 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm ${busy ? 'bg-bss-interactive-blue/60 text-white' : 'bg-bss-interactive-blue text-white hover:bg-bss-deep-navy'}`}><Upload size={14}/>{busy ? 'Uploading…' : 'Upload Filled Sheet (CSV/XLSX)'}<input type="file" accept=".csv,.xlsx" className="hidden" disabled={busy} onChange={e => { void uploadSheet(e.target.files?.[0]); e.target.value = ''; }}/></label>
          <span className="text-[11px] text-bss-text-muted self-center flex items-center gap-1.5"><FileSpreadsheet size={13}/>Codes: P = Present · A = Absent · L = Leave · H = Holiday</span>
        </div>
        {result && <div className="rounded-xl border border-bss-border bg-bss-soft-green p-3 text-xs text-bss-green">
          Synced <strong>{result.rows}</strong> worker row(s) → <strong>{result.created}</strong> new + <strong>{result.updated}</strong> updated attendance entries for <strong>{result.workers}</strong> worker(s){result.site ? ` at ${result.site}` : ''} ({result.start} → {result.end}).{result.unknown.length ? ` ${result.unknown.length} BSS ID(s) not matched to your workers: ${result.unknown.slice(0, 5).join(', ')}.` : ''}
        </div>}
      </div>
    </section>

    {recSelected && (
      <div className="fixed inset-0 z-[120] grid place-items-center bg-bss-navy/40 backdrop-blur-sm p-4" onClick={() => setRecSelected(null)}>
        <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
          <header className="flex items-center justify-between px-5 py-4 border-b border-bss-border">
            <div>
              <p className="text-[10px] font-bold text-bss-text-muted uppercase">Attendance Detail</p>
              <h3 className="text-sm font-semibold text-bss-text-primary mt-0.5">{displayDate(recSelected.date)} · {recSelected.worker}</h3>
            </div>
            <button type="button" onClick={() => setRecSelected(null)} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg text-bss-text-secondary hover:bg-bss-bg"><X size={18}/></button>
          </header>
          <div className="p-5 space-y-2 text-xs">
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
            {recSelected.gpsAddress && <Detail label="Location" value={recSelected.gpsAddress} />}
            {recSelected.matchStatus && <Detail label="Verification" value={recSelected.matchStatus} />}
            {recSelected.events && recSelected.events.length > 0 && (
              <div className="p-3 rounded-2xl bg-bss-bg border border-bss-border">
                <span className="text-[10px] text-bss-text-muted font-semibold uppercase block mb-2">Source records ({recSelected.events.length})</span>
                <ul className="space-y-1.5">
                  {recSelected.events.map((ev, i) => (
                    <li key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-bss-text-secondary">{ev.sourceLabel || ev.source} · {ev.typeLabel || ev.type}</span>
                      <span className="text-bss-text-primary font-semibold">{ev.at ? new Date(ev.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recSelected.remarks && <Detail label="Remarks" value={recSelected.remarks} />}
          </div>
          <div className="p-5 pt-0">
            <button type="button" onClick={() => setRecSelected(null)} className="w-full h-10 rounded-lg bg-bss-interactive-blue text-white text-sm font-semibold hover:bg-bss-deep-navy transition-colors">Close</button>
          </div>
        </div>
      </div>
    )}
  </div>;
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-bss-bg border border-bss-border">
      <span className="text-bss-text-muted font-semibold">{label}</span>
      <span className={`font-semibold text-bss-text-primary text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
