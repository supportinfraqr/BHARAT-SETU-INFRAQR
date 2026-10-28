'use client';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, FileText, ShieldCheck, Stethoscope } from 'lucide-react';
import { useAdoptionStatus } from '@/components/employer/useAdoptionStatus';

export default function SetupAdoptionsPage() {
  const { status, loading, error } = useAdoptionStatus();
  const complete = Boolean(status?.complete);
  return <div className="mx-auto max-w-4xl space-y-6 pb-12">
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-bss-text-muted">Employer setup</p>
      <h1 className="mt-1 text-2xl font-extrabold text-bss-text-primary">Complete your site adoptions</h1>
      <p className="mt-1 max-w-2xl text-sm text-bss-text-muted">Your first site is registered. Complete these adoptions before using the rest of the employer portal. Cost Sheet Adoption is optional.</p>
    </header>
    {error && <p className="bss-alert bss-alert-error">{error}</p>}
    {loading && !status ? <p className="text-sm text-bss-text-muted">Loading adoption status…</p> : status ? <>
      <div className="rounded-2xl border border-bss-border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-full ${complete ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-soft-orange text-bss-orange'}`}>{complete ? <CheckCircle2 size={20}/> : <Clock3 size={20}/>}</span>
            <div><p className="text-sm font-bold text-bss-text-primary">{complete ? 'Setup complete' : 'Setup pending'}</p><p className="text-[11px] text-bss-text-muted">{complete ? 'You can continue to your dashboard.' : 'These are required for appointment letters, medical exams and compliance registers.'}</p></div>
          </div>
          {complete && <Link href="/employer/dashboard" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-bss-navy px-4 text-sm font-bold text-white">Continue <ArrowRight size={15}/></Link>}
        </div>
      </div>
      <div className="grid gap-4">
        <Step icon={<FileText size={18}/>} title="Appointment Letter Adoption" done={status.appointmentLetter.adopted} href="/employer/letter-adoption" detail={status.appointmentLetter.templateName ? `Adopted: ${status.appointmentLetter.templateName}` : 'Employer-wide template required before workers are bound.'} />
        <Step icon={<Stethoscope size={18}/>} title="Medical Form Adoption" done={status.medical.complete} href="/employer/medical-form-adoption" detail={status.medical.states.length ? status.medical.states.map(s => `${s.state}: ${s.adopted ? 'adopted' : s.mineRequired ? 'Form-VIII + Form-IX pending' : 'pending'}`).join(' · ') : 'No state form required.'} />
        <Step icon={<ShieldCheck size={18}/>} title="CLRA Registers Adoption" done={status.registers.complete} href="/employer/clra-registers" detail={status.registers.states.length ? status.registers.states.map(s => `${s.state}: ${s.adopted ? `${s.adoptedCount}/${s.total} ready` : 'pending'}`).join(' · ') : 'No register required.'} />
        <div className="rounded-2xl border border-dashed border-bss-border bg-bss-bg/50 p-4"><p className="text-sm font-bold text-bss-text-primary">Cost Sheet Adoption <span className="ml-2 text-[10px] font-bold uppercase text-bss-text-muted">Optional</span></p><p className="mt-1 text-[11px] text-bss-text-muted">Cost sheets are site-specific and can be completed later when wage terms are finalised.</p></div>
      </div>
    </> : null}
  </div>;
}

function Step({ icon, title, done, href, detail }: { icon:React.ReactNode; title:string; done:boolean; href:string; detail:string }) {
  return <section className="flex flex-col gap-4 rounded-2xl border border-bss-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${done ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-blue-tint text-bss-interactive-blue'}`}>{done ? <CheckCircle2 size={19}/> : icon}</span>
      <div><p className="text-sm font-bold text-bss-text-primary">{title}</p><p className="mt-0.5 text-[11px] text-bss-text-muted">{detail}</p></div>
    </div>
    <Link href={href} className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-bold ${done ? 'border border-bss-border bg-white text-bss-text-primary' : 'bg-bss-navy text-white'}`}>{done ? 'Review' : 'Complete'} <ArrowRight size={14}/></Link>
  </section>;
}
