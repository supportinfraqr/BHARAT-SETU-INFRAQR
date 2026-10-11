'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { IScannerControls } from '@zxing/browser';
import {
  ArrowLeft,
  CalendarDays,
  List,
  QrCode,
  ScanLine,
  MapPin,
  Loader2,
  Upload,
  X,
  RadioTower,
  CheckCircle2,
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
import PageHero from '@/components/portal/PageHero';
import type { AttendanceRecord } from '@/types/portal';
import { useWorker } from '@/contexts/WorkerContext';
import EnterpriseDataTable, { DataColumn } from '@/components/worker/EnterpriseDataTable';
import ScanFrame from '@/components/qr/ScanFrame';
import AttendanceDetailDialog, { statusStyle, fmtDist, fmtCoord } from '@/components/attendance/AttendanceDetailDialog';
import { createQrReader, QR_VIDEO_CONSTRAINTS, applyContinuousFocus, decodeQrFromImageFile } from '@/lib/qrScanner';

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Resolve coordinates to a human-readable address via the geocode proxy.
 *  Best-effort — returns '' on any failure so it never blocks marking. */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
    if (!res.ok) return '';
    const body = await res.json() as { data?: { address?: string; label?: string } | null };
    return String(body.data?.address || body.data?.label || '').trim();
  } catch { return ''; }
}

export default function AttendancePage() {
  const { portal, refresh } = useWorker();
  const attendanceData = portal.attendance;
  const [view, setView] = useState<'calendar' | 'history'>('calendar');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [siteFilter, setSiteFilter] = useState('');
  const records = attendanceData.records;
  const sites = useMemo(() => Array.from(new Set(records.map(r => r.site).filter(Boolean))), [records]);
  const visibleRecords = useMemo(() => (siteFilter ? records.filter(r => r.site === siteFilter) : records), [records, siteFilter]);

  // ── Self attendance: scan the site QR + capture GPS ──────────────────────
  type MarkState = 'idle' | 'scanning' | 'locating' | 'submitting' | 'done' | 'already' | 'error';
  type MarkResult = { action?: 'IN' | 'OUT'; checkIn?: string | null; checkOut?: string | null; finalCheckout?: boolean; site?: string; distanceM?: number | null; radiusM?: number | null; outsideM?: number | null; accuracyM?: number | null; gpsLat?: number | null; gpsLong?: number | null; within?: boolean | null; clubbed?: boolean | null; geofenceOk?: boolean | null; address?: string | null; remarks?: string };
  const [markOpen, setMarkOpen] = useState(false);
  const [markState, setMarkState] = useState<MarkState>('idle');
  const [markMessage, setMarkMessage] = useState('');
  const [markResult, setMarkResult] = useState<MarkResult | null>(null);
  const [markLocation, setMarkLocation] = useState('');
  const [markCoords, setMarkCoords] = useState<{ lat: number; lng: number } | null>(null);
  const scanVideoRef = useRef<HTMLVideoElement>(null);
  const scanControls = useRef<IScannerControls | null>(null);

  const stopScan = useCallback(() => { scanControls.current?.stop(); scanControls.current = null; }, []);
  useEffect(() => () => stopScan(), [stopScan]);

  const submitMark = useCallback((siteToken: string) => {
    if (!navigator.geolocation) { setMarkState('error'); setMarkMessage('Location is not supported on this device.'); return; }
    setMarkState('locating'); setMarkMessage('Capturing your location…');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      setMarkMessage('Resolving your location…');
      setMarkCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      const address = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (address) setMarkLocation(address);
      setMarkState('submitting'); setMarkMessage('Marking attendance…');
      try {
        const response = await fetch('/api/worker/attendance/site-scan', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteToken, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, address }),
        });
        const body = await response.json().catch(() => ({})) as { data?: MarkResult; error?: string };
        if (!response.ok || !body.data) throw new Error(body.error ?? 'Attendance could not be marked.');
        setMarkResult(body.data);
        setMarkState('done');
        void refresh();
      } catch (reason) {
        setMarkState('error');
        setMarkMessage(reason instanceof Error ? reason.message : 'Attendance could not be marked.');
      } finally { stopScan(); }
    }, (err) => {
      setMarkState('error');
      setMarkMessage(err.code === err.PERMISSION_DENIED
        ? 'Location permission denied. Enable it and try again.'
        : 'Could not get your location.');
      stopScan();
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }, [refresh, stopScan]);

  const handleQrText = useCallback((text: string) => {
    try {
      const payload = JSON.parse(text) as { type?: string; siteToken?: string };
      if (payload?.type !== 'BSS_SITE' || !payload.siteToken) {
        setMarkState('error'); setMarkMessage('That is not a site QR code. Scan the site QR.');
        return;
      }
      submitMark(payload.siteToken);
    } catch { setMarkState('error'); setMarkMessage('That QR code is not a site QR.'); }
  }, [submitMark]);

  const startCameraScan = useCallback(async () => {
    setMarkState('scanning'); setMarkMessage('Location captured — point the camera at the site QR code');
    try {
      const reader = createQrReader();
      scanControls.current = await reader.decodeFromConstraints(QR_VIDEO_CONSTRAINTS, scanVideoRef.current!, r => {
        if (r) { stopScan(); handleQrText(r.getText()); }
      });
      applyContinuousFocus(scanControls.current);
    } catch { setMarkState('error'); setMarkMessage('Camera access was unavailable. You can upload a site QR image instead.'); }
  }, [handleQrText, stopScan]);

  const startScan = useCallback(() => {
    setMarkOpen(true); setMarkState('locating'); setMarkResult(null); setMarkLocation(''); setMarkCoords(null);
    // Ask for location permission BEFORE scanning — attendance can't be marked
    // without it, and the browser prompt needs a user gesture.
    setMarkMessage('We need your location to mark attendance — allow location access to continue.');
    if (!navigator.geolocation) { setMarkState('error'); setMarkMessage('Location is not supported on this device.'); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      // Permission granted + a fix obtained; resolve it to an address for display
      // and start the scanner. A fresh, accurate fix is taken again at submit.
      setMarkCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      void reverseGeocode(pos.coords.latitude, pos.coords.longitude).then(addr => { if (addr) setMarkLocation(addr); });
      void startCameraScan();
    }, () => {
      setMarkState('error'); setMarkMessage('Location permission is required to mark attendance. Allow location access and try again.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }, [startCameraScan]);

  const scanFile = useCallback(async (file?: File) => {
    if (!file) return;
    setMarkState('scanning'); setMarkMessage('Reading QR image…');
    try { handleQrText(await decodeQrFromImageFile(file)); }
    catch { setMarkState('error'); setMarkMessage('No valid site QR could be read from that image.'); }
  }, [handleQrText]);

  const closeMark = useCallback(() => { stopScan(); setMarkOpen(false); setMarkState('idle'); setMarkMessage(''); }, [stopScan]);

  // Calendar grid anchor & navigation
  const anchor = records[0]?.date ? new Date(records[0].date) : new Date();
  const [month, setMonth] = useState(anchor.getMonth());
  const [year, setYear] = useState(anchor.getFullYear());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const byDate = useMemo(() => new Map(visibleRecords.map((r) => [r.date, r])), [visibleRecords]);
  const todayKey = new Date().toISOString().slice(0, 10);
  // Next scan action for today (toggle): OUT when already checked in, else IN.
  const todayRecord = records.find((r) => r.date === todayKey);
  const nextAction: 'IN' | 'OUT' = todayRecord?.nextAction === 'OUT' ? 'OUT' : 'IN';
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

  // (Detail dialog lives in <AttendanceDetailDialog/> — a shared component.)

  return (
    <ModuleShell
      title="Site Attendance System"
      description="Official biometric, QR scan and CCTV attendance records synchronized from your site."
      icon={CalendarDays}
      hero={<PageHero title="Site Attendance System" subtitle="Official biometric, QR scan and CCTV attendance records synchronized from your site." actions={<Link href="/worker" aria-label="Back to dashboard" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"><ArrowLeft size={18}/></Link>} />}
    >
      <div className="space-y-6">
        {/* Self attendance — scan the site QR + GPS */}
        <section className="bss-3d bss-scroll-rise bss-card rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-bss-border flex items-center gap-2">
            <MapPin size={16} className="text-[#01183A]" />
            <div>
              <h2 className="text-sm font-semibold text-bss-text-primary">Mark today&apos;s attendance</h2>
              <p className="text-xs text-bss-text-muted mt-0.5">Scan your site&apos;s QR code while on site. Your GPS location is recorded and compared to the site coordinates.</p>
            </div>
          </header>
          <div className="p-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void startScan()} className="h-10 px-4 rounded-xl bg-bss-navy text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-bss-deep-navy transition-colors">
              <QrCode size={16} /> Scan site QR &amp; {nextAction === 'OUT' ? 'mark out' : 'mark in'}
            </button>
            <span className="text-[11px] text-bss-text-muted">Source: <b className="text-bss-text-secondary">Self (GPS)</b> · {nextAction === 'OUT' ? (todayRecord?.checkIn ? `checked in ${todayRecord.checkIn}` : 'mark out') : 'mark check-in'}</span>
          </div>
        </section>

        {markOpen && (
          <div className="fixed inset-0 z-[120] grid place-items-center bg-bss-navy/40 backdrop-blur-sm p-4" onClick={closeMark}>
            <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <header className="flex items-center justify-between px-4 py-3 border-b border-bss-border bg-gradient-to-r from-bss-navy/5 to-transparent">
                <h3 className="text-sm font-bold text-bss-text-primary flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-bss-blue-tint text-bss-interactive-blue grid place-items-center"><QrCode size={16} /></span> Scan site QR</h3>
                <button type="button" onClick={closeMark} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg text-bss-text-muted hover:bg-bss-bg transition-colors"><X size={18} /></button>
              </header>
              <div className="p-4 space-y-3">
                {(markState === 'scanning' || markState === 'idle') && (
                  <>
                  <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden">
                    <video ref={scanVideoRef} className="w-full h-full object-cover" muted playsInline />
                    <ScanFrame active className="absolute inset-0" />
                  </div>
                  {markLocation && <p className="text-xs text-bss-interactive-blue flex items-start gap-1.5"><MapPin size={13} className="mt-0.5 shrink-0"/><span>{markLocation}</span></p>}
                  {markCoords && <p className="text-[11px] font-mono text-bss-text-muted text-center">GPS {fmtCoord(markCoords.lat, markCoords.lng)}</p>}
                  <p className="text-xs text-bss-text-muted text-center">{markMessage || 'Point the camera at the site QR code'}</p>
                  </>
                )}

                {(markState === 'locating' || markState === 'submitting') && (
                  <p className="text-sm text-bss-text-secondary flex items-center justify-center gap-2 py-6"><Loader2 size={16} className="animate-spin" />{markMessage}</p>
                )}
                {markState === 'already' && (
                  <p className="text-sm text-bss-orange bg-bss-soft-orange border border-bss-border rounded-2xl px-4 py-3 flex items-start gap-2.5"><Info size={16} className="mt-0.5 shrink-0" />{markMessage}</p>
                )}
                {markState === 'error' && (
                  <div className="rounded-2xl border border-bss-border bg-bss-bg p-5 text-center space-y-4">
                    <span className="mx-auto w-12 h-12 rounded-2xl bg-bss-soft-orange text-bss-orange grid place-items-center"><ScanLine size={22} /></span>
                    <p className="text-sm text-bss-text-secondary">{markMessage}</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <button type="button" onClick={() => void startScan()} className="h-10 px-4 rounded-xl bg-bss-navy text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 hover:bg-bss-deep-navy transition-colors">Allow location &amp; retry</button>
                      <label className="h-10 px-4 rounded-xl border border-bss-border bg-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer hover:bg-bss-bg transition-colors">
                        <Upload size={15} /> Upload QR image
                        <input type="file" accept="image/*" className="hidden" onChange={e => { void scanFile(e.target.files?.[0]); e.target.value = ''; }} />
                      </label>
                    </div>
                  </div>
                )}
                {markState === 'done' && markResult && (
                  <div className={`rounded-2xl px-4 py-3 text-sm border ${markResult.geofenceOk === false ? 'bg-bss-soft-orange border-bss-border text-bss-orange' : 'bg-bss-soft-green border-bss-border text-bss-green'}`}>
                    <p className="font-bold flex items-center gap-2">
                      <CheckCircle2 size={15} />
                      {markResult.action === 'OUT'
                        ? `Checked out${markResult.checkOut ? ` at ${new Date(markResult.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}${markResult.finalCheckout ? ' — final checkout' : ''}`
                        : `Checked in${markResult.checkIn ? ` at ${new Date(markResult.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
                    </p>
                    {markResult.distanceM != null && (
                      <p className="text-xs mt-1">
                        {fmtDist(markResult.distanceM)} from site · radius {fmtDist(markResult.radiusM)}
                        {markResult.outsideM ? ` · ${fmtDist(markResult.outsideM)} outside` : ''}
                        {markResult.accuracyM != null ? ` · ±${fmtDist(markResult.accuracyM)}` : ''}
                      </p>
                    )}
                    {markResult.remarks && <p className="text-[11px] mt-0.5 opacity-80">{markResult.remarks}</p>}
                    {(markResult.address || markLocation) && <p className="text-[11px] mt-1 flex items-start gap-1.5"><MapPin size={12} className="mt-0.5 shrink-0"/><span>{markResult.address || markLocation}</span></p>}
                    {fmtCoord(markResult.gpsLat ?? markCoords?.lat, markResult.gpsLong ?? markCoords?.lng) && <p className="text-[11px] mt-1 font-mono">GPS {fmtCoord(markResult.gpsLat ?? markCoords?.lat, markResult.gpsLong ?? markCoords?.lng)}</p>}
                  </div>
                )}

                {(markState === 'scanning' || markState === 'idle') && (
                  <div className="flex items-center justify-center gap-2">
                    <label className="h-9 px-3 rounded-xl border border-bss-border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-bss-bg transition-colors">
                      <Upload size={14} /> Upload QR image
                      <input type="file" accept="image/*" className="hidden" onChange={e => { void scanFile(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                  </div>
                )}

                {(markState === 'done' || markState === 'already') && (
                  <button type="button" onClick={closeMark} className="w-full h-10 rounded-xl bg-bss-navy text-white text-sm font-bold hover:bg-bss-deep-navy transition-colors">Done</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connection Banner */}
        <div className="bg-gradient-to-r from-[#01183A] to-[#1E3A8A] rounded-3xl p-6 text-white shadow-xl shadow-[#01183A]/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md border border-white/15">
                <ShieldCheck size={13} className="text-bss-green" />
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
                  <option key={m} value={i} className="text-bss-text-primary font-bold">
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
                  <option key={y} value={y} className="text-bss-text-primary font-bold">
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
              <span className="text-lg font-bold text-bss-soft-green">{monthCount('Present')} Days</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-white/70 block">Absent Days</span>
              <span className="text-lg font-bold text-bss-orange">{monthCount('Absent')} Days</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-white/70 block">Approved Leave</span>
              <span className="text-lg font-bold text-bss-soft-orange">{monthCount('Leave')} Days</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-white/70 block">Holidays & Offs</span>
              <span className="text-lg font-bold text-bss-interactive-blue">
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
        <div className="bss-3d bss-scroll-rise flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 border border-bss-border rounded-2xl shadow-sm">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-bss-text-muted">Capture System:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bss-blue-tint text-[#01183A] border border-bss-border font-bold">
              <QrCode size={14} /> QR Scan ({methodCounts.qr})
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bss-blue-tint text-bss-interactive-blue border border-bss-border font-bold">
              <ScanLine size={14} /> CCTV ({methodCounts.cctv})
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bss-soft-green text-bss-green border border-bss-border font-bold">
              <RadioTower size={14} /> RFID ({methodCounts.rfid})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {sites.length > 1 && (
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-bss-text-secondary bg-white border border-bss-border rounded-xl px-3 py-2">
                <Building2 size={13} className="text-[#01183A]" /> Site
                <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="bg-transparent text-xs font-bold text-[#01183A] focus:outline-none">
                  <option value="">All sites</option>
                  {sites.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            )}
            <div className="flex rounded-xl bg-bss-bg p-1 w-full sm:w-auto">
              <button
                onClick={() => setView('calendar')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  view === 'calendar' ? 'bg-white text-[#01183A] shadow-sm' : 'text-bss-text-secondary hover:text-bss-text-primary'
                }`}
              >
                <CalendarDays size={14} /> Calendar Grid
              </button>
              <button
                onClick={() => setView('history')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  view === 'history' ? 'bg-white text-[#01183A] shadow-sm' : 'text-bss-text-secondary hover:text-bss-text-primary'
                }`}
              >
                <List size={14} /> History Log
              </button>
            </div>
          </div>
        </div>

        {/* View Content */}
        {view === 'calendar' ? (
          <div className="bss-3d bss-scroll-rise bss-card rounded-3xl overflow-hidden">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-bss-border bg-bss-bg text-center text-xs font-extrabold uppercase tracking-wider text-bss-text-muted py-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-px bg-bss-bg p-px">
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
                    className={`bg-white p-2.5 min-h-[5.5rem] flex flex-col justify-between transition-all relative group cursor-pointer hover:bg-bss-blue-tint/30 ${
                      isToday ? 'ring-2 ring-inset ring-[#01183A]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-[#01183A] text-white shadow-sm'
                            : rec?.presence === 'Present'
                            ? 'text-bss-green bg-bss-soft-green'
                            : rec?.presence === 'Absent'
                            ? 'text-bss-error bg-bss-soft-orange'
                            : 'text-bss-text-secondary'
                        }`}
                      >
                        {day}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bss-blue-tint text-[#01183A]">
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
                                ? 'bg-bss-soft-green text-bss-green'
                                : rec.leaveStatus === 'Rejected'
                                ? 'bg-bss-soft-orange text-bss-error'
                                : 'bg-bss-soft-orange text-bss-orange'
                            }`}
                          >
                            {rec.leaveStatus}
                          </span>
                        )}

                        {rec.presence === 'Present' && rec.checkIn && (
                          <span className="block text-[9px] font-semibold text-bss-text-muted text-center leading-tight">
                            {rec.checkIn} → {rec.checkOut || '—'}
                          </span>
                        )}

                        {rec.method && rec.method !== '—' && (
                          <span className="block text-[8.5px] text-bss-text-muted font-mono text-center truncate">
                            {rec.method}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-bss-text-muted text-center my-auto">—</span>
                    )}

                    {holiday && (
                      <span className="block text-[8.5px] font-bold text-bss-interactive-blue truncate bg-bss-blue-tint px-1 rounded text-center">
                        {holiday.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-bss-bg/50 border-t border-bss-border text-xs font-bold text-bss-text-secondary">
              <div className="flex flex-wrap gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-bss-soft-green0" /> Present
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-bss-soft-orange0" /> Absent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-bss-soft-orange0" /> Leave (Approved / Pending)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-bss-blue-tint0" /> Holiday
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-bss-text-muted" /> Weekly Off
                </span>
              </div>
              <span className="text-bss-text-muted font-normal">Click any day to view full shift & leave details</span>
            </div>
          </div>
        ) : (
          <EnterpriseDataTable
            title="Attendance Records History"
            rows={visibleRecords}
            columns={attendanceColumns}
            rowKey={(r) => r.date}
            filename="bss-attendance-history"
          />
        )}

        {selectedRecord && <AttendanceDetailDialog record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
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
            ? 'bg-bss-soft-green text-bss-green border-bss-border'
            : r.presence === 'Absent'
            ? 'bg-bss-soft-orange text-bss-error border-bss-border'
            : 'bg-bss-bg text-bss-text-secondary border-bss-border'
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
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#01183A] bg-bss-blue-tint border border-bss-border px-2 py-0.5 rounded-md">
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
        <span className="text-bss-text-muted">—</span>
      )
  },
  { id: 'shift', header: 'Shift', value: (r) => r.shift ?? 'Not applicable' },
  { id: 'site', header: 'Site', value: (r) => r.site },
  { id: 'checkIn', header: 'Check-in', value: (r) => r.checkIn ?? '—' },
  { id: 'checkOut', header: 'Check-out', value: (r) => r.checkOut ?? '—' },
  { id: 'status', header: 'Status', value: (r) => r.status ?? r.statusCode ?? '—' }
];
