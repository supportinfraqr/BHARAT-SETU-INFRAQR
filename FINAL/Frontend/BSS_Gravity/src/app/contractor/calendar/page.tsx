"use client";
import { useState } from 'react';
import { CalendarDays, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';
import type { SiteCalendar } from '@/types/portal';

const HOLIDAY_TYPES = [
  ['PUBLIC', 'Public holiday'],
  ['ANNUAL', 'Annual holiday'],
  ['RESTRICTED', 'Restricted holiday'],
  ['SICK', 'Sick leave day'],
  ['WEEKLY_OFF', 'Weekly off'],
  ['OPTIONAL', 'Optional holiday'],
  ['OTHER', 'Other'],
] as const;

export default function ContractorCalendarPage() {
  const { contractor, replaceContractor, mutate } = useContractor();
  const calendars = contractor.siteCalendars ?? [];
  const [siteId, setSiteId] = useState<number | null>(calendars[0]?.siteId ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const current = calendars.find(c => c.siteId === siteId) ?? calendars[0];

  const [hDate, setHDate] = useState('');
  const [hName, setHName] = useState('');
  const [hType, setHType] = useState('PUBLIC');
  const [hPaid, setHPaid] = useState(true);

  const [pType, setPType] = useState(contractor.leaveTypeCatalog?.[0] ?? '');
  const [pAnnual, setPAnnual] = useState('12');
  const [pOpening, setPOpening] = useState('0');

  const applyCalendars = (next: SiteCalendar[]) => replaceContractor({ ...contractor, siteCalendars: next });

  async function addHoliday(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await mutate('site-calendar', 'POST', { kind: 'holiday', siteId: current.siteId, date: hDate, name: hName, holidayType: hType, isPaid: hPaid });
      const holiday = { id: Date.now(), date: hDate, name: hName, holidayType: HOLIDAY_TYPES.find(t => t[0] === hType)?.[1] ?? hType, holidayTypeCode: hType, isPaid: hPaid, note: '' };
      applyCalendars(calendars.map(c => c.siteId === current.siteId ? { ...c, holidays: [...c.holidays, holiday].sort((a, b) => a.date.localeCompare(b.date)) } : c));
      setHDate(''); setHName('');
      setNotice('Holiday added — every worker at this site inherits it.');
      setTimeout(() => setNotice(''), 4000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Holiday could not be added.');
    } finally { setBusy(false); }
  }

  async function removeHoliday(id: number) {
    if (!current) return;
    setBusy(true); setError('');
    try {
      await mutate('site-calendar', 'DELETE', { kind: 'holiday', siteId: current.siteId, id });
      applyCalendars(calendars.map(c => c.siteId === current.siteId ? { ...c, holidays: c.holidays.filter(h => h.id !== id) } : c));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Holiday could not be removed.');
    } finally { setBusy(false); }
  }

  async function savePolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !pType) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await mutate('site-calendar', 'POST', { kind: 'leavePolicy', siteId: current.siteId, leaveType: pType, annualEntitlement: Number(pAnnual) || 0, openingBalance: Number(pOpening) || 0 });
      const existing = current.leavePolicies.find(p => p.leaveType === pType);
      const policy = { id: existing?.id ?? Date.now(), leaveTypeId: existing?.leaveTypeId ?? 0, leaveType: pType, annualEntitlement: Number(pAnnual) || 0, openingBalance: Number(pOpening) || 0, isActive: true };
      applyCalendars(calendars.map(c => c.siteId === current.siteId ? { ...c, leavePolicies: existing ? c.leavePolicies.map(p => p.leaveType === pType ? policy : p) : [...c.leavePolicies, policy] } : c));
      setNotice('Leave policy saved — workers at this site now use these entitlements.');
      setTimeout(() => setNotice(''), 4000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Leave policy could not be saved.');
    } finally { setBusy(false); }
  }

  async function removePolicy(id: number) {
    if (!current) return;
    setBusy(true); setError('');
    try {
      await mutate('site-calendar', 'DELETE', { kind: 'leavePolicy', siteId: current.siteId, id });
      applyCalendars(calendars.map(c => c.siteId === current.siteId ? { ...c, leavePolicies: c.leavePolicies.filter(p => p.id !== id) } : c));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Leave policy could not be removed.');
    } finally { setBusy(false); }
  }

  const field = 'mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm';

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Master data</p>
          <h1 className="text-2xl font-bold mt-1">Site Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Set holidays and leave entitlements per site. Every worker bound to the site inherits them.</p>
        </div>
        {calendars.length > 0 && (
          <label className="text-xs font-semibold text-gray-600">Site
            <select value={current?.siteId ?? ''} onChange={e => setSiteId(Number(e.target.value))} className="ml-2 h-10 border border-gray-200 rounded-lg px-3 text-sm">
              {calendars.map(c => <option key={c.siteId} value={c.siteId}>{c.siteName || `Site ${c.siteId}`}</option>)}
            </select>
          </label>
        )}
      </header>

      {notice && <p className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>{notice}</p>}
      {error && <p className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</p>}

      {!current ? (
        <p className="p-8 bg-white border border-gray-200 rounded-2xl text-center text-sm text-gray-500">No sites are allotted to you yet, so there is no calendar to manage.</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5 items-start">
          {/* Holidays */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <header className="p-4 border-b border-gray-100 flex items-center gap-2 font-semibold text-sm"><CalendarDays size={16} className="text-[#073B67]"/>Holiday calendar · {current.siteName}</header>
            <form onSubmit={addHoliday} className="p-4 grid grid-cols-2 gap-3 border-b border-gray-100">
              <label className="text-xs font-semibold text-gray-600">Date<input type="date" required value={hDate} onChange={e => setHDate(e.target.value)} className={field}/></label>
              <label className="text-xs font-semibold text-gray-600">Name<input required value={hName} onChange={e => setHName(e.target.value)} placeholder="e.g. Diwali" className={field}/></label>
              <label className="text-xs font-semibold text-gray-600">Type<select value={hType} onChange={e => setHType(e.target.value)} className={field}>{HOLIDAY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label className="text-xs font-semibold text-gray-600 flex items-center gap-2 mt-5"><input type="checkbox" checked={hPaid} onChange={e => setHPaid(e.target.checked)}/>Paid holiday</label>
              <button disabled={busy} className="col-span-2 h-10 rounded-lg bg-[#073B67] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F] disabled:opacity-60"><Plus size={15}/>Add holiday</button>
            </form>
            <div>
              {current.holidays.length ? current.holidays.map(h => (
                <div key={h.id} className="px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-3">
                  <div><strong className="text-sm text-gray-900">{h.name}</strong><p className="text-[11px] text-gray-500">{h.date} · {h.holidayType}{h.isPaid ? '' : ' · unpaid'}</p></div>
                  <button type="button" onClick={() => removeHoliday(h.id)} disabled={busy} className="text-gray-400 hover:text-red-600" aria-label="Remove holiday"><Trash2 size={15}/></button>
                </div>
              )) : <p className="p-6 text-center text-xs text-gray-400">No holidays configured for this site.</p>}
            </div>
          </section>

          {/* Leave policy */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <header className="p-4 border-b border-gray-100 flex items-center gap-2 font-semibold text-sm"><CalendarDays size={16} className="text-[#F47A32]"/>Leave policy · {current.siteName}</header>
            <form onSubmit={savePolicy} className="p-4 grid grid-cols-2 gap-3 border-b border-gray-100">
              <label className="text-xs font-semibold text-gray-600 col-span-2">Leave type<select value={pType} onChange={e => setPType(e.target.value)} className={field}>{(contractor.leaveTypeCatalog ?? []).map(t => <option key={t} value={t}>{t}</option>)}</select></label>
              <label className="text-xs font-semibold text-gray-600">Annual entitlement<input type="number" min="0" value={pAnnual} onChange={e => setPAnnual(e.target.value)} className={field}/></label>
              <label className="text-xs font-semibold text-gray-600">Opening balance<input type="number" min="0" value={pOpening} onChange={e => setPOpening(e.target.value)} className={field}/></label>
              <button disabled={busy || !pType} className="col-span-2 h-10 rounded-lg bg-[#F47A32] text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"><Plus size={15}/>Save leave policy</button>
            </form>
            <div>
              {current.leavePolicies.length ? current.leavePolicies.map(p => (
                <div key={p.id} className="px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-3">
                  <div><strong className="text-sm text-gray-900">{p.leaveType}</strong><p className="text-[11px] text-gray-500">{p.annualEntitlement}/year · opening {p.openingBalance}</p></div>
                  <button type="button" onClick={() => removePolicy(p.id)} disabled={busy} className="text-gray-400 hover:text-red-600" aria-label="Remove policy"><Trash2 size={15}/></button>
                </div>
              )) : <p className="p-6 text-center text-xs text-gray-400">No leave policy — workers use the global leave master.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
