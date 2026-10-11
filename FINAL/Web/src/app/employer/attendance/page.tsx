"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Camera } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import AttendanceDetailDialog from '@/components/attendance/AttendanceDetailDialog';
import type { AttendanceRecord } from '@/types/portal';

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

// Map the employer records row onto the shared worker AttendanceRecord shape.
function toRecord(r: AttendanceRow): AttendanceRecord {
  return {
    ...(r as unknown as AttendanceRecord),
    presence: (STATUS_LABEL[r.statusCode || r.status || ''] ?? 'Present') as AttendanceRecord['presence'],
    events: r.events as unknown as AttendanceRecord['events'],
  };
}

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
    { id: 'status', header: 'Status', value: r => STATUS_LABEL[r.statusCode || r.status || ''] ?? (r.statusCode || r.status || '—'), render: r => <span className={(r.statusCode || r.status) === 'PRESENT' ? 'text-bss-green' : (r.statusCode || r.status) === 'ABSENT' ? 'text-bss-error' : 'text-bss-orange'}>{STATUS_LABEL[r.statusCode || r.status || ''] ?? (r.statusCode || r.status || '—')}</span> },
    { id: 'source', header: 'Source', value: r => r.source || r.capture || '', render: r => <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bss-blue-tint text-bss-interactive-blue">{r.source || r.capture}</span> },
    { id: 'view', header: '', value: () => '', render: r => <button type="button" onClick={() => setRecSelected(r)} className="text-[11px] font-bold text-[#01183A] hover:underline">Details</button> },
  ];

  const presentCount = useMemo(() => recRows.filter(r => (r.statusCode || r.status) === 'PRESENT').length, [recRows]);

  return <div className="space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Principal employer · Operations</p>
      <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><Camera size={22} /> Attendance</h1>
      <p className="text-sm text-bss-text-muted mt-1">
        View your workers&apos; attendance month-wise and per site — every source (QR, RFID, CCTV, Self GPS, uploaded
        sheet) with full detail — CCTV attendance control is on the CCTV Setup page.
      </p>
    </header>

    <section className="bss-card rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border flex items-center gap-2"><CalendarDays size={16} className="text-[#01183A]"/><div><h2 className="text-sm font-semibold text-bss-text-primary">Attendance records</h2><p className="text-xs text-bss-text-muted mt-0.5">{recRows.length} entr{recRows.length === 1 ? 'y' : 'ies'} · {presentCount} present this month</p></div></header>
      <div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold">Month<input type="month" value={recMonth} onChange={e => setRecMonth(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white"/></label>
          <label className="text-xs font-semibold">Site<select value={recSite} onChange={e => setRecSite(e.target.value)} className="mt-1 w-full h-10 border rounded-lg px-2 text-sm bg-white"><option value="">All my sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` · ${s.code}` : ''}</option>)}</select></label>
        </div>
        {recBusy && <p className="text-[11px] text-bss-text-muted">Loading attendance…</p>}
        <EnterpriseDataTable title="Attendance records" rows={recRows} columns={recColumns} rowKey={r => r.id} filename={`attendance-records-${recMonth}`} />
      </div>
    </section>

    {recSelected && (
      <AttendanceDetailDialog
        record={toRecord(recSelected)}
        subtitle={`${recSelected.worker ?? ''}${recSelected.bssId ? ` · ${recSelected.bssId}` : ''}`}
        onClose={() => setRecSelected(null)}
      />
    )}
  </div>;
}
