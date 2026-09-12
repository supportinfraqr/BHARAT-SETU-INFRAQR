'use client';
import { useMemo, useState } from 'react';
import { CalendarDays, List, QrCode, ScanLine, RadioTower } from 'lucide-react';
import { fieldClass, ModuleShell } from '@/components/worker/ModuleShell';
import type { AttendanceRecord } from '@/types/portal';
import { useWorker } from '@/contexts/WorkerContext';
import EnterpriseDataTable, { DataColumn } from '@/components/worker/EnterpriseDataTable';

export default function AttendancePage() {
  const {portal}=useWorker(); const attendanceData=portal.attendance;
  const [view,setView]=useState<'calendar'|'history'>('calendar');
  const records=attendanceData.records;
  const count=(presence:string)=>records.filter(r=>r.presence===presence).length;

  // Calendar grid for the selected month, populated from the recorded days.
  const anchor = records[0]?.date ? new Date(records[0].date) : new Date();
  const [month,setMonth]=useState(anchor.getMonth());
  const [year,setYear]=useState(anchor.getFullYear());
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstWeekday=new Date(year,month,1).getDay();
  const monthKey=`${year}-${String(month+1).padStart(2,'0')}`;
  const byDate=useMemo(()=>new Map(records.map(r=>[r.date,r])),[records]);
  const todayKey=new Date().toISOString().slice(0,10);
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const methodCounts={
    qr:records.filter(r=>r.method?.includes('QR Scan')).length,
    cctv:records.filter(r=>r.method?.includes('CCTV')).length,
    rfid:records.filter(r=>r.method?.includes('RFID')).length,
  };

  const statusStyle=(presence:string)=>{
    switch(presence){
      case 'Present': return 'bg-[#EDF8F2] text-[#2F9E67] border-[#2F9E67]/25';
      case 'Absent': return 'bg-red-50 text-red-600 border-red-100';
      case 'Leave': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'Weekly Off': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  return <ModuleShell title="Attendance" description="Attendance received from the connected site attendance system." icon={CalendarDays}>
    <div className="text-xs bg-blue-50 border border-blue-100 text-blue-800 rounded-xl px-4 py-3"><strong>{portal.dataMode==='demo'?'Demo database records':'Connected attendance records'}</strong> · {attendanceData.source} · Last sync {attendanceData.syncedAt?new Date(attendanceData.syncedAt).toLocaleString('en-IN'):'—'}</div>

    {/* Summary */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {[{l:'Present',v:count('Present'),t:'text-[#2F9E67]'},{l:'Absent',v:count('Absent'),t:'text-red-600'},{l:'Leave',v:count('Leave'),t:'text-orange-600'},{l:'Working days',v:records.filter(r=>!['Weekly Off','Holiday'].includes(r.presence)).length,t:'text-gray-800'}].map(x=><div key={x.l} className="bg-white border border-gray-200 rounded-xl p-3"><strong className={`text-lg ${x.t}`}>{x.v}</strong><p className="text-[11px] text-gray-500">{x.l}</p></div>)}
    </div>

    {/* Capture methods */}
    <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Attendance methods</span>
      <span className="inline-flex items-center gap-1.5 text-gray-600"><QrCode size={14} className="text-[#073B67]"/>QR Scan <strong className="text-gray-900">{methodCounts.qr}</strong></span>
      <span className="inline-flex items-center gap-1.5 text-gray-600"><ScanLine size={14} className="text-[#073B67]"/>CCTV <strong className="text-gray-900">{methodCounts.cctv}</strong></span>
      <span className="inline-flex items-center gap-1.5 text-gray-600"><RadioTower size={14} className="text-[#073B67]"/>RFID <strong className="text-gray-900">{methodCounts.rfid}</strong></span>
      <span className="text-gray-400">· A day may combine methods (e.g. QR Scan + CCTV)</span>
    </div>

    <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap justify-between gap-3">
      <div className="flex gap-2"><select className={fieldClass} aria-label="Month" value={month} onChange={e=>setMonth(Number(e.target.value))}>{monthNames.map((m,i)=><option key={m} value={i}>{m}</option>)}</select><select className={fieldClass} aria-label="Year" value={year} onChange={e=>setYear(Number(e.target.value))}>{[year-1,year,year+1].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
      <div className="flex rounded-lg bg-gray-100 p-1"><button onClick={()=>setView('calendar')} className={`px-3 py-1.5 rounded-md text-xs flex gap-1.5 items-center ${view==='calendar'?'bg-white shadow-sm font-semibold':''}`}><CalendarDays size={14}/>Calendar</button><button onClick={()=>setView('history')} className={`px-3 py-1.5 rounded-md text-xs flex gap-1.5 items-center ${view==='history'?'bg-white shadow-sm font-semibold':''}`}><List size={14}/>History</button></div>
    </div>

    {view==='calendar'?(
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/60 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d} className="py-2.5">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-100">
          {Array.from({length:firstWeekday},(_,i)=><div key={`pad-${i}`} className="bg-white p-2 min-h-[4.5rem]"/>)}
          {Array.from({length:daysInMonth},(_,i)=>{
            const day=i+1; const date=`${monthKey}-${String(day).padStart(2,'0')}`;
            const rec=byDate.get(date);
            const isToday=date===todayKey;
            return <div key={date} className={`bg-white p-2 min-h-[4.5rem] flex flex-col ${isToday?'ring-2 ring-inset ring-[#073B67]/40':''}`}>
              <span className={`text-xs font-bold ${rec?rec.presence==='Present'?'text-[#2F9E67]':rec.presence==='Absent'?'text-red-600':'text-gray-600':isToday?'text-[#073B67]':'text-gray-300'}`}>{day}</span>
              {rec?<span className={`mt-1.5 inline-flex items-center justify-center text-[9px] font-bold px-1.5 py-1 rounded border ${statusStyle(rec.presence)}`}>{rec.presence}{rec.presence==='Present'&&rec.checkIn?` · ${rec.checkIn}`:''}</span>:<span className="mt-1.5 text-[9px] text-gray-300">—</span>}
              {rec?.method&&rec.method!=='—'&&<span className="mt-1 text-[8.5px] font-mono text-gray-400 truncate">{rec.method}</span>}
            </div>;
          })}
        </div>
        <div className="flex flex-wrap gap-4 p-3 bg-gray-50/50 border-t border-gray-100 text-[11px] font-semibold text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#2F9E67]"/>Present</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-400"/>Absent</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-orange-400"/>Leave</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-gray-300"/>Weekly Off</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded border-2 border-[#073B67]/40"/>Today</span>
        </div>
      </div>
    ):<EnterpriseDataTable title="Attendance records" rows={records} columns={attendanceColumns} rowKey={r=>r.date} filename="bss-attendance-history"/>}
    {portal.dataMode==='demo'&&<p className="text-xs text-gray-500">Illustrative attendance records. Production values come from the connected attendance source.</p>}
  </ModuleShell>;
}
type AttendanceRow=AttendanceRecord;
const attendanceColumns:DataColumn<AttendanceRow>[]=[
  {id:'date',header:'Date',value:r=>r.date},
  {id:'presence',header:'Presence',value:r=>r.presence},
  {id:'method',header:'Method',value:r=>r.method??'—',render:r=>r.method&&r.method!=='—'?<span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#073B67] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">{r.method.includes('QR Scan')?<QrCode size={11}/>:r.method.includes('CCTV')?<ScanLine size={11}/>:r.method.includes('RFID')?<RadioTower size={11}/>:null}{r.method}</span>:<span className="text-gray-300">—</span>},
  {id:'shift',header:'Shift',value:r=>r.shift??'Not applicable'},
  {id:'site',header:'Site',value:r=>r.site},
  {id:'checkIn',header:'Check-in',value:r=>r.checkIn??'—'},
  {id:'checkOut',header:'Check-out',value:r=>r.checkOut??'—'},
  {id:'status',header:'Status',value:r=>r.status},
];
