"use client";
import Link from 'next/link';
import { Award, BookOpenCheck, ChevronRight, Clock3, GraduationCap, Play, Sparkles } from 'lucide-react';
import CourseCard from '@/components/skills/CourseCard';
import { useWorker } from '@/contexts/WorkerContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SkillsPage() {
  const { t } = useLanguage();
  const { portal } = useWorker();
  const courses = portal.courses;
  const active = courses.find(c => c.progress > 0 && c.progress < 100);
  const completed = courses.filter(c => c.status === 'Completed').length;
  const inProgress = courses.filter(c => c.status === 'In progress').length;

  return <div className="space-y-5 pb-12">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Learning</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">{t('nav.skills')}</h1><p className="text-sm text-gray-500 mt-1">Build verified skills and carry credentials across jobs.</p></div><Link href="/worker/Skills/catalog" className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold flex items-center gap-2 hover:border-gray-300">Browse catalog<ChevronRight size={15}/></Link></header>

    <section className="grid grid-cols-3 gap-3"><Metric icon={BookOpenCheck} label="Completed" value={String(completed)}/><Metric icon={Award} label="In progress" value={String(inProgress)}/><Metric icon={Clock3} label="Courses" value={String(courses.length)}/></section>

    {active ? <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden"><div className="grid md:grid-cols-[1fr_220px]"><div className="p-5 sm:p-6"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-700"><Sparkles size={13}/>Continue learning</div><h2 className="text-lg font-semibold text-gray-950 mt-3">{active.title}</h2><p className="text-sm text-gray-500 mt-1 max-w-xl">{active.description}</p><div className="mt-5 max-w-lg"><div className="flex justify-between text-xs text-gray-500 mb-1.5"><span>{active.provider}</span><strong className="text-gray-700">{active.progress}%</strong></div><div className="h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-[#073B67] rounded-full" style={{width:`${active.progress}%`}}/></div></div><Link href={`/worker/Skills/${active.id}`} className="mt-5 inline-flex h-9 items-center gap-2 px-4 rounded-lg bg-[#0F172A] text-white text-xs font-semibold"><Play size={14}/>Resume course</Link></div>{active.image&&<img src={active.image} alt="" className="hidden md:block w-full h-full object-cover"/>}</div></section>
      : <section className="bg-white border border-gray-200 rounded-2xl p-6 text-center"><GraduationCap size={26} className="mx-auto text-[#073B67]"/><h2 className="text-base font-semibold text-gray-900 mt-3">{courses.length?'Start a course to build verified skills':'No courses published yet'}</h2><p className="text-sm text-gray-500 mt-1">{courses.length?'Watch the lessons, pass the quiz, and the skill is added to your profile.':'Your employer / BSS admin will publish courses here.'}</p>{courses.length>0&&<Link href="/worker/Skills/catalog" className="mt-4 inline-flex h-9 items-center gap-2 px-4 rounded-lg bg-[#0F172A] text-white text-xs font-semibold"><Play size={14}/>Browse courses</Link>}</section>}

    <section><div className="flex items-end justify-between mb-3"><div><h2 className="text-sm font-semibold text-gray-950">Your learning</h2><p className="text-xs text-gray-400 mt-0.5">Courses published by BSS and your employer</p></div></div>{courses.length?<div className="grid xl:grid-cols-2 gap-3">{courses.map(course=><CourseCard key={course.id} course={course}/>)}</div>:<p className="p-8 text-center bg-white border border-gray-200 rounded-xl text-sm text-gray-500">No courses available.</p>}</section>

    <section className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 flex gap-3"><GraduationCap size={19} className="text-[#073B67] shrink-0"/><div><h3 className="text-sm font-semibold text-gray-900">Credentials remain with your BSS profile</h3><p className="text-xs text-gray-500 mt-1">Completed course certificates are added to your verified skills and can be shown to authorised employers without exposing private identity data.</p></div></section>
  </div>;
}
function Metric({icon:Icon,label,value}:{icon:typeof Award;label:string;value:string}) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><Icon size={16} className="text-gray-400"/><strong className="block text-xl font-semibold text-gray-950 mt-3">{value}</strong><span className="text-[11px] text-gray-400">{label}</span></div> }
