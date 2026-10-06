"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Award, BookOpenCheck, CheckCircle2, ChevronLeft, Clock3, FilePen, GraduationCap, Plus, Send, Sparkles, Trash2, Users, Video, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { contractorCourses, courseCategories, courseDurations, type ContractorCourse } from '@/data/contractorCourses';
import { useContractor } from '@/contexts/ContractorContext';

type Tab = 'dashboard' | 'history';

type CourseDraft = {
  title: string;
  category: string;
  provider: string;
  duration: string;
  instructor: string;
  certification: string;
  description: string;
  modules: Array<{ title: string; duration: string }>;
};

export default function ContractorSkillsPage() {
  const { contractor: portal, employerScope } = useContractor();
  const boundWorkers = employerScope === 'all' ? portal.workers : portal.workers.filter(w => w.employer === employerScope);
  const boundWorkersCount = boundWorkers.length;

  const [courses, setCourses] = useState<ContractorCourse[]>(contractorCourses);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [createOpen, setCreateOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<CourseDraft>({
    title: '',
    category: 'Safety',
    provider: portal.identity.company || portal.identity.name || 'BSS Skilling Academy',
    duration: '4 Hours',
    instructor: '',
    certification: '',
    description: '',
    modules: [{ title: '', duration: '45 mins' }]
  });

  const published = courses.filter(c => c.status === 'Published');
  const totalModules = courses.reduce((sum, c) => sum + c.modules.length, 0);
  const totalCertificates = courses.reduce((sum, c) => sum + c.certificatesIssued, 0);
  const totalLearners = boundWorkersCount;

  function setModule(index: number, key: 'title' | 'duration', value: string) {
    setDraft(current => ({ ...current, modules: current.modules.map((m, i) => i === index ? { ...m, [key]: value } : m) }));
  }
  function addModule() { setDraft(current => ({ ...current, modules: [...current.modules, { title:'', duration:'45 mins' }] })); }
  function removeModule(index: number) { setDraft(current => ({ ...current, modules: current.modules.length > 1 ? current.modules.filter((_, i) => i !== index) : current.modules })); }

  function finish(saveAs: 'draft' | 'publish') {
    setBusy(true); setError(''); setNotice('');
    const required = [draft.title, draft.provider, draft.instructor, draft.certification, draft.description].some(v => !v.trim());
    const modulesReady = draft.modules.filter(m => m.title.trim()).length;
    if (saveAs === 'publish' && (required || modulesReady < 1)) { setError('Complete course title, provider, instructor, certification, description and at least one video module before publishing.'); setBusy(false); return; }
    if (saveAs === 'draft' && !draft.title.trim()) { setError('Enter a course title before saving the draft.'); setBusy(false); return; }
    setTimeout(() => {
      const course: ContractorCourse = {
        id: `COURSE-${Date.now()}`,
        title: draft.title.trim(), category: draft.category, provider: draft.provider.trim(), duration: draft.duration,
        instructor: draft.instructor.trim(), certification: draft.certification.trim(), description: draft.description.trim(),
        image: '/images/financial_literacy.png', status: saveAs === 'publish' ? 'Published' : 'Draft',
        learners: 0, completedLearners: 0, certificatesIssued: 0, publishedOn: saveAs === 'publish' ? new Date().toISOString().slice(0, 10) : undefined,
        modules: draft.modules.filter(m => m.title.trim()).map((m, i) => ({ id: `m${i + 1}`, title: m.title.trim(), duration: m.duration, completed: false })),
      };
      setCourses(current => [course, ...current]);
      setCreateOpen(false); setStep(1);
      setDraft({ title:'', category:'Safety', provider:'RK Buildcon Skilling Academy', duration:'4 Hours', instructor:'', certification:'', description:'', modules:[{ title:'', duration:'45 mins' }] });
      setNotice(saveAs === 'publish'
        ? `Course "${course.title}" published — workers bound to your contractor can now enrol. Certificates auto-generate on completion.`
        : 'Course saved as Draft — publish it from the course dashboard when ready.');
    }, 900);
  }

  const columns: DataColumn<ContractorCourse>[] = [
    { id:'course', header:'Course', value:r => r.title, render:r => <div><strong className="text-gray-900">{r.title}</strong><p className="text-[11px] text-gray-500 mt-0.5">{r.category} · {r.provider}</p></div> },
    { id:'modules', header:'Video modules', value:r => r.modules.length, render:r => <span className="inline-flex items-center gap-1 text-gray-700"><Video size={13}/>{r.modules.length}</span> },
    { id:'duration', header:'Duration', value:r => r.duration },
    { id:'learners', header:'Learners', value:r => r.status === 'Published' ? boundWorkersCount : 0 },
    { id:'completion', header:'Completion', value:r => `${r.completedLearners}/${r.status === 'Published' ? boundWorkersCount : 0}`, render:r => (r.status === 'Published' && boundWorkersCount > 0) ? <span className="font-semibold text-gray-800">{r.completedLearners}/{boundWorkersCount}</span> : <span className="text-gray-300">—</span> },
    { id:'certificates', header:'Certificates issued', value:r => r.certificatesIssued, render:r => <span className={r.certificatesIssued ? 'text-green-700 font-semibold' : 'text-gray-400'}>{r.certificatesIssued}</span> },
    { id:'status', header:'Status', value:r => r.status, render:r => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'Published' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{r.status}</span> },
    { id:'published', header:'Published', value:r => r.publishedOn ?? '—' },
    { id:'actions', header:'Action', filterable:false, value:r => r.id, render:r => <Link href={`/contractor/skills/${r.id}`} className="inline-flex items-center gap-1 text-blue-700 font-semibold text-xs">Open course<ArrowRight size={13}/></Link> },
  ];

  const input = 'mt-1 w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20';
  const stepHead = (n: 1 | 2 | 3, label: string) => <span className={`flex items-center gap-2 text-xs font-bold ${step === n ? 'text-blue-700' : step > n ? 'text-green-700' : 'text-gray-400'}`}><span className={`w-6 h-6 rounded-full grid place-items-center ${step === n ? 'bg-blue-700 text-white' : step > n ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{step > n ? '✓' : n}</span>{label}</span>;

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Master data</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Skills & Courses</h1>
        <p className="text-sm text-gray-500 mt-1">Create course modules with video lectures — completion auto-generates a certificate in the worker&apos;s panel.</p>
      </div>
      <button onClick={() => { setCreateOpen(true); setStep(1); setError(''); }} className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 self-start hover:bg-black"><Plus size={16}/>Create course</button>
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && !createOpen && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Courses created</span><span className="bss-kpi-icon bg-blue-50 text-blue-700"><BookOpenCheck size={16}/></span></div><strong>{courses.length}</strong><p>{published.length} published · {courses.length - published.length} draft</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Video modules</span><span className="bss-kpi-icon bg-indigo-50 text-indigo-700"><Video size={16}/></span></div><strong>{totalModules}</strong><p>Across all courses</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Certificates issued</span><span className="bss-kpi-icon bg-green-50 text-green-700"><Award size={16}/></span></div><strong>{totalCertificates}</strong><p>Auto-generated on completion</p></article>
      <article className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">Learners enrolled</span><span className="bss-kpi-icon bg-orange-50 text-orange-700"><Users size={16}/></span></div><strong>{totalLearners}</strong><p>Bound workers</p></article>
    </section>

    <div className="flex border-b">
      <button onClick={() => setTab('dashboard')} className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === 'dashboard' ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Course Dashboard</button>
      <button onClick={() => setTab('history')} className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === 'history' ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Course History</button>
    </div>

    {tab === 'dashboard' && <>
      <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs">Courses you create appear in the <strong>worker Skills catalogue</strong>. When a worker completes every video module, the certificate is <strong>auto-generated</strong> and stored with the worker&apos;s BSS profile.</div>
      <EnterpriseDataTable title="Created courses" rows={courses} columns={columns} rowKey={r => r.id} filename="contractor-courses"/>
    </>}

    {tab === 'history' && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Course History & Certificates</h2><p className="text-xs text-gray-400 mt-0.5">Certificates auto-generated per course once a learner completes all video lessons.</p></header>
      <div className="divide-y divide-gray-100">{courses.map(course => (
        <div key={course.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 grid place-items-center flex-shrink-0"><GraduationCap size={17}/></span>
            <div className="min-w-0"><p className="text-sm font-semibold text-gray-900">{course.title}</p><p className="text-xs text-gray-400 mt-0.5">{course.certification} · {course.duration} · {course.modules.length} video modules</p></div>
          </div>
          <div className="flex items-center gap-3">
            {course.certificatesIssued > 0
              ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5"><Award size={11}/>{course.certificatesIssued} certificate{course.certificatesIssued === 1 ? '' : 's'} issued</span>
              : <span className="text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">No certificates yet</span>}
            <Link href={`/contractor/skills/${course.id}`} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold flex items-center gap-1 hover:bg-gray-50">View<ArrowRight size={13}/></Link>
          </div>
        </div>
      ))}</div>
    </section>}

    {/* Create course — multi-step wizard */}
    {createOpen && <div className="fixed inset-0 z-[80] bg-black/50 grid place-items-center p-4"><section role="dialog" aria-modal="true" aria-label="Create course" className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex justify-between items-center"><div><h2 className="font-semibold text-sm">Create course</h2><p className="text-xs text-gray-500 mt-1">Define course details, then add video lesson modules. Certificates auto-generate when learners complete all modules.</p></div><button onClick={() => setCreateOpen(false)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button></header>
      <div className="px-5 pt-4 flex gap-6">{stepHead(1, 'Course Info')}{stepHead(2, 'Video Modules')}{stepHead(3, 'Final Review')}</div>
      <div className="p-5 space-y-4 max-h-[58vh] overflow-y-auto">
        {step === 1 && <div className="grid sm:grid-cols-2 gap-4">
          <label className="sm:col-span-2 text-xs font-semibold">Course Title<input value={draft.title} onChange={e => setDraft(c => ({ ...c, title: e.target.value }))} placeholder="e.g. Site Induction & Safety Awareness" className={input}/></label>
          <label className="text-xs font-semibold">Category<select value={draft.category} onChange={e => setDraft(c => ({ ...c, category: e.target.value }))} className={input}>{courseCategories.map(cat => <option key={cat}>{cat}</option>)}</select></label>
          <label className="text-xs font-semibold">Duration<select value={draft.duration} onChange={e => setDraft(c => ({ ...c, duration: e.target.value }))} className={input}>{courseDurations.map(d => <option key={d}>{d}</option>)}</select></label>
          <label className="sm:col-span-2 text-xs font-semibold">Provider / Academy<input value={draft.provider} onChange={e => setDraft(c => ({ ...c, provider: e.target.value }))} className={input}/></label>
          <label className="text-xs font-semibold">Instructor<input value={draft.instructor} onChange={e => setDraft(c => ({ ...c, instructor: e.target.value }))} placeholder="e.g. Rajesh Kumar, Safety Officer" className={input}/></label>
          <label className="text-xs font-semibold">Certification Name<input value={draft.certification} onChange={e => setDraft(c => ({ ...c, certification: e.target.value }))} placeholder="e.g. RK Buildcon Safety Badge" className={input}/></label>
          <label className="sm:col-span-2 text-xs font-semibold">Course Description<textarea value={draft.description} onChange={e => setDraft(c => ({ ...c, description: e.target.value }))} rows={3} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20"/></label>
        </div>}
        {step === 2 && <div className="space-y-3">
          <p className="text-xs text-gray-500">Add the video lessons that make up this course. Each lesson can be watched and marked complete by the learner.</p>
          {draft.modules.map((module, index) => (
            <div key={index} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 grid place-items-center text-xs font-bold flex-shrink-0"><Video size={15}/></span>
              <input value={module.title} onChange={e => setModule(index, 'title', e.target.value)} placeholder={`Video lesson ${index + 1} title`} className="flex-1 h-9 border border-gray-200 rounded-lg px-2 text-xs min-w-0"/>
              <select value={module.duration} onChange={e => setModule(index, 'duration', e.target.value)} className="h-9 border border-gray-200 rounded-lg px-2 text-xs bg-white">{[ '30 mins','45 mins','60 mins','90 mins','2 Hours','3 Hours','4 Hours','5 Hours' ].map(d => <option key={d}>{d}</option>)}</select>
              <button onClick={() => removeModule(index)} className="w-8 h-9 grid place-items-center text-gray-400 hover:text-red-600" aria-label="Remove module"><Trash2 size={15}/></button>
            </div>
          ))}
          <button onClick={addModule} className="h-9 px-3 rounded-lg border border-dashed border-gray-300 text-xs font-semibold flex items-center gap-1.5 hover:border-blue-400 hover:text-blue-700"><Plus size={14}/>Add video module</button>
        </div>}
        {step === 3 && <div className="rounded-xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-bold text-gray-950">{draft.title || 'Untitled course'}</h3><p className="text-xs text-gray-500 mt-1">{draft.category} · {draft.duration} · {draft.provider}</p></div><span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 flex-shrink-0">Review before publish</span></div>
          <dl className="grid grid-cols-2 gap-3 text-xs"><Fact label="Instructor" value={draft.instructor || '—'}/><Fact label="Certification" value={draft.certification || '—'}/><Fact label="Video modules" value={String(draft.modules.filter(m => m.title.trim()).length)}/><Fact label="Total duration" value={draft.duration}/></dl>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Description</p><p className="text-xs text-gray-700 leading-5">{draft.description || '—'}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Video lessons</p><ul className="space-y-1.5">{draft.modules.filter(m => m.title.trim()).map((m, i) => <li key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-xs"><span className="flex items-center gap-2"><Video size={13} className="text-gray-400"/>{m.title}</span><span className="text-gray-400">{m.duration}</span></li>)}</ul></div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1.5"><Sparkles size={13}/>Publishing makes this course available to bound workers. When every video lesson is completed, the certificate &quot;{draft.certification || 'course certificate'}&quot; is auto-generated in the worker&apos;s panel.</p>
        </div>}
        {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
      </div>
      <footer className="p-5 border-t border-gray-100 flex flex-wrap justify-between gap-2">
        <button onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm">Cancel</button>
        <div className="flex gap-2">
          {step > 1 && <button onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)} className="px-4 py-2 rounded-lg border text-sm font-semibold flex items-center gap-1"><ChevronLeft size={15}/>Back</button>}
          {step < 3 && <button onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold flex items-center gap-1">Next<ArrowRight size={15}/></button>}
          {step === 3 && <><button onClick={() => finish('draft')} disabled={busy} className="px-4 py-2 rounded-lg border text-sm font-semibold flex items-center gap-1.5"><FilePen size={14}/>{busy ? 'Saving…' : 'Save Draft'}</button><button onClick={() => finish('publish')} disabled={busy} className="px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-1.5"><Send size={14}/>{busy ? 'Publishing…' : 'Publish Course'}</button></>}
        </div>
      </footer>
    </section></div>}
  </div>;
}

function Fact({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] uppercase text-gray-400 font-bold">{label}</p><p className="mt-1 text-sm font-semibold text-gray-800">{value}</p></div>; }
