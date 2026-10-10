"use client";

import { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, CheckCircle2, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';

type Lesson = { id?: number; title: string; duration?: string; youtubeUrl?: string };
type Reading = { id?: number; title: string; body?: string; resourceUrl?: string; duration?: string };
type Question = { id?: number; question: string; options: string[]; correctIndex: number };
type Assignment = { id?: number; title: string; type: 'QUIZ' | 'WRITING' | 'UPLOAD'; instructions?: string; passScore: number; questions: Question[] };
type Module = { id?: number; title: string; lessons: Lesson[]; readings: Reading[]; assignments: Assignment[] };

type CourseAssignmentView = { id: number; title: string; type: string; instructions: string; passScore: number; questions: Array<{ id: number; question: string; options: string[]; correctIndex: number }> };
type CourseModuleView = { id: number; title: string; lessons: Array<{ id: number; title: string; duration: string; youtubeUrl: string }>; readings: Array<{ id: number; title: string; body: string; resourceUrl: string; duration: string }>; assignments: CourseAssignmentView[] };
type Course = {
  id: number; code: string; title: string; provider: string; category: string; duration: string;
  description: string; instructor: string; certification: string; skillName: string;
  imageUrl?: string; badge?: string; audience?: string; audienceContractorIds?: number[]; audienceEmployerIds?: number[];
  passScore: number; active: boolean; modules: CourseModuleView[];
};
type Draft = {
  id?: number; title: string; provider: string; category: string; duration: string; instructor: string;
  certification: string; skillName: string; description: string; passScore: number; active: boolean; modules: Module[];
  imageUrl: string; audience: string; audienceContractorIds: number[]; audienceEmployerIds: number[];
};
type AudienceOption = { id: number; name: string };

type ReportSubmission = { id: number; workerName: string; workerId: string; course: string; module: string; assignment: string; type: string; content: string; fileUrl: string; status: string; score: number | null; feedback: string; submittedAt: string | null };
type ReportEnrollment = { id: number; workerName: string; workerId: string; course: string; status: string; progress: number; certificateNo: string; completedAt: string | null; updatedAt: string | null };
type Report = { summary: { enrollments: number; completed: number; submissions: number; pendingGrading: number }; enrollments: ReportEnrollment[]; submissions: ReportSubmission[] };

const emptyModule = (): Module => ({ title: '', lessons: [{ title: '', duration: '', youtubeUrl: '' }], readings: [], assignments: [] });
const emptyAssignment = (): Assignment => ({ title: '', type: 'QUIZ', instructions: '', passScore: 60, questions: [] });
const emptyQuestion = (): Question => ({ question: '', options: ['', ''], correctIndex: 0 });

const emptyDraft = (): Draft => ({ title: '', provider: 'Bharat Shram Setu', category: '', duration: '', instructor: '', certification: '', skillName: '', description: '', passScore: 70, active: true, modules: [emptyModule()], imageUrl: '', audience: 'all', audienceContractorIds: [], audienceEmployerIds: [] });

const AUDIENCE_LABEL: Record<string, string> = {
  all: 'All workers',
  contractors: "All contractors' workers",
  employers: "All employers' workers",
  selected: 'Selected contractors / employers',
};

/** Human-readable summary of a course's visibility, shown on each course card. */
function audienceText(c: { audience?: string; audienceContractorIds?: number[]; audienceEmployerIds?: number[] }): string {
  const key = c.audience ?? 'all';
  const base = AUDIENCE_LABEL[key] ?? 'All workers';
  if (key === 'selected') {
    const nc = c.audienceContractorIds?.length ?? 0;
    const ne = c.audienceEmployerIds?.length ?? 0;
    return `${base} (${nc} contractor${nc === 1 ? '' : 's'}, ${ne} employer${ne === 1 ? '' : 's'})`;
  }
  return base;
}

const input = 'mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm';
const TYPE_LABEL: Record<string, string> = { QUIZ: 'Quiz', WRITING: 'Written response', UPLOAD: 'File upload' };

export default function AdminCoursesPage() {
  const [tab, setTab] = useState<'courses' | 'reports'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [audienceOptions, setAudienceOptions] = useState<{ contractors: AudienceOption[]; employers: AudienceOption[] }>({ contractors: [], employers: [] });
  const [thumbBusy, setThumbBusy] = useState(false);

  const [report, setReport] = useState<Report | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [grades, setGrades] = useState<Record<number, { score: string; feedback: string }>>({});
  const [savingGrade, setSavingGrade] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, listRes, optRes] = await Promise.all([
        fetch('/api/admin/learning-config', { cache: 'no-store' }),
        fetch('/api/admin/courses', { cache: 'no-store' }),
        fetch('/api/admin/courses/audience-options', { cache: 'no-store' }),
      ]);
      const cfg = await cfgRes.json().catch(() => ({})) as { data?: { coursesEnabled: boolean } };
      const list = await listRes.json().catch(() => ({})) as { data?: Course[]; error?: string };
      const opts = await optRes.json().catch(() => ({})) as { data?: { contractors: AudienceOption[]; employers: AudienceOption[] } };
      if (cfg.data) setEnabled(cfg.data.coursesEnabled);
      if (listRes.ok) setCourses(list.data ?? []);
      if (opts.data) setAudienceOptions({ contractors: opts.data.contractors ?? [], employers: opts.data.employers ?? [] });
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Courses could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await fetch('/api/admin/learning-report', { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { data?: Report; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error ?? 'The skilling report could not be loaded.');
      setReport(body.data);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'The skilling report could not be loaded.'); }
    finally { setReportLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load report on tab switch
  useEffect(() => { if (tab === 'reports') void loadReport(); }, [tab, loadReport]);

  async function toggleEnabled(next: boolean) {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/admin/learning-config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coursesEnabled: next }) });
      const body = await res.json().catch(() => ({})) as { data?: { coursesEnabled: boolean }; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error ?? 'Could not update.');
      setEnabled(body.data.coursesEnabled);
      setNotice(body.data.coursesEnabled ? 'Courses enabled — workers can see the catalog.' : 'Courses disabled — the worker skills catalog is hidden.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update.'); }
    finally { setBusy(false); }
  }

  async function uploadThumbnail(file?: File) {
    if (!file || !draft) return;
    setThumbBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/admin/courses/thumbnail', { method: 'POST', body: form });
      const body = await response.json().catch(() => ({})) as { data?: { url?: string }; error?: string };
      if (!response.ok || !body.data?.url) throw new Error(body.error ?? 'The image could not be uploaded.');
      const url = body.data.url;
      setDraft(cur => (cur ? { ...cur, imageUrl: url } : cur));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The image could not be uploaded.');
    } finally { setThumbBusy(false); }
  }

  function edit(c: Course) {
    setDraft({
      id: c.id, title: c.title, provider: c.provider, category: c.category, duration: c.duration,
      instructor: c.instructor, certification: c.certification, skillName: c.skillName,
      description: c.description, passScore: c.passScore, active: c.active,
      imageUrl: c.imageUrl ?? '', audience: c.audience ?? 'all',
      audienceContractorIds: c.audienceContractorIds ?? [], audienceEmployerIds: c.audienceEmployerIds ?? [],
      modules: c.modules.length ? c.modules.map(m => ({
        id: m.id, title: m.title,
        lessons: m.lessons.map(l => ({ id: l.id, title: l.title, duration: l.duration, youtubeUrl: l.youtubeUrl })),
        readings: m.readings.map(r => ({ id: r.id, title: r.title, body: r.body, resourceUrl: r.resourceUrl, duration: r.duration })),
        assignments: m.assignments.map(a => ({
          id: a.id, title: a.title, type: (a.type as Assignment['type']) || 'QUIZ', instructions: a.instructions,
          passScore: a.passScore,
          questions: a.questions.map(q => ({ id: q.id, question: q.question, options: q.options.length ? q.options : ['', ''], correctIndex: q.correctIndex })),
        })),
      })) : [emptyModule()],
    });
    setError(''); setNotice('');
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim()) { setError('Course title is required.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        ...draft,
        modules: draft.modules
          .filter(m => m.title.trim())
          .map(m => ({
            ...m,
            lessons: m.lessons.filter(l => l.title.trim()),
            readings: m.readings.filter(r => r.title.trim()),
            assignments: m.assignments
              .filter(a => a.title.trim())
              .map(a => ({ ...a, questions: a.questions.filter(q => q.question.trim() && q.options.filter(o => o.trim()).length >= 2) })),
          })),
      };
      const res = await fetch(draft.id ? `/api/admin/courses/${draft.id}` : '/api/admin/courses', {
        method: draft.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'The course could not be saved.');
      setDraft(null);
      setNotice('Course saved.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'The course could not be saved.'); }
    finally { setBusy(false); }
  }

  async function remove(c: Course) {
    if (!window.confirm(`Delete course “${c.title}”?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/admin/courses/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('The course could not be removed.');
      setNotice('Course removed.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'The course could not be removed.'); }
    finally { setBusy(false); }
  }

  async function grade(sub: ReportSubmission) {
    const g = grades[sub.id] ?? { score: sub.score != null ? String(sub.score) : '', feedback: sub.feedback };
    setSavingGrade(sub.id); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/admin/course-submissions/${sub.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: Number(g.score || 0), feedback: g.feedback }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'The submission could not be graded.');
      setNotice(`Graded “${sub.assignment}” for ${sub.workerName}.`);
      await loadReport();
    } catch (e) { setError(e instanceof Error ? e.message : 'The submission could not be graded.'); }
    finally { setSavingGrade(null); }
  }

  // ── Draft mutation helpers ────────────────────────────────────────────────
  const setMod = (i: number, patch: Partial<Module>) => setDraft(d => d ? { ...d, modules: d.modules.map((m, k) => k === i ? { ...m, ...patch } : m) } : d);
  const setLesson = (i: number, j: number, patch: Partial<Lesson>) => setDraft(d => d ? { ...d, modules: d.modules.map((m, k) => k === i ? { ...m, lessons: m.lessons.map((l, x) => x === j ? { ...l, ...patch } : l) } : m) } : d);
  const setReading = (i: number, j: number, patch: Partial<Reading>) => setDraft(d => d ? { ...d, modules: d.modules.map((m, k) => k === i ? { ...m, readings: m.readings.map((r, x) => x === j ? { ...r, ...patch } : r) } : m) } : d);
  const setAssign = (i: number, j: number, patch: Partial<Assignment>) => setDraft(d => d ? { ...d, modules: d.modules.map((m, k) => k === i ? { ...m, assignments: m.assignments.map((a, x) => x === j ? { ...a, ...patch } : a) } : m) } : d);
  const setQuestion = (i: number, j: number, q: number, patch: Partial<Question>) => setDraft(d => d ? { ...d, modules: d.modules.map((m, k) => k === i ? { ...m, assignments: m.assignments.map((a, x) => x === j ? { ...a, questions: a.questions.map((qq, y) => y === q ? { ...qq, ...patch } : qq) } : a) } : m) } : d);

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Skilling · Audit &amp; Reports</p>
        <h1 className="text-2xl font-bold mt-1">Courses &amp; Skills</h1>
        <p className="text-sm text-gray-500 mt-1">Build full learning tracks — lessons, readings, quizzes and assignments — and review learner progress and submissions here.</p>
      </div>
      {tab === 'courses' && <button onClick={() => { setDraft(emptyDraft()); setError(''); setNotice(''); }} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 self-start"><Plus size={14}/>New course</button>}
    </header>

    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      {(['courses', 'reports'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`h-8 px-4 rounded-md text-xs font-bold ${tab === t ? 'bg-[#073B67] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{t === 'courses' ? 'Courses' : 'Reports & Grading'}</button>)}
    </div>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    {tab === 'courses' && <>
      <section className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Courses module</p>
          <p className="text-xs text-gray-500 mt-0.5">When off, the worker Skills/learning catalog is hidden across the portal.</p>
        </div>
        <button onClick={() => void toggleEnabled(!enabled)} disabled={busy} className={`h-9 px-4 rounded-lg text-xs font-bold disabled:opacity-50 ${enabled ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-600 text-white'}`}>{enabled ? 'Disable courses' : 'Enable courses'}</button>
      </section>

      {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-8"><Loader2 size={15} className="animate-spin"/>Loading courses…</p>
        : !courses.length ? <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center"><BookOpenCheck size={26} className="mx-auto text-gray-300"/><p className="text-sm font-semibold text-gray-700 mt-3">No courses yet</p><p className="text-xs text-gray-500 mt-1">Create the first course — it will appear on the worker Skills page.</p></div>
        : <div className="grid md:grid-cols-2 gap-4">{courses.map(c => <article key={c.id} className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 truncate">{c.title}</h2>
                <p className="text-[11px] text-gray-400">{c.code} · {c.provider || '—'} · {c.modules.length} module(s) · {c.modules.reduce((n, m) => n + m.assignments.length, 0)} assignment(s){c.skillName ? ` · skill: ${c.skillName}` : ''}</p>
                <p className="text-[11px] text-[#073B67] mt-0.5">Visible to: {audienceText(c)}</p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>{c.active ? 'Active' : 'Hidden'}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => edit(c)} className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold inline-flex items-center gap-1"><Pencil size={12}/>Edit</button>
              <button onClick={() => void remove(c)} disabled={busy} className="h-8 px-3 rounded-lg border border-red-200 text-red-600 text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"><Trash2 size={12}/>Delete</button>
            </div>
          </article>)}</div>}
    </>}

    {tab === 'reports' && (reportLoading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-8"><Loader2 size={15} className="animate-spin"/>Loading report…</p>
      : !report ? <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center"><p className="text-sm text-gray-500">No report data yet.</p></div>
      : <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[['Enrollments', report.summary.enrollments], ['Completed', report.summary.completed], ['Submissions', report.summary.submissions], ['Pending grading', report.summary.pendingGrading]].map(([label, value]) => <div key={label as string} className="bg-white border border-gray-200 rounded-2xl p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value as number}</p></div>)}
        </div>

        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="p-4 border-b border-gray-100"><h2 className="text-sm font-bold text-gray-900">Assignment submissions</h2><p className="text-xs text-gray-500 mt-0.5">Written and file-upload responses can be scored here — quizzes are auto-graded.</p></header>
          {!report.submissions.length ? <p className="p-6 text-sm text-gray-500">No submissions yet.</p> : <div className="divide-y divide-gray-100">
            {report.submissions.map(s => {
              const g = grades[s.id] ?? { score: s.score != null ? String(s.score) : '', feedback: s.feedback };
              const canGrade = s.type !== 'QUIZ';
              return <div key={s.id} className="p-4 flex flex-col lg:flex-row lg:items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{s.workerName} <span className="text-[11px] font-normal text-gray-400">· {s.workerId}</span></p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{s.course} · {s.module} · {s.assignment} · {TYPE_LABEL[s.type] ?? s.type} · submitted {s.submittedAt?.slice(0, 10) ?? '—'}</p>
                  {s.content && <p className="text-xs text-gray-600 mt-2 whitespace-pre-line line-clamp-4">{s.content}</p>}
                  {s.fileUrl && <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#073B67] mt-1 inline-block">View submitted file</a>}
                </div>
                <div className="flex items-end gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${s.status === 'Graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{s.status}{s.score != null ? ` · ${s.score}%` : ''}</span>
                  {canGrade && <>
                    <label className="text-[11px] font-semibold text-gray-600">Score<input type="number" min={0} max={100} className="mt-1 w-20 h-9 border border-gray-200 rounded-lg px-2 text-sm" value={g.score} onChange={e => setGrades(cur => ({ ...cur, [s.id]: { ...g, score: e.target.value } }))}/></label>
                    <label className="text-[11px] font-semibold text-gray-600">Feedback<input className="mt-1 w-40 h-9 border border-gray-200 rounded-lg px-2 text-sm" value={g.feedback} onChange={e => setGrades(cur => ({ ...cur, [s.id]: { ...g, feedback: e.target.value } }))}/></label>
                    <button onClick={() => void grade(s)} disabled={savingGrade === s.id} className="h-9 px-3 rounded-lg bg-[#073B67] text-white text-[11px] font-bold disabled:opacity-50 inline-flex items-center gap-1">{savingGrade === s.id ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>}Grade</button>
                  </>}
                </div>
              </div>;
            })}
          </div>}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="p-4 border-b border-gray-100"><h2 className="text-sm font-bold text-gray-900">Enrollments &amp; progress</h2></header>
          {!report.enrollments.length ? <p className="p-6 text-sm text-gray-500">No enrollments yet.</p> : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500"><tr><th className="text-left px-4 py-2">Worker</th><th className="text-left px-4 py-2">Course</th><th className="text-left px-4 py-2">Progress</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Certificate</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{report.enrollments.map(e => <tr key={e.id}>
              <td className="px-4 py-2"><p className="font-semibold text-gray-900">{e.workerName}</p><p className="text-[11px] text-gray-400">{e.workerId}</p></td>
              <td className="px-4 py-2">{e.course}</td>
              <td className="px-4 py-2"><div className="flex items-center gap-2"><div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#073B67]" style={{ width: `${e.progress}%` }}/></div><span className="text-[11px] text-gray-500">{e.progress}%</span></div></td>
              <td className="px-4 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{e.status}</span></td>
              <td className="px-4 py-2 text-[11px] text-gray-500">{e.certificateNo || '—'}</td>
            </tr>)}</tbody>
          </table></div>}
        </section>
      </>)}

    {draft && <div className="fixed inset-0 z-[95] bg-black/50 flex justify-end" role="presentation">
      <section role="dialog" aria-modal="true" className="bg-white w-full max-w-3xl h-full overflow-y-auto">
        <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10"><h2 className="text-sm font-bold">{draft.id ? 'Edit course' : 'New course'}</h2><button onClick={() => setDraft(null)} aria-label="Close"><X size={16}/></button></header>
        <div className="p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-700">Title *<input className={input} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}/></label>
            <label className="text-xs font-semibold text-gray-700">Provider<input className={input} value={draft.provider} onChange={e => setDraft({ ...draft, provider: e.target.value })}/></label>
            <label className="text-xs font-semibold text-gray-700">Category<input className={input} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}/></label>
            <label className="text-xs font-semibold text-gray-700">Duration<input className={input} value={draft.duration} onChange={e => setDraft({ ...draft, duration: e.target.value })}/></label>
            <label className="text-xs font-semibold text-gray-700">Instructor<input className={input} value={draft.instructor} onChange={e => setDraft({ ...draft, instructor: e.target.value })}/></label>
            <label className="text-xs font-semibold text-gray-700">Certification<input className={input} value={draft.certification} onChange={e => setDraft({ ...draft, certification: e.target.value })}/></label>
            <label className="text-xs font-semibold text-gray-700">Skill added on completion<input className={input} value={draft.skillName} onChange={e => setDraft({ ...draft, skillName: e.target.value })}/></label>
            <label className="text-xs font-semibold text-gray-700">Pass score (%)<input type="number" className={input} value={draft.passScore} onChange={e => setDraft({ ...draft, passScore: Number(e.target.value) })}/></label>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">Thumbnail image
              <input className={input} placeholder="Paste an image URL or upload below" value={draft.imageUrl} onChange={e => setDraft({ ...draft, imageUrl: e.target.value })}/>
            </label>
            <div className="flex items-center gap-2">
              <label className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-gray-50">
                {thumbBusy ? 'Uploading…' : 'Upload image'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={thumbBusy} onChange={e => { void uploadThumbnail(e.target.files?.[0]); e.target.value = ''; }}/>
              </label>
              {draft.imageUrl && <button type="button" onClick={() => setDraft({ ...draft, imageUrl: '' })} className="text-xs text-gray-500 hover:text-red-600">Clear</button>}
            </div>
            {draft.imageUrl && <img src={draft.imageUrl} alt="thumbnail preview" className="h-28 w-48 object-cover rounded-lg border border-gray-200"/>}
          </div>
          <label className="block text-xs font-semibold text-gray-700">Visible to
            <select className={input} value={draft.audience} onChange={e => setDraft({ ...draft, audience: e.target.value })}>
              <option value="all">All workers</option>
              <option value="contractors">All contractors (their workers)</option>
              <option value="employers">All employers (their workers)</option>
              <option value="selected">Selected contractors / employers</option>
            </select>
          </label>
          {draft.audience === 'selected' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Contractors</p>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-auto p-2 space-y-1">
                  {audienceOptions.contractors.length === 0 && <p className="text-[11px] text-gray-400">No contractors.</p>}
                  {audienceOptions.contractors.map(o => (
                    <label key={o.id} className="flex items-center gap-2 text-xs text-gray-700">
                      <input type="checkbox" className="accent-[#073B67]" checked={draft.audienceContractorIds.includes(o.id)}
                        onChange={e => setDraft({ ...draft, audienceContractorIds: e.target.checked ? [...draft.audienceContractorIds, o.id] : draft.audienceContractorIds.filter(x => x !== o.id) })}/>
                      {o.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Employers</p>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-auto p-2 space-y-1">
                  {audienceOptions.employers.length === 0 && <p className="text-[11px] text-gray-400">No employers.</p>}
                  {audienceOptions.employers.map(o => (
                    <label key={o.id} className="flex items-center gap-2 text-xs text-gray-700">
                      <input type="checkbox" className="accent-[#073B67]" checked={draft.audienceEmployerIds.includes(o.id)}
                        onChange={e => setDraft({ ...draft, audienceEmployerIds: e.target.checked ? [...draft.audienceEmployerIds, o.id] : draft.audienceEmployerIds.filter(x => x !== o.id) })}/>
                      {o.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <label className="block text-xs font-semibold text-gray-700">Description<textarea rows={2} className={input + ' h-auto py-2'} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></label>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} className="accent-[#073B67] w-4 h-4"/>Active (visible to workers)</label>

          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">Modules & content</p><button onClick={() => setDraft({ ...draft, modules: [...draft.modules, emptyModule()] })} className="text-[11px] font-bold text-[#073B67] inline-flex items-center gap-1"><Plus size={12}/>Add module</button></div>

            {draft.modules.map((m, i) => <div key={i} className="rounded-xl border border-gray-200 p-3 mb-3 space-y-3 bg-gray-50/40">
              <div className="flex items-center gap-2"><input className={input + ' flex-1 mt-0 bg-white'} placeholder={`Module ${i + 1} title`} value={m.title} onChange={e => setMod(i, { title: e.target.value })}/><button onClick={() => setDraft({ ...draft, modules: draft.modules.filter((_, k) => k !== i) })} className="text-gray-400 hover:text-red-600" aria-label="Remove module"><Trash2 size={14}/></button></div>

              {/* Lessons */}
              <div className="rounded-lg border border-gray-100 bg-white p-2.5">
                <div className="flex items-center justify-between mb-1.5"><p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Video lessons</p><button onClick={() => setMod(i, { lessons: [...m.lessons, { title: '', duration: '', youtubeUrl: '' }] })} className="text-[11px] font-bold text-[#073B67] inline-flex items-center gap-1"><Plus size={11}/>Add lesson</button></div>
                {m.lessons.map((l, j) => <div key={j} className="grid grid-cols-[1fr_80px_1fr_24px] gap-2 items-center mb-1.5">
                  <input className={input + ' mt-0'} placeholder="Lesson title" value={l.title} onChange={e => setLesson(i, j, { title: e.target.value })}/>
                  <input className={input + ' mt-0'} placeholder="Duration" value={l.duration ?? ''} onChange={e => setLesson(i, j, { duration: e.target.value })}/>
                  <input className={input + ' mt-0'} placeholder="YouTube URL" value={l.youtubeUrl ?? ''} onChange={e => setLesson(i, j, { youtubeUrl: e.target.value })}/>
                  <button onClick={() => setMod(i, { lessons: m.lessons.filter((_, x) => x !== j) })} className="text-gray-400 hover:text-red-600" aria-label="Remove lesson"><X size={14}/></button>
                </div>)}
              </div>

              {/* Readings */}
              <div className="rounded-lg border border-gray-100 bg-white p-2.5">
                <div className="flex items-center justify-between mb-1.5"><p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Readings</p><button onClick={() => setMod(i, { readings: [...m.readings, { title: '', body: '', resourceUrl: '', duration: '' }] })} className="text-[11px] font-bold text-[#073B67] inline-flex items-center gap-1"><Plus size={11}/>Add reading</button></div>
                {m.readings.map((r, j) => <div key={j} className="rounded-lg border border-gray-100 p-2 mb-1.5 space-y-1.5">
                  <div className="grid grid-cols-[1fr_90px_1fr_24px] gap-2 items-center">
                    <input className={input + ' mt-0'} placeholder="Reading title" value={r.title} onChange={e => setReading(i, j, { title: e.target.value })}/>
                    <input className={input + ' mt-0'} placeholder="Duration" value={r.duration ?? ''} onChange={e => setReading(i, j, { duration: e.target.value })}/>
                    <input className={input + ' mt-0'} placeholder="Resource URL" value={r.resourceUrl ?? ''} onChange={e => setReading(i, j, { resourceUrl: e.target.value })}/>
                    <button onClick={() => setMod(i, { readings: m.readings.filter((_, x) => x !== j) })} className="text-gray-400 hover:text-red-600" aria-label="Remove reading"><X size={14}/></button>
                  </div>
                  <textarea rows={2} className={input + ' mt-0 h-auto py-2'} placeholder="Article text (optional)" value={r.body ?? ''} onChange={e => setReading(i, j, { body: e.target.value })}/>
                </div>)}
              </div>

              {/* Assignments */}
              <div className="rounded-lg border border-gray-100 bg-white p-2.5">
                <div className="flex items-center justify-between mb-1.5"><p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Assignments &amp; quizzes</p><button onClick={() => setMod(i, { assignments: [...m.assignments, emptyAssignment()] })} className="text-[11px] font-bold text-[#073B67] inline-flex items-center gap-1"><Plus size={11}/>Add assignment</button></div>
                {m.assignments.map((a, j) => <div key={j} className="rounded-lg border border-gray-100 p-2.5 mb-2 space-y-2">
                  <div className="grid grid-cols-[1fr_140px_80px_24px] gap-2 items-center">
                    <input className={input + ' mt-0'} placeholder="Assignment title" value={a.title} onChange={e => setAssign(i, j, { title: e.target.value })}/>
                    <select className={input + ' mt-0'} value={a.type} onChange={e => setAssign(i, j, { type: e.target.value as Assignment['type'] })}>
                      <option value="QUIZ">Quiz</option><option value="WRITING">Written response</option><option value="UPLOAD">File upload</option>
                    </select>
                    <input type="number" min={0} max={100} className={input + ' mt-0'} placeholder="Pass %" value={a.passScore} onChange={e => setAssign(i, j, { passScore: Number(e.target.value) })}/>
                    <button onClick={() => setMod(i, { assignments: m.assignments.filter((_, x) => x !== j) })} className="text-gray-400 hover:text-red-600" aria-label="Remove assignment"><X size={14}/></button>
                  </div>
                  <textarea rows={2} className={input + ' mt-0 h-auto py-2'} placeholder="Instructions (optional)" value={a.instructions ?? ''} onChange={e => setAssign(i, j, { instructions: e.target.value })}/>
                  {a.type === 'QUIZ' && <div className="rounded-lg border border-gray-100 p-2 space-y-2">
                    <div className="flex items-center justify-between"><p className="text-[11px] font-bold text-gray-500">Questions</p><button onClick={() => setAssign(i, j, { questions: [...a.questions, emptyQuestion()] })} className="text-[11px] font-bold text-[#073B67] inline-flex items-center gap-1"><Plus size={11}/>Add question</button></div>
                    {a.questions.map((q, k) => <div key={k} className="rounded-lg bg-gray-50 p-2 space-y-1.5">
                      <div className="flex items-center gap-2"><input className={input + ' mt-0 flex-1 bg-white'} placeholder={`Question ${k + 1}`} value={q.question} onChange={e => setQuestion(i, j, k, { question: e.target.value })}/><button onClick={() => setAssign(i, j, { questions: a.questions.filter((_, x) => x !== k) })} className="text-gray-400 hover:text-red-600" aria-label="Remove question"><X size={14}/></button></div>
                      {q.options.map((o, oi) => <div key={oi} className="flex items-center gap-2">
                        <input type="radio" name={`correct-${i}-${j}-${k}`} checked={q.correctIndex === oi} onChange={() => setQuestion(i, j, k, { correctIndex: oi })} className="accent-[#073B67] w-4 h-4" title="Mark as correct answer"/>
                        <input className={input + ' mt-0 bg-white'} placeholder={`Option ${oi + 1}`} value={o} onChange={e => setQuestion(i, j, k, { options: q.options.map((oo, x) => x === oi ? e.target.value : oo) })}/>
                        {q.options.length > 2 && <button onClick={() => setQuestion(i, j, k, { options: q.options.filter((_, x) => x !== oi), correctIndex: Math.min(q.correctIndex, q.options.length - 2) })} className="text-gray-400 hover:text-red-600" aria-label="Remove option"><X size={13}/></button>}
                      </div>)}
                      <button onClick={() => setQuestion(i, j, k, { options: [...q.options, ''] })} className="text-[11px] font-bold text-gray-500 inline-flex items-center gap-1"><Plus size={10}/>Add option</button>
                    </div>)}
                  </div>}
                </div>)}
              </div>
            </div>)}
          </div>
        </div>
        <footer className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex justify-end gap-2 z-10"><button onClick={() => setDraft(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button><button onClick={() => void save()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">{busy ? 'Saving…' : 'Save course'}</button></footer>
      </section>
    </div>}
  </div>;
}
