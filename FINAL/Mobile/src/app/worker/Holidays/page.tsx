'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarHeart, CalendarPlus } from 'lucide-react';
import { ModuleShell } from '@/components/worker/ModuleShell';
import PageHero from '@/components/portal/PageHero';
import { useWorker } from '@/contexts/WorkerContext';

type LeaveRecord = ReturnType<typeof useWorker>['portal']['leaveRecords'][number];

const STATUS_TONE: Record<string, string> = {
  Approved: 'bg-bss-soft-green text-bss-green border-bss-border',
  Pending: 'bg-bss-soft-orange text-bss-orange border-bss-border',
  Rejected: 'bg-bss-soft-orange text-bss-error border-bss-border',
  Cancelled: 'bg-bss-bg text-bss-text-muted border-bss-border',
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HolidaysPage(){
  const {portal}=useWorker();
  const holidays=portal.holidays;
  const leaves=portal.leaveRecords;
  const restricted=portal.restrictedHolidays ?? {allotment:0,maxAvail:0,used:0,requests:[]};
  // RH requests are treated as leave (they show in "Your leave" and on the grid).
  const rhList=restricted.requests;
  const weeklyOff=new Set(portal.weeklyOffDays ?? []);
  // Default the calendar to the current month (not the first holiday's month).
  const [month,setMonth]=useState(()=>new Date().getMonth());
  const [year,setYear]=useState(()=>new Date().getFullYear());
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstWeekday=new Date(year,month,1).getDay();
  const monthKey=`${year}-${String(month+1).padStart(2,'0')}`;
  const monthHolidays=holidays.filter(h=>h.date.startsWith(monthKey));
  const byDate=new Map(monthHolidays.map(h=>[h.date.slice(8,10),h]));
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Expand each leave request's date range into per-day statuses for the grid.
  const leaveByDate=useMemo(()=>{
    const map=new Map<string,LeaveRecord[]>();
    for(const r of leaves){
      const start=new Date(`${r.from}T00:00:00`);
      const end=new Date(`${r.to}T00:00:00`);
      if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))continue;
      for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
        const key=dayKey(d);
        map.set(key,[...(map.get(key)??[]),r]);
      }
    }
    return map;
  },[leaves]);

  // "Your leave" also lists Restricted Holiday (RH) requests — RH is a leave the
  // worker takes, just limited to the site's restricted-holiday dates.
  const leaveRows=[
    ...leaves.map(r=>({ id:r.id, type:r.type, from:r.from, to:r.to, reason:r.reason, status:r.status, approver:r.approver, comment:r.comment })),
    ...rhList.map(r=>({ id:`rh-${r.id}`, type:'Restricted Holiday', from:r.holidayDate, to:r.holidayDate, reason:r.reason||r.holidayName, status:r.status as string, approver:undefined as string|undefined, comment:r.comment })),
  ];
  const monthLeaves=leaveRows.filter(r=>r.from.slice(0,7)===monthKey||r.to.slice(0,7)===monthKey);

  // Approved / pending Restricted Holidays for the grid (RH is not a leave record,
  // so without this an approved RH would never appear on the worker's calendar).
  const rhByDate=useMemo(()=>new Map(
    rhList.filter(r=>r.status==='Approved'||r.status==='Pending').map(r=>[r.holidayDate,r])
  ),[rhList]);

  if(!portal.leaveEnabled){
    return <ModuleShell title="Holiday Calendar" description="Available once you are bound to a contractor and site." icon={CalendarHeart} hero={<PageHero title="Holiday Calendar" subtitle="Available once you are bound to a contractor and site." actions={<Link href="/worker" aria-label="Back to dashboard" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"><ArrowLeft size={18}/></Link>} />}>
      <div className="bss-3d bss-scroll-rise bss-card rounded-2xl p-8 text-center">
        <CalendarHeart size={30} className="mx-auto text-[#E45D24]"/>
        <h2 className="text-base font-semibold text-bss-text-primary mt-3">Calendar unlocks after binding</h2>
        <p className="text-sm text-bss-text-muted mt-1 max-w-md mx-auto">Your site&apos;s holiday calendar and your leave dates appear here once a contractor binds you (and you accept the binding request).</p>
        <a href="/worker/binding" className="mt-5 inline-flex h-10 items-center gap-2 px-4 rounded-lg bg-[#01183A] text-white text-sm font-semibold hover:bg-[#022B5E]">View binding requests</a>
      </div>
    </ModuleShell>;
  }

  return <ModuleShell title="Holiday Calendar" description="Holidays and your applied leave for your current site." icon={CalendarHeart} hero={<PageHero title="Holiday Calendar" subtitle="Holidays and your applied leave for your current site." actions={<Link href="/worker" aria-label="Back to dashboard" className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"><ArrowLeft size={18}/></Link>} />}>
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
      <div className="bss-3d bss-scroll-rise bss-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bss-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="h-9 border border-bss-border rounded-lg px-2 text-xs font-semibold" aria-label="Month">{monthNames.map((m,i)=><option key={m} value={i}>{m}</option>)}</select>
            <select value={year} onChange={e=>setYear(Number(e.target.value))} className="h-9 border border-bss-border rounded-lg px-2 text-xs font-semibold" aria-label="Year">{[year-1,year,year+1].map(y=><option key={y} value={y}>{y}</option>)}</select>
          </div>
          <span className="text-[10px] font-bold text-bss-orange bg-bss-soft-orange px-2 py-1 rounded-full">{monthHolidays.length} holiday{monthHolidays.length===1?'':'s'} this month</span>
        </div>
        <div className="grid grid-cols-7 border-b border-bss-border bg-bss-bg/60 text-center text-[11px] font-bold uppercase tracking-wider text-bss-text-muted">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d} className="py-2.5">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-bss-bg">
          {Array.from({length:firstWeekday},(_,i)=><div key={`pad-${i}`} className="bg-white p-2 min-h-[4rem]"/>)}
          {Array.from({length:daysInMonth},(_,i)=>{
            const day=i+1; const date=`${monthKey}-${String(day).padStart(2,'0')}`;
            const holiday=byDate.get(String(day).padStart(2,'0'));
            const dayLeaves=leaveByDate.get(date)??[];
            const weekday=new Date(year,month,day).getDay();
            const weekend=weeklyOff.has(['SUN','MON','TUE','WED','THU','FRI','SAT'][weekday]);
            return <div key={date} className={`bg-white p-2 min-h-[4rem] ${holiday?'ring-2 ring-inset ring-[#E45D24]/50 bg-bss-soft-orange/40':''}`}>
              <span className={`text-xs font-bold ${holiday?'text-[#E45D24]':weekend?'text-bss-text-muted':'text-bss-text-secondary'}`}>{day}</span>
              {holiday&&<span className="mt-1 block text-[8.5px] font-bold text-bss-orange leading-tight">{holiday.name}</span>}
              {dayLeaves.map((l,idx)=><span key={`${l.id}-${idx}`} className={`mt-1 block text-[8.5px] font-bold px-1 py-0.5 rounded border leading-tight truncate ${STATUS_TONE[l.status]??STATUS_TONE.Pending}`}>{l.type} · {l.status}</span>)}
              {rhByDate.get(date)&&<span className={`mt-1 block text-[8.5px] font-bold px-1 py-0.5 rounded border leading-tight truncate ${rhByDate.get(date)!.status==='Approved'?'bg-bss-soft-green text-bss-green border-bss-border':'bg-bss-soft-orange text-bss-orange border-bss-border'}`}>RH · {rhByDate.get(date)!.status}</span>}
              {!holiday&&!dayLeaves.length&&!rhByDate.get(date)&&weekend&&<span className="mt-1 block text-[8.5px] text-bss-text-muted">Weekly off</span>}
            </div>;
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 border-t border-bss-border bg-bss-bg/50 text-[10px] font-semibold text-bss-text-muted">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#E45D24]"/>Holiday</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-bss-green"/>Leave approved</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-bss-orange"/>Leave pending</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-bss-error"/>Leave rejected</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-bss-orange"/>Restricted Holiday (RH)</span>
        </div>
      </div>

      <div className="space-y-4">
        <section className="bss-3d bss-scroll-rise bss-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-bss-border flex items-center justify-between"><h2 className="font-semibold text-sm flex items-center gap-2"><CalendarPlus size={15} className="text-[#01183A]"/>Your leave · {monthNames[month]} {year}</h2><a href="/worker/Leave" className="text-[11px] font-semibold text-bss-interactive-blue hover:underline">Apply →</a></div>
          {monthLeaves.length?monthLeaves.map(r=>(
            <div key={r.id} className="p-4 border-b border-bss-border">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm text-bss-text-primary">{r.type}</strong>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_TONE[r.status]??STATUS_TONE.Pending}`}>{r.status}</span>
              </div>
              <p className="text-xs text-bss-text-muted mt-1">{r.from} – {r.to}{r.reason?` · ${r.reason}`:''}</p>
              {(r.approver||r.comment)&&<p className="text-[11px] text-bss-text-muted mt-0.5">{r.approver}{r.comment?` · ${r.comment}`:''}</p>}
            </div>
          )):<p className="p-6 text-center text-xs text-bss-text-muted">No leave applied in this month.</p>}
        </section>

        <section className="bss-3d bss-scroll-rise bss-card rounded-2xl overflow-hidden">
          <h2 className="p-4 border-b border-bss-border font-semibold text-sm">Upcoming holidays</h2>
          {holidays.length?holidays.map(h=>{
            const d=new Date(`${h.date}T00:00:00`);
            return <div key={h.date} className="p-4 border-b border-bss-border flex items-start gap-3">
              <span className="w-12 h-12 rounded-xl bg-bss-soft-orange text-bss-orange grid place-items-center text-center leading-none flex-shrink-0"><strong className="block text-base">{d.toLocaleDateString('en-IN',{day:'numeric'})}</strong><small className="text-[9px] font-bold uppercase">{d.toLocaleDateString('en-IN',{month:'short'})}</small></span>
              <div><strong className="text-sm text-bss-text-primary">{h.name}</strong><p className="text-xs text-bss-text-muted mt-0.5">{d.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})} · {h.type}</p><p className="text-[11px] text-bss-text-muted mt-0.5">{h.appliesTo}</p></div>
            </div>;
          }):<p className="p-6 text-center text-xs text-bss-text-muted">No holidays published for your site yet.</p>}
        </section>
        <div className="bg-bss-blue-tint/70 border border-bss-border rounded-2xl p-4 text-xs text-bss-text-primary">Leave you apply for (including <strong>Restricted Holiday</strong>) shows here straight away — <strong>Pending</strong> until your contractor approves it, then <strong>Approved</strong>.</div>
      </div>
    </div>
  </ModuleShell>;
}
