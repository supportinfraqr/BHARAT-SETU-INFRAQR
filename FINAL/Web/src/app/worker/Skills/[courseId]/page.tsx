"use client";
import { use, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, BookOpen, Check, ClipboardList, Clock3, Download, Lock, Play, PlayCircle, Sparkles, X } from 'lucide-react';
import { useWorker } from '@/contexts/WorkerContext';
import { youTubeEmbed, youTubeThumb } from '@/lib/youtube';
import type { CourseAssignmentView, CourseModuleView, CourseReadingView } from '@/types/portal';

type CourseSummary = { progress?: number; status?: string; certificateNo?: string; skillAwarded?: string; completedLessonIds?: string[]; assignmentScores?: Record<string, number>; modules?: Array<{ moduleId: string; completed: boolean }> };

export default function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { portal, worker } = useWorker();
  const course = portal.courses.find(item => item.id === courseId) ?? notFound();

  const [modules, setModules] = useState<CourseModuleView[]>(course.modules);
  const [progress, setProgress] = useState(course.progress);
  const [status, setStatus] = useState(course.status);
  const [certificateNo, setCertificateNo] = useState(course.certificateNo);
  const [skillAwarded, setSkillAwarded] = useState(course.skillAwarded);
  const [active, setActive] = useState<{ moduleId: string; lessonId: string } | null>(
    course.modules[0]?.lessons[0] ? { moduleId: course.modules[0].id, lessonId: course.modules[0].lessons[0].id } : null);
  const [openAssignment, setOpenAssignment] = useState<CourseAssignmentView | null>(null);
  const [openReading, setOpenReading] = useState<CourseReadingView | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [writing, setWriting] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCertificate, setShowCertificate] = useState(false);

  const activeLesson = useMemo(() => {
    if (!active) return null;
    const m = modules.find(x => x.id === active.moduleId);
    return m?.lessons.find(l => l.id === active.lessonId) ?? null;
  }, [active, modules]);

  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const doneLessons = modules.reduce((n, m) => n + m.lessons.filter(l => l.completed).length, 0);
  const totalAssignments = modules.reduce((n, m) => n + m.assignments.length, 0);
  const passedAssignments = modules.reduce((n, m) => n + m.assignments.filter(a => a.passed).length, 0);
  const completed = status === 'Completed';

  function applySummary(data: CourseSummary) {
    const completedIds = new Set((data.completedLessonIds ?? []).map(String));
    const scores = data.assignmentScores ?? {};
    const moduleDone = new Map((data.modules ?? []).map(m => [String(m.moduleId), m.completed]));
    setModules(current => current.map(m => ({
      ...m,
      completed: moduleDone.get(m.id) ?? m.completed,
      lessons: m.lessons.map(l => ({ ...l, completed: completedIds.has(l.id) })),
      assignments: m.assignments.map(a => {
        const score = scores[a.id] ?? a.score;
        return { ...a, score, passed: score !== null && score >= a.passScore };
      }),
    })));
    if (typeof data.progress === 'number') setProgress(data.progress);
    if (data.status) setStatus(data.status as 'Not started' | 'In progress' | 'Completed');
    if (typeof data.certificateNo === 'string' && data.certificateNo) setCertificateNo(data.certificateNo);
    if (data.skillAwarded) setSkillAwarded(data.skillAwarded);
    if (data.status === 'Completed') setShowCertificate(true);
  }

  async function completeLesson(moduleId: string, lessonId: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/portal/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete-lesson', courseId, lessonId }) });
      const result = await response.json().catch(() => ({})) as { data?: CourseSummary; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Progress could not be saved.');
      applySummary(result.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Progress could not be saved.'); }
    finally { setBusy(false); }
  }

  async function submitAssignment() {
    if (!openAssignment) return;
    setBusy(true); setError('');
    try {
      const payload = openAssignment.type === 'QUIZ'
        ? { action: 'submit-assignment', courseId, assignmentId: openAssignment.id, answers }
        : { action: 'submit-assignment', courseId, assignmentId: openAssignment.id, content: writing };
      const response = await fetch('/api/portal/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({})) as { data?: CourseSummary; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? 'Assignment could not be submitted.');
      applySummary(result.data);
      const score = result.data.assignmentScores?.[openAssignment.id];
      const passed = score !== undefined && score >= openAssignment.passScore;
      setOpenAssignment(current => current ? { ...current, score: score ?? null, passed } : current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Assignment could not be submitted.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <header className="flex gap-3 items-start"><Link href="/worker/Skills" className="w-9 h-9 border rounded-lg grid place-items-center mt-0.5"><ArrowLeft size={16}/></Link><div><p className="text-xs text-blue-700 font-semibold">{course.category} · {course.provider}</p><h1 className="text-2xl font-bold">{course.title}</h1></div></header>

    <section className="bg-white border rounded-2xl overflow-hidden grid md:grid-cols-[260px_1fr]">
      {course.image ? <Image src={course.image} alt="" width={520} height={360} className="w-full h-full object-cover"/> : <div className="hidden md:block bg-gradient-to-br from-[#073B67] to-[#0F172A]"/>}
      <div className="p-6"><p className="text-sm text-gray-600">{course.description}</p><p className="text-xs text-gray-500 mt-4">{course.duration} · {course.instructor} · {course.certification}</p>
        <div className="h-2 bg-gray-100 mt-5 rounded-full"><div className="h-full bg-blue-700 rounded-full" style={{ width: `${progress}%` }}/></div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2"><p className="text-xs">{doneLessons}/{totalLessons} lessons · {passedAssignments}/{totalAssignments} assignments passed</p>{completed && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><Sparkles size={11}/>Certificate issued</span>}</div>
      </div>
    </section>

    <section className="grid lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
      {/* Video lesson player */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="aspect-video bg-[#0A192F] relative">
          {activeLesson?.videoUrl
            ? <iframe className="absolute inset-0 w-full h-full" src={youTubeEmbed(activeLesson.videoUrl) ?? activeLesson.videoUrl} title={activeLesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
            : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6"><PlayCircle size={52} className="text-white/80"/><p className="text-sm font-semibold text-white">{activeLesson?.title ?? 'Select a lesson'}</p><p className="text-xs text-white/60 max-w-sm">No video attached to this lesson.</p></div>}
          {activeLesson?.completed && <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold text-green-300 bg-green-500/20 border border-green-400/30 px-2 py-0.5 rounded-full"><Check size={11}/>Completed</span>}
        </div>
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100">
          <div><h2 className="text-sm font-semibold text-gray-900">{activeLesson?.title ?? 'Course lessons'}</h2><p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Clock3 size={11}/>{activeLesson?.duration ?? ''}</p></div>
          {activeLesson && <button disabled={activeLesson.completed || busy} onClick={() => active && completeLesson(active.moduleId, active.lessonId)} className="px-4 py-2 rounded-lg bg-gray-950 disabled:bg-green-50 disabled:text-green-700 text-white text-xs font-semibold flex gap-1.5 items-center"><Play size={13}/>{activeLesson.completed ? 'Completed' : 'Mark lesson complete'}</button>}
        </div>
      </div>

      {/* Modules: lessons + assignments */}
      <section className="space-y-3">
        {modules.map((m, mi) => <div key={m.id} className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Module {mi + 1}</p><h2 className="text-sm font-semibold text-gray-900">{m.title}</h2></div>
            {m.completed ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><Check size={11}/>Module complete</span> : <span className="text-[10px] font-bold text-gray-400">{m.lessons.filter(l => l.completed).length}/{m.lessons.length} lessons</span>}
          </div>
          <div className="divide-y divide-gray-50">
            {m.lessons.map(l => {
              const thumb = youTubeThumb(l.videoUrl);
              return <button key={l.id} type="button" onClick={() => setActive({ moduleId: m.id, lessonId: l.id })} className={`w-full text-left p-3 flex justify-between gap-3 items-center hover:bg-gray-50 ${active?.lessonId === l.id ? 'bg-blue-50/40' : ''}`}>
              <span className="flex gap-3 min-w-0"><span className="relative w-[72px] h-[44px] rounded-md overflow-hidden bg-slate-900 grid place-items-center flex-shrink-0">
                {thumb ? <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover"/> : <Play size={13} className="text-white/80"/>}
                {!l.completed && thumb && <span className="absolute inset-0 bg-black/25 grid place-items-center"><Play size={14} className="text-white"/></span>}
                {l.completed && <span className="absolute inset-0 bg-black/45 grid place-items-center"><Check size={16} className="text-green-300"/></span>}
              </span><span className="min-w-0"><span className="block text-sm font-medium text-gray-800 truncate">{l.title}</span><span className="block text-[11px] text-gray-400">{l.duration}</span></span></span>
            </button>;
            })}
            {m.assignments.map(a => <Link key={a.id} href={`/worker/Skills/${courseId}/assignment/${a.id}`} className="w-full text-left p-3 flex justify-between gap-3 items-center hover:bg-gray-50 transition-colors">
              <span className="flex gap-3 min-w-0"><span className={`w-6 h-6 rounded-full grid place-items-center flex-shrink-0 ${a.passed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}><ClipboardList size={12}/></span><span className="min-w-0"><span className="block text-sm font-medium text-gray-800 truncate">{a.title}</span><span className="block text-[11px] text-gray-400">{a.type === 'QUIZ' ? 'Quiz (Dedicated Page)' : a.type === 'WRITING' ? 'Written assignment' : 'File upload'} · pass {a.passScore}%</span></span></span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.passed ? 'text-green-700 bg-green-50' : a.score !== null ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-100'}`}>{a.score !== null ? `${a.score}%` : 'Start'}</span>
            </Link>)}
            {m.readings.map(r => <button key={r.id} type="button" onClick={() => setOpenReading(r)} className="w-full text-left p-3 flex justify-between gap-3 items-center hover:bg-gray-50">
              <span className="flex gap-3 min-w-0"><span className="w-6 h-6 rounded-full grid place-items-center flex-shrink-0 bg-blue-50 text-[#073B67]"><BookOpen size={12}/></span><span className="min-w-0"><span className="block text-sm font-medium text-gray-800 truncate">{r.title}</span><span className="block text-[11px] text-gray-400">Reading · {r.duration || 'reference'}</span></span></span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Read</span>
            </button>)}
            {!m.lessons.length && !m.assignments.length && !m.readings.length && <p className="p-4 text-center text-xs text-gray-400">No content published for this module yet.</p>}
          </div>
        </div>)}
      </section>
    </section>

    {completed && <section className="bg-green-50/70 border border-green-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"><span className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0"><Award size={20}/></span><div className="flex-1"><h3 className="text-sm font-semibold text-gray-900">Course completed — certificate issued</h3><p className="text-xs text-gray-500 mt-0.5">The skill <strong>{skillAwarded}</strong> is added to your verified skills. Certificate <strong>{certificateNo}</strong> issued to {worker.identity.name}.</p></div><button onClick={() => setShowCertificate(true)} className="h-10 px-4 rounded-lg bg-[#2F9E67] text-white text-xs font-semibold flex items-center gap-2 hover:bg-[#237c50] flex-shrink-0"><Download size={15}/>View certificate</button></section>}

    {error && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</p>}

    {/* Reading material modal */}
    {openReading && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpenReading(null)}><div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reading material{openReading.duration ? ` · ${openReading.duration}` : ''}</p><h2 className="text-sm font-bold text-gray-900 mt-0.5">{openReading.title}</h2></div><button onClick={() => setOpenReading(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full hover:bg-gray-100"><X size={16}/></button></div>
      <div className="p-5 text-sm text-gray-700 whitespace-pre-line leading-relaxed">{openReading.body || 'No content.'}</div>
      {openReading.url && <div className="px-5 pb-2"><a href={openReading.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-700 underline">Open external resource →</a></div>}
      <div className="px-5 py-4 border-t border-gray-100 flex justify-end"><button onClick={() => setOpenReading(null)} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold">Done</button></div>
    </div></div>}

    {/* Certificate modal */}
    {showCertificate && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCertificate(false)}><div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 no-print"><h2 className="text-sm font-bold text-gray-900">Official BSS Skill Certificate</h2><button onClick={() => setShowCertificate(false)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-gray-200"><X size={16}/></button></div>
      <div className="p-8 text-center bg-gradient-to-b from-white to-blue-50/30 border-b border-gray-100" id="bss-certificate-print-area">
        <div className="w-20 h-20 rounded-2xl bg-[#073B67] text-white flex items-center justify-center mx-auto shadow-md"><Award size={40}/></div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#073B67] mt-5">Bharat Shram Setu National Skill Registry</p>
        <h3 className="text-2xl font-extrabold text-gray-950 mt-2">{course.title}</h3>
        <p className="text-xs text-gray-600 mt-3">This official certificate is proudly awarded to</p>
        <p className="text-xl font-extrabold text-[#073B67] mt-1">{worker.identity.name}</p>
        <p className="text-xs text-gray-500 mt-1">BSS ID: <span className="font-mono font-semibold">{worker.identity.bssId}</span></p>
        <div className="my-6 pt-5 border-t border-gray-200/80 max-w-md mx-auto grid grid-cols-2 gap-4 text-left bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Issued By</p><p className="text-xs font-semibold text-gray-800 mt-0.5">{course.provider}</p></div>
          <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Instructor</p><p className="text-xs font-semibold text-gray-800 mt-0.5">{course.instructor || 'BSS Assessed'}</p></div>
          <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Certificate No.</p><p className="text-xs font-mono font-semibold text-[#073B67] mt-0.5">{certificateNo || 'BSS-CERT-VERIFIED'}</p></div>
          <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Verified Skill</p><p className="text-xs font-semibold text-green-700 mt-0.5">{skillAwarded || course.title}</p></div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-800 bg-green-100/80 border border-green-200 px-4 py-1.5 rounded-full"><Check size={14}/>Cryptographically Verified on BSS Trust Registry</div>
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-gray-50 no-print"><button onClick={() => window.print()} className="flex-1 h-10 rounded-xl bg-[#073B67] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F] transition-colors"><Download size={15}/>Print / Save PDF Certificate</button><button onClick={() => setShowCertificate(false)} className="h-10 px-5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100">Close</button></div>
    </div></div>}

    {!completed && totalAssignments > 0 && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Lock size={12}/>Pass every assignment in every module to earn the certificate.</p>}
  </div>;
}
