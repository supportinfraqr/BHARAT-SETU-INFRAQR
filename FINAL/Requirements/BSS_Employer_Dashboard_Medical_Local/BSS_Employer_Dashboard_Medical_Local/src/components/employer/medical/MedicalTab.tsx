"use client";

/** Employer · Medical Officer workspace ("Medical Final.html" in BSS style).
 *  Lists every worker by site, records Part-A/Part-B examinations and generates the
 *  certificate on the state form BSS issued to that worker's site. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Ban, CalendarCheck, CheckCheck, CheckCircle2, ClipboardCheck, Clock3, Eye, FileCheck2, FileText, IdCard, Inbox, MapPin, Paperclip, Plus, Printer, ShieldCheck, Stethoscope, Trash2, UserRound, Users, X } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { EmptyFiltered, FilterChips, Pager, SearchBox, TABLE_HEAD, TABLE_ROW, type Tone } from '@/components/employer/DashboardUI';
import type { EmployerSite, EmployerWorker } from '@/types/portal';
import { medicalApi } from './api';
import { DEFAULT_TESTS, addMonths, daysUntil, fmtDate, fmtDateTime, normaliseState, todayIso } from './catalog';
import { certificateNo, fillForm } from './formEngine';
import { OSH_FORM_HTML } from './oshFormTemplate';
import type { Fitness, FormDispatch, MedicalExam, TestFlag, TestResult } from './types';
import { BTN_ACCENT, BTN_GHOST, BTN_PRIMARY, BTN_SM, Field, FormFrame, INPUT, KpiTile, Modal, Pill, SubHead, TEXTAREA, initials, printFrame, useToast } from './ui';

type MedStatus = 'Valid' | 'Due Soon' | 'Expired' | 'Not examined';
type Row = { worker: EmployerWorker; site?: EmployerSite; state: string; exam?: MedicalExam; status: MedStatus; days: number | null; form?: FormDispatch };
const PAGE = 12;

function medStatus(exam?: MedicalExam): { status: MedStatus; days: number | null } {
  if (!exam) return { status: 'Not examined', days: null };
  const d = daysUntil(exam.nextDue);
  if (d === null || d < 0) return { status: 'Expired', days: d };
  return { status: d <= 30 ? 'Due Soon' : 'Valid', days: d };
}
const STATUS_TONE: Record<MedStatus, Tone> = { Valid: 'green', 'Due Soon': 'orange', Expired: 'red', 'Not examined': 'red' };

function gate(r: Row): { label: string; tone: Tone; icon: typeof CheckCircle2 } {
  if (r.status === 'Expired' || r.status === 'Not examined' || r.exam?.overall === 'Unfit') return { label: 'Blocked', tone: 'red', icon: Ban };
  if (r.status === 'Due Soon' || r.exam?.overall === 'Fit with restrictions') return { label: r.exam?.overall === 'Fit with restrictions' ? 'Restricted' : 'Action req.', tone: 'orange', icon: AlertTriangle };
  return { label: 'Eligible', tone: 'green', icon: CheckCircle2 };
}

function dueText(r: Row) {
  if (r.status === 'Not examined') return 'No examination on record';
  if (r.days === null) return '';
  if (r.days < 0) return `Expired ${-r.days} day${r.days === -1 ? '' : 's'} ago`;
  if (r.days <= 30) return `Due in ${r.days} day${r.days === 1 ? '' : 's'}`;
  const m = Math.round(r.days / 30.4);
  return m >= 12 ? `Next due in ${(m / 12).toFixed(m % 12 ? 1 : 0)} yr` : `Next due in ${m} mo`;
}

function tenure(doj: string) {
  const s = new Date(`${doj}T00:00:00`);
  if (Number.isNaN(s.getTime())) return '';
  const n = new Date();
  const months = Math.max(0, (n.getFullYear() - s.getFullYear()) * 12 + n.getMonth() - s.getMonth());
  return months >= 12 ? `${Math.floor(months / 12)}y ${months % 12}m service` : `${months}m service`;
}

export default function MedicalTab() {
  const { employer } = useEmployer();
  const { toast, node: toastNode } = useToast();
  const [forms, setForms] = useState<FormDispatch[]>([]);
  const [exams, setExams] = useState<Record<string, MedicalExam[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [site, setSite] = useState('all');
  const [status, setStatus] = useState<'all' | MedStatus>('all');
  const [page, setPage] = useState(1);
  const [recording, setRecording] = useState<Row | null>(null);
  const [cert, setCert] = useState<{ row: Row; exam: MedicalExam } | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [formView, setFormView] = useState<FormDispatch | null>(null);

  const employerId = employer.identity.bssId;
  const workerIds = useMemo(() => employer.workers.map(w => w.id), [employer.workers]);
  useEffect(() => {
    let live = true;
    Promise.all([medicalApi.receivedForms(employerId), workerIds.length ? medicalApi.exams(workerIds) : Promise.resolve({})])
      .then(([f, e]) => { if (live) { setForms(f); setExams(e); setError(''); } })
      .catch(e => { if (live) setError((e as Error).message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [employerId, workerIds]);

  const siteById = useMemo(() => new Map(employer.sites.map(s => [s.id, s])), [employer.sites]);
  /** Latest form issued to each site. */
  const formBySite = useMemo(() => {
    const m = new Map<string, FormDispatch>();
    [...forms].sort((a, b) => a.sentAt.localeCompare(b.sentAt)).forEach(d => d.siteIds.forEach(id => m.set(id, d)));
    return m;
  }, [forms]);

  const rows: Row[] = useMemo(() => employer.workers.map(w => {
    const s = siteById.get(w.siteId);
    const exam = exams[w.id]?.[0];
    return { worker: w, site: s, state: normaliseState(s?.state), exam, ...medStatus(exam), form: formBySite.get(w.siteId) };
  }), [employer.workers, siteById, exams, formBySite]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(r => (site === 'all' || r.worker.siteId === site) && (status === 'all' || r.status === status)
      && (!needle || `${r.worker.name} ${r.worker.bssId} ${r.worker.mobile} ${r.worker.designation} ${r.worker.contractor} ${r.worker.site} ${r.exam?.partA.department ?? ''} ${r.exam?.partA.role ?? ''}`.toLowerCase().includes(needle)));
  }, [rows, q, site, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * PAGE, cur * PAGE);
  const count = (s: MedStatus) => rows.filter(r => r.status === s).length;

  return <div className="space-y-5">
    {toastNode}
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Medical KPIs">
      <KpiTile label="Total workers" value={rows.length} icon={Users} tone="blue" hint={`${employer.sites.length} sites`} />
      <KpiTile label="Medicals valid" value={count('Valid')} icon={CheckCircle2} tone="green" hint="Gate pass eligible" />
      <KpiTile label="Due soon" value={count('Due Soon')} icon={Clock3} tone="orange" hint="Next 30 days" />
      <KpiTile label="Expired / not examined" value={count('Expired') + count('Not examined')} icon={AlertTriangle} tone="red" hint="Gate pass blocked" />
    </section>

    {/* Forms issued by BSS, per site */}
    <section className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden">
      <header className="px-5 py-4 border-b border-[#DBE3EF] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-[#1E3A8A] text-white grid place-items-center"><Inbox size={15} /></span>
          <div><h3 className="text-sm font-bold text-[#01183A]">Health forms issued by BSS</h3>
            <p className="text-[11px] text-bss-text-muted">Medical forms are state specific. Each site uses the form BSS issued for its state.</p></div>
        </div>
        <Pill tone="blue">{employer.sites.filter(s => formBySite.has(s.id)).length} / {employer.sites.length} sites ready</Pill>
      </header>
      <div className="p-4 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {employer.sites.map(s => {
          const f = formBySite.get(s.id);
          return <div key={s.id} className={`relative rounded-2xl border p-3.5 ${f ? 'border-[#BFE3CB] bg-[#EAF5EE]/50' : 'border-dashed border-[#DBE3EF] bg-[#F2F6FC]/50'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="text-xs font-extrabold text-[#01183A] truncate">{s.name}</p>
                <p className="text-[10px] text-bss-text-muted flex items-center gap-1 mt-0.5"><MapPin size={10} className="text-[#E45D24]" />{s.location}, {s.state}</p></div>
              {f ? <Pill tone="green">v{f.version}</Pill> : <Pill tone="orange">Awaiting</Pill>}
            </div>
            {f ? <>
              <p className="mt-2 text-[10px] text-bss-text-secondary">{normaliseState(s.state)} Form-VIII / IX · received {fmtDate(f.sentAt)}</p>
              {f.note && <p className="mt-1 text-[10px] italic text-bss-text-muted line-clamp-2">“{f.note}”</p>}
              <button type="button" onClick={() => setFormView(f)} className={`${BTN_SM} mt-2 bg-white border border-[#DBE3EF] text-[#01183A] hover:border-[#1E3A8A]/40`}><Eye size={12} /> View form</button>
            </> : <p className="mt-2 text-[10px] text-bss-text-muted">BSS has not issued the {normaliseState(s.state)} form to this site yet. Examinations here can be recorded once it arrives.</p>}
          </div>;
        })}
      </div>
    </section>

    {/* Records */}
    <section className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-[#DBE3EF] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="text-sm font-bold text-[#01183A]">Medical records</h3><p className="text-[11px] text-bss-text-muted">Examinations, reports and gate pass eligibility · filter by site</p></div>
          <SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search name, BSS ID, role, dept…" className="w-full sm:w-72" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-bss-text-muted">Site
            <select value={site} onChange={e => { setSite(e.target.value); setPage(1); }} className="h-8 rounded-full border border-[#DBE3EF] bg-white px-2.5 text-xs text-[#01183A]">
              <option value="all">All sites</option>
              {employer.sites.map(s => <option key={s.id} value={s.id}>{s.name} · {s.state}</option>)}
            </select>
          </label>
          <FilterChips value={status} onChange={v => { setStatus(v); setPage(1); }} options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'Valid', label: 'Valid', dot: '#14843C', count: count('Valid') },
            { value: 'Due Soon', label: 'Due soon', dot: '#E45D24', count: count('Due Soon') },
            { value: 'Expired', label: 'Expired', dot: '#DC2626', count: count('Expired') },
            { value: 'Not examined', label: 'Not examined', dot: '#94A3B8', count: count('Not examined') },
          ]} />
        </div>
      </div>
      {error && <p role="alert" className="m-4 rounded-2xl bg-[#FDECEC] text-[#DC2626] text-xs p-3">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[1120px]">
          <thead className={TABLE_HEAD}><tr>
            <th className="pl-5 pr-3 py-2.5">Worker details</th><th className="px-3 py-2.5">Joining date</th><th className="px-3 py-2.5">Designation</th><th className="px-3 py-2.5">Dept / role</th>
            <th className="px-3 py-2.5">Contractor / site</th><th className="px-3 py-2.5">Medical status</th><th className="px-3 py-2.5">Valid until</th><th className="px-3 py-2.5">Gate pass</th><th className="pl-3 pr-5 py-2.5 text-right">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-[#DBE3EF]">
            {loading && rows.length === 0 ? <tr><td colSpan={9} className="py-10 text-center text-bss-text-muted">Loading medical records…</td></tr>
              : slice.length === 0 ? <tr><td colSpan={9}><EmptyFiltered onReset={() => { setQ(''); setSite('all'); setStatus('all'); }} /></td></tr>
              : slice.map(r => {
                const g = gate(r);
                const tint = r.status === 'Expired' || r.status === 'Not examined' ? 'bg-[#FDECEC]/30' : r.status === 'Due Soon' ? 'bg-[#FDF0EA]/40' : '';
                return <tr key={r.worker.id} className={`${TABLE_ROW} ${tint}`}>
                  <td className="pl-5 pr-3 py-3"><div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-[#01183A] text-white grid place-items-center text-[10px] font-bold shrink-0">{initials(r.worker.name)}</span>
                    <div className="min-w-0"><p className="font-semibold text-[#01183A] whitespace-nowrap">{r.worker.name}</p><p className="font-mono text-[10px] text-bss-text-muted whitespace-nowrap">{r.worker.bssId} · {r.worker.mobile}</p></div>
                  </div></td>
                  <td className="px-3 py-3 whitespace-nowrap"><p className="text-[#01183A]">{fmtDate(r.worker.doj)}</p><p className="text-[10px] text-bss-text-muted">{tenure(r.worker.doj)}</p></td>
                  <td className="px-3 py-3 whitespace-nowrap text-[#01183A]">{r.worker.designation}</td>
                  <td className="px-3 py-3">{r.exam?.partA.department ? <><span className="inline-flex px-2 py-0.5 rounded-md bg-[#F2F6FC] border border-[#DBE3EF] text-[10px] font-semibold text-bss-text-secondary">{r.exam.partA.department}</span><p className="text-[10px] text-bss-text-muted mt-0.5 max-w-[160px] truncate">{r.exam.partA.role}</p></> : <span className="text-bss-text-muted">—</span>}</td>
                  <td className="px-3 py-3 whitespace-nowrap"><p className="text-[#01183A]">{r.worker.contractor}</p><p className="text-[10px] text-bss-text-muted">{r.worker.site} · {r.state || '—'}</p></td>
                  <td className="px-3 py-3"><Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill>{r.exam && r.exam.overall !== 'Fit' && <p className={`mt-1 text-[10px] font-semibold ${r.exam.overall === 'Unfit' ? 'text-[#DC2626]' : 'text-[#E45D24]'}`}>{r.exam.overall}</p>}</td>
                  <td className="px-3 py-3 whitespace-nowrap"><p className={r.status === 'Valid' ? 'text-[#01183A]' : r.status === 'Due Soon' ? 'text-[#E45D24] font-semibold' : 'text-[#DC2626] font-semibold'}>{fmtDate(r.exam?.nextDue)}</p><p className="text-[10px] text-bss-text-muted">{dueText(r)}</p></td>
                  <td className="px-3 py-3"><Pill tone={g.tone} dot={false}><g.icon size={11} />{g.label}</Pill></td>
                  <td className="pl-3 pr-5 py-3"><div className="flex justify-end gap-1.5">
                    {r.exam && r.status === 'Valid'
                      ? <button type="button" onClick={() => setCert({ row: r, exam: r.exam! })} className={`${BTN_SM} bg-[#EEF2FB] text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white`}><FileCheck2 size={12} /> Certificate</button>
                      : <RecordButton row={r} onClick={() => setRecording(r)} />}
                    <button type="button" onClick={() => setViewing(r)} className={`${BTN_SM} border border-[#DBE3EF] bg-white text-[#01183A] hover:border-[#1E3A8A]/40`}><Eye size={12} /> View</button>
                  </div></td>
                </tr>;
              })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-[#DBE3EF] bg-[#F2F6FC]/50"><Pager page={cur} pages={pages} total={filtered.length} noun="worker" onPage={setPage} /></div>
    </section>

    <p className="rounded-2xl border border-[#DBE3EF] bg-[#EEF2FB]/60 p-3 text-[11px] text-[#1E3A8A] flex gap-2"><CalendarCheck size={14} className="shrink-0" />Reminders go to the contractor, site in-charge and worker 30 days before the next due date. Gate pass is blocked automatically on expiry or an “Unfit” opinion.</p>

    {formView && <Modal title={`${formView.state} health form · v${formView.version}`} subtitle={`Issued by BSS on ${fmtDateTime(formView.sentAt)} to ${formView.siteNames.join(', ')}`} onClose={() => setFormView(null)} size="xl"
      footer={<button type="button" className={BTN_GHOST} onClick={() => setFormView(null)}>Close</button>}>
      <FormFrame html={formView.html} title={`${formView.state} form`} className="h-[70vh] rounded-2xl" />
    </Modal>}
    {recording && <ExamModal row={recording} company={employer.identity.company} onClose={() => setRecording(null)}
      onSaved={exam => { setExams(m => ({ ...m, [exam.workerId]: [exam, ...(m[exam.workerId] ?? [])] })); const row = recording; setRecording(null); setCert({ row, exam }); toast('Examination saved. Certificate generated on the state form.'); }}
      onError={m => toast(m, 'red')} />}
    {cert && <CertificateModal row={cert.row} exam={cert.exam} company={employer.identity.company} onClose={() => setCert(null)} />}
    {viewing && <WorkerMedicalView row={viewing} history={exams[viewing.worker.id] ?? []} onClose={() => setViewing(null)}
      onRecord={() => { const r = viewing; setViewing(null); setRecording(r); }} onCert={exam => { const r = viewing; setViewing(null); setCert({ row: r, exam }); }} />}
  </div>;
}

function RecordButton({ row, onClick }: { row: Row; onClick: () => void }) {
  const blocked = !row.form;
  return <button type="button" onClick={onClick} disabled={blocked} title={blocked ? `Waiting for BSS to issue the ${row.state} form to ${row.worker.site}` : undefined}
    className={`${BTN_SM} text-white disabled:bg-[#94A3B8] disabled:cursor-not-allowed ${row.status === 'Expired' || row.status === 'Not examined' ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'bg-[#01183A] hover:bg-[#022B5E]'}`}>
    <Stethoscope size={12} /> {blocked ? 'Awaiting form' : 'Record exam'}
  </button>;
}

/* ───────────────────────── Record examination ───────────────────────── */

function blankExam(row: Row, company: string, previous?: MedicalExam): MedicalExam {
  const p = previous?.partA;
  const exam = todayIso();
  return {
    id: '', workerId: row.worker.id, siteId: row.worker.siteId, state: row.state, formType: 'VIII', dispatchId: row.form?.id ?? null, formVersion: row.form?.version ?? null,
    partA: {
      name: row.worker.name, gender: p?.gender || 'Male', dob: p?.dob || '', company: row.worker.contractor || company, designation: row.worker.designation,
      department: p?.department || '', role: p?.role || row.worker.designation, uan: p?.uan || '', aadhaar: p?.aadhaar || '',
      incharge: p?.incharge || 'Site Safety Officer', mobile: row.worker.mobile, email: p?.email || '',
      address: p?.address || [row.site?.name, row.site?.location, row.site?.state].filter(Boolean).join(', '), illness: p?.illness || 'None reported', nature: p?.nature || '',
    },
    tests: DEFAULT_TESTS.map(t => ({ key: t.key, name: t.name, unit: t.unit, result: '', flag: 'Normal' as TestFlag, fileName: '' })),
    doctor: { name: previous?.doctor.name ?? '', reg: previous?.doctor.reg ?? '', hospital: previous?.doctor.hospital ?? '' },
    examDate: exam, intervalMonths: 24, nextDue: addMonths(exam, 24), remarks: '', heightWork: { value: 'NA', detail: '' },
    overall: 'Fit', restrictions: '', altFit: { enabled: false, role: '', work: '', dept: '', remarks: '' }, unfit: { role: '', work: '', dept: '', recommendation: '' }, recordedAt: '',
  };
}

function ExamModal({ row, company, onClose, onSaved, onError }: { row: Row; company: string; onClose: () => void; onSaved: (e: MedicalExam) => void; onError: (m: string) => void }) {
  const [exam, setExam] = useState<MedicalExam>(() => blankExam(row, company, row.exam));
  const [saving, setSaving] = useState(false);
  const pa = <K extends keyof MedicalExam['partA']>(k: K, v: string) => setExam(e => ({ ...e, partA: { ...e.partA, [k]: v } }));
  const set = <K extends keyof MedicalExam>(k: K, v: MedicalExam[K]) => setExam(e => ({ ...e, [k]: v }));
  const setTest = (i: number, patch: Partial<TestResult>) => setExam(e => {
    const tests = e.tests.map((t, j) => j === i ? { ...t, ...patch } : t);
    const h = parseFloat(tests.find(t => t.key === 'height')?.result.replace(/[^\d.]/g, '') ?? '');
    const w = parseFloat(tests.find(t => t.key === 'weight')?.result.replace(/[^\d.]/g, '') ?? '');
    const b = tests.findIndex(t => t.key === 'bmi');
    if (b >= 0 && h >= 50 && w > 0) tests[b] = { ...tests[b], result: (w / ((h / 100) ** 2)).toFixed(1) };
    return { ...e, tests };
  });
  const attached = exam.tests.filter(t => t.fileName).length;

  async function save() {
    if (!exam.partA.name.trim()) return onError('Enter the worker name.');
    if (!exam.doctor.name.trim()) return onError('Enter the examining doctor’s name.');
    setSaving(true);
    try { onSaved(await medicalApi.saveExam({ ...exam, nextDue: addMonths(exam.examDate, exam.intervalMonths) })); }
    catch (e) { onError((e as Error).message); } finally { setSaving(false); }
  }

  return <Modal size="xl" onClose={onClose} title="Record medical examination"
    subtitle={<>{row.worker.name} · {row.worker.bssId} · {row.worker.designation} · {row.worker.site}</>}
    footer={<><button type="button" className={BTN_GHOST} onClick={onClose}>Cancel</button>
      <button type="button" className={BTN_ACCENT} onClick={save} disabled={saving}><FileCheck2 size={14} />{saving ? 'Saving…' : 'Save & generate certificate'}</button></>}>
    <div className="space-y-7">
      <div className="rounded-2xl border border-[#BFE3CB] bg-[#EAF5EE]/60 p-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-[#14532D] flex items-center gap-2"><FileText size={14} className="shrink-0" />Certificate will be generated on the <b>{row.state}</b> form v{row.form?.version} issued by BSS on {fmtDate(row.form?.sentAt)}.</p>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#01183A]">Form
          {(['VIII', 'IX'] as const).map(f => <button key={f} type="button" onClick={() => set('formType', f)} className={`${BTN_SM} ${exam.formType === f ? 'bg-[#01183A] text-white' : 'bg-white border border-[#DBE3EF] text-[#01183A]'}`}>Form-{f}{f === 'VIII' ? ' · factory' : ' · mines'}</button>)}
        </div>
      </div>

      <section>
        <SubHead icon={IdCard} title="Part A — Employee & job details" hint="Auto-filled from the worker master · editable" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Full name" className="md:col-span-2"><input className={INPUT} value={exam.partA.name} onChange={e => pa('name', e.target.value)} /></Field>
          <Field label="Gender"><select className={INPUT} value={exam.partA.gender} onChange={e => pa('gender', e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></Field>
          <Field label="Date of birth"><input type="date" className={INPUT} value={exam.partA.dob} onChange={e => pa('dob', e.target.value)} /></Field>
          <Field label="Company / contractor" className="md:col-span-2"><input className={INPUT} value={exam.partA.company} onChange={e => pa('company', e.target.value)} /></Field>
          <Field label="Designation"><input className={INPUT} value={exam.partA.designation} onChange={e => pa('designation', e.target.value)} /></Field>
          <Field label="Department"><input className={INPUT} value={exam.partA.department} onChange={e => pa('department', e.target.value)} placeholder="e.g. Production" /></Field>
          <Field label="Role" className="md:col-span-2"><input className={INPUT} value={exam.partA.role} onChange={e => pa('role', e.target.value)} /></Field>
          <Field label="UAN"><input className={INPUT} value={exam.partA.uan} onChange={e => pa('uan', e.target.value)} /></Field>
          <Field label="Aadhaar (masked, with consent)"><input className={INPUT} value={exam.partA.aadhaar} onChange={e => pa('aadhaar', e.target.value)} placeholder="XXXX XXXX 1234" /></Field>
          <Field label="In-charge employer / executive contact" className="md:col-span-2"><input className={INPUT} value={exam.partA.incharge} onChange={e => pa('incharge', e.target.value)} placeholder="Name · +91 XXXXX XXXXX" /></Field>
          <Field label="Mobile"><input className={INPUT} value={exam.partA.mobile} onChange={e => pa('mobile', e.target.value)} /></Field>
          <Field label="Email"><input type="email" className={INPUT} value={exam.partA.email} onChange={e => pa('email', e.target.value)} /></Field>
          <Field label="Complete personal / plant address" className="md:col-span-4"><input className={INPUT} value={exam.partA.address} onChange={e => pa('address', e.target.value)} /></Field>
          <Field label="Medical illness (current) / medication" className="md:col-span-2"><input className={INPUT} value={exam.partA.illness} onChange={e => pa('illness', e.target.value)} placeholder="e.g. None / Hypertension on medication" /></Field>
          <Field label="Nature of job (physical / chemical / biological / ergonomic)" className="md:col-span-2"><input className={INPUT} value={exam.partA.nature} onChange={e => pa('nature', e.target.value)} /></Field>
        </div>
      </section>

      <section>
        <SubHead icon={ClipboardCheck} title="Part B — Medical tests, results & reports" hint="Enter result values, mark interpretation and attach the lab / imaging report against each test."
          right={<div className="flex gap-1.5">
            <button type="button" className={`${BTN_SM} border border-[#DBE3EF] bg-white text-[#01183A]`} onClick={() => setExam(e => ({ ...e, tests: e.tests.map(t => t.flag === 'Not Done' ? t : { ...t, flag: 'Normal' }) }))}><CheckCheck size={12} /> Mark all normal</button>
            <button type="button" className={`${BTN_SM} bg-[#EEF2FB] text-[#1E3A8A]`} onClick={() => setExam(e => ({ ...e, tests: [...e.tests, { key: `custom_${Date.now()}`, name: '', unit: '', result: '', flag: 'Normal', fileName: '', custom: true }] }))}><Plus size={12} /> Add test</button>
          </div>} />
        <div className="rounded-2xl border border-[#DBE3EF] overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead className={`${TABLE_HEAD} sticky top-0 z-10`}><tr><th className="px-3 py-2 w-[27%]">Test / parameter</th><th className="px-3 py-2 w-[24%]">Result value</th><th className="px-3 py-2 w-[10%]">Unit</th><th className="px-3 py-2 w-[13%]">Interpretation</th><th className="px-3 py-2">Report upload</th><th className="px-2 py-2 w-8" /></tr></thead>
              <tbody className="divide-y divide-[#DBE3EF]">
                {exam.tests.map((t, i) => {
                  const def = DEFAULT_TESTS.find(d => d.key === t.key);
                  return <tr key={t.key} className={TABLE_ROW}>
                    <td className="px-3 py-1.5">{t.custom ? <input className={INPUT} value={t.name} placeholder="Test name…" onChange={e => setTest(i, { name: e.target.value })} /> : <span className="font-semibold text-[#01183A]">{t.name}</span>}</td>
                    <td className="px-3 py-1.5"><input className={INPUT} value={t.result} readOnly={def?.auto} placeholder={def?.ph} onChange={e => setTest(i, { result: e.target.value })} /></td>
                    <td className="px-3 py-1.5"><input className={INPUT} value={t.unit} readOnly={t.unit === '—'} onChange={e => setTest(i, { unit: e.target.value })} /></td>
                    <td className="px-3 py-1.5"><select value={t.flag} onChange={e => setTest(i, { flag: e.target.value as TestFlag })}
                      className={`${INPUT} font-bold ${t.flag === 'Normal' ? '!bg-[#EAF5EE] !text-[#14843C] !border-[#BFE3CB]' : t.flag === 'Abnormal' ? '!bg-[#FDECEC] !text-[#DC2626] !border-[#F8C9C9]' : '!text-bss-text-muted'}`}>
                      <option>Normal</option><option>Abnormal</option><option>Not Done</option></select></td>
                    <td className="px-3 py-1.5"><div className="flex items-center gap-2">
                      <label className={`${BTN_SM} border border-[#DBE3EF] bg-white text-bss-text-secondary cursor-pointer hover:border-[#1E3A8A]/40`}><Paperclip size={11} /> Attach
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) setTest(i, { fileName: f.name }); }} /></label>
                      {t.fileName ? <span className="inline-flex items-center gap-1 max-w-[140px] rounded-md bg-[#EAF5EE] border border-[#BFE3CB] text-[#14843C] px-1.5 py-0.5 text-[10px]"><span className="truncate" title={t.fileName}>{t.fileName}</span><button type="button" aria-label="Remove file" onClick={() => setTest(i, { fileName: '' })}><X size={10} /></button></span>
                        : <span className="text-[10px] text-bss-text-muted">No file</span>}
                    </div></td>
                    <td className="px-2 py-1.5 text-center">{t.custom && <button type="button" aria-label="Remove test" className="text-bss-text-muted hover:text-[#DC2626]" onClick={() => setExam(e => ({ ...e, tests: e.tests.filter((_, j) => j !== i) }))}><Trash2 size={13} /></button>}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-[#F2F6FC] border-t border-[#DBE3EF] flex flex-wrap justify-between gap-2 text-[11px] text-bss-text-muted">
            <span>Attach PDF / JPG / PNG reports — they are listed as annexures on the certificate.</span><span className="font-semibold text-[#01183A]">{attached} report{attached === 1 ? '' : 's'} attached</span>
          </div>
        </div>
      </section>

      <section>
        <SubHead icon={Stethoscope} title="Examining authority" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Doctor name"><input className={INPUT} value={exam.doctor.name} placeholder="Dr. A. K. Sharma" onChange={e => set('doctor', { ...exam.doctor, name: e.target.value })} /></Field>
          <Field label="Registration no."><input className={INPUT} value={exam.doctor.reg} placeholder="MCI-12345" onChange={e => set('doctor', { ...exam.doctor, reg: e.target.value })} /></Field>
          <Field label="Hospital / clinic"><input className={INPUT} value={exam.doctor.hospital} placeholder="City Medical Center" onChange={e => set('doctor', { ...exam.doctor, hospital: e.target.value })} /></Field>
        </div>
      </section>

      <section>
        <SubHead icon={CalendarCheck} title="Examination dates & remarks" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="Exam date"><input type="date" className={INPUT} value={exam.examDate} onChange={e => setExam(x => ({ ...x, examDate: e.target.value, nextDue: addMonths(e.target.value, x.intervalMonths) }))} /></Field>
          <Field label="Validity period"><select className={INPUT} value={exam.intervalMonths} onChange={e => setExam(x => ({ ...x, intervalMonths: Number(e.target.value), nextDue: addMonths(x.examDate, Number(e.target.value)) }))}>
            <option value={6}>6 months</option><option value={12}>1 year</option><option value={24}>2 years</option><option value={36}>3 years</option></select></Field>
          <Field label="Next due date (auto)"><input type="date" className={INPUT} value={exam.nextDue} readOnly disabled /></Field>
        </div>
        <Field label="Medical remarks / doctor’s observations (Item 13)"><textarea rows={2} className={TEXTAREA} value={exam.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Final diagnosis, opinion or treatment advised…" /></Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Field label="Seizure disorder / difficulty working at height? (Item 14)"><select className={INPUT} value={exam.heightWork.value} onChange={e => set('heightWork', { ...exam.heightWork, value: e.target.value as 'NA' | 'No' | 'Yes' })}>
            <option value="NA">NA (Not applicable)</option><option value="No">No</option><option value="Yes">Yes — specify works to be avoided</option></select></Field>
          <Field label="Works to be avoided (if yes)"><input className={INPUT} disabled={exam.heightWork.value !== 'Yes'} value={exam.heightWork.detail} onChange={e => set('heightWork', { ...exam.heightWork, detail: e.target.value })} placeholder="e.g. Work at height above 2 m, scaffolding" /></Field>
        </div>
      </section>

      <section>
        <SubHead icon={ShieldCheck} title="Fitness determination" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#DBE3EF] p-4">
            <p className="text-[11px] font-bold text-[#01183A] mb-2">Overall fitness opinion</p>
            <div className="flex flex-wrap gap-1.5 mb-3" role="radiogroup">
              {([['Fit', 'green'], ['Fit with restrictions', 'orange'], ['Unfit', 'red']] as Array<[Fitness, Tone]>).map(([v, tone]) => {
                const on = exam.overall === v;
                const c = tone === 'green' ? 'border-[#14843C] bg-[#EAF5EE] text-[#14843C]' : tone === 'orange' ? 'border-[#E45D24] bg-[#FDF0EA] text-[#C94D18]' : 'border-[#DC2626] bg-[#FDECEC] text-[#DC2626]';
                return <button key={v} type="button" role="radio" aria-checked={on} onClick={() => set('overall', v)} className={`h-8 px-3.5 rounded-full border text-xs font-bold ${on ? c : 'border-[#DBE3EF] bg-white text-bss-text-secondary'}`}>{v}</button>;
              })}
            </div>
            <Field label="Restrictions / conditions (if any)"><textarea rows={3} className={TEXTAREA} value={exam.restrictions} onChange={e => set('restrictions', e.target.value)} placeholder="e.g. Avoid night shift, no work at height, no lifting > 20 kg" /></Field>
          </div>
          <div className="rounded-2xl border border-[#BFE3CB] bg-[#EAF5EE]/40 p-4">
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#14843C]" checked={exam.altFit.enabled} onChange={e => set('altFit', { ...exam.altFit, enabled: e.target.checked })} />
              <span><span className="block text-xs font-bold text-[#14532D]">Fit for other role / work / department</span><span className="block text-[11px] text-[#14843C]">Medically fit, but not for the current assigned job.</span></span></label>
            {exam.altFit.enabled && <div className="mt-3 space-y-2">
              <Field label="Fit for role"><input className={INPUT} value={exam.altFit.role} onChange={e => set('altFit', { ...exam.altFit, role: e.target.value })} placeholder="e.g. Quality Inspector" /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Fit for work / activity"><input className={INPUT} value={exam.altFit.work} onChange={e => set('altFit', { ...exam.altFit, work: e.target.value })} /></Field>
                <Field label="Fit for department"><input className={INPUT} value={exam.altFit.dept} onChange={e => set('altFit', { ...exam.altFit, dept: e.target.value })} /></Field>
              </div>
              <Field label="Remarks"><textarea rows={2} className={TEXTAREA} value={exam.altFit.remarks} onChange={e => set('altFit', { ...exam.altFit, remarks: e.target.value })} /></Field>
            </div>}
          </div>
          <div className="lg:col-span-2 rounded-2xl border border-[#F8C9C9] bg-[#FDECEC]/40 p-4">
            <p className="text-xs font-bold text-[#991B1B] flex items-center gap-1.5"><AlertTriangle size={13} /> Unfit for role / work / department</p>
            <p className="text-[11px] text-[#B91C1C] mb-3">Declare what the worker is medically unfit for, with the recommended action.</p>
            <div className="grid md:grid-cols-3 gap-2 mb-2">
              <Field label="Unfit for role"><input className={INPUT} value={exam.unfit.role} onChange={e => set('unfit', { ...exam.unfit, role: e.target.value })} placeholder="e.g. Furnace Operator" /></Field>
              <Field label="Unfit for work / activity"><input className={INPUT} value={exam.unfit.work} onChange={e => set('unfit', { ...exam.unfit, work: e.target.value })} placeholder="e.g. Confined space entry" /></Field>
              <Field label="Unfit for department"><input className={INPUT} value={exam.unfit.dept} onChange={e => set('unfit', { ...exam.unfit, dept: e.target.value })} placeholder="e.g. Paint Shop" /></Field>
            </div>
            <Field label="Recommendation"><textarea rows={2} className={TEXTAREA} value={exam.unfit.recommendation} onChange={e => set('unfit', { ...exam.unfit, recommendation: e.target.value })} placeholder="e.g. Redeploy to stores; review after 3 months with specialist opinion" /></Field>
          </div>
        </div>
      </section>
    </div>
  </Modal>;
}

/* ───────────────────────── Certificate ───────────────────────── */

function CertificateModal({ row, exam, company, onClose }: { row: Row; exam: MedicalExam; company: string; onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const onFrame = useCallback((f: HTMLIFrameElement | null) => { frame.current = f; }, []);
  // Historic exams may predate the current form; render on the form issued to the site (or the Gazette default).
  const html = useMemo(() => {
    const merged: MedicalExam = { ...exam, partA: { ...exam.partA, name: exam.partA.name || row.worker.name, designation: exam.partA.designation || row.worker.designation,
      company: exam.partA.company || row.worker.contractor || company, mobile: exam.partA.mobile || row.worker.mobile, role: exam.partA.role || row.worker.designation } };
    return fillForm(row.form?.html ?? OSH_FORM_HTML, merged, { workerBssId: row.worker.bssId, siteName: row.worker.site, siteLocation: row.site?.location ?? '', state: row.state, formVersion: row.form?.version ?? null });
  }, [row, exam, company]);
  return <Modal size="xl" onClose={onClose} title="Health examination certificate"
    subtitle={<>{certificateNo(exam)} · {row.worker.name} · {row.state} Form-{exam.formType}{row.form ? ` v${row.form.version}` : ' (Gazette default)'}</>}
    footer={<><span className="mr-auto text-[11px] text-bss-text-muted flex items-center gap-1"><ShieldCheck size={12} /> Rendered on the BSS-issued state form · verification via QR</span>
      <button type="button" className={BTN_GHOST} onClick={onClose}>Close</button>
      <button type="button" className={BTN_PRIMARY} onClick={() => printFrame(frame.current)}><Printer size={14} /> Download / print PDF</button></>}>
    <FormFrame html={html} title="Certificate" className="h-[70vh] rounded-2xl" onFrame={onFrame} />
  </Modal>;
}

/* ───────────────────────── Worker view ───────────────────────── */

function WorkerMedicalView({ row, history, onClose, onRecord, onCert }: { row: Row; history: MedicalExam[]; onClose: () => void; onRecord: () => void; onCert: (e: MedicalExam) => void }) {
  const g = gate(row);
  const note = g.tone === 'green' ? 'This worker is eligible to enter the premises based on a valid medical record.'
    : g.tone === 'orange' ? (row.exam?.overall === 'Fit with restrictions' ? `Entry permitted with restrictions: ${row.exam.restrictions || 'see certificate'}.` : 'Medical examination is due shortly. Gate pass is blocked automatically on the due date.')
    : 'Gate pass is BLOCKED. The worker may not enter until a valid medical examination is recorded.';
  const info: Array<[string, string]> = [['Worker name', row.worker.name], ['BSS ID', row.worker.bssId], ['Phone', row.worker.mobile], ['Joining date', fmtDate(row.worker.doj)],
    ['Designation', row.worker.designation], ['Department', row.exam?.partA.department || '—'], ['Contractor', row.worker.contractor], ['Site', `${row.worker.site} · ${row.state}`]];
  return <Modal size="lg" onClose={onClose} title="Worker profile & gate pass" subtitle="Scan the QR at the turnstile for entry verification"
    footer={<><button type="button" className={BTN_GHOST} onClick={onClose}>Close</button>{row.form && <button type="button" className={BTN_PRIMARY} onClick={onRecord}><Stethoscope size={14} /> Record new exam</button>}</>}>
    <div className="grid md:grid-cols-[minmax(0,1fr)_240px] gap-5">
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#DBE3EF] bg-[#F2F6FC]/60 p-4 grid sm:grid-cols-2 gap-3">
          {info.map(([k, v]) => <div key={k}><p className="text-[10px] uppercase tracking-wider font-semibold text-bss-text-muted">{k}</p><p className="text-xs font-semibold text-[#01183A]">{v}</p></div>)}
        </div>
        <div className="rounded-2xl border border-[#DBE3EF] p-4 flex items-center justify-between gap-3">
          <div><p className="text-[10px] uppercase tracking-wider font-semibold text-bss-text-muted">Medical status</p><div className="mt-1"><Pill tone={STATUS_TONE[row.status]}>{row.status}</Pill></div></div>
          <div className="text-right"><p className="text-[10px] uppercase tracking-wider font-semibold text-bss-text-muted">Valid until</p><p className="text-sm font-bold text-[#01183A]">{fmtDate(row.exam?.nextDue)}</p></div>
        </div>
        <div className={`rounded-2xl p-3.5 flex gap-2.5 text-[11px] ${g.tone === 'green' ? 'bg-[#EEF2FB] text-[#1E3A8A]' : g.tone === 'orange' ? 'bg-[#FDF0EA] text-[#9A3412]' : 'bg-[#FDECEC] text-[#991B1B]'}`}><ShieldCheck size={15} className="shrink-0" /><div><p className="font-bold">Gate pass · {g.label}</p><p>{note}</p></div></div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#01183A] mb-2">Examination history</p>
          {history.length === 0 ? <p className="text-xs text-bss-text-muted">No examinations recorded.</p>
            : <ul className="space-y-1.5">{history.map(h => <li key={h.id} className="flex items-center justify-between gap-2 rounded-2xl border border-[#DBE3EF] px-3 py-2">
                <span className="min-w-0"><span className="block text-xs font-semibold text-[#01183A]">{fmtDate(h.examDate)} · {h.overall}</span><span className="block text-[10px] text-bss-text-muted truncate">{h.doctor.name || '—'} · valid until {fmtDate(h.nextDue)}</span></span>
                <button type="button" onClick={() => onCert(h)} className={`${BTN_SM} bg-[#EEF2FB] text-[#1E3A8A]`}><FileCheck2 size={12} /> Certificate</button>
              </li>)}</ul>}
        </div>
      </div>
      <div className="rounded-2xl border border-[#DBE3EF] bg-[#F2F6FC]/60 p-4 flex flex-col items-center text-center">
        <span className="w-12 h-12 rounded-full bg-[#01183A] text-white grid place-items-center mb-3"><UserRound size={20} /></span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Gate access QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(row.worker.bssId)}`} className="w-40 h-40 rounded-xl bg-white p-2 border border-[#DBE3EF]" />
        <p className="mt-3 text-xs font-bold text-[#01183A]">Gate access QR</p>
        <p className="text-[10px] text-bss-text-muted">Scan at the turnstile for attendance and access verification.</p>
      </div>
    </div>
  </Modal>;
}
