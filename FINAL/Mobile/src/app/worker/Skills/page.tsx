"use client";
import Link from 'next/link';
import { Award, BookOpenCheck, ChevronRight, GraduationCap, Play, Sparkles } from 'lucide-react';
import CourseCard from '@/components/skills/CourseCard';
import { useWorker } from '@/contexts/WorkerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHero from '@/components/portal/PageHero';

export default function SkillsPage() {
  const { t } = useLanguage();
  const { portal } = useWorker();
  const courses = portal.courses;
  const active = courses.find(c => c.progress > 0 && c.progress < 100);
  const completed = courses.filter(c => c.status === 'Completed').length;
  const inProgress = courses.filter(c => c.status === 'In progress').length;

  return <div className="space-y-5 pb-12">
    <PageHero eyebrow="Learning" title={t('nav.skills')} subtitle="Build verified skills and carry credentials across jobs." actions={<Link href="/worker/Skills/catalog" className="bg-white/10 border border-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-white/20 transition-colors inline-flex items-center gap-2">Browse catalog<ChevronRight size={15}/></Link>} />

    <section className="grid grid-cols-3 gap-3"><Metric icon={BookOpenCheck} label="Completed" value={String(completed)} tone="bg-bss-soft-green text-bss-green"/><Metric icon={Award} label="In progress" value={String(inProgress)} tone="bg-bss-blue-tint text-bss-interactive-blue"/><Metric icon={GraduationCap} label="Courses" value={String(courses.length)} tone="bg-bss-soft-orange text-bss-orange"/></section>

    {active ? <section className="bss-3d bss-scroll-rise bss-card rounded-2xl overflow-hidden"><div className="grid md:grid-cols-[1fr_220px]"><div className="p-5 sm:p-6"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-bss-interactive-blue"><Sparkles size={13}/>Continue learning</div><h2 className="text-lg font-semibold text-bss-text-primary mt-3">{active.title}</h2><p className="text-sm text-bss-text-muted mt-1 max-w-xl">{active.description}</p><div className="mt-5 max-w-lg"><div className="flex justify-between text-xs text-bss-text-muted mb-1.5"><span>{active.provider}</span><strong className="text-bss-text-secondary">{active.progress}%</strong></div><div className="h-1.5 bg-bss-bg rounded-full"><div className="h-full bg-[#01183A] rounded-full" style={{width:`${active.progress}%`}}/></div></div><Link href={`/worker/Skills/${active.id}`} className="mt-5 inline-flex h-9 items-center gap-2 px-4 rounded-lg bg-[#01183A] text-white text-xs font-semibold"><Play size={14}/>Resume course</Link></div>{active.image&&<img src={active.image} alt="" className="hidden md:block w-full h-full object-cover"/>}</div></section>
      : <section className="bss-3d bss-scroll-rise bss-card rounded-2xl p-6 text-center"><GraduationCap size={26} className="mx-auto text-[#01183A]"/><h2 className="text-base font-semibold text-bss-text-primary mt-3">{courses.length?'Start a course to build verified skills':'No courses published yet'}</h2><p className="text-sm text-bss-text-muted mt-1">{courses.length?'Watch the lessons, pass the quiz, and the skill is added to your profile.':'Your employer / BSS admin will publish courses here.'}</p>{courses.length>0&&<Link href="/worker/Skills/catalog" className="mt-4 inline-flex h-9 items-center gap-2 px-4 rounded-lg bg-[#01183A] text-white text-xs font-semibold"><Play size={14}/>Browse courses</Link>}</section>}

    <section><div className="flex items-end justify-between mb-3"><div><h2 className="text-sm font-semibold text-bss-text-primary">Your learning</h2><p className="text-xs text-bss-text-muted mt-0.5">Courses published by BSS and your employer</p></div></div>{courses.length?<div className="grid xl:grid-cols-2 gap-3">{courses.map(course=><CourseCard key={course.id} course={course}/>)}</div>:<p className="p-8 text-center bss-3d bss-scroll-rise bss-card rounded-2xl text-sm text-bss-text-muted">No courses available.</p>}</section>

    <section className="bg-bss-blue-tint/60 border border-bss-border rounded-xl p-4 flex gap-3"><GraduationCap size={19} className="text-[#01183A] shrink-0"/><div><h3 className="text-sm font-semibold text-bss-text-primary">Credentials remain with your BSS profile</h3><p className="text-xs text-bss-text-muted mt-1">Completed course certificates are added to your verified skills and can be shown to authorised employers without exposing private identity data.</p></div></section>
  </div>;
}
function Metric({icon:Icon,label,value,tone}:{icon:typeof Award;label:string;value:string;tone?:string}) { return <div className="bss-3d bss-scroll-rise bss-card rounded-2xl p-4"><span className={`w-9 h-9 rounded-xl grid place-items-center ${tone ?? 'bg-bss-bg text-bss-text-muted'}`}><Icon size={16}/></span><strong className="block text-2xl font-bold text-bss-text-primary mt-3">{value}</strong><span className="text-[11px] text-bss-text-muted">{label}</span></div> }
