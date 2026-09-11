'use client';
import { CalendarHeart } from 'lucide-react';
import { ModuleShell } from '@/components/worker/ModuleShell';
import { useWorker } from '@/contexts/WorkerContext';

export default function HolidaysPage(){
  const {portal}=useWorker();
  const holidays=portal.holidays;
  // September 2026 grid (1 Sep is a Tuesday)
  const daysInMonth=30, firstWeekday=2;
  const byDate=new Map(holidays.map(h=>[h.date.slice(0,7)==='2026-09'?h.date.slice(8,10):null,h]).filter(([d])=>d).map(([d,h])=>[d as string,h as typeof holidays[number]]));

  return <ModuleShell title="Holiday Calendar" description="Holidays applicable to your current employer and site." icon={CalendarHeart}>
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">September 2026</h2>
          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{holidays.filter(h=>h.date.startsWith('2026-09')).length} holiday{holidays.filter(h=>h.date.startsWith('2026-09')).length===1?'':'s'} this month</span>
        </div>
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/60 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d} className="py-2.5">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-100">
          {Array.from({length:firstWeekday},(_,i)=><div key={`pad-${i}`} className="bg-white p-2 min-h-[4rem]"/>)}
          {Array.from({length:daysInMonth},(_,i)=>{
            const day=i+1; const date=`2026-09-${String(day).padStart(2,'0')}`;
            const holiday=byDate.get(String(day).padStart(2,'0'));
            const weekend=day%7===0||day%7===1;
            return <div key={date} className={`bg-white p-2 min-h-[4rem] ${holiday?'ring-2 ring-inset ring-[#F47A32]/50 bg-orange-50/40':''}`}>
              <span className={`text-xs font-bold ${holiday?'text-[#F47A32]':weekend?'text-gray-400':'text-gray-700'}`}>{day}</span>
              {holiday&&<span className="mt-1 block text-[8.5px] font-bold text-orange-700 leading-tight">{holiday.name}</span>}
              {!holiday&&weekend&&<span className="mt-1 block text-[8.5px] text-gray-300">Weekly off</span>}
            </div>;
          })}
        </div>
      </div>

      <div className="space-y-4">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <h2 className="p-4 border-b border-gray-100 font-semibold text-sm">Upcoming holidays</h2>
          {holidays.map(h=>{
            const d=new Date(`${h.date}T00:00:00`);
            return <div key={h.date} className="p-4 border-b border-gray-50 flex items-start gap-3">
              <span className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 grid place-items-center text-center leading-none flex-shrink-0"><strong className="block text-base">{d.toLocaleDateString('en-IN',{day:'numeric'})}</strong><small className="text-[9px] font-bold uppercase">{d.toLocaleDateString('en-IN',{month:'short'})}</small></span>
              <div><strong className="text-sm text-gray-900">{h.name}</strong><p className="text-xs text-gray-500 mt-0.5">{d.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})} · {h.type}</p><p className="text-[11px] text-gray-400 mt-0.5">{h.appliesTo}</p></div>
            </div>;
          })}
        </section>
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900">Leave taken on a holiday is not counted. Check the <a href="/worker/Leave" className="font-semibold underline">Leave page</a> to plan your time off around these dates.</div>
      </div>
    </div>
  </ModuleShell>;
}
