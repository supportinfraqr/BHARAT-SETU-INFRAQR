"use client";
import {useState} from 'react';
import {CalendarHeart,CalendarPlus,CheckCircle2,Home,Paperclip,Send,Stethoscope,UsersRound} from 'lucide-react';
import {ModuleShell} from '@/components/worker/ModuleShell';
import {useWorker} from '@/contexts/WorkerContext';
type Leave=ReturnType<typeof useWorker>['portal']['leaveRecords'][number];

const quickReasons=[
  {label:'Festival', emoji:'🪔'},
  {label:'Fever / not well', emoji:'🤒'},
  {label:'Family function', emoji:'🎉'},
  {label:'Emergency at home', emoji:'🏠'},
  {label:'Going to hometown', emoji:'🚌'},
  {label:'Other', emoji:'📝'},
];

export default function LeavePage(){
  const {portal,worker}=useWorker();
  const [records,setRecords]=useState(portal.leaveRecords);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [type,setType]=useState('');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [reason,setReason]=useState('');
  const [days,setDays]=useState(0);
  const [rhDate,setRhDate]=useState('');

  // Leave ledger comes from the backend (opening + accrued − availed = balance).
  const FY_LABEL='Current financial year · 1 Apr – 31 Mar';
  const FY_AS_ON_LABEL='as on today';
  const balanceByType=new Map((portal.leaveBalance ?? []).map(b=>[b.type,b]));
  const leaveLedger=(leaveType:string)=>balanceByType.get(leaveType) ?? {opening:0,accrued:0,availed:0,pending:0,balance:0};
  const rh=portal.restrictedHolidays;
  // Restricted Holiday (RH) is offered as a selectable leave option too. It is
  // not a leave type — applying for it raises an RH request for a specific
  // restricted holiday (with the contractor's prior approval).
  const RH_TYPE='Restricted Holiday (RH)';
  const isRh=type===RH_TYPE;
  const rhRequested=new Set((rh?.requests ?? []).filter(r=>r.status==='Pending'||r.status==='Approved').map(r=>r.holidayDate));
  const rhOptions=(portal.holidays ?? []).filter(h=>h.typeCode==='RESTRICTED'&&!rhRequested.has(h.date));
  const rhBalance=rh?Math.max(0,rh.maxAvail-rh.used):0;


  const pickType=(t:string)=>{setType(t);};
  const pickDays=(start:string,end:string)=>{setFrom(start);setTo(end);if(start&&end){const a=new Date(start+ 'T00:00:00'),b=new Date(end+'T00:00:00');setDays(Math.max(0,Math.round((b.getTime()-a.getTime())/86400000)+1));}};

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');
    const form=e.currentTarget;const data=new FormData(form);const file=data.get('file');
    if(isRh){
      if(rhBalance<=0){setError('You have used all your restricted holidays for this year.');setBusy(false);return}
      if(!rhDate){setError('Choose a restricted holiday.');setBusy(false);return}
      try{
        const response=await fetch('/api/portal/restricted-holiday',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({holidayDate:rhDate,reason})});
        const result=await response.json() as {error?:string};
        if(!response.ok)throw new Error(result.error??'Restricted holiday request could not be submitted.');
        form.reset();setType('');setReason('');setRhDate('');
        setMessage('Restricted holiday requested. Your contractor will approve it.');
      }catch(reason){setError(reason instanceof Error?reason.message:'Restricted holiday request could not be submitted.')}finally{setBusy(false)}
      return;
    }
    if(!type||!from||!to){setError('Please choose a leave type and the dates.');setBusy(false);return}
    if(file instanceof File&&file.size>10*1024*1024){setError('Attachment must be 10 MB or smaller.');setBusy(false);return}
    // Logical guard — never let a worker apply more days than the available balance in that category.
    if(type && days>0 && days>leaveLedger(type).balance){setError(`Only ${leaveLedger(type).balance} day${leaveLedger(type).balance===1?'':'s'} of ${type} left this financial year — opening + accrued − applied (pending + approved).`);setBusy(false);return}
    try{
      let attachmentId:string|undefined;
      if(file instanceof File&&file.size){const upload=new FormData();upload.set('file',file);upload.set('type','Leave evidence');upload.set('site',worker.employment.site);upload.set('period',String(from).slice(0,7));const uploadResponse=await fetch('/api/portal/uploads',{method:'POST',body:upload});const uploadResult=await uploadResponse.json() as {data?:{id:string};error?:string};if(!uploadResponse.ok||!uploadResult.data)throw new Error(uploadResult.error??'Leave evidence could not be uploaded.');attachmentId=uploadResult.data.id}
      const payload={type,from,to,reason,attachmentId};
      const response=await fetch('/api/portal/leave',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json() as {data?:Leave;error?:string};
      if(!response.ok||!result.data)throw new Error(result.error??'Leave request could not be submitted.');
      setRecords(current=>[result.data!,...current]);form.reset();setType('');setFrom('');setTo('');setReason('');setDays(0);
      setMessage('Leave request submitted for approval. Your supervisor has been notified.');
    }catch(reason){setError(reason instanceof Error?reason.message:'Leave request could not be submitted.')}finally{setBusy(false)}
  }

  // Leave types are configured per site by the contractor, so pick an icon/hint
  // by keyword with a sensible fallback instead of a fixed type map.
  const leaveTypeMeta=(name:string):{icon:React.ReactNode;hint:string}=>{
    const n=name.toLowerCase();
    if(n.includes('medical')||n.includes('sick'))return{icon:<Stethoscope size={22}/>,hint:'When you are sick or need a doctor visit'};
    if(n.includes('casual')||n.includes('personal'))return{icon:<UsersRound size={22}/>,hint:'Family function, home work or personal need'};
    if(n.includes('earned')||n.includes('annual')||n.includes('privilege'))return{icon:<Home size={22}/>,hint:'Paid / earned leave'};
    return{icon:<CalendarHeart size={22}/>,hint:'Configured by your contractor'};
  };

  if(!portal.leaveEnabled){
    return <ModuleShell title="Leave" description="Leave is available once you are bound to a contractor and site." icon={CalendarPlus}>
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <CalendarPlus size={30} className="mx-auto text-[#073B67]"/>
        <h2 className="text-base font-semibold text-gray-900 mt-3">Leave unlocks after binding</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">You are not bound to a contractor and site yet. Once a contractor binds you (and you accept the binding request), your site&apos;s leave calendar and entitlements become available here.</p>
        <a href="/worker/binding" className="mt-5 inline-flex h-10 items-center gap-2 px-4 rounded-lg bg-[#073B67] text-white text-sm font-semibold hover:bg-[#062D4F]">View binding requests</a>
      </div>
    </ModuleShell>;
  }

  // No leave types = the contractor has not configured the site's leave calendar
  // yet. Show exactly what the contractor set up (never a default list).
  if(!portal.leaveTypes.length){
    return <ModuleShell title="Leave" description="Your site's leave calendar is set up by your contractor." icon={CalendarPlus}>
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <CalendarHeart size={30} className="mx-auto text-[#F47A32]"/>
        <h2 className="text-base font-semibold text-gray-900 mt-3">Leave calendar not set up yet</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">Your contractor hasn&apos;t set up the leave calendar for your site yet. Your leave types and balances will appear here once they configure them in <strong>Site Calendar &amp; Leave Setup</strong>.</p>
      </div>
    </ModuleShell>;
  }

  return <ModuleShell title="Leave" description="Apply for leave in three simple steps — choose, pick dates, submit." icon={CalendarPlus}>
    {message&&<p role="status" className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-lg flex items-center gap-2"><CheckCircle2 size={16}/>{message}</p>}
    {error&&<p role="alert" className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg">{error}</p>}

    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-5">
        <h2 className="font-semibold text-gray-900">Apply for leave</h2>

        {/* Step 0 — leave balance per category (Opening + Accrued − Availed = Balance) */}
        <div className="rounded-2xl border border-[#073B67]/25 bg-[#073B67]/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#073B67]">Leave balance (per category) · {FY_LABEL}</p>
              <p className="text-[11px] text-gray-500 mt-1">Opening leave + Accrued leave − Applied leave = Balance leave · {FY_AS_ON_LABEL}</p>
            </div>
            {type && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#073B67] bg-white border border-[#073B67]/20 rounded-full px-2.5 py-1"><strong className="mx-0.5 text-[#073B67]">{leaveLedger(type).balance}</strong> {type} days balance left</span>}
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            {portal.leaveTypes.map(v=>{
              const ledger=leaveLedger(v);
              return <button key={v} type="button" onClick={()=>pickType(v)} className={`rounded-xl border p-3 text-left transition ${type===v?'border-[#073B67] bg-[#073B67] text-white ring-1 ring-[#073B67]':'border-gray-200 bg-white hover:border-[#073B67]/40'}`}>
                <span className="flex items-center justify-between gap-2 mb-2"><strong className={`text-sm ${type===v?'text-white':'text-gray-900'}`}>{v}</strong>{ledger.balance<1&&<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${type===v?'bg-white/20 text-amber-200':'bg-amber-50 text-amber-700'}`}>No balance</span>}</span>
                <span className="flex flex-col gap-1 text-[11px]">
                  <span className={`flex justify-between ${type===v?'text-white/80':'text-gray-500'}`}><span>Opening leave</span><strong className={type===v?'text-white':'text-gray-700'}>{ledger.opening}</strong></span>
                  <span className={`flex justify-between ${type===v?'text-white/80':'text-gray-500'}`}><span>Add: Accrued leave</span><strong className={`${type===v?'text-emerald-200':'text-[#2F9E67]'}`}>+ {ledger.accrued}</strong></span>
                  <span className={`flex justify-between ${type===v?'text-white/80':'text-gray-500'}`}><span>Less: Applied leave{ledger.pending>0?` (${ledger.pending} pending)`:''}</span><strong className={`${type===v?'text-red-200':'text-red-500'}`}>{ledger.availed>0?`− ${ledger.availed}`:'0'}</strong></span>
                  <span className={`flex justify-between pt-1 mt-0.5 border-t ${type===v?'border-white/20':'border-gray-100'} text-xs font-bold`}><span>Balance leave</span><strong className={type===v?'text-[#F47A32]':'text-[#073B67]'}>{ledger.balance}</strong></span>
                </span>
              </button>;
            })}
            {rh && rh.maxAvail > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-left">
                <span className="flex items-center justify-between gap-2 mb-1"><strong className="text-sm text-gray-900">Restricted Holiday (RH)</strong><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{rh.used} of {rh.maxAvail} availed</span></span>
                <p className="text-[11px] text-amber-800 mb-2">You may avail <strong>{rh.maxAvail}</strong> of the <strong>{rh.allotment}</strong> restricted holiday{rh.allotment===1?'':'s'} offered this year.</p>
                <span className="flex flex-col gap-1 text-[11px]">
                  <span className="flex justify-between text-gray-500"><span>Offered this year</span><strong className="text-gray-700">{rh.allotment}</strong></span>
                  <span className="flex justify-between text-gray-500"><span>Max you can avail</span><strong className="text-gray-700">{rh.maxAvail}</strong></span>
                  <span className="flex justify-between text-gray-500"><span>Less: Availed</span><strong className="text-red-500">{rh.used>0?`− ${rh.used}`:'0'}</strong></span>
                  <span className="flex justify-between pt-1 mt-0.5 border-t border-amber-200 text-xs font-bold"><span>Balance</span><strong className="text-[#073B67]">{Math.max(0, rh.maxAvail - rh.used)}</strong></span>
                </span>
                <a href="/worker/Holidays" className="mt-2 block text-[11px] font-semibold text-blue-700 hover:underline">Manage restricted holidays →</a>
              </div>
            )}
          </div>
        </div>

        {/* Step 1 — type */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">1 · What kind of leave?</p>
          <div className="grid sm:grid-cols-3 gap-2">
            {portal.leaveTypes.map(v=>(
              <button key={v} type="button" onClick={()=>pickType(v)} className={`rounded-xl border p-4 text-left transition ${type===v?'border-[#073B67] bg-[#073B67]/5 ring-1 ring-[#073B67]':'border-gray-200 hover:border-gray-300'}`}>
                <span className={`w-10 h-10 rounded-lg grid place-items-center mb-2 ${type===v?'bg-[#073B67] text-white':'bg-gray-100 text-gray-500'}`}>{leaveTypeMeta(v).icon}</span>
                <strong className="block text-sm">{v}</strong>
                <small className="block text-[11px] text-gray-500 mt-0.5">{leaveTypeMeta(v).hint}</small>
              </button>
            ))}
            {rh && rh.maxAvail>0 && (
              <button key="rh" type="button" onClick={()=>pickType(RH_TYPE)} className={`rounded-xl border p-4 text-left transition ${isRh?'border-[#073B67] bg-[#073B67]/5 ring-1 ring-[#073B67]':'border-amber-200 bg-amber-50/40 hover:border-amber-300'}`}>
                <span className={`w-10 h-10 rounded-lg grid place-items-center mb-2 ${isRh?'bg-[#073B67] text-white':'bg-amber-100 text-amber-700'}`}><CalendarHeart size={22}/></span>
                <strong className="block text-sm">Restricted Holiday</strong>
                <small className="block text-[11px] text-gray-500 mt-0.5">Choose from your site&apos;s optional holidays · {rhBalance} of {rh.maxAvail} left</small>
              </button>
            )}
          </div>
        </div>

        {/* Step 2 — dates (or restricted-holiday picker) */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isRh?'2 · Which restricted holiday?':'2 · Which dates?'}</p>
          {isRh?<div className="space-y-2">
            <p className="text-[11px] text-gray-500">Pick one of your site&apos;s restricted holidays. You can avail up to {rh?.maxAvail ?? 0} this year ({rhBalance} left).</p>
            <select value={rhDate} onChange={e=>{setRhDate(e.target.value);const picked=rhOptions.find(x=>x.date===e.target.value);if(picked&&!reason)setReason(picked.name);}} className="w-full h-12 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:border-[#0066CC]">
              <option value="">Select a restricted holiday</option>
              {rhOptions.map(h=><option key={h.date} value={h.date}>{h.name} — {new Date(`${h.date}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</option>)}
            </select>
            {rhOptions.length===0&&<p className="text-xs text-[#F47A32] font-semibold">No restricted holidays available to request (all used, or none published by your contractor yet).</p>}
          </div>:<>
          <div className="flex flex-wrap gap-2 mb-3">
            <button type="button" onClick={()=>{const t=new Date();const f=t.toISOString().slice(0,10);pickDays(f,f)}} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold hover:border-[#073B67]/40">Today (1 day)</button>
            <button type="button" onClick={()=>{const t=new Date();t.setDate(t.getDate()+1);const f=t.toISOString().slice(0,10);pickDays(f,f)}} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold hover:border-[#073B67]/40">Tomorrow (1 day)</button>
            <button type="button" onClick={()=>{const t=new Date();const f=t.toISOString().slice(0,10);t.setDate(t.getDate()+2);pickDays(f,t.toISOString().slice(0,10))}} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold hover:border-[#073B67]/40">2 days from today</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-gray-600">From (first day of leave)<input required name="from" type="date" value={from} onChange={e=>pickDays(e.target.value,to)} className="mt-1 w-full h-12 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:border-[#0066CC]"/></label>
            <label className="text-xs text-gray-600">To (last day of leave)<input required name="to" type="date" value={to} onChange={e=>pickDays(from,e.target.value)} min={from||undefined} className="mt-1 w-full h-12 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:border-[#0066CC]"/></label>
          </div>
          {days>0&&<p className="text-xs mt-2 text-[#2F9E67] font-semibold">✓ {days} day{days>1?'s':''} of leave selected</p>}
          </>}
        </div>

        {/* Step 3 — reason */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">3 · Why do you need leave? (tap one, or write below)</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {quickReasons.map(r=>(
              <button key={r.label} type="button" onClick={()=>setReason(r.label)} className={`h-9 px-3 rounded-full border text-xs font-semibold transition ${reason===r.label?'border-[#073B67] bg-[#073B67]/5 text-[#073B67]':'border-gray-200 text-gray-600 hover:border-gray-300'}`}>{r.emoji} {r.label}</button>
            ))}
          </div>
          <textarea name="reason" value={reason} onChange={e=>setReason(e.target.value)} rows={2} placeholder="Write your reason in simple words (optional)" className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:border-[#0066CC]"/>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <label className="text-xs flex gap-2 items-center text-gray-600"><Paperclip size={14}/>Add a photo or paper (optional)<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-xs"/></label>
          <button disabled={busy} className="h-11 px-5 bg-[#073B67] text-white rounded-xl font-bold flex gap-2 items-center hover:bg-[#062D4F] disabled:opacity-60"><Send size={15}/>{busy?'Submitting…':'Submit leave request'}</button>
        </div>
      </form>

      <div className="space-y-5">
        {/* Upcoming holidays (clumped with leave) */}
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between"><h2 className="font-semibold text-sm">Upcoming holidays</h2><CalendarHeart size={16} className="text-[#F47A32]"/></div>
          {portal.holidays.length?portal.holidays.map(h=><div key={h.date} className="px-4 py-3 border-b border-gray-50 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 grid place-items-center font-bold text-[11px] leading-none">{new Date(`${h.date}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span><div className="flex-1"><strong className="block text-xs text-gray-900">{h.name}</strong><small className="text-[11px] text-gray-400">{h.type} · {h.appliesTo}</small></div></div>):<p className="p-6 text-center text-xs text-gray-400">No upcoming holidays.</p>}
          <a href="/worker/Holidays" className="block px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50/50">Open full holiday calendar →</a>
        </section>

        {/* Balance hint */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900"><strong className="block text-sm mb-1">Tip</strong>Apply at least one day before your leave. Your supervisor approves it, and you will see the answer below in <strong>Leave history</strong>.</div>
      </div>
    </div>

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <h2 className="p-4 border-b border-gray-100 font-semibold">Leave history</h2>
      {records.length?records.map(row=>(
        <article key={row.id} id={row.id} className="p-4 border-b border-gray-50 flex flex-wrap justify-between gap-3">
          <div><strong className="text-sm">{row.type}</strong><p className="text-xs text-gray-500 mt-1">{row.from} – {row.to} · submitted {row.submitted}</p><p className="text-xs text-gray-500 mt-1">{row.reason}</p>{(row.approver||row.comment)&&<p className="text-[11px] text-gray-400 mt-1">{row.approver} · {row.comment}</p>}</div>
          <span className={`h-fit text-[10px] font-bold px-2 py-1 rounded-full ${row.status==='Approved'?'bg-green-50 text-green-700':row.status==='Rejected'?'bg-red-50 text-red-600':'bg-orange-50 text-orange-600'}`}>{row.status}</span>
        </article>
      )):<p className="p-8 text-center text-gray-500">No leave history.</p>}
    </section>
  </ModuleShell>;
}
