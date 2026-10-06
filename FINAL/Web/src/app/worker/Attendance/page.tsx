'use client';
import { useMemo, useState } from 'react';
import {
  CalendarDays,
  List,
  QrCode,
  ScanLine,
  RadioTower,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  CalendarCheck2,
  Layers
} from 'lucide-react';
import { fieldClass, ModuleShell } from '@/components/worker/ModuleShell';
import type { AttendanceRecord } from '@/types/portal';
import { useWorker } from '@/contexts/WorkerContext';
import EnterpriseDataTable, { DataColumn } from '@/components/worker/EnterpriseDataTable';

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AttendancePage() {
  const { portal } = useWorker();
  const attendanceData = portal.attendance;
  const [view, setView] = useState<'calendar' | 'history'>('calendar');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const records = attendanceData.records;

  // Calendar grid anchor & navigation
  const anchor = records[0]?.date ? new Date(records[0].date) : new Date();
  const [month, setMonth] = useState(anchor.getMonth());
  const [year, setYear] = useState(anchor.getFullYear());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const byDate = useMemo(() => new Map(records.map((r) => [r.date, r])), [records]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Sync with holiday calendar, weekly offs and leave records (Approved, Pending, Rejected)
  const holidayByDate = useMemo(() => new Map((portal.holidays ?? []).map((h) => [h.date, h])), [portal.holidays]);
  const weeklyOff = useMemo(() => new Set(portal.weeklyOffDays ?? []), [portal.weeklyOffDays]);
  
  const leaveInfoByDate = useMemo(() => {
    const map = new Map<string, { type: string; status: 'Approved' | 'Pending' | 'Rejected' | 'Cancelled' }>();
    for (const r of portal.leaveRecords ?? []) {
      const start = new Date(`${r.from}T00:00:00`), end = new Date(`${r.to}T00:00:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) continue;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        map.set(dayKey(d), { type: r.type, status: (r.status as 'Approved' | 'Pending' | 'Rejected') || 'Pending' });
      }
    }
    for (const r of portal.restrictedHolidays?.requests ?? []) {
      map.set(r.holidayDate, {
        type: 'Restricted Holiday',
        status: (r.status as 'Approved' | 'Pending' | 'Rejected') || 'Pending'
      });
    }
    return map;
  }, [portal.leaveRecords, portal.restrictedHolidays]);

  const mergedFor = useMemo(
    () => (date: string, jsDay: number): (AttendanceRecord & { leaveType?: string; leaveStatus?: string }) | undefined => {
      const rec = byDate.get(date);
      if (rec) return rec;
      const leaveInfo = leaveInfoByDate.get(date);
      if (leaveInfo) {
        return {
          date,
          presence: 'Leave',
          leaveType: leaveInfo.type,
          leaveStatus: leaveInfo.status,
          site: '',
          status: 'Recorded'
        };
      }
      const holiday = holidayByDate.get(date);
      if (holiday)
        return {
          date,
          presence: holiday.typeCode === 'WEEKLY_OFF' ? 'Weekly Off' : 'Holiday',
          site: holiday.appliesTo,
          status: 'Recorded'
        };
      if (weeklyOff.has(DAY_CODES[jsDay])) return { date, presence: 'Weekly Off', site: '', status: 'Recorded' };
      return undefined;
    },
    [byDate, holidayByDate, leaveInfoByDate, weeklyOff]
  );

  const monthRows = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const date = `${monthKey}-${String(day).padStart(2, '0')}`;
        return mergedFor(date, new Date(year, month, day).getDay());
      }).filter((r): r is AttendanceRecord => !!r),
    [mergedFor, daysInMonth, month, year, monthKey]
  );

  const monthCount = (presence: string) => monthRows.filter((r) => r.presence === presence).length;

  const methodCounts = {
    qr: records.filter((r) => r.method?.includes('QR Scan')).length,
    cctv: records.filter((r) => r.method?.includes('CCTV')).length,
    rfid: records.filter((r) => r.method?.includes('RFID')).length
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const statusStyle = (presence: string) => {
    switch (presence) {
      case 'Present':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Absent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Leave':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Holiday':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Weekly Off':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <ModuleShell
      title="Site Attendance System"
      description="Official biometric, QR scan and CCTV attendance records synchronized from your site."
      icon={CalendarDays}
    >
      <div className="space-y-6">
        {/* Connection Banner */}
        <div className="bg-gradient-to-r from-[#073B67] to-[#0A4D87] rounded-3xl p-6 text-white shadow-xl shadow-[#073B67]/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md border border-white/15">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>{portal.dataMode === 'demo' ? 'Verified Database Mode' : 'Live System Sync'}</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight">Attendance Logs & Shift Summary</h2>
              <p className="text-white/80 text-xs max-w-xl">
                Source: <b className="text-white">{attendanceData.source}</b> · Last Synced:{' '}
                {attendanceData.syncedAt ? new Date(attendanceData.syncedAt).toLocaleString('en-IN') : '—'}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 p-2 rounded-2xl">
              <button
                onClick={prevMonth}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>

              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="bg-white/20 text-white font-extrabold text-xs rounded-lg px-2 py-1 border border-white/20 focus:outline-none cursor-pointer"
              >
                {monthNames.map((m, i) => (
                  <option key={m} value={i} className="text-gray-900 font-bold">
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-white/20 text-white font-extrabold text-xs rounded-lg px-2 py-1 border border-white/20 focus:outline-none cursor-pointer"
              >
                {[year - 2, year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y} className="text-gray-900 font-bold">
                    {y}
                  </option>
                ))}
              </select>

              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-white/15">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-white/70 block">Present Days</span>
              <span className="text-lg font-bold text-emerald-300">{monthCount('Present')} Days</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-white/70 block">Absent Days</span>
              <span className="text-lg font-bold text-rose-300">{monthCount('Absent')} Days</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-white/70 block">Approved Leave</span>
              <span className="text-lg font-bold text-amber-300">{monthCount('Leave')} Days</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-white/70 block">Holidays & Offs</span>
              <span className="text-lg font-bold text-purple-300">
                {monthCount('Holiday') + monthCount('Weekly Off')} Days
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-white/70 block">Working Days</span>
              <span className="text-lg font-bold text-white">
                {monthRows.filter((r) => !['Weekly Off', 'Holiday'].includes(r.presence)).length} Days
              </span>
            </div>
          </div>
        </div>

        {/* Capture Methods Bar & Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 border border-gray-200 rounded-2xl shadow-sm">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">Capture System:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#073B67] border border-blue-100 font-bold">
              <QrCode size={14} /> QR Scan ({methodCounts.qr})
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 font-bold">
              <ScanLine size={14} /> CCTV ({methodCounts.cctv})
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold">
              <RadioTower size={14} /> RFID ({methodCounts.rfid})
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex rounded-xl bg-gray-100 p-1 w-full sm:w-auto">
              <button
                onClick={() => setView('calendar')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  view === 'calendar' ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays size={14} /> Calendar Grid
              </button>
              <button
                onClick={() => setView('history')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  view === 'history' ? 'bg-white text-[#073B67] shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List size={14} /> History Log
              </button>
            </div>
          </div>
        </div>

        {/* View Content */}
        {view === 'calendar' ? (
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 text-center text-xs font-extrabold uppercase tracking-wider text-gray-500 py-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 p-px">
              {Array.from({ length: firstWeekday }, (_, i) => (
                <div key={`pad-${i}`} className="bg-white p-2 min-h-[5.5rem] opacity-40" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const date = `${monthKey}-${String(day).padStart(2, '0')}`;
                const jsDay = new Date(year, month, day).getDay();
                const rec = mergedFor(date, jsDay);
                const isToday = date === todayKey;
                const holiday = holidayByDate.get(date);

                return (
                  <div
                    key={date}
                    onClick={() => rec && setSelectedRecord(rec)}
                    className={`bg-white p-2.5 min-h-[5.5rem] flex flex-col justify-between transition-all relative group cursor-pointer hover:bg-blue-50/30 ${
                      isToday ? 'ring-2 ring-inset ring-[#073B67]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-[#073B67] text-white shadow-sm'
                            : rec?.presence === 'Present'
                            ? 'text-emerald-700 bg-emerald-50'
                            : rec?.presence === 'Absent'
                            ? 'text-rose-600 bg-rose-50'
                            : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#073B67]">
                          Today
                        </span>
                      )}
                    </div>

                    {rec ? (
                      <div className="space-y-1 my-1">
                        <span
                          className={`block text-[10px] font-extrabold px-1.5 py-0.5 rounded border text-center truncate ${statusStyle(
                            rec.presence
                          )}`}
                        >
                          {rec.presence === 'Leave' && rec.leaveType
                            ? `${rec.leaveType}`
                            : rec.presence}
                        </span>

                        {rec.presence === 'Leave' && rec.leaveStatus && (
                          <span
                            className={`block text-[8.5px] font-bold px-1 rounded text-center truncate ${
                              rec.leaveStatus === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.leaveStatus === 'Rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.leaveStatus}
                          </span>
                        )}

                        {rec.presence === 'Present' && rec.checkIn && (
                          <span className="block text-[9px] font-semibold text-gray-500 text-center">
                            {rec.checkIn} - {rec.checkOut || 'Active'}
                          </span>
                        )}

                        {rec.method && rec.method !== '—' && (
                          <span className="block text-[8.5px] text-gray-400 font-mono text-center truncate">
                            {rec.method}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-300 text-center my-auto">—</span>
                    )}

                    {holiday && (
                      <span className="block text-[8.5px] font-bold text-purple-700 truncate bg-purple-50 px-1 rounded text-center">
                        {holiday.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50/50 border-t border-gray-100 text-xs font-bold text-gray-600">
              <div className="flex flex-wrap gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" /> Present
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500" /> Absent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500" /> Leave (Approved / Pending)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-500" /> Holiday
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-gray-400" /> Weekly Off
                </span>
              </div>
              <span className="text-gray-400 font-normal">Click any day to view full shift & leave details</span>
            </div>
          </div>
        ) : (
          <EnterpriseDataTable
            title="Attendance Records History"
            rows={records}
            columns={attendanceColumns}
            rowKey={(r) => r.date}
            filename="bss-attendance-history"
          />
        )}

        {/* Selected Record Modal / Details */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95">
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-gray-400 block uppercase">Attendance Detail</span>
                  <h3 className="text-lg font-extrabold text-gray-900">{selectedRecord.date}</h3>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 font-semibold">Presence Status</span>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${statusStyle(
                      selectedRecord.presence
                    )}`}
                  >
                    {selectedRecord.presence}
                  </span>
                </div>

                {selectedRecord.presence === 'Leave' && (selectedRecord as any).leaveType && (
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">Leave Application Details</span>
                    <div className="flex items-center justify-between">
                      <strong className="text-xs text-amber-900 font-extrabold">{(selectedRecord as any).leaveType}</strong>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          (selectedRecord as any).leaveStatus === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : (selectedRecord as any).leaveStatus === 'Rejected'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {(selectedRecord as any).leaveStatus}
                      </span>
                    </div>
                  </div>
                )}

                {selectedRecord.site && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-500 font-semibold">Worksite</span>
                    <span className="text-xs font-bold text-gray-900">{selectedRecord.site}</span>
                  </div>
                )}

                {selectedRecord.shift && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-500 font-semibold">Shift Timing</span>
                    <span className="text-xs font-bold text-gray-900">{selectedRecord.shift}</span>
                  </div>
                )}

                {selectedRecord.checkIn && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 font-bold block uppercase">Check In</span>
                      <strong className="text-sm text-emerald-900">{selectedRecord.checkIn}</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
                      <span className="text-[10px] text-blue-700 font-bold block uppercase">Check Out</span>
                      <strong className="text-sm text-blue-900">{selectedRecord.checkOut || 'Active Shift'}</strong>
                    </div>
                  </div>
                )}

                {selectedRecord.method && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-500 font-semibold">Validation Method</span>
                    <span className="text-xs font-bold text-[#073B67]">{selectedRecord.method}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="w-full h-11 rounded-xl bg-[#073B67] text-white text-sm font-bold shadow-lg shadow-[#073B67]/20"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </div>
    </ModuleShell>
  );
}

type AttendanceRow = AttendanceRecord;
const attendanceColumns: DataColumn<AttendanceRow>[] = [
  { id: 'date', header: 'Date', value: (r) => r.date },
  {
    id: 'presence',
    header: 'Presence',
    value: (r) => r.presence,
    render: (r) => (
      <span
        className={`px-2 py-0.5 rounded text-xs font-bold border ${
          r.presence === 'Present'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : r.presence === 'Absent'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-gray-100 text-gray-600 border-gray-200'
        }`}
      >
        {r.presence}
      </span>
    )
  },
  {
    id: 'method',
    header: 'Method',
    value: (r) => r.method ?? '—',
    render: (r) =>
      r.method && r.method !== '—' ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#073B67] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
          {r.method.includes('QR Scan') ? (
            <QrCode size={11} />
          ) : r.method.includes('CCTV') ? (
            <ScanLine size={11} />
          ) : r.method.includes('RFID') ? (
            <RadioTower size={11} />
          ) : null}
          {r.method}
        </span>
      ) : (
        <span className="text-gray-300">—</span>
      )
  },
  { id: 'shift', header: 'Shift', value: (r) => r.shift ?? 'Not applicable' },
  { id: 'site', header: 'Site', value: (r) => r.site },
  { id: 'checkIn', header: 'Check-in', value: (r) => r.checkIn ?? '—' },
  { id: 'checkOut', header: 'Check-out', value: (r) => r.checkOut ?? '—' },
  { id: 'status', header: 'Status', value: (r) => r.status }
];
