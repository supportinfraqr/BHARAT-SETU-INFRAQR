'use client';
import { useMemo, useState } from 'react';
import { CalendarHeart, CalendarPlus } from 'lucide-react';
import { ModuleShell } from '@/components/worker/ModuleShell';
import { useWorker } from '@/contexts/WorkerContext';

type LeaveRecord = ReturnType<typeof useWorker>['portal']['leaveRecords'][number];

const STATUS_TONE: Record<string, string> = {
  Approved: 'bg-green-100 text-green-800 border-green-200',
  Pending: 'bg-orange-100 text-orange-800 border-orange-200',
  Rejected: 'bg-red-100 text-red-700 border-red-200',
  Cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HolidaysPage(){
  const {portal}=useWorker();
  const holidays=portal.holidays;
  const leaves=portal.leaveRecords;
  const anchor=holidays[0]?.date?new Date(`${holidays[0].date}T00:00:00`):new Date();
  const [month,setMonth]=useState(anchor.getMonth());
  const [year,setYear]=useState(anchor.getFullYear());
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

  const monthLeaves=leaves.filter(r=>r.from.slice(0,7)===monthKey||r.to.slice(0,7)===monthKey);

  if(!portal.leaveEnabled){
    return <ModuleShell title="Holiday Calendar" description="Available once you are bound to a contractor and site." icon={CalendarHeart}>
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <CalendarHeart size={30} className="mx-auto text-[#F47A32]"/>
        <h2 className="text-base font-semibold text-gray-900 mt-3">Calendar unlocks after binding</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">Your site&apos;s holiday calendar and your leave dates appear here once a contractor binds you (and you accept the binding request).</p>
        <a href="/worker/binding" className="mt-5 inline-flex h-10 items-center gap-2 px-4 rounded-lg bg-[#073B67] text-white text-sm font-semibold hover:bg-[#062D4F]">View binding requests</a>
      </div>
    </ModuleShell>;
  }

  return <ModuleShell title="Holiday Calendar" description="Holidays and your applied leave for your current site." icon={CalendarHeart}>
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="h-9 border border-gray-200 rounded-lg px-2 text-xs font-semibold" aria-label="Month">{monthNames.map((m,i)=><option key={m} value={i}>{m}</option>)}</select>
            <select value={year} onChange={e=>setYear(Number(e.target.value))} className="h-9 border border-gray-200 rounded-lg px-2 text-xs font-semibold" aria-label="Year">{[year-1,year,year+1].map(y=><option key={y} value={y}>{y}</option>)}</select>
          </div>
          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{monthHolidays.length} holiday{monthHolidays.length===1?'':'s'} this month</span>
        </div>
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/60 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d} className="py-2.5">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-100">
          {Array.from({length:firstWeekday},(_,i)=><div key={`pad-${i}`} className="bg-white p-2 min-h-[4rem]"/>)}
          {Array.from({length:daysInMonth},(_,i)=>{
            const day=i+1; const date=`${monthKey}-${String(day).padStart(2,'0')}`;
            const holiday=byDate.get(String(day).padStart(2,'0'));
            const dayLeaves=leaveByDate.get(date)??[];
            const weekday=new Date(year,month,day).getDay();
            const weekend=weekday===0||weekday===6;
            return <div key={date} className={`bg-white p-2 min-h-[4rem] ${holiday?'ring-2 ring-inset ring-[#F47A32]/50 bg-orange-50/40':''}`}>
              <span className={`text-xs font-bold ${holiday?'text-[#F47A32]':weekend?'text-gray-400':'text-gray-700'}`}>{day}</span>
              {holiday&&<span className="mt-1 block text-[8.5px] font-bold text-orange-700 leading-tight">{holiday.name}</span>}
              {dayLeaves.map((l,idx)=><span key={`${l.id}-${idx}`} className={`mt-1 block text-[8.5px] font-bold px-1 py-0.5 rounded border leading-tight truncate ${STATUS_TONE[l.status]??STATUS_TONE.Pending}`}>{l.type} · {l.status}</span>)}
              {!holiday&&!dayLeaves.length&&weekend&&<span className="mt-1 block text-[8.5px] text-gray-300">Weekly off</span>}
            </div>;
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 border-t border-gray-100 bg-gray-50/50 text-[10px] font-semibold text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#F47A32]"/>Holiday</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-400"/>Leave approved</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-orange-400"/>Leave pending</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-400"/>Leave rejected</span>
        </div>
      </div>

      <div className="space-y-4">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between"><h2 className="font-semibold text-sm flex items-center gap-2"><CalendarPlus size={15} className="text-[#073B67]"/>Your leave · {monthNames[month]} {year}</h2><a href="/worker/Leave" className="text-[11px] font-semibold text-blue-700 hover:underline">Apply →</a></div>
          {monthLeaves.length?monthLeaves.map(r=>(
            <div key={r.id} className="p-4 border-b border-gray-50">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm text-gray-900">{r.type}</strong>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_TONE[r.status]??STATUS_TONE.Pending}`}>{r.status}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{r.from} – {r.to}{r.reason?` · ${r.reason}`:''}</p>
              {(r.approver||r.comment)&&<p className="text-[11px] text-gray-400 mt-0.5">{r.approver}{r.comment?` · ${r.comment}`:''}</p>}
            </div>
          )):<p className="p-6 text-center text-xs text-gray-400">No leave applied in this month.</p>}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <h2 className="p-4 border-b border-gray-100 font-semibold text-sm">Upcoming holidays</h2>
          {holidays.length?holidays.map(h=>{
            const d=new Date(`${h.date}T00:00:00`);
            return <div key={h.date} className="p-4 border-b border-gray-50 flex items-start gap-3">
              <span className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 grid place-items-center text-center leading-none flex-shrink-0"><strong className="block text-base">{d.toLocaleDateString('en-IN',{day:'numeric'})}</strong><small className="text-[9px] font-bold uppercase">{d.toLocaleDateString('en-IN',{month:'short'})}</small></span>
              <div><strong className="text-sm text-gray-900">{h.name}</strong><p className="text-xs text-gray-500 mt-0.5">{d.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})} · {h.type}</p><p className="text-[11px] text-gray-400 mt-0.5">{h.appliesTo}</p></div>
            </div>;
          }):<p className="p-6 text-center text-xs text-gray-400">No holidays published for your site yet.</p>}
        </section>
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900">Leave you apply for shows here straight away — <strong>Pending</strong> until your contractor approves it, then <strong>Approved</strong>.</div>
      </div>
    </div>
  </ModuleShell>;
}
