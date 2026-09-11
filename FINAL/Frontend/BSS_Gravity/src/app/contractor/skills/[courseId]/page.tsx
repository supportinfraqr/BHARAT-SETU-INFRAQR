"use client";

import { use, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, Check, CheckCircle2, Clock3, Download, Play, PlayCircle, Sparkles, Users, Video, X } from 'lucide-react';
import { contractorCourses } from '@/data/contractorCourses';

export default function ContractorCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const course = contractorCourses.find(item => item.id === courseId) ?? notFound();
  const [completed, setCompleted] = useState<boolean[]>(() => course.modules.map(item => item.completed));
  const [activeModule, setActiveModule] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [showCertificate, setShowCertificate] = useState(false);

  const done = completed.filter(Boolean).length;
  const progress = Math.round((done / completed.length) * 100);
  const fullyComplete = progress === 100;
  const activeLesson = course.modules[activeModule];

  function complete(index: number) {
    setBusy(true); setNotice('');
    setTimeout(() => {
      const next = completed.map((value, itemIndex) => itemIndex === index ? true : value);
      setCompleted(next);
      if (next.every(Boolean)) {
        setNotice('All video lessons completed — certificate auto-generated and stored with the learner\'s BSS profile.');
      }
      setBusy(false);
    }, 500);
  }

  return <div className="space-y-5 pb-12">
    <header className="flex gap-3 items-start">
      <Link href="/contractor/skills" className="w-9 h-9 border rounded-lg grid place-items-center mt-0.5"><ArrowLeft size={16}/></Link>
      <div><p className="text-xs text-blue-700 font-semibold">{course.category} · {course.provider}</p><h1 className="text-2xl font-bold">{course.title}</h1><p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${course.status === 'Published' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{course.status}</span><span className="inline-flex items-center gap-1"><Users size={12}/>{course.learners} learners · {course.certificatesIssued} certificates issued</span></p></div>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <section className="bg-white border rounded-2xl overflow-hidden grid md:grid-cols-[260px_1fr]">
      <Image src={course.image} alt="" width={520} height={360} className="w-full h-full object-cover"/>
      <div className="p-6">
        <p className="text-sm text-gray-600">{course.description}</p>
        <p className="text-xs text-gray-500 mt-4">{course.duration} · {course.instructor} · {course.certification}</p>
        <div className="h-2 bg-gray-100 mt-5 rounded-full"><div className="h-full bg-blue-700 rounded-full" style={{ width: progress + '%' }}/></div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs">{done} of {completed.length} modules completed</p>
          {fullyComplete
            ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><Sparkles size={11}/>Certificate auto-generated</span>
            : <span className="text-[10px] font-bold text-gray-400">Certificate on completion</span>}
        </div>
      </div>
    </section>

    <section className="grid lg:grid-cols-[1.6fr_1fr] gap-5 items-start">
      {/* Video lesson player (simulated, same pattern as Worker Skills) */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="aspect-video bg-[#0A192F] flex items-center justify-center relative">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6">
            <PlayCircle size={52} className="text-white/80"/>
            <p className="text-sm font-semibold text-white">{activeLesson.title}</p>
            <p className="text-xs text-white/60 max-w-sm">Lesson {activeModule + 1} of {course.modules.length} · {activeLesson.duration} · Hindi with English subtitles. Video streaming is simulated in this demo build.</p>
          </div>
          {completed[activeModule] && <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold text-green-300 bg-green-500/20 border border-green-400/30 px-2 py-0.5 rounded-full"><Check size={11}/>Completed</span>}
        </div>
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100">
          <div><h2 className="text-sm font-semibold text-gray-900">Lesson {activeModule + 1}: {activeLesson.title}</h2><p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Clock3 size={11}/>{activeLesson.duration}</p></div>
          <button disabled={completed[activeModule] || busy} onClick={() => complete(activeModule)} className="px-4 py-2 rounded-lg bg-gray-950 disabled:bg-green-50 disabled:text-green-700 text-white text-xs font-semibold flex gap-1.5 items-center"><Play size={13}/>{completed[activeModule] ? 'Completed' : 'Mark lesson complete'}</button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Module list */}
        <section className="bg-white border rounded-2xl divide-y">
          <div className="px-4 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Course lessons</h2><p className="text-[11px] text-gray-400 mt-0.5">Watch each lesson — completing all lessons auto-generates the certificate</p></div>
          {course.modules.map((item, index) => (
            <button key={item.id} onClick={() => setActiveModule(index)} className={`w-full p-4 flex justify-between gap-3 items-center cursor-pointer hover:bg-gray-50 text-left ${activeModule === index ? 'bg-blue-50/40' : ''}`}>
              <div className="flex gap-3 min-w-0">
                <span className={'w-7 h-7 rounded-full grid place-items-center flex-shrink-0 ' + (completed[index] ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>{completed[index] ? <Check size={14}/> : index + 1}</span>
                <div className="min-w-0"><h3 className="text-sm font-semibold truncate">{item.title}</h3><p className="text-xs text-gray-400 flex gap-1 items-center"><Clock3 size={11}/>{item.duration}</p></div>
              </div>
              <Video size={14} className={activeModule === index ? 'text-[#073B67]' : 'text-gray-300'}/>
            </button>
          ))}
        </section>

        {/* Auto certificate */}
        <section className={`border rounded-2xl p-5 ${fullyComplete ? 'bg-green-50/70 border-green-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-start gap-3">
            <span className={`w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 ${fullyComplete ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400'}`}><Award size={20}/></span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Certificate auto-generation</h3>
              <p className="text-xs text-gray-500 mt-0.5">{fullyComplete ? 'All lessons completed — certificate generated for every enrolled learner and stored with their BSS profile.' : 'Once every lesson is marked complete, the certificate "' + course.certification + '" is auto-generated for enrolled learners.'}</p>
              <button onClick={() => setShowCertificate(true)} disabled={!fullyComplete} className="mt-3 h-9 px-4 rounded-lg bg-[#2F9E67] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#237c50] disabled:opacity-40 disabled:cursor-not-allowed"><Download size={14}/>View sample certificate</button>
            </div>
          </div>
        </section>
      </div>
    </section>

    {/* Certificate modal — auto-generated on completion */}
    {showCertificate && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCertificate(false)}><div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="text-sm font-bold text-gray-900">Auto-generated course certificate</h2><button onClick={() => setShowCertificate(false)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-gray-100"><X size={16}/></button></div>
      <div className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-[#073B67] flex items-center justify-center mx-auto"><AwardIcon/></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-5">Certificate of completion</p>
        <h3 className="text-lg font-bold text-gray-950 mt-2">{course.title}</h3>
        <p className="text-xs text-gray-500 mt-1">Awarded to <strong>Ravi Kumar</strong> · BSS234567890124</p>
        <p className="text-xs text-gray-500 mt-1">Issued by <strong>{course.provider}</strong> · {course.instructor}</p>
        <div className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full"><Check size={12}/>Auto-generated · Verified on BSS profile</div>
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex gap-2"><button onClick={() => setShowCertificate(false)} className="flex-1 h-10 rounded-lg bg-[#073B67] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F]"><Download size={15}/>Download PDF</button><button onClick={() => setShowCertificate(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">Close</button></div>
    </div></div>}
  </div>;
}

function AwardIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>; }
