"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, ArrowRight, FileText, ShieldCheck, Stethoscope } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { useAdoptionStatus } from '@/components/employer/useAdoptionStatus';

const ADOPTION_PATHS = new Set([
  '/employer/letter-adoption',
  '/employer/medical-form-adoption',
  '/employer/clra-registers',
  '/employer/setup-adoptions',
  '/employer/contact',
  '/employer/profile',
]);

export default function AdoptionBlockerGate() {
  const pathname = usePathname();
  const { employer } = useEmployer();
  const isStaff = Boolean(employer.isStaff);
  const siteSignature = employer.sites.map(s => `${s.id}:${s.state ?? ''}:${s.status ?? ''}`).join('|');
  const { status } = useAdoptionStatus(!isStaff && employer.sites.length > 0, `${pathname}|${siteSignature}`);

  if (isStaff || !status?.required || status.complete || ADOPTION_PATHS.has(pathname)) return null;

  const missingAppointment = !status.appointmentLetter.adopted;
  const missingMedical = status.medical.states.filter(s => s.required && !s.adopted);
  const missingRegisters = status.registers.states.filter(s => s.required && !s.adopted);
  if (!missingAppointment && !missingMedical.length && !missingRegisters.length) return null;

  return <div className="fixed inset-0 z-[97] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Required employer adoptions">
    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="border-b border-gray-100 px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900"><AlertTriangle size={18} className="text-[#E45D24]"/>Complete required adoptions</h2>
        <p className="mt-1 text-xs text-gray-500">Your site needs the required adoptions before you can continue using the employer portal. Cost Sheet Adoption is optional.</p>
      </header>
      <div className="space-y-2.5 p-5">
        {missingAppointment && <AdoptionRow icon={<FileText size={16}/>} title="Appointment Letter Adoption" detail="Employer-wide appointment letter template" href="/employer/letter-adoption"/>}
        {missingMedical.map(row => <AdoptionRow key={`m-${row.state}`} icon={<Stethoscope size={16}/>} title={`Medical forms — ${row.state}`} detail="Form-VIII must be adopted for this state" href="/employer/medical-form-adoption"/>)}
        {missingRegisters.map(row => <AdoptionRow key={`r-${row.state}`} icon={<ShieldCheck size={16}/>} title={`CLRA registers — ${row.state}`} detail="Register adoption must be saved for this state" href="/employer/clra-registers"/>)}
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-5 py-3">
        <p className="text-[11px] text-gray-500">This popup closes automatically once the required adoptions are saved.</p>
        <Link href="/employer/setup-adoptions" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#E45D24] px-3 text-xs font-bold text-white">Setup checklist <ArrowRight size={13}/></Link>
      </footer>
    </div>
  </div>;
}

function AdoptionRow({ icon, title, detail, href }: { icon:React.ReactNode; title:string; detail:string; href:string }) {
  return <Link href={href} className="flex items-center gap-3 rounded-xl border border-[#DBE3EF] bg-[#F8FAFD] px-3 py-3 transition-colors hover:border-[#1E3A8A]/40 hover:bg-[#F2F6FC]">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#1E3A8A] border border-[#DBE3EF]">{icon}</span>
    <span className="min-w-0 flex-1"><strong className="block text-xs font-bold text-[#01183A]">{title}</strong><span className="mt-0.5 block text-[10px] text-gray-500">{detail}</span></span>
    <ArrowRight size={14} className="shrink-0 text-gray-400"/>
  </Link>;
}
