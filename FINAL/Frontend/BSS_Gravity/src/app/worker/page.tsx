"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, BadgeCheck, Bell, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock3, FileText, Fingerprint, GraduationCap, Handshake, IdCard, IndianRupee, Landmark, MapPin, Megaphone, MessageSquareText, QrCode, Settings, ShieldCheck, UserRound, X, XCircle } from 'lucide-react';
import { useWorker } from '@/contexts/WorkerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { CopyButton } from '@/components/ui/CopyButton';
import { workerCompletion } from '@/lib/workerProfileCompletion';

export default function WorkerOverview() {
  const { worker, portal, saveWorker } = useWorker(); const { t } = useLanguage();
  const { actionCount } = useNotifications();
  // "Available for work" — sourced from the backend portal payload (WorkerOther.available_for_work).
  const availableForWork = portal.availability === true;
  const attendancePresent = portal.attendance.records.filter(record=>record.presence==='Present').length;
  const lastWage = portal.wages.records[0];
  const pfTotal = portal.providentFund.records.reduce((total,record)=>total+record.employeeContribution+record.employerContribution,0);
  const nextHoliday = portal.holidays[0];
  const announcement = portal.announcements.find(item=>item.priority==='Important')??portal.announcements[0];
  const missingDocuments = portal.documents.filter(item=>item.mandatory&&['Missing','Rejected','Expired'].includes(item.status));
  const pendingBinding = portal.jobRequests.find(item=>item.status==='Pending');
  const profileCompletion = workerCompletion(worker).percent;
  const inr = (amount:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(amount);
  const emp = worker.employment;
  const siteInfo = emp.siteDetails ?? { name: '', code: '', location: '', medicalOfficer: '', officerContact: '' };
  const contractorInfo = emp.contractorDetails ?? { name: '', code: '', contact: '', email: '', lin: '' };
  const employerInfo = emp.employerDetails ?? { name: '', code: '', industry: '', email: '', lin: '' };
  const verificationItems = [
    { label:'Aadhaar', value:worker.identity.aadhaar, tone:(worker.identity.aadhaarVerified?'done':'pending') as 'done'|'pending' },
    { label:'PAN', value:worker.identity.pan, tone:(worker.identity.panVerified?'done':'pending') as 'done'|'pending' },
    { label:'UAN', value:worker.socialSecurity.epfoUan, tone:(worker.socialSecurity.epfoUan?'done':'pending') as 'done'|'pending' },
    { label:'ESIC', value:worker.socialSecurity.esicIp, tone:(worker.socialSecurity.esicIp?'done':'pending') as 'done'|'pending' },
    { label:'Bank Verification', value:worker.banking.verificationStatus, tone:(worker.banking.verificationStatus==='Verified'?'done':'pending') as 'done'|'pending' },
  ];
  const complianceOverview = [
    {
      label: 'Appointment Letter Status',
      status: (portal.documents.some(d => d.name === 'Appointment Letter' && ['Verified', 'UPLOADED', 'Uploaded', 'Active'].includes(d.status)) || worker.employment.status === 'Active') ? 'Issued' : 'Pending',
      tone: (portal.documents.some(d => d.name === 'Appointment Letter' && ['Verified', 'UPLOADED', 'Uploaded', 'Active'].includes(d.status)) || worker.employment.status === 'Active') ? ('done' as const) : ('warn' as const)
    },
    {
      label: 'Gate Pass Status',
      status: worker.compliance.permanentGatePass || 'No Gate Pass',
      tone: (worker.compliance.permanentGatePass === 'Active' || worker.compliance.permanentGatePass === 'Issued') ? ('done' as const) : ('warn' as const)
    },
    {
      label: 'Medical Status',
      status: worker.compliance.medicalFitnessStatus || 'Not reported',
      tone: worker.compliance.medicalFitnessStatus === 'Fit' ? ('done' as const) : ('warn' as const)
    },
    {
      label: 'Safety Kit Status',
      status: (worker.compliance.ppeIssued && worker.compliance.ppeIssued.length > 0) ? 'Issued' : 'Pending',
      tone: (worker.compliance.ppeIssued && worker.compliance.ppeIssued.length > 0) ? ('done' as const) : ('warn' as const)
    },
    {
      label: 'Safety Training Status',
      status: worker.compliance.medicalExaminationStatus || 'Pending',
      tone: (worker.compliance.medicalExaminationStatus === 'Done' || worker.compliance.medicalExaminationStatus === 'Completed') ? ('done' as const) : ('warn' as const)
    },
  ];
  const quickActions = [
    {label:t('dash.view_card'),detail:'Print-ready worker credential',href:'/worker/idcard',icon:IdCard},
    {label:t('nav.identity'),detail:'Personal, bank and social profile',href:'/worker/Profile',icon:UserRound},
    {label:'Rozgar requests',detail:'Review employment invitations',href:'/worker/rozgar',icon:BriefcaseBusiness},
    {label:'Attendance',detail:'View calendar and attendance history',href:'/worker/Attendance',icon:CalendarDays},
    {label:'Leave',detail:'Apply and track leave requests',href:'/worker/Leave',icon:CalendarDays},
    {label:'Holiday calendar',detail:nextHoliday?`${nextHoliday.date} · ${nextHoliday.name}`:'No upcoming holiday',href:'/worker/Holidays',icon:CalendarDays},
    {label:'Wage History',detail:lastWage?`${inr(lastWage.net)} · ${lastWage.status}`:'No payroll record',href:'/worker/Earnings',icon:IndianRupee},
    {label:'Retirement benefits',detail:`${inr(pfTotal)} recorded PF`,href:'/worker/Benefits',icon:Landmark},
    {label:t('nav.documents'),detail:'Upload and verify records',href:'/worker/Documents',icon:FileText},
    {label:t('nav.compliance'),detail:'Medical, safety and gate passes',href:'/worker/Compliance',icon:ShieldCheck},
    {label:t('nav.skills'),detail:'Skills, courses and certificates',href:'/worker/Skills',icon:GraduationCap},
    {label:'Announcements',detail:announcement?.title??'No announcements',href:'/worker/Announcements',icon:Megaphone},
    {label:'Notifications',detail:`${actionCount} pending actions and alerts`,href:'/worker/notifications',icon:Bell},
    {label:'Grievances',detail:'Raise or track a worker concern',href:'/worker/grievances',icon:MessageSquareText},
    {label:'Binding Requests',detail:'Approve or decline contractor binding',href:'/worker/binding',icon:Handshake},
    {label:t('nav.settings'),detail:'Language, privacy and security',href:'/worker/Settings',icon:Settings},
  ];
  if (!worker.identity.placeOfBirth?.trim()) {
    return <PlaceOfBirthGate name={worker.identity.name} onSave={async (value) => { await saveWorker({ identity: { ...worker.identity, placeOfBirth: value } }); }} />;
  }
  return <div className="space-y-5 pb-12">
    {availableForWork && <section className="bg-[#073B67] border border-[#073B67] text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3"><span className="w-10 h-10 rounded-xl bg-[#F47A32] grid place-items-center flex-shrink-0"><BadgeCheck size={20}/></span><div className="flex-1"><p className="text-sm font-bold">Available for work — ON</p><p className="text-xs text-white/80 mt-0.5">Employers can see that you are available and shortlist you for matching jobs. Turn it off anytime in Rozgar Setu.</p></div><Link href="/worker/rozgar" className="h-9 px-3 rounded-lg bg-white/10 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-white/20 flex-shrink-0">Manage availability<ArrowRight size={13}/></Link></section>}
    {!worker.identity.aadhaarVerified && <section className="bg-[#FFF8F0] border border-[#F47A32]/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3"><span className="w-10 h-10 rounded-xl bg-[#F47A32] grid place-items-center flex-shrink-0 text-white"><Fingerprint size={20}/></span><div className="flex-1"><p className="text-sm font-bold text-[#9A3412]">Link your Aadhaar</p><p className="text-xs text-[#9A3412]/80 mt-0.5">Enter your Aadhaar to verify via OTP and auto-fill your name, date of birth, address and photo.</p></div><Link href="/worker/Profile?tab=integrations" className="h-9 px-3 rounded-lg bg-[#F47A32] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#e06a24] flex-shrink-0">Link Aadhaar<ArrowRight size={13}/></Link></section>}

    {/* Mandatory AI CCTV Face Attendance Photo Enrolment Prompt Banner */}
    <section className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 border border-blue-700/60 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
      <div className="flex items-start sm:items-center gap-3.5">
        <span className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 grid place-items-center flex-shrink-0 text-blue-300">
          <Fingerprint size={22} />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Required for Daily Attendance</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">CCTV Ready</span>
          </div>
          <p className="text-sm font-bold text-white mt-0.5">Upload 5 Face Photos for AI Camera Attendance</p>
          <p className="text-xs text-slate-300 mt-0.5">
            Your contractor/employer uses AI video cameras on site to auto-track your attendance daily. Upload 5 front-facing photos to enable auto-marking.
          </p>
        </div>
      </div>
      <Link href="/worker/Profile?tab=personal" className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors flex-shrink-0 whitespace-nowrap shadow-sm">
        Upload 5 Photos &rarr;
      </Link>
    </section>

    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">{t('nav.overview')}</p><div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">{t('dash.welcome')}, {worker.identity.name.split(' ')[0]}</h1><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">{t('portal.worker')}</span></div><p className="text-sm text-gray-500 mt-1">A quick view of your identity, work and benefits.</p></div>
      <div className="flex gap-2"><Link href="/worker/idcard" className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 flex items-center gap-2 hover:border-gray-300"><QrCode size={16}/>{t('dash.view_card')}</Link><Link href="/worker/Profile" className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black">{t('dash.manage')}<ArrowRight size={15}/></Link></div>
    </header>

    <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      {worker.identity.photoUrl ? <img src={worker.identity.photoUrl} alt={worker.identity.name} className="w-14 h-14 rounded-xl object-cover border border-gray-200"/> : <span className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-100 grid place-items-center text-gray-400"><UserRound size={22}/></span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-gray-950">{worker.identity.name}</h2><span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${worker.identity.aadhaarVerified?'text-green-700 bg-green-50 border border-green-100':'text-orange-600 bg-orange-50 border border-orange-100'}`}><CheckCircle2 size={11}/>{worker.identity.aadhaarVerified?'VERIFIED':'NOT VERIFIED'}</span></div><div className="flex items-center gap-2 mt-1"><p className="text-xs text-gray-500 font-mono">{worker.identity.bssId}</p><CopyButton value={worker.identity.bssId}/></div></div>
      <dl className="grid grid-cols-2 sm:flex gap-x-8 gap-y-3 text-xs"><div><dt className="text-gray-400">Category</dt><dd className="font-semibold text-gray-800 mt-0.5">{worker.identity.category}</dd></div><div><dt className="text-gray-400">Primary skill</dt><dd className="font-semibold text-gray-800 mt-0.5">{worker.skills?.primary?.name}</dd></div><div><dt className="text-gray-400">Status</dt><dd className="font-semibold text-green-700 mt-0.5">{worker.employment.status}</dd></div></dl>
    </section>

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      <Status label="Profile" value={worker.contact.email&&worker.address.currentPin?'Complete':'Action due'} note="Core details" tone="blue" icon={UserRound}/><Status label="Documents" value={`${worker.documents.uploaded}/${worker.documents.required}`} note="Uploaded" tone="orange" icon={FileText}/><Status label="Compliance" value={String(worker.compliance.medicalFitnessDaysLeft)} note="Medical days left" tone="red" icon={ShieldCheck}/><Status label="Attendance" value={`${attendancePresent}/${portal.attendance.records.length}`} note="Current records" tone="green" icon={CalendarDays}/>
    </section>

    {pendingBinding && <section className="bg-orange-50 border border-orange-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"><span className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0"><BriefcaseBusiness size={20}/></span><div className="flex-1 min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-orange-600">Binding Request Pending</p><h2 className="text-sm font-semibold text-gray-900 mt-0.5">Employment invitation from {pendingBinding.employer} · {pendingBinding.site}</h2><p className="text-xs text-gray-500 mt-0.5">Accept or reject this binding request before {pendingBinding.duration ?? 'the stated deadline'}.</p></div><Link href="/worker/binding" className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black flex-shrink-0">Review request<ArrowRight size={15}/></Link></section>}

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden"><div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-gray-950">Work compliance overview</h2><p className="text-xs text-gray-400 mt-0.5">Employment, site and welfare compliance status</p></div><Link href="/worker/Compliance" className="text-xs font-semibold text-blue-700">View all</Link></div><div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-gray-100">{complianceOverview.map((item,index)=><div key={item.label} className={`px-4 py-4 text-center ${index===complianceOverview.length-1?'col-span-2 sm:col-span-1':''}`}><span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.tone==='done'?'bg-green-50 text-green-700':'bg-orange-50 text-orange-600'}`}>{item.tone==='done'?<CheckCircle2 size={11}/>:<Clock3 size={11}/>}{item.status}</span><p className="text-[11px] font-medium text-gray-500 mt-2">{item.label}</p></div>)}</div></section>

    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5 items-start">
      <div className="space-y-5">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden"><div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-gray-950">Needs your attention</h2><p className="text-xs text-gray-400 mt-0.5">Priority actions affecting work or benefits</p></div><Link href="/worker/notifications" aria-label={`${actionCount} pending actions`} className="min-w-6 h-6 px-1.5 rounded-full bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center">{actionCount}</Link></div><div className="divide-y divide-gray-100">
          {missingDocuments.length>0&&<Attention href="/worker/Documents" icon={FileText} title={`${missingDocuments.length} mandatory document actions`} text={missingDocuments.map(item=>item.name).join(', ')} tone="red"/>}
          <Attention href="/worker/Compliance" icon={Clock3} title={`Medical fitness: ${worker.compliance.medicalFitnessDaysLeft} days remaining`} text="Review examination and renewal details." tone="orange"/>
          {portal.jobRequests.some(item=>item.status==='Pending')&&<Attention href="/worker/binding" icon={BriefcaseBusiness} title="Employment request pending" text={portal.jobRequests.find(item=>item.status==='Pending')?.site??''} tone="blue"/>}
        </div></section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-950">Labour law compliance</h2><Link href="/worker/LabourCompliance" className="text-xs font-semibold text-blue-700">View all</Link></div><div className="grid grid-cols-3 gap-2 mt-4">{['fulfilled','pending','attention'].map(status => { const n = portal.labourLaw.filter(item => item.status === status).length; return <div key={status} className="text-center"><strong className={`block text-lg ${status === 'fulfilled' ? 'text-green-700' : status === 'pending' ? 'text-orange-700' : 'text-red-700'}`}>{n}</strong><span className="text-[10px] uppercase tracking-wide text-gray-400">{status}</span></div>; })}</div>      <div className="mt-4 pt-4 border-t border-gray-100">{portal.labourLaw.find(item => item.status === 'attention') ? <Attention href="/worker/LabourCompliance" icon={ShieldCheck} title={portal.labourLaw.find(item => item.status === 'attention')!.headline} text="A labour-law action item needs your attention." tone='red'/> : portal.labourLaw.find(item => item.status === 'pending') ? <Attention href="/worker/LabourCompliance" icon={ShieldCheck} title={portal.labourLaw.find(item => item.status === 'pending')!.headline} text="A labour-law item is being processed." tone='orange'/> : <p className="text-xs text-green-700">All central labour-law conditions are fulfilled.</p>}</div></section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-950">Profile Completion</h2><Link href="/worker/Profile" className="text-xs font-semibold text-blue-700">Complete</Link></div><div className="mt-4 flex items-end justify-between"><strong className="text-2xl font-bold text-gray-900">{profileCompletion}%</strong><span className="text-[11px] text-gray-400 mb-1">{profileCompletion===100?'All set — great job!':'Complete your record to unlock full verification'}</span></div><div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#2F9E67] rounded-full" style={{width:profileCompletion+'%'}}/></div></section>
      </div>

      <aside className="space-y-5">
        <section className="bg-white border border-gray-200 rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-950">Current Employment Details</h2><span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">{worker.employment.status.toUpperCase()}</span></div><div className="mt-5"><p className="text-base font-semibold text-gray-900">{worker.employment.designation}</p><p className="text-sm text-gray-500 mt-1">{worker.employment.employer}</p><p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5"><MapPin size={13}/>{worker.employment.site} · {siteInfo.code}</p></div><dl className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs"><div><dt className="text-gray-400">Contractor</dt><dd className="font-semibold text-gray-700 mt-1">{worker.employment.contractor}</dd></div><div><dt className="text-gray-400">Shift</dt><dd className="font-semibold text-gray-700 mt-1">{worker.employment.shift}</dd></div><div><dt className="text-gray-400">Department</dt><dd className="font-semibold text-gray-700 mt-1">{worker.employment.department}</dd></div><div><dt className="text-gray-400">Joined</dt><dd className="font-semibold text-gray-700 mt-1">{formatDate(worker.employment.doj)}</dd></div></dl>
          {worker.employment.status === 'Active' && <Link href="/worker/binding" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700"><XCircle size={13}/>Request Unbind</Link>}
          <details className="group mt-4 pt-4 border-t border-gray-100"><summary className="list-none flex items-center justify-between cursor-pointer text-xs font-semibold text-blue-700 select-none"><span>Contractor, principal employer & site details</span><ChevronDown size={14} className="transition-transform group-open:rotate-180"/></summary><div className="mt-4 space-y-4">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><Building2 size={11}/>Contractor Details</p><dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs"><div><dt className="text-gray-400">Name</dt><dd className="font-semibold text-gray-800 mt-0.5">{contractorInfo.name}</dd></div><div><dt className="text-gray-400">Code</dt><dd className="font-semibold text-gray-800 mt-0.5 font-mono">{contractorInfo.code}</dd></div><div><dt className="text-gray-400">Contact</dt><dd className="font-semibold text-gray-800 mt-0.5">{contractorInfo.contact}</dd></div><div><dt className="text-gray-400">Email</dt><dd className="font-semibold text-gray-800 mt-0.5 break-all">{contractorInfo.email}</dd></div><div><dt className="text-gray-400">LIN No.</dt><dd className="font-semibold text-gray-800 mt-0.5 font-mono">{contractorInfo.lin}</dd></div></dl></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><Landmark size={11}/>Principal Employer Details</p><dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs"><div><dt className="text-gray-400">Name</dt><dd className="font-semibold text-gray-800 mt-0.5">{employerInfo.name}</dd></div><div><dt className="text-gray-400">Code</dt><dd className="font-semibold text-gray-800 mt-0.5 font-mono">{employerInfo.code}</dd></div><div><dt className="text-gray-400">Industry</dt><dd className="font-semibold text-gray-800 mt-0.5">{employerInfo.industry}</dd></div><div><dt className="text-gray-400">Email</dt><dd className="font-semibold text-gray-800 mt-0.5 break-all">{employerInfo.email}</dd></div><div><dt className="text-gray-400">LIN No.</dt><dd className="font-semibold text-gray-800 mt-0.5 font-mono">{employerInfo.lin}</dd></div></dl></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><MapPin size={11}/>Site Details</p><dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs"><div><dt className="text-gray-400">Site name</dt><dd className="font-semibold text-gray-800 mt-0.5">{siteInfo.name}</dd></div><div><dt className="text-gray-400">Site code</dt><dd className="font-semibold text-gray-800 mt-0.5 font-mono">{siteInfo.code}</dd></div><div><dt className="text-gray-400">Location</dt><dd className="font-semibold text-gray-800 mt-0.5">{siteInfo.location}</dd></div><div><dt className="text-gray-400">Medical officer</dt><dd className="font-semibold text-gray-800 mt-0.5">{siteInfo.medicalOfficer}</dd></div><div><dt className="text-gray-400">Officer contact</dt><dd className="font-semibold text-gray-800 mt-0.5">{siteInfo.officerContact}</dd></div></dl></div>
          </div></details></section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-950">Identity Verification</h2><Link href="/worker/Profile" className="text-xs font-semibold text-blue-700">Manage</Link></div><p className="text-xs text-gray-400 mt-1">Government IDs linked to your BSS profile</p><ul className="mt-4 space-y-3">{verificationItems.map(item=><li key={item.label} className="flex items-center gap-3"><span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.tone==='done'?'bg-green-50 text-green-700':'bg-orange-50 text-orange-500'}`}>{item.tone==='done'?<BadgeCheck size={15}/>:<Clock3 size={14}/>}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-gray-800">{item.label}</span><span className="block text-[10px] font-mono text-gray-400 truncate mt-0.5">{item.value}</span></span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${item.tone==='done'?'bg-green-50 text-green-700':'bg-orange-50 text-orange-600'}`}>{item.tone==='done'?'Verified':'Pending'}</span></li>)}</ul></section>
      </aside>
    </div>

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden"><div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Quick access</h2><p className="text-xs text-gray-400 mt-0.5">Common worker services and records</p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100">{quickActions.map(action=><Link key={action.href} href={action.href} className="bg-white min-h-20 p-4 flex items-center gap-3 hover:bg-gray-50 transition group"><span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 group-hover:text-[#073B67] flex-shrink-0"><action.icon size={17}/></span><span className="min-w-0 flex-1"><strong className="block text-sm font-semibold text-gray-850">{action.label}</strong><small className="block text-[11px] text-gray-400 line-clamp-2 mt-0.5">{action.detail}</small></span><ChevronRight size={15} className="text-gray-300 flex-shrink-0"/></Link>)}</div></section>

    {/* Floating QR Scan — binding with contractor (item 13) */}
    <Link href="/worker/scan" className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 h-12 pl-4 pr-5 rounded-full bg-[#073B67] text-white shadow-xl shadow-[#073B67]/30 hover:bg-[#062D4F] transition group" aria-label="Scan contractor QR to bind"><span className="w-7 h-7 rounded-full bg-white/15 grid place-items-center"><QrCode size={16}/></span><span className="text-sm font-bold">Scan & Bind</span></Link>
  </div>;
}

function formatDate(value?: string) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function Status({label,value,note,tone,icon:Icon}:{label:string;value:string;note:string;tone:'blue'|'orange'|'red'|'green';icon:typeof UserRound}) { const colors={blue:'bg-blue-50 text-blue-700',orange:'bg-orange-50 text-orange-700',red:'bg-red-50 text-red-700',green:'bg-green-50 text-green-700'}; return <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{label}</span><span className={`bss-kpi-icon ${colors[tone]}`}><Icon size={16}/></span></div><strong>{value}</strong><p>{note}</p></article>; }
function Attention({href,icon:Icon,title,text,tone}:{href:string;icon:typeof AlertCircle;title:string;text:string;tone:'red'|'orange'|'blue'}) { const colors={red:'bg-red-50 text-red-600',orange:'bg-orange-50 text-orange-600',blue:'bg-blue-50 text-blue-700'}; return <Link href={href} className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50 group"><span className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[tone]}`}><Icon size={17}/></span><span className="flex-1 min-w-0"><strong className="block text-sm font-semibold text-gray-850">{title}</strong><small className="block text-xs text-gray-400 mt-0.5 truncate">{text}</small></span><ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500"/></Link> }


function PlaceOfBirthGate({ name, onSave }: { name: string; onSave: (value: string) => Promise<void> | void }) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!value.trim()) { setTouched(true); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(value.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save place of birth. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return <div className="min-h-[60vh] grid place-items-center p-4">
    <section className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full overflow-hidden">
      <div className="p-6 sm:p-8">
        <span className="w-12 h-12 rounded-xl bg-blue-50 text-[#073B67] grid place-items-center mb-4"><MapPin size={22}/></span>
        <h1 className="text-xl font-semibold text-gray-950">Welcome, {name.split(' ')[0]}</h1>
        <p className="text-sm text-gray-500 mt-1.5 leading-6">Before you can continue, please add your <strong>place of birth</strong> (native village/town, block/tehsil and district). Bharat Shram Setu uses this together with your Aadhaar-verified work address to map where workers come from and where they work — this powers state-level migrant statistics.</p>
        <label className="block mt-5 text-xs font-semibold text-gray-600">Place of birth (as declared by you)
          <textarea rows={2} value={value} onChange={event => { setValue(event.target.value); if (event.target.value.trim()) setTouched(false); }} placeholder="e.g. Rampur Village, Danapur, Patna, Bihar" className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"/>
        </label>
        {touched && !value.trim() && <p className="text-xs text-red-600 mt-1.5">Place of birth is required to open the dashboard.</p>}
        {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
        <button onClick={submit} disabled={saving} className="mt-5 w-full h-11 rounded-xl bg-[#0F172A] hover:bg-black text-white text-sm font-bold disabled:opacity-60">{saving ? 'Saving…' : 'Save & open dashboard'}</button>
        <p className="text-[11px] text-gray-400 mt-3">This single declaration lets policy dashboards classify workers born in your state as local, and those born elsewhere as in-migrants.</p>
      </div>
    </section>
  </div>;
}
