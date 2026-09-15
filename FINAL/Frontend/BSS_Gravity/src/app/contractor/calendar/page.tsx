"use client";

import { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  Sparkles,
  Trash2,
  Zap,
  Building2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';
import type { SiteCalendar } from '@/types/portal';

const HOLIDAY_TYPES = [
  ['WEEKLY_OFF', 'Weekly Off', 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20'],
  ['PUBLIC', 'Public Holiday', 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20'],
  ['RESTRICTED', 'Restricted Holiday', 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20'],
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
  const [activeTab, setActiveTab] = useState<'calendar' | 'holidays' | 'policy'>('calendar');

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
    'w-full h-10 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#073B67]/20 focus:border-[#073B67] transition-all bg-white';

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#073B67] to-[#0A4D87] rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-[#073B67]/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md border border-white/15">
              <Building2 size={13} className="text-[#F47A32]" />
              <span>Master Configuration</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Site Calendar & Leave Setup</h1>
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
                className="w-full h-10 bg-white text-gray-900 font-bold rounded-xl px-3 text-sm border-0 focus:ring-2 focus:ring-[#F47A32] cursor-pointer shadow-sm"
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
              <span className="text-xl font-bold flex items-center gap-1.5 text-emerald-300">
                <ShieldCheck size={16} /> Inherited
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {notice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-sm">
          <Info size={18} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!current ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#F47A32] grid place-items-center mx-auto">
            <Building2 size={32} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">No Sites Allotted Yet</h2>
          <p className="text-sm text-gray-500">
            You do not have any active project site allotments mapped to your account. Once a principal employer allots a site to your organisation, its calendar interface will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2 border border-gray-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'calendar'
                    ? 'bg-[#073B67] text-white shadow-md shadow-[#073B67]/20'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CalendarDays size={16} /> Interactive Calendar Grid
              </button>
              <button
                onClick={() => setActiveTab('holidays')}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'holidays'
                    ? 'bg-[#073B67] text-white shadow-md shadow-[#073B67]/20'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CalendarIcon size={16} /> Holidays List ({siteHolidays.length})
              </button>
              <button
                onClick={() => setActiveTab('policy')}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'policy'
                    ? 'bg-[#073B67] text-white shadow-md shadow-[#073B67]/20'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Clock size={16} /> Leave Policies ({sitePolicies.length})
              </button>
            </div>

            <button
              onClick={loadStandardPresets}
              disabled={busy}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#F47A32] text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 shadow-md shadow-[#F47A32]/20 transition-all disabled:opacity-50"
            >
              <Sparkles size={15} /> Auto-fill Indian Public Holidays
            </button>
          </div>

          {/* TAB 1: Visual Interactive Month Grid */}
          {activeTab === 'calendar' && (
            <div className="grid lg:grid-cols-[1.8fr_1fr] gap-6 items-start">
              {/* Calendar Grid Box */}
              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={prevMonth}
                      className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <h2 className="text-base font-extrabold text-gray-900 min-w-[140px] text-center">
                      {monthNames[currentMonth]} {currentYear}
                    </h2>
                    <button
                      onClick={nextMonth}
                      className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {monthHolidays.length} Holiday{monthHolidays.length === 1 ? '' : 's'} in {monthNames[currentMonth]}
                    </span>
                  </div>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 text-center text-xs font-bold uppercase tracking-wider text-gray-500 py-3">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-px bg-gray-200 p-px">
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
                        className={`bg-white p-2.5 min-h-[5.5rem] transition-all relative group cursor-pointer hover:bg-blue-50/30 ${
                          holiday ? 'bg-amber-50/40 ring-1 ring-inset ring-[#F47A32]/40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                              holiday
                                ? 'bg-[#F47A32] text-white shadow-sm'
                                : isSunday
                                ? 'text-rose-500 bg-rose-50'
                                : 'text-gray-800'
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
                              className="text-gray-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove holiday"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {holiday ? (
                          <div className="mt-1.5 space-y-1">
                            <span className="block text-[11px] font-bold text-amber-900 leading-tight truncate">
                              {holiday.name}
                            </span>
                            <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              {holiday.isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>
                        ) : isSunday ? (
                          <span className="mt-2 block text-[10px] font-medium text-rose-400">Weekly Off</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Add Holiday Panel */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-5 shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Plus size={18} className="text-[#073B67]" /> Add Holiday to Site
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Select a date or pick one directly from the calendar grid to register a holiday for {current.siteName}.
                  </p>
                </div>

                <form onSubmit={(e) => addHoliday(e)} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Date</label>
                    <input
                      type="date"
                      required
                      value={hDate}
                      onChange={(e) => setHDate(e.target.value)}
                      className={inputStyle}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Holiday Name / Description</label>
                    <input
                      required
                      value={hName}
                      onChange={(e) => setHName(e.target.value)}
                      placeholder="e.g. Founder's Day / Regional Festival"
                      className={inputStyle}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Category Type</label>
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
                      className="w-4 h-4 text-[#073B67] rounded border-gray-300 focus:ring-[#073B67]"
                    />
                    <label htmlFor="hPaid" className="text-xs font-semibold text-gray-700 cursor-pointer">
                      Paid holiday (Workers receive daily wage entitlement)
                    </label>
                  </div>

                  <button
                    disabled={busy}
                    className="w-full h-11 rounded-xl bg-[#073B67] hover:bg-[#062D4F] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#073B67]/20 transition-all disabled:opacity-60"
                  >
                    <Plus size={16} /> Save Holiday to Calendar
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: Holidays Master Table & List */}
          {activeTab === 'holidays' && (
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm space-y-4 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Configured Site Holidays ({siteHolidays.length})</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Holidays applicable for all workers and sub-contractors on {current.siteName}.
                  </p>
                </div>
              </div>

              {siteHolidays.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No holidays configured for this site. Switch to the calendar tab or click &quot;Auto-fill Indian Public Holidays&quot; above.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {siteHolidays.map((h) => {
                    const typeConfig = HOLIDAY_TYPES.find((t) => t[0] === h.holidayTypeCode || t[1] === h.holidayType);
                    const badgeStyle = typeConfig ? typeConfig[2] : 'bg-gray-50 text-gray-700 border-gray-200';
                    return (
                      <div
                        key={h.id}
                        className="p-4 border border-gray-200 rounded-2xl bg-white hover:border-[#073B67]/30 transition-all flex items-start justify-between gap-3 shadow-sm"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-gray-400 block">{h.date}</span>
                          <strong className="text-sm font-bold text-gray-900 block">{h.name}</strong>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                              {h.holidayType || h.holidayTypeCode}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                h.isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
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
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
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
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Leave Policies & Allowances ({sitePolicies.length})</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Annual leave quotas and opening balances inherited by workers on {current.siteName}.
                  </p>
                </div>

                {sitePolicies.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                    No leave policies configured for this site yet. Workers at this site will see &ldquo;leave calendar not set up&rdquo; until you add at least one leave type here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sitePolicies.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 border border-gray-200 rounded-2xl flex items-center justify-between gap-4 hover:border-[#F47A32]/40 transition-all bg-gray-50/40"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F47A32] grid place-items-center font-bold">
                            {p.leaveType.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong className="text-sm font-bold text-gray-900 block">{p.leaveType}</strong>
                            <span className="text-xs text-gray-500">
                              Annual Quota: <b className="text-gray-900">{p.annualEntitlement} Days</b> · Opening Balance:{' '}
                              <b className="text-gray-900">{p.openingBalance} Days</b>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removePolicy(p.id)}
                          disabled={busy}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Restricted Holiday (RH) policy */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <CalendarDays size={18} className="text-[#F47A32]" /> Restricted Holiday (RH) Policy
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Optional/regional holidays (e.g. Ganesh Chaturthi, Onam) workers may choose from. <strong className="text-gray-700">{rhOfferedCount}</strong> restricted holiday{rhOfferedCount === 1 ? '' : 's'} currently on this site&apos;s calendar. Set how many a worker may avail per year — with your prior approval.
                  </p>
                </div>
                <label className="text-xs font-bold text-gray-700 block max-w-xs">RH allowance per worker / year
                  <input type="number" min="0" value={rhMaxAvail} onChange={(e) => setRhMaxAvail(e.target.value)} className={inputStyle} />
                </label>
                <button type="button" disabled={busy} onClick={() => void saveRestrictedPolicy()} className="h-11 px-4 rounded-xl bg-[#073B67] hover:bg-[#062D4F] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                  <Zap size={16} /> Save RH policy
                </button>
              </div>

              {/* Weekly off days */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <CalendarDays size={18} className="text-[#F47A32]" /> Weekly Off Days
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    The day(s) workers at this site get off every week. Leave cannot be applied on weekly offs or public holidays.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAY_CODES.map(([code, label]) => (
                    <button key={code} type="button" onClick={() => toggleWeeklyOff(code)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${weeklyOff.has(code) ? 'bg-[#073B67] text-white border-[#073B67]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{label}</button>
                  ))}
                </div>
                <button type="button" disabled={busy} onClick={() => void saveWeeklyOff()} className="h-11 px-4 rounded-xl bg-[#073B67] hover:bg-[#062D4F] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                  <Zap size={16} /> Save weekly offs
                </button>
              </div>

              {/* Copy setup to other sites */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Copy size={18} className="text-[#F47A32]" /> Copy setup to other sites
                </h3>
                <p className="text-xs text-gray-500">
                  Apply this site&apos;s holidays, leave policies and RH policy to all your other allotted sites. Existing entries are kept and updated.
                </p>
                <button type="button" disabled={busy} onClick={() => void copyCalendarToSites()} className="h-11 px-4 rounded-xl border border-[#073B67]/30 text-[#073B67] text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#073B67]/5 disabled:opacity-60">
                  <Copy size={16} /> Copy to other sites
                </button>
              </div>
              </div>

              {/* Form */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Clock size={18} className="text-[#F47A32]" /> Configure Leave Entitlement
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Set up or modify leave rules for Casual, Earned, or Sick leave categories.
                  </p>
                </div>

                <form onSubmit={savePolicy} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Leave Category</label>
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
                    <label className="text-xs font-bold text-gray-700">Annual Entitlement (Days / Year)</label>
                    <input
                      type="number"
                      min="0"
                      value={pAnnual}
                      onChange={(e) => setPAnnual(e.target.value)}
                      className={inputStyle}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Opening Balance Default</label>
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
                    className="w-full h-11 rounded-xl bg-[#F47A32] hover:bg-[#D96622] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#F47A32]/20 transition-all disabled:opacity-60"
                  >
                    <Zap size={16} /> Save Leave Policy
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

