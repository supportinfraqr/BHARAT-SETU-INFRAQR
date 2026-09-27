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
  const [camSiteId, setCamSiteId] = useState('');
  const [camBusy, setCamBusy] = useState(false);
  const [camRunning, setCamRunning] = useState(false);
  const [camNotice, setCamNotice] = useState('');
  const [camDetections, setCamDetections] = useState<Array<{ id: number; name: string | null; tsStart: number }>>([]);
  const [camMarked, setCamMarked] = useState(0);

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

  useEffect(() => {
    if (!camRunning || !camSiteId) return;
    let active = true;
    const tick = async () => {
      try {
        const response = await fetch('/api/contractor/attendance/camera', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: Number(camSiteId), action: 'sync' }),
        });
        const body = await response.json().catch(() => ({})) as {
          data?: { sightings: Array<{ id: number; name: string | null; tsStart: number }>; markedToday: number };
        };
        if (active && body.data) {
          setCamDetections(body.data.sightings ?? []);
          setCamMarked(body.data.markedToday ?? 0);
        }
      } catch { /* transient; retry next tick */ }
    };
    void tick();
    const timer = setInterval(tick, 10_000);
    return () => { active = false; clearInterval(timer); };
  }, [camRunning, camSiteId]);

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

  async function controlCamera(action: 'start' | 'stop') {
    const siteId = camSiteId || String(sites[0]?.id ?? '');
    if (!siteId) { setError('Select a site first.'); return; }
    setCamBusy(true); setError(''); setCamNotice('');
    try {
      const response = await fetch('/api/contractor/attendance/camera', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: Number(siteId), action }),
      });
      const body = await response.json().catch(() => ({})) as {
        data?: { siteName: string; running: boolean; sightings: Array<{ id: number; name: string | null; tsStart: number }>; markedToday: number };
        error?: string;
      };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Camera action failed.');
      setCamRunning(body.data.running);
      setCamSiteId(siteId);
      setCamDetections(body.data.sightings ?? []);
      setCamMarked(body.data.markedToday ?? 0);
      setCamNotice(`${action === 'start' ? 'Started' : 'Stopped'} live attendance for ${body.data.siteName}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Camera action failed.');
    } finally { setCamBusy(false); }
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

    {/* AI CCTV video attendance — real pipeline control */}
    <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl border border-slate-700 text-white p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${camRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className={`text-xs font-extrabold uppercase tracking-widest ${camRunning ? 'text-emerald-400' : 'text-slate-400'}`}>{camRunning ? 'Live — tracking' : 'Live AI attendance'}</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">Site CCTV &amp; Camera Attendance</h2>
          <p className="text-xs text-slate-300 mt-1">Pick one of your allotted sites and start its camera pipeline — recognised workers and QR scans are recorded live for that site.</p>
        </div>
        <button
          type="button"
          disabled={camBusy}
          onClick={() => controlCamera(camRunning ? 'stop' : 'start')}
          className={`h-10 px-5 rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all self-start sm:self-auto disabled:opacity-50 ${camRunning ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'}`}
        >
          {camRunning ? '⏹ Stop Attendance Camera' : '📹 Start Attendance Camera'}
        </button>
      </div>

      {camNotice && <p className="text-xs text-emerald-300">{camNotice}</p>}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Site</span>
          <select value={camSiteId} onChange={e => setCamSiteId(e.target.value)} className="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-2 text-xs font-semibold text-slate-200 focus:outline-none">
            {sites.length === 0 && <option value="">No allotted sites</option>}
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` · ${s.code}` : ''}</option>)}
          </select>
          <p className="text-[10px] text-slate-400">Status: <span className={camRunning ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>{camRunning ? 'Pipeline running' : 'Stopped'}</span></p>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recorded detections</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-white">{camDetections.length}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">This site</span>
          </div>
          <p className="text-[10px] text-slate-400">Face / QR events stored by the pipeline.</p>
          <p className="text-[10px] text-emerald-300">Workers marked today: <strong>{camMarked}</strong></p>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latest events</span>
          {camDetections.length === 0
            ? <p className="text-[11px] text-slate-500">No events yet.</p>
            : <ul className="space-y-1">{camDetections.slice(0, 4).map(d => (
                <li key={d.id} className="text-[11px] text-slate-200 flex justify-between gap-2">
                  <span>{d.name || 'Unknown / QR'}</span>
                  <span className="text-slate-500">{new Date((d.tsStart || 0) * 1000).toLocaleTimeString()}</span>
                </li>
              ))}</ul>}
        </div>
      </div>
    </section>

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-gray-950">Uploaded attendance — {start} → {end}</h2><p className="text-xs text-gray-400 mt-0.5">{rows.length} entr{rows.length === 1 ? 'y' : 'ies'} · {presentCount} present</p></div></header>
      <EnterpriseDataTable title={`Uploaded attendance — ${start} → ${end}`} rows={rows} columns={columns} rowKey={r => r.id} filename={`attendance-uploaded-${start}-to-${end}`} />
    </section>
  </div>;
}
