"use client";

import { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';

type Lesson = { title: string; duration?: string; youtubeUrl?: string };
type Module = { title: string; lessons: Lesson[] };
type Course = {
  id: number; code: string; title: string; provider: string; category: string; duration: string;
  description: string; instructor: string; certification: string; skillName: string;
  passScore: number; active: boolean; modules: Array<{ id: number; title: string; lessons: Array<{ id: number; title: string; duration: string; youtubeUrl: string }> }>;
};
type Draft = { id?: number; title: string; provider: string; category: string; duration: string; instructor: string; certification: string; skillName: string; description: string; passScore: number; active: boolean; modules: Module[] };

const emptyDraft = (): Draft => ({ title: '', provider: 'Bharat Shram Setu', category: '', duration: '', instructor: '', certification: '', skillName: '', description: '', passScore: 70, active: true, modules: [{ title: '', lessons: [{ title: '', duration: '', youtubeUrl: '' }] }] });

const input = 'mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, listRes] = await Promise.all([
        fetch('/api/admin/learning-config', { cache: 'no-store' }),
        fetch('/api/admin/courses', { cache: 'no-store' }),
      ]);
      const cfg = await cfgRes.json().catch(() => ({})) as { data?: { coursesEnabled: boolean } };
      const list = await listRes.json().catch(() => ({})) as { data?: Course[]; error?: string };
      if (cfg.data) setEnabled(cfg.data.coursesEnabled);
      if (listRes.ok) setCourses(list.data ?? []);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Courses could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

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

  function edit(c: Course) {
    setDraft({
      id: c.id, title: c.title, provider: c.provider, category: c.category, duration: c.duration,
      instructor: c.instructor, certification: c.certification, skillName: c.skillName,
      description: c.description, passScore: c.passScore, active: c.active,
      modules: c.modules.length ? c.modules.map(m => ({ title: m.title, lessons: m.lessons.map(l => ({ title: l.title, duration: l.duration, youtubeUrl: l.youtubeUrl })) }))
        : [{ title: '', lessons: [{ title: '', duration: '', youtubeUrl: '' }] }],
    });
    setError(''); setNotice('');
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim()) { setError('Course title is required.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { ...draft, modules: draft.modules.filter(m => m.title.trim()) };
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

  const setMod = (i: number, patch: Partial<Module>) => setDraft(d => d ? { ...d, modules: d.modules.map((m, k) => k === i ? { ...m, ...patch } : m) } : d);
  const setLesson = (i: number, j: number, patch: Partial<Lesson>) => setDraft(d => d ? { ...d, modules: d.modules.map((m, k) => k === i ? { ...m, lessons: m.lessons.map((l, x) => x === j ? { ...l, ...patch } : l) } : m) } : d);

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Skilling</p>
        <h1 className="text-2xl font-bold mt-1">Courses & Skills</h1>
        <p className="text-sm text-gray-500 mt-1">BSS Admin controls the course catalog and the worker skills module. Only courses created here appear on the worker Skills page.</p>
      </div>
      <button onClick={() => { setDraft(emptyDraft()); setError(''); setNotice(''); }} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1.5 self-start"><Plus size={14}/>New course</button>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

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
              <p className="text-[11px] text-gray-400">{c.code} · {c.provider || '—'} · {c.category || '—'} · {c.modules.length} module(s){c.skillName ? ` · skill: ${c.skillName}` : ''}</p>
            </div>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>{c.active ? 'Active' : 'Hidden'}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={() => edit(c)} className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold inline-flex items-center gap-1"><Pencil size={12}/>Edit</button>
            <button onClick={() => void remove(c)} disabled={busy} className="h-8 px-3 rounded-lg border border-red-200 text-red-600 text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"><Trash2 size={12}/>Delete</button>
          </div>
        </article>)}</div>}

    {draft && <div className="fixed inset-0 z-[95] bg-black/50 flex justify-end" role="presentation">
      <section role="dialog" aria-modal="true" className="bg-white w-full max-w-2xl h-full overflow-y-auto">
        <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between"><h2 className="text-sm font-bold">{draft.id ? 'Edit course' : 'New course'}</h2><button onClick={() => setDraft(null)} aria-label="Close"><X size={16}/></button></header>
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
          <label className="block text-xs font-semibold text-gray-700">Description<textarea rows={2} className={input + ' h-auto py-2'} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></label>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} className="accent-[#073B67] w-4 h-4"/>Active (visible to workers)</label>

          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">Modules & lessons</p><button onClick={() => setDraft({ ...draft, modules: [...draft.modules, { title: '', lessons: [{ title: '', duration: '', youtubeUrl: '' }] }] })} className="text-[11px] font-bold text-[#073B67] inline-flex items-center gap-1"><Plus size={12}/>Add module</button></div>
            {draft.modules.map((m, i) => <div key={i} className="rounded-xl border border-gray-100 p-3 mb-2 space-y-2">
              <div className="flex items-center gap-2"><input className={input + ' flex-1 mt-0'} placeholder={`Module ${i + 1} title`} value={m.title} onChange={e => setMod(i, { title: e.target.value })}/><button onClick={() => setDraft({ ...draft, modules: draft.modules.filter((_, k) => k !== i) })} className="text-gray-400 hover:text-red-600" aria-label="Remove module"><Trash2 size={14}/></button></div>
              {m.lessons.map((l, j) => <div key={j} className="grid grid-cols-[1fr_90px_1fr_28px] gap-2 items-center">
                <input className={input + ' mt-0'} placeholder="Lesson title" value={l.title} onChange={e => setLesson(i, j, { title: e.target.value })}/>
                <input className={input + ' mt-0'} placeholder="Duration" value={l.duration ?? ''} onChange={e => setLesson(i, j, { duration: e.target.value })}/>
                <input className={input + ' mt-0'} placeholder="YouTube URL" value={l.youtubeUrl ?? ''} onChange={e => setLesson(i, j, { youtubeUrl: e.target.value })}/>
                <button onClick={() => setMod(i, { lessons: m.lessons.filter((_, x) => x !== j) })} className="text-gray-400 hover:text-red-600" aria-label="Remove lesson"><X size={14}/></button>
              </div>)}
              <button onClick={() => setMod(i, { lessons: [...m.lessons, { title: '', duration: '', youtubeUrl: '' }] })} className="text-[11px] font-bold text-gray-500 inline-flex items-center gap-1"><Plus size={11}/>Add lesson</button>
            </div>)}
          </div>
        </div>
        <footer className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex justify-end gap-2"><button onClick={() => setDraft(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button><button onClick={() => void save()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">{busy ? 'Saving…' : 'Save course'}</button></footer>
      </section>
    </div>}
  </div>;
}
