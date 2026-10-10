"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Camera, X } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import VideoAttendancePanel from '@/components/attendance/VideoAttendancePanel';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';

type AttendanceRow = {
  id: string; date: string; worker?: string; bssId?: string; site: string;
  status?: string; statusCode?: string; capture?: string; source?: string;
  verification?: string; checkIn?: string; checkOut?: string; singleMark?: boolean;
  camera?: string; cameraArea?: string; confidence?: number | null; matchStatus?: string;
  geofenceOk?: boolean | null; distanceM?: number | null; accuracyM?: number | null; gpsAddress?: string; remarks?: string;
  events?: Array<{ source: string; sourceLabel?: string; type: string; typeLabel?: string; at: string }>;
};

const STATUS_LABEL: Record<string, string> = {
  PRESENT: 'Present', ABSENT: 'Absent', LEAVE: 'Leave', HOLIDAY: 'Holiday',
  HALF_DAY: 'Half Day', LATE: 'Late', EXPECTED: 'Expected',
};

function displayDate(iso: string) {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function EmployerAttendancePage() {
  const { employer } = useEmployer();
  const sites = employer.sites.map(site => ({ id: String(site.id), name: site.name, code: site.code }));

  const [recMonth, setRecMonth] = useState(() => currentMonth());
  const [recSite, setRecSite] = useState('');
  const [recRows, setRecRows] = useState<AttendanceRow[]>([]);
  const [recBusy, setRecBusy] = useState(false);
  const [recSelected, setRecSelected] = useState<AttendanceRow | null>(null);

  const loadRecords = useCallback(() => {
    let active = true;
    setRecBusy(true);
    const query = new URLSearchParams();
    if (recMonth) query.set('month', recMonth);
    if (recSite) query.set('siteId', recSite);
    void fetch(`/api/employer/attendance/records?${query}`, { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: AttendanceRow[] } | null) => { if (active && body?.data) setRecRows(body.data); })
      .catch(() => {})
      .finally(() => { if (active) setRecBusy(false); });
    return () => { active = false; };
  }, [recMonth, recSite]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + filter reload
  useEffect(() => loadRecords(), [loadRecords]);

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
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Principal employer · Operations</p>
      <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><Camera size={22} /> Attendance</h1>
      <p className="text-sm text-gray-500 mt-1">
        View your workers&apos; attendance month-wise and per site — every source (QR, RFID, CCTV, Self GPS, uploaded
        sheet) with full detail — and run video attendance from your site cameras.
      </p>
    </header>

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

    <VideoAttendancePanel sites={sites} />

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
            {recSelected.gpsAddress && <Detail label="Location" value={recSelected.gpsAddress} />}
            {recSelected.matchStatus && <Detail label="Verification" value={recSelected.matchStatus} />}
            {recSelected.events && recSelected.events.length > 0 && (
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] text-gray-500 font-bold uppercase block mb-2">Source records ({recSelected.events.length})</span>
                <ul className="space-y-1.5">
                  {recSelected.events.map((ev, i) => (
                    <li key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">{ev.sourceLabel || ev.source} · {ev.typeLabel || ev.type}</span>
                      <span className="text-gray-800 font-semibold">{ev.at ? new Date(ev.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
