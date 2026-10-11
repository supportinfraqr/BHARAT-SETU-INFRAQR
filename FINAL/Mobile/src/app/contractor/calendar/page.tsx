"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Info,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Zap,
  Building2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import type { SiteCalendar } from '@/types/portal';

type AttendanceRow = { id: string; date: string; worker: string; site: string; status: string; capture: string };
type AttendanceUploadResult = { created: number; updated: number; holidays: number; workers: number; rows: number; unknown: string[]; site: string; start: string; end: string };
const ATT_STATUS_LABEL: Record<string, string> = {
  PRESENT: 'Present', ABSENT: 'Absent', LEAVE: 'Leave', HOLIDAY: 'Holiday',
  HALF_DAY: 'Half Day', LATE: 'Late', EXPECTED: 'Expected',
};
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function monthBounds() {
  const now = new Date();
  return { start: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}
function displayDate(iso: string) {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

const HOLIDAY_TYPES = [
  ['WEEKLY_OFF', 'Weekly Off', 'bg-bss-soft-green text-bss-green border-bss-border ring-emerald-500/20'],
  ['PUBLIC', 'Public Holiday', 'bg-bss-blue-tint text-bss-interactive-blue border-bss-border ring-blue-500/20'],
  ['RESTRICTED', 'Restricted Holiday', 'bg-bss-soft-orange text-bss-orange border-bss-border ring-amber-500/20'],
] as const;

const STANDARD_INDIAN_HOLIDAYS = [
  { name: 'Republic Day', date: '-01-26', type: 'PUBLIC', isPaid: true },
  { name: 'Labor Day / May Day', date: '-05-01', type: 'PUBLIC', isPaid: true },
  { name: 'Independence Day', date: '-08-15', type: 'PUBLIC', isPaid: true },
  { name: 'Gandhi Jayanti', date: '-10-02', type: 'PUBLIC', isPaid: true },
  { name: 'Diwali', date: '-11-01', type: 'PUBLIC', isPaid: true },
] as const;

const DAY_CODES = [
  ['MON', 'Mon'], ['TUE', 'Tue'], ['WED', 'Wed'], ['THU', 'Thu'], ['FRI', 'Fri'], ['SAT', 'Sat'], ['SUN', 'Sun'],
] as const;

export default function ContractorCalendarPage() {
  const { contractor, replaceContractor, mutate } = useContractor();
  const calendars = contractor.siteCalendars ?? [];
  const [siteId, setSiteId] = useState<number | null>(calendars[0]?.siteId ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const current = calendars.find((c) => c.siteId === siteId) ?? calendars[0];

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'calendar' | 'holidays' | 'policy' | 'attendance'>('calendar');

  // Attendance sheet (CSV upload) tab state
  const attBounds = monthBounds();
  const [attStart, setAttStart] = useState(attBounds.start);
  const [attEnd, setAttEnd] = useState(attBounds.end);
  const [attBusy, setAttBusy] = useState(false);
  const [attError, setAttError] = useState('');
  const [attNotice, setAttNotice] = useState('');
  const [attResult, setAttResult] = useState<AttendanceUploadResult | null>(null);
  const [attRows, setAttRows] = useState<AttendanceRow[]>([]);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ start: attStart, end: attEnd });
    void fetch(`/api/contractor/attendance?${query}`, { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { data?: AttendanceRow[] } | null) => { if (active && body?.data) setAttRows(body.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [attStart, attEnd, attResult]);

  const downloadAttendanceTemplate = () => {
    setAttError(''); setAttNotice('');
    const query = new URLSearchParams({ start: attStart, end: attEnd });
    if (current?.siteName) query.set('site', current.siteName);
    window.open(`/api/contractor/attendance/template?${query}`, '_blank');
    setAttNotice(`Attendance CSV template for ${attStart} → ${attEnd} downloaded — fill P (Present) / A (Absent) / L (Leave) per date and upload it back.`);
  };

  async function uploadAttendanceSheet(file?: File) {
    if (!file) return;
    setAttBusy(true); setAttError(''); setAttNotice(''); setAttResult(null);
    try {
      const form = new FormData();
      form.set('sheet', file);
      form.set('start', attStart); form.set('end', attEnd);
      if (current?.siteName) form.set('site', current.siteName);
      const response = await fetch('/api/contractor/attendance/upload', { method: 'POST', body: form });
      const body = await response.json().catch(() => ({})) as { data?: AttendanceUploadResult; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'The attendance sheet could not be uploaded.');
      setAttResult(body.data);
      setAttNotice(`Attendance synced from ${file.name}: ${body.data.created} new + ${body.data.updated} updated for ${body.data.workers} worker(s)${body.data.holidays ? `, ${body.data.holidays} holiday/weekly-off row(s) auto-registered` : ''}.`);
    } catch (reason) {
      setAttError(reason instanceof Error ? reason.message : 'The attendance sheet could not be uploaded.');
    } finally { setAttBusy(false); }
  }

  const attendanceColumns: DataColumn<AttendanceRow>[] = [
    { id: 'date', header: 'Date', value: r => r.date, render: r => displayDate(r.date) },
    { id: 'worker', header: 'Worker', value: r => r.worker },
    { id: 'site', header: 'Site', value: r => r.site || '—', render: r => r.site || '—' },
    { id: 'status', header: 'Status', value: r => ATT_STATUS_LABEL[r.status] ?? r.status, render: r => <span className={r.status === 'PRESENT' ? 'text-bss-green' : r.status === 'ABSENT' ? 'text-bss-error' : 'text-bss-orange'}>{ATT_STATUS_LABEL[r.status] ?? r.status}</span> },
    { id: 'source', header: 'Source', value: r => r.capture, render: r => <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bss-blue-tint text-bss-interactive-blue">{r.capture}</span> },
  ];

  // Form states
  const [hDate, setHDate] = useState('');
  const [hName, setHName] = useState('');
  const [hType, setHType] = useState('PUBLIC');
  const [hPaid, setHPaid] = useState(true);

  const [pType, setPType] = useState(contractor.leaveTypeCatalog?.[0] ?? 'Casual Leave');
  const [pAnnual, setPAnnual] = useState('12');
  const [pOpening, setPOpening] = useState('0');

  const applyCalendars = (next: SiteCalendar[]) => replaceContractor({ ...contractor, siteCalendars: next });

  // Restricted Holiday (RH) policy — derived from the selected site's calendar;
  // edits update it optimistically (no local mirror state / effect).
  const rhMaxAvail = String(current?.restrictedHolidayMaxAvail ?? 2);
  const rhOfferedCount = (current?.holidays ?? []).filter((h) => h.holidayTypeCode === 'RESTRICTED').length;
  const setRhMaxAvail = (value: string) => applyCalendars(calendars.map((c) => c.siteId === current?.siteId ? { ...c, restrictedHolidayMaxAvail: Math.max(0, Number(value) || 0) } : c));

  // Weekly off days for the site (leave cannot be applied on these days).
  const weeklyOff = new Set(current?.weeklyOffDays ?? []);
  const toggleWeeklyOff = (code: string) => {
    const next = new Set(weeklyOff);
    if (next.has(code)) next.delete(code); else next.add(code);
    applyCalendars(calendars.map((c) => c.siteId === current?.siteId ? { ...c, weeklyOffDays: [...next] } : c));
  };
  async function saveWeeklyOff() {
    if (!current) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await mutate('site-calendar', 'POST', { kind: 'weeklyoff', siteId: current.siteId, days: [...weeklyOff] });
      setNotice(`Weekly off days saved for ${current.siteName || 'this site'}.`);
      setTimeout(() => setNotice(''), 4500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Weekly offs could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstWeekday = new Date(currentYear, currentMonth, 1).getDay();

  const siteHolidays = current?.holidays ?? [];
  const sitePolicies = current?.leavePolicies ?? [];

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, typeof siteHolidays[number]>();
    for (const h of siteHolidays) {
      map.set(h.date, h);
    }
    return map;
  }, [siteHolidays]);

  const monthHolidays = useMemo(() => {
    return siteHolidays.filter((h) => h.date.startsWith(monthKey));
  }, [siteHolidays, monthKey]);

  // Quick actions
  async function addHoliday(e?: React.FormEvent, presetDate?: string, presetName?: string) {
    if (e) e.preventDefault();
    if (!current) return;
    const targetDate = presetDate || hDate;
    const targetName = presetName || hName;
    if (!targetDate || !targetName) return;

    setBusy(true);
    setError('');
    setNotice('');
    try {
      await mutate('site-calendar', 'POST', {
        kind: 'holiday',
        siteId: current.siteId,
        date: targetDate,
        name: targetName,
        holidayType: hType,
        isPaid: hPaid
      });
      const holiday = {
        id: Date.now(),
        date: targetDate,
        name: targetName,
        holidayType: HOLIDAY_TYPES.find((t) => t[0] === hType)?.[1] ?? hType,
        holidayTypeCode: hType,
        isPaid: hPaid,
        note: ''
      };
      applyCalendars(
        calendars.map((c) =>
          c.siteId === current.siteId
            ? { ...c, holidays: [...c.holidays.filter(h => h.date !== targetDate), holiday].sort((a, b) => a.date.localeCompare(b.date)) }
            : c
        )
      );
      if (!presetDate) {
        setHDate('');
        setHName('');
      }
      setNotice(`Holiday "${targetName}" saved for ${current.siteName || 'site'}. All workers mapped to this site inherit it.`);
      setTimeout(() => setNotice(''), 4500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Holiday could not be added.');
    } finally {
      setBusy(false);
    }
  }

  async function removeHoliday(id: number) {
    if (!current) return;
    setBusy(true);
    setError('');
    try {
      await mutate('site-calendar', 'DELETE', { kind: 'holiday', siteId: current.siteId, id });
      applyCalendars(
        calendars.map((c) => (c.siteId === current.siteId ? { ...c, holidays: c.holidays.filter((h) => h.id !== id) } : c))
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Holiday could not be removed.');
    } finally {
      setBusy(false);
    }
  }

  async function savePolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !pType) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await mutate('site-calendar', 'POST', {
        kind: 'leavePolicy',
        siteId: current.siteId,
        leaveType: pType,
        annualEntitlement: Number(pAnnual) || 0,
        openingBalance: Number(pOpening) || 0
      });
      const existing = current.leavePolicies.find((p) => p.leaveType === pType);
      const policy = {
        id: existing?.id ?? Date.now(),
        leaveTypeId: existing?.leaveTypeId ?? 0,
        leaveType: pType,
        annualEntitlement: Number(pAnnual) || 0,
        openingBalance: Number(pOpening) || 0,
        isActive: true
      };
      applyCalendars(
        calendars.map((c) =>
          c.siteId === current.siteId
            ? { ...c, leavePolicies: existing ? c.leavePolicies.map((p) => (p.leaveType === pType ? policy : p)) : [...c.leavePolicies, policy] }
            : c
        )
      );
      setNotice(`Leave policy for ${pType} updated! Workers at ${current.siteName || 'this site'} inherit these balances.`);
      setTimeout(() => setNotice(''), 4500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Leave policy could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function saveRestrictedPolicy() {
    if (!current) return;
    setBusy(true);
    setError('');
    setNotice('');
    const maxAvail = Math.max(0, Number(rhMaxAvail) || 0);
    try {
      await mutate('site-calendar', 'POST', {
        kind: 'restrictedPolicy',
        siteId: current.siteId,
        maxAvail,
      });
      applyCalendars(
        calendars.map((c) =>
          c.siteId === current.siteId
            ? { ...c, restrictedHolidayMaxAvail: maxAvail }
            : c
        )
      );
      setNotice(`Restricted Holiday policy updated for ${current.siteName || 'this site'} — up to ${maxAvail} availed per year.`);
      setTimeout(() => setNotice(''), 4500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Restricted Holiday policy could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function copyCalendarToSites() {
    if (!current) return;
    if (!window.confirm("Copy this site's holidays, leave policies and RH policy to all your other allotted sites? Existing entries are kept and updated.")) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await mutate<{ data?: { copied?: number } }>('site-calendar', 'POST', { kind: 'copy', siteId: current.siteId });
      setNotice(`Calendar copied to ${res?.data?.copied ?? 0} other site(s).`);
      setTimeout(() => setNotice(''), 4500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Calendar could not be copied.');
    } finally {
      setBusy(false);
    }
  }

  async function removePolicy(id: number) {
    if (!current) return;
    setBusy(true);
    setError('');
    try {
      await mutate('site-calendar', 'DELETE', { kind: 'leavePolicy', siteId: current.siteId, id });
      applyCalendars(
        calendars.map((c) => (c.siteId === current.siteId ? { ...c, leavePolicies: c.leavePolicies.filter((p) => p.id !== id) } : c))
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Leave policy could not be removed.');
    } finally {
      setBusy(false);
    }
  }

  async function loadStandardPresets() {
    if (!current) return;
    setBusy(true);
    setError('');
    try {
      for (const h of STANDARD_INDIAN_HOLIDAYS) {
        const dateStr = `${currentYear}${h.date}`;
        if (!siteHolidays.some(existing => existing.date === dateStr)) {
          await mutate('site-calendar', 'POST', {
            kind: 'holiday',
            siteId: current.siteId,
            date: dateStr,
            name: h.name,
            holidayType: h.type,
            isPaid: h.isPaid
          });
        }
      }
      // Re-fetch state or generate locally
      const addedHolidays = STANDARD_INDIAN_HOLIDAYS.map((h, i) => ({
        id: Date.now() + i,
        date: `${currentYear}${h.date}`,
        name: h.name,
        holidayType: 'Public Holiday',
        holidayTypeCode: h.type,
        isPaid: h.isPaid,
        note: ''
      }));

      applyCalendars(
        calendars.map((c) => {
          if (c.siteId !== current.siteId) return c;
          const existingDates = new Set(c.holidays.map(x => x.date));
          const newOnes = addedHolidays.filter(x => !existingDates.has(x.date));
          return {
            ...c,
            holidays: [...c.holidays, ...newOnes].sort((a, b) => a.date.localeCompare(b.date))
          };
        })
      );
      setNotice(`Standard Indian public holidays added to ${current.siteName || 'this site'}.`);
      setTimeout(() => setNotice(''), 4500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Preset holidays could not be added.');
    } finally {
      setBusy(false);
    }
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const inputStyle =
    'w-full h-10 border border-bss-border rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#01183A]/20 focus:border-[#01183A] transition-all bg-white';

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#01183A] to-[#1E3A8A] rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-[#01183A]/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md border border-white/15">
              <Building2 size={13} className="text-[#E45D24]" />
              <span>Master Configuration</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Leave Calendar</h1>
            <p className="text-white/80 text-sm max-w-2xl">
              Configure official holidays and annual leave policies for your allotted project sites. All workers mapped to the selected site automatically inherit these settings.
            </p>
          </div>

          {calendars.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex flex-col gap-1 min-w-[240px]">
              <span className="text-[11px] uppercase tracking-wider font-bold text-white/70">Selected Site</span>
              <select
                value={current?.siteId ?? ''}
                onChange={(e) => setSiteId(Number(e.target.value))}
                className="w-full h-10 bg-white text-bss-text-primary font-bold rounded-xl px-3 text-sm border-0 focus:ring-2 focus:ring-[#E45D24] cursor-pointer shadow-sm"
              >
                {calendars.map((c) => (
                  <option key={c.siteId} value={c.siteId}>
                    {c.siteName || `Site ${c.siteId}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Stats bar */}
        {current && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/15">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-xs text-white/70 block">Total Holidays</span>
              <span className="text-xl font-bold">{siteHolidays.length} Days</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-xs text-white/70 block">Paid Holidays</span>
              <span className="text-xl font-bold">{siteHolidays.filter(h => h.isPaid).length} Days</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-xs text-white/70 block">Leave Categories</span>
              <span className="text-xl font-bold">{sitePolicies.length} Types</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-xs text-white/70 block">Workers Bound</span>
              <span className="text-xl font-bold flex items-center gap-1.5 text-bss-soft-green">
                <ShieldCheck size={16} /> Inherited
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {notice && (
        <div className="p-4 bg-bss-soft-green border border-bss-border text-bss-green rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} className="text-bss-green flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-bss-soft-orange border border-bss-border text-bss-error rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-sm">
          <Info size={18} className="text-bss-error flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!current ? (
        <div className="bss-card rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-bss-soft-orange text-[#E45D24] grid place-items-center mx-auto">
            <Building2 size={32} />
          </div>
          <h2 className="text-lg font-bold text-bss-text-primary">No Sites Allotted Yet</h2>
          <p className="text-sm text-bss-text-muted">
            You do not have any active project site allotments mapped to your account. Once a principal employer allots a site to your organisation, its calendar interface will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2 border border-bss-border rounded-2xl shadow-sm">
            <div className="flex items-center gap-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'calendar'
                    ? 'bg-[#01183A] text-white shadow-md shadow-[#01183A]/20'
                    : 'text-bss-text-secondary hover:bg-bss-bg'
                }`}
              >
                <CalendarDays size={16} /> Interactive Calendar Grid
              </button>
              <button
                onClick={() => setActiveTab('holidays')}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'holidays'
                    ? 'bg-[#01183A] text-white shadow-md shadow-[#01183A]/20'
                    : 'text-bss-text-secondary hover:bg-bss-bg'
                }`}
              >
                <CalendarIcon size={16} /> Holidays List ({siteHolidays.length})
              </button>
              <button
                onClick={() => setActiveTab('policy')}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'policy'
                    ? 'bg-[#01183A] text-white shadow-md shadow-[#01183A]/20'
                    : 'text-bss-text-secondary hover:bg-bss-bg'
                }`}
              >
                <Clock size={16} /> Leave Policies ({sitePolicies.length})
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'attendance'
                    ? 'bg-[#01183A] text-white shadow-md shadow-[#01183A]/20'
                    : 'text-bss-text-secondary hover:bg-bss-bg'
                }`}
              >
                <FileSpreadsheet size={16} /> Attendance
              </button>
            </div>

            <button
              onClick={loadStandardPresets}
              disabled={busy}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-bss-orange to-[#E45D24] text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 shadow-md shadow-[#E45D24]/20 transition-all disabled:opacity-50"
            >
              <Sparkles size={15} /> Auto-fill Indian Public Holidays
            </button>
          </div>

          {/* TAB 1: Visual Interactive Month Grid */}
          {activeTab === 'calendar' && (
            <div className="grid lg:grid-cols-[1.8fr_1fr] gap-6 items-start">
              {/* Calendar Grid Box */}
              <div className="bss-card rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-bss-border flex flex-wrap items-center justify-between gap-3 bg-bss-bg/50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={prevMonth}
                      className="w-9 h-9 rounded-xl border border-bss-border bg-white flex items-center justify-center text-bss-text-secondary hover:bg-bss-bg transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <h2 className="text-base font-extrabold text-bss-text-primary min-w-[140px] text-center">
                      {monthNames[currentMonth]} {currentYear}
                    </h2>
                    <button
                      onClick={nextMonth}
                      className="w-9 h-9 rounded-xl border border-bss-border bg-white flex items-center justify-center text-bss-text-secondary hover:bg-bss-bg transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-bss-blue-tint text-bss-interactive-blue border border-bss-border">
                      {monthHolidays.length} Holiday{monthHolidays.length === 1 ? '' : 's'} in {monthNames[currentMonth]}
                    </span>
                  </div>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-bss-border bg-bss-bg text-center text-xs font-bold uppercase tracking-wider text-bss-text-muted py-3">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-px bg-bss-surface p-px">
                  {Array.from({ length: firstWeekday }, (_, i) => (
                    <div key={`pad-${i}`} className="bg-white p-2 min-h-[5.5rem] opacity-40" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
                    const holiday = holidaysByDate.get(dateStr);
                    const weekday = new Date(currentYear, currentMonth, day).getDay();
                    const isSunday = weekday === 0;

                    return (
                      <div
                        key={dateStr}
                        onClick={() => {
                          setHDate(dateStr);
                          if (holiday) {
                            setHName(holiday.name);
                          }
                        }}
                        className={`bg-white p-2.5 min-h-[5.5rem] transition-all relative group cursor-pointer hover:bg-bss-blue-tint/30 ${
                          holiday ? 'bg-bss-soft-orange/40 ring-1 ring-inset ring-[#E45D24]/40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                              holiday
                                ? 'bg-[#E45D24] text-white shadow-sm'
                                : isSunday
                                ? 'text-bss-error bg-bss-soft-orange'
                                : 'text-bss-text-primary'
                            }`}
                          >
                            {day}
                          </span>
                          {holiday && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeHoliday(holiday.id);
                              }}
                              className="text-bss-text-muted hover:text-bss-error transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove holiday"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {holiday ? (
                          <div className="mt-1.5 space-y-1">
                            <span className="block text-[11px] font-bold text-bss-orange leading-tight truncate">
                              {holiday.name}
                            </span>
                            <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-bss-soft-orange text-bss-orange border border-bss-border">
                              {holiday.isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>
                        ) : isSunday ? (
                          <span className="mt-2 block text-[10px] font-medium text-bss-error">Weekly Off</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Add Holiday Panel */}
              <div className="bss-card rounded-3xl p-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-bss-text-primary flex items-center gap-2">
                    <Plus size={18} className="text-[#01183A]" /> Add Holiday to Site
                  </h3>
                  <p className="text-xs text-bss-text-muted mt-1">
                    Select a date or pick one directly from the calendar grid to register a holiday for {current.siteName}.
                  </p>
                </div>

                <form onSubmit={(e) => addHoliday(e)} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-bss-text-primary">Date</label>
                    <input
                      type="date"
                      required
                      value={hDate}
                      onChange={(e) => setHDate(e.target.value)}
                      className={inputStyle}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-bss-text-primary">Holiday Name / Description</label>
                    <input
                      required
                      value={hName}
                      onChange={(e) => setHName(e.target.value)}
                      placeholder="e.g. Founder's Day / Regional Festival"
                      className={inputStyle}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-bss-text-primary">Category Type</label>
                    <select
                      value={hType}
                      onChange={(e) => setHType(e.target.value)}
                      className={inputStyle}
                    >
                      {HOLIDAY_TYPES.map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="hPaid"
                      checked={hPaid}
                      onChange={(e) => setHPaid(e.target.checked)}
                      className="w-4 h-4 text-[#01183A] rounded border-bss-border focus:ring-[#01183A]"
                    />
                    <label htmlFor="hPaid" className="text-xs font-semibold text-bss-text-primary cursor-pointer">
                      Paid holiday (Workers receive daily wage entitlement)
                    </label>
                  </div>

                  <button
                    disabled={busy}
                    className="w-full h-11 rounded-xl bg-[#01183A] hover:bg-[#022B5E] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#01183A]/20 transition-all disabled:opacity-60"
                  >
                    <Plus size={16} /> Save Holiday to Calendar
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: Holidays Master Table & List */}
          {activeTab === 'holidays' && (
            <div className="bss-card rounded-3xl overflow-hidden space-y-4 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bss-border pb-4">
                <div>
                  <h3 className="text-base font-bold text-bss-text-primary">Configured Site Holidays ({siteHolidays.length})</h3>
                  <p className="text-xs text-bss-text-muted mt-0.5">
                    Holidays applicable for all workers and sub-contractors on {current.siteName}.
                  </p>
                </div>
              </div>

              {siteHolidays.length === 0 ? (
                <div className="p-8 text-center text-sm text-bss-text-muted">
                  No holidays configured for this site. Switch to the calendar tab or click &quot;Auto-fill Indian Public Holidays&quot; above.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {siteHolidays.map((h) => {
                    const typeConfig = HOLIDAY_TYPES.find((t) => t[0] === h.holidayTypeCode || t[1] === h.holidayType);
                    const badgeStyle = typeConfig ? typeConfig[2] : 'bg-bss-bg text-bss-text-primary border-bss-border';
                    return (
                      <div
                        key={h.id}
                        className="p-4 border border-bss-border rounded-2xl bg-white hover:border-[#01183A]/30 transition-all flex items-start justify-between gap-3 shadow-sm"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-bss-text-muted block">{h.date}</span>
                          <strong className="text-sm font-bold text-bss-text-primary block">{h.name}</strong>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                              {h.holidayType || h.holidayTypeCode}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                h.isPaid
                                  ? 'bg-bss-soft-green text-bss-green border-bss-border'
                                  : 'bg-bss-soft-orange text-bss-error border-bss-border'
                              }`}
                            >
                              {h.isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeHoliday(h.id)}
                          disabled={busy}
                          className="p-2 text-bss-text-muted hover:text-bss-error hover:bg-bss-soft-orange rounded-xl transition-all"
                          title="Delete Holiday"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Leave Policy & Entitlements */}
          {activeTab === 'policy' && (
            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
              <div className="space-y-6">
              {/* Leave Policy List */}
              <div className="bss-card rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-bss-text-primary">Leave Policies & Allowances ({sitePolicies.length})</h3>
                  <p className="text-xs text-bss-text-muted mt-1">
                    Annual leave quotas and opening balances inherited by workers on {current.siteName}.
                  </p>
                </div>

                {sitePolicies.length === 0 ? (
                  <div className="p-8 text-center text-sm text-bss-text-muted border border-dashed border-bss-border rounded-2xl">
                    No leave policies configured for this site yet. Workers at this site will see &ldquo;leave calendar not set up&rdquo; until you add at least one leave type here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sitePolicies.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 border border-bss-border rounded-2xl flex items-center justify-between gap-4 hover:border-[#E45D24]/40 transition-all bg-bss-bg/40"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-bss-soft-orange text-[#E45D24] grid place-items-center font-bold">
                            {p.leaveType.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong className="text-sm font-bold text-bss-text-primary block">{p.leaveType}</strong>
                            <span className="text-xs text-bss-text-muted">
                              Annual Quota: <b className="text-bss-text-primary">{p.annualEntitlement} Days</b> · Opening Balance:{' '}
                              <b className="text-bss-text-primary">{p.openingBalance} Days</b>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removePolicy(p.id)}
                          disabled={busy}
                          className="p-2 text-bss-text-muted hover:text-bss-error hover:bg-bss-soft-orange rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Restricted Holiday (RH) policy */}
              <div className="bss-card rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-bss-text-primary flex items-center gap-2">
                    <CalendarDays size={18} className="text-[#E45D24]" /> Restricted Holiday (RH) Policy
                  </h3>
                  <p className="text-xs text-bss-text-muted mt-1">
                    Optional/regional holidays (e.g. Ganesh Chaturthi, Onam) workers may choose from. <strong className="text-bss-text-primary">{rhOfferedCount}</strong> restricted holiday{rhOfferedCount === 1 ? '' : 's'} currently on this site&apos;s calendar. Set how many a worker may avail per year — with your prior approval.
                  </p>
                </div>
                <label className="text-xs font-bold text-bss-text-primary block max-w-xs">RH allowance per worker / year
                  <input type="number" min="0" value={rhMaxAvail} onChange={(e) => setRhMaxAvail(e.target.value)} className={inputStyle} />
                </label>
                <button type="button" disabled={busy} onClick={() => void saveRestrictedPolicy()} className="h-11 px-4 rounded-xl bg-[#01183A] hover:bg-[#022B5E] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                  <Zap size={16} /> Save RH policy
                </button>
              </div>

              {/* Weekly off days */}
              <div className="bss-card rounded-3xl p-6 space-y-3">
                <div>
                  <h3 className="text-base font-bold text-bss-text-primary flex items-center gap-2">
                    <CalendarDays size={18} className="text-[#E45D24]" /> Weekly Off Days
                  </h3>
                  <p className="text-xs text-bss-text-muted mt-1">
                    The day(s) workers at this site get off every week. Leave cannot be applied on weekly offs or public holidays.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAY_CODES.map(([code, label]) => (
                    <button key={code} type="button" onClick={() => toggleWeeklyOff(code)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${weeklyOff.has(code) ? 'bg-[#01183A] text-white border-[#01183A]' : 'bg-white border-bss-border text-bss-text-secondary hover:border-bss-border'}`}>{label}</button>
                  ))}
                </div>
                <button type="button" disabled={busy} onClick={() => void saveWeeklyOff()} className="h-11 px-4 rounded-xl bg-[#01183A] hover:bg-[#022B5E] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                  <Zap size={16} /> Save weekly offs
                </button>
              </div>

              {/* Copy setup to other sites */}
              <div className="bss-card rounded-3xl p-6 space-y-3">
                <h3 className="text-base font-bold text-bss-text-primary flex items-center gap-2">
                  <Copy size={18} className="text-[#E45D24]" /> Copy setup to other sites
                </h3>
                <p className="text-xs text-bss-text-muted">
                  Apply this site&apos;s holidays, leave policies and RH policy to all your other allotted sites. Existing entries are kept and updated.
                </p>
                <button type="button" disabled={busy} onClick={() => void copyCalendarToSites()} className="h-11 px-4 rounded-xl border border-[#01183A]/30 text-[#01183A] text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#01183A]/5 disabled:opacity-60">
                  <Copy size={16} /> Copy to other sites
                </button>
              </div>
              </div>

              {/* Form */}
              <div className="bss-card rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-bss-text-primary flex items-center gap-2">
                    <Clock size={18} className="text-[#E45D24]" /> Configure Leave Entitlement
                  </h3>
                  <p className="text-xs text-bss-text-muted mt-1">
                    Set up or modify leave rules for Casual, Earned, or Sick leave categories.
                  </p>
                </div>

                <form onSubmit={savePolicy} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-bss-text-primary">Leave Category</label>
                    <select
                      value={pType}
                      onChange={(e) => setPType(e.target.value)}
                      className={inputStyle}
                    >
                      {(contractor.leaveTypeCatalog?.length ? contractor.leaveTypeCatalog : ['Casual Leave', 'Medical Leave', 'Personal Leave']).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-bss-text-primary">Annual Entitlement (Days / Year)</label>
                    <input
                      type="number"
                      min="0"
                      value={pAnnual}
                      onChange={(e) => setPAnnual(e.target.value)}
                      className={inputStyle}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-bss-text-primary">Opening Balance Default</label>
                    <input
                      type="number"
                      min="0"
                      value={pOpening}
                      onChange={(e) => setPOpening(e.target.value)}
                      className={inputStyle}
                    />
                  </div>

                  <button
                    disabled={busy || !pType}
                    className="w-full h-11 rounded-xl bg-[#E45D24] hover:bg-[#C94D18] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#E45D24]/20 transition-all disabled:opacity-60"
                  >
                    <Zap size={16} /> Save Leave Policy
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: Attendance — uploaded sheet */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="bss-card rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-bss-text-primary flex items-center gap-2"><FileSpreadsheet size={18} className="text-[#01183A]" /> Attendance — Uploaded Sheet</h3>
                  <p className="text-xs text-bss-text-muted mt-1">
                    Download the BSS-ID / date-wise CSV for {current.siteName || 'your site'}, fill P/A/L, upload it, and it syncs into the attendance system marked as &ldquo;Uploaded sheet&rdquo;.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="space-y-1"><span className="text-xs font-bold text-bss-text-primary">Start date</span><input type="date" value={attStart} onChange={(e) => setAttStart(e.target.value)} className={inputStyle} /></label>
                  <label className="space-y-1"><span className="text-xs font-bold text-bss-text-primary">End date</span><input type="date" value={attEnd} onChange={(e) => setAttEnd(e.target.value)} className={inputStyle} /></label>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <button type="button" onClick={downloadAttendanceTemplate} className="h-10 px-4 rounded-xl border border-bss-border text-xs font-bold flex items-center gap-2 hover:bg-bss-bg"><Download size={15} /> Download Attendance CSV</button>
                  <label className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${attBusy ? 'bg-[#01183A]/60 text-white' : 'bg-[#01183A] text-white hover:bg-[#022B5E]'}`}>
                    <Upload size={15} /> {attBusy ? 'Uploading…' : 'Upload Filled Sheet (CSV/XLSX)'}
                    <input type="file" accept=".csv,.xlsx" className="hidden" disabled={attBusy} onChange={(e) => { void uploadAttendanceSheet(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  <span className="text-[11px] text-bss-text-muted">Codes: P = Present · A = Absent · L = Leave · H = Holiday</span>
                </div>
                {attNotice && <p className="text-xs text-bss-green bg-bss-soft-green border border-bss-border rounded-xl p-3">{attNotice}</p>}
                {attError && <p className="text-xs text-bss-error bg-bss-soft-orange border border-bss-border rounded-xl p-3">{attError}</p>}
                {attResult && <div className="text-xs text-bss-green bg-bss-soft-green/50 border border-bss-border rounded-xl p-3">Synced {attResult.rows} row(s) → {attResult.created} new + {attResult.updated} updated{attResult.holidays ? `, ${attResult.holidays} holiday/weekly-off` : ''} for {attResult.workers} worker(s).{attResult.unknown.length ? ` ${attResult.unknown.length} BSS ID(s) not linked to you: ${attResult.unknown.slice(0, 5).join(', ')}.` : ''}</div>}
                <p className="text-[11px] text-bss-text-muted">The CSV is generated for the <strong>selected site</strong> and already marks that site&rsquo;s holidays and weekly offs (pre-filled <strong>H</strong>, labelled in the date header). Rows are validated by BSS ID (must be bound to you). Saved with capture method <strong>Uploaded sheet</strong> alongside QR/NFC/camera punches.</p>
              </div>
              <div className="bss-card rounded-3xl overflow-hidden">
                <EnterpriseDataTable title={`Uploaded attendance — ${attStart} → ${attEnd}`} rows={attRows} columns={attendanceColumns} rowKey={(r) => r.id} filename={`attendance-uploaded-${attStart}-to-${attEnd}`} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

