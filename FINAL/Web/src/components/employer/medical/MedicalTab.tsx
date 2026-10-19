"use client";

/** Employer · Medical Officer workspace ("Medical Final.html" in BSS style).
 *  Lists every worker by site, records Part-A/Part-B examinations and generates the
 *  certificate on the state form BSS issued to that worker's site. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Ban, CalendarCheck, CheckCheck, CheckCircle2, ClipboardCheck, Clock3, Eye, FileCheck2, FileText, Inbox, MapPin, Paperclip, Printer, ShieldCheck, Stethoscope, UserRound, Users, X } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { useEmployerDocView } from '@/components/documentEngine/portalAdapters';
import { templateService } from '@/lib/documentEngine/services';
import { buildGatePassHtml } from '@/lib/documentEngine/gatePass';
import { GatePassViewer } from '@/components/documentEngine/GatePassViewer';
import { EmptyFiltered, FilterChips, Pager, SearchBox, TABLE_HEAD, TABLE_ROW, type Tone } from '@/components/employer/DashboardUI';
import type { EmployerSite, EmployerWorker } from '@/types/portal';
import { medicalApi } from './api';
import { addMonths, daysUntil, fmtDate, fmtDateTime, normaliseState, todayIso } from './catalog';
import { TEST_TOKENS, customTokens, humanLabel, testTokens } from './tokens';
import { certificateNo, fillForm } from './formEngine';
import { OSH_FORM_HTML } from './oshFormTemplate';
import type { Fitness, FormDispatch, MedicalExam, TestFlag, TestResult } from './types';
import { BTN_ACCENT, BTN_GHOST, BTN_PRIMARY, BTN_SM, Field, FormFrame, INPUT, KpiTile, Modal, Pill, SubHead, TEXTAREA, initials, printFrame, useToast } from './ui';

type MedStatus = 'Valid' | 'Due Soon' | 'Expired' | 'Not examined';
type Row = { worker: EmployerWorker; site?: EmployerSite; state: string; exam?: MedicalExam; exams: MedicalExam[]; status: MedStatus; days: number | null; form?: FormDispatch; forms?: Partial<Record<'VIII' | 'IX', FormDispatch>> };

function formFor(row: Row, type: 'VIII' | 'IX') { return row.forms?.[type] ?? (type === 'VIII' ? row.form : undefined); }
function examFor(row: Row, type: 'VIII' | 'IX') { return row.exams.find(e => e.formType === type); }
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
  const docCtx = useEmployerDocView();
  const { toast, node: toastNode } = useToast();
  const [forms, setForms] = useState<FormDispatch[]>([]);
  const [exams, setExams] = useState<Record<string, MedicalExam[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [site, setSite] = useState('all');
  const [status, setStatus] = useState<'all' | MedStatus>('all');
  const [page, setPage] = useState(1);
  const [recording, setRecording] = useState<{ row: Row; formType: 'VIII' | 'IX' } | null>(null);
  const [cert, setCert] = useState<{ row: Row; exam: MedicalExam } | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [formView, setFormView] = useState<FormDispatch | null>(null);
  const [passPreview, setPassPreview] = useState<{ html: string; title: string } | null>(null);

  // Render the worker's gate pass on demand from the employer's active gate-pass
  // template (owner branding) + the worker's live BSS data.
  async function viewGatePass(row: Row) {
    await templateService.hydrate(docCtx.owner);
    const worker = docCtx.workers.find(w => w.bssId === row.worker.bssId || w.id === row.worker.id);
    if (!worker) { toast(`No worker record found for ${row.worker.name}.`, 'red'); return; }
    const gp = employer.gatePasses?.find(p => p.workerId === row.worker.bssId || p.workerName === row.worker.name);
    if (!gp || gp.type === 'Not eligible' || gp.status === 'Not eligible') {
      toast(`No gate pass yet for ${row.worker.name}. Complete Medical, Health & Safety and Compliance first.`, 'red');
      return;
    }
    const type = gp?.type === 'Permanent' ? 'permanent-gate-pass' : 'temporary-gate-pass';
    const html = await buildGatePassHtml(docCtx.owner, docCtx.view, worker, type,
      gp ? { validFrom: gp.validFrom, validTo: gp.validTo, number: gp.number, status: gp.status, branding: gp.branding } : {});
    setPassPreview({ html, title: `${row.worker.name} · ${gp?.type ?? 'Temporary'} Gate Pass` });
  }

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
  /** Latest Form-VIII / Form-IX issued to each site (independent statuses). */
  const formBySite = useMemo(() => {
    const m = new Map<string, Partial<Record<'VIII' | 'IX', FormDispatch>>>();
    [...forms].sort((a, b) => a.sentAt.localeCompare(b.sentAt)).forEach(d => {
      d.siteIds.forEach(rawId => {
        const id = String(rawId);
        const current = m.get(id) ?? {};
        if (d.forms) {
          (['VIII', 'IX'] as const).forEach(ft => {
            const entry = d.forms?.[ft];
            if (entry) current[ft] = { ...d, ...entry, siteIds: d.siteIds, forms: d.forms };
          });
        } else {
          current[d.formType ?? 'VIII'] = d;
        }
        m.set(id, current);
      });
    });
    return m;
  }, [forms]);

  const rows: Row[] = useMemo(() => employer.workers.map(w => {
    const s = siteById.get(w.siteId);
    const list = exams[w.id] ?? [];
    const exam = list[0];
    const siteForms = formBySite.get(String(w.siteId)) ?? {};
    return { worker: w, site: s, state: normaliseState(s?.state), exam, exams: list, ...medStatus(exam), form: siteForms.VIII, forms: siteForms };
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
            <p className="text-[11px] text-bss-text-muted">Medical forms are state specific. Adopt the published Form-VIII / Form-IX for your states in <b>Medical Form Adoption</b>.</p></div>
        </div>
        <Pill tone="blue">{employer.sites.filter(s => !!formBySite.get(String(s.id))?.VIII).length} / {employer.sites.length} sites ready</Pill>
      </header>
      <div className="p-4 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {employer.sites.map(s => {
          const fm = formBySite.get(String(s.id));
          const required = fm?.VIII;
          return <div key={s.id} className={`relative rounded-2xl border p-3.5 ${required ? 'border-[#BFE3CB] bg-[#EAF5EE]/50' : 'border-dashed border-[#DBE3EF] bg-[#F2F6FC]/50'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="text-xs font-extrabold text-[#01183A] truncate">{s.name}</p>
                <p className="text-[10px] text-bss-text-muted flex items-center gap-1 mt-0.5"><MapPin size={10} className="text-[#E45D24]" />{s.location}, {s.state}</p></div>
              <Pill tone={required ? 'green' : 'orange'}>{required ? 'Ready' : 'Adopt form'}</Pill>
            </div>
            <p className="mt-2 text-[10px] text-bss-text-secondary">{normaliseState(s.state)}</p>
            <div className="mt-2 space-y-1.5">
              {(['VIII', 'IX'] as const).map(ft => {
                const form = fm?.[ft];
                return <div key={ft} className="rounded-xl border border-[#DBE3EF] bg-white/70 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-[#01183A]">Form-{ft}{ft === 'IX' ? ' · mines (optional)' : ''}</p>
                      <p className="text-[10px] text-bss-text-muted">
                        {form ? <>v{form.version} · received {fmtDate(form.sentAt)}{form.reAdoptAvailable ? ' · new version available' : ''}</>
                          : ft === 'IX' ? 'Not adopted — optional' : 'Not adopted — required'}
                      </p>
                    </div>
                    {form
                      ? <button type="button" onClick={() => setFormView(form)} className={`${BTN_SM} border border-[#DBE3EF] bg-white text-[#01183A] hover:border-[#1E3A8A]/40`}><Eye size={12} /> View</button>
                      : <span className="text-[10px] text-bss-text-muted">—</span>}
                  </div>
                </div>;
              })}
            </div>
            {fm?.VIII?.note && <p className="mt-1 text-[10px] italic text-bss-text-muted line-clamp-2">“{fm.VIII.note}”</p>}
            {(fm?.VIII?.reAdoptAvailable || fm?.IX?.reAdoptAvailable) && <p className="mt-1 text-[10px] font-semibold text-[#C94D18]">New version available — re-adopt in Medical Form Adoption.</p>}
            {!required && <p className="mt-1.5 text-[10px] text-bss-text-muted">Adopt <b>Form-VIII</b> in Medical Form Adoption to record examinations. Form-IX (mines) is optional.</p>}
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
                const gp = employer.gatePasses?.find(p => p.workerId === r.worker.bssId || p.workerName === r.worker.name);
                const hasGatePass = !!gp && gp.type !== 'Not eligible' && gp.status !== 'Not eligible';
                return <tr key={r.worker.id} className={`${TABLE_ROW} ${tint}`}>
                  <td className="pl-5 pr-3 py-3"><div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-[#01183A] text-white grid place-items-center text-[10px] font-bold shrink-0">{initials(r.worker.name)}</span>
                    <div className="min-w-0"><p className="font-semibold text-[#01183A] whitespace-nowrap">{r.worker.name}</p><p className="font-mono text-[10px] text-bss-text-muted whitespace-nowrap">{r.worker.bssId} · {r.worker.mobile}</p></div>
                  </div></td>
                  <td className="px-3 py-3 whitespace-nowrap"><p className="text-[#01183A]">{fmtDate(r.worker.doj)}</p><p className="text-[10px] text-bss-text-muted">{tenure(r.worker.doj)}</p></td>
                  <td className="px-3 py-3 whitespace-nowrap text-[#01183A]">{r.worker.designation}</td>
                  <td className="px-3 py-3">{r.exam?.partA.department ? <><span className="inline-flex px-2 py-0.5 rounded-md bg-[#F2F6FC] border border-[#DBE3EF] text-[10px] font-semibold text-bss-text-secondary">{r.exam.partA.department}</span><p className="text-[10px] text-bss-text-muted mt-0.5 max-w-[160px] truncate">{r.exam.partA.role}</p></> : <span className="text-bss-text-muted">—</span>}</td>
                  <td className="px-3 py-3 whitespace-nowrap"><p className="text-[#01183A]">{r.worker.contractor}</p><p className="text-[10px] text-bss-text-muted">{r.worker.site} · {r.state || '—'}</p></td>
                  <td className="px-3 py-3"><Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill>{r.exam && <p className="mt-1 text-[10px] text-bss-text-muted">Form-{r.exam.formType}{r.exam.formType === 'IX' ? ' · mines' : ''}</p>}{r.exam && r.exam.overall !== 'Fit' && <p className={`mt-1 text-[10px] font-semibold ${r.exam.overall === 'Unfit' ? 'text-[#DC2626]' : 'text-[#E45D24]'}`}>{r.exam.overall}</p>}</td>
                  <td className="px-3 py-3 whitespace-nowrap"><p className={r.status === 'Valid' ? 'text-[#01183A]' : r.status === 'Due Soon' ? 'text-[#E45D24] font-semibold' : 'text-[#DC2626] font-semibold'}>{fmtDate(r.exam?.nextDue)}</p><p className="text-[10px] text-bss-text-muted">{dueText(r)}</p></td>
                  <td className="px-3 py-3"><Pill tone={g.tone} dot={false}><g.icon size={11} />{g.label}</Pill></td>
                  <td className="pl-3 pr-5 py-3"><div className="flex flex-col items-end gap-1.5">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {(['VIII', 'IX'] as const).filter(ft => !!formFor(r, ft)).map(ft => {
                        const ex = examFor(r, ft);
                        return ex
                          ? <button key={ft} type="button" onClick={() => setCert({ row: r, exam: ex })} className={`${BTN_SM} bg-[#EEF2FB] text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white`}><FileCheck2 size={12} /> Form-{ft} certificate</button>
                          : <button key={ft} type="button" onClick={() => setRecording({ row: r, formType: ft })} className={`${BTN_SM} border border-[#DBE3EF] bg-white text-[#01183A] hover:border-[#1E3A8A]/40`}><Stethoscope size={12} /> Record Form-{ft}{ft === 'IX' ? ' (optional)' : ''}</button>;
                      })}
                    </div>
                    <button type="button" onClick={() => void viewGatePass(r)} disabled={!hasGatePass} title={hasGatePass ? undefined : 'No gate pass yet — complete Medical, Health & Safety and Compliance first'} className={`${BTN_SM} border border-[#DBE3EF] bg-white text-[#01183A] hover:border-[#1E3A8A]/40 disabled:opacity-40 disabled:cursor-not-allowed`}><Eye size={12} /> View Gate Pass</button>
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
    {recording && <ExamModal row={recording.row} initialFormType={recording.formType} company={employer.identity.company} onClose={() => setRecording(null)}
      onSaved={exam => { setExams(m => ({ ...m, [exam.workerId]: [exam, ...(m[exam.workerId] ?? []).filter(e => e.id !== exam.id)] })); const row = recording.row; setRecording(null); setCert({ row, exam }); toast(`Form-${exam.formType} examination saved. Certificate generated.`); }}
      onError={m => toast(m, 'red')} />}
    {cert && <CertificateModal row={cert.row} exam={cert.exam} company={employer.identity.company} onClose={() => setCert(null)} />}
    {viewing && <WorkerMedicalView row={viewing} history={exams[viewing.worker.id] ?? []} onClose={() => setViewing(null)}
      onRecord={() => { const r = viewing; setViewing(null); setRecording({ row: r, formType: formFor(r, 'VIII') ? 'VIII' : 'IX' }); }} onCert={exam => { const r = viewing; setViewing(null); setCert({ row: r, exam }); }} />}
    {passPreview && <GatePassViewer html={passPreview.html} title={passPreview.title} onClose={() => setPassPreview(null)} />}
  </div>;
}

/* ───────────────────────── Record examination ───────────────────────── */

/** Token scope for the Record Examination form: the selected form's section
 *  PLUS any tokens outside the sections (global custom fields), while excluding
 *  the other form's section. */
function formScope(row: Row, formType: 'VIII' | 'IX') {
  const html = formFor(row, formType)?.html || OSH_FORM_HTML;
  const other = formType === 'VIII' ? 'IX' : 'VIII';
  const otherRe = new RegExp(`<section\\s+data-form="${other}"[^>]*>[\\s\\S]*?</section>`, 'i');
  return html.replace(otherRe, '');
}
function buildTests(html: string, previous?: MedicalExam): TestResult[] {
  const prev = new Map((previous?.tests ?? []).map(t => [t.key, t]));
  return testTokens(html).map(key => {
    const p = prev.get(key);
    const def = TEST_TOKENS.find(t => t.token === `test.${key}`);
    return {
      key,
      name: p?.name || (def?.label ? def.label.replace(/ result$/, '') : humanLabel(key)),
      unit: p?.unit ?? '', result: p?.result ?? '', flag: p?.flag ?? 'Normal', fileName: p?.fileName ?? '',
    };
  });
}
function buildCustomFields(html: string, previous?: MedicalExam): Record<string, string> {
  const out: Record<string, string> = { ...(previous?.customFields ?? {}) };
  for (const t of customTokens(html)) if (!(t.key in out)) out[t.key] = '';
  return out;
}

function blankExam(row: Row, company: string, previous?: MedicalExam, type?: 'VIII' | 'IX'): MedicalExam {
  const p = previous?.partA;
  const exam = todayIso();
  const formType: 'VIII' | 'IX' = type ?? (formFor(row, 'VIII') ? 'VIII' : 'IX');
  const form = formFor(row, formType);
  const section = formScope(row, formType);
  return {
    id: '', workerId: row.worker.id, siteId: row.worker.siteId, state: row.state, formType, dispatchId: form?.id ?? null, formVersion: form?.version ?? null,
    partA: {
      name: row.worker.name, gender: p?.gender || 'Male', dob: p?.dob || '', company: row.worker.contractor || company, designation: row.worker.designation,
      department: p?.department || '', role: p?.role || row.worker.designation, uan: p?.uan || '', aadhaar: p?.aadhaar || '',
      incharge: p?.incharge || 'Site Safety Officer', mobile: row.worker.mobile, email: p?.email || '',
      address: p?.address || [row.site?.name, row.site?.location, row.site?.state].filter(Boolean).join(', '), illness: p?.illness || 'None reported', nature: p?.nature || '',
    },
    tests: buildTests(section, previous),
    customFields: buildCustomFields(section, previous),
    doctor: { name: previous?.doctor.name ?? '', reg: previous?.doctor.reg ?? '', hospital: previous?.doctor.hospital ?? '' },
    examDate: exam, intervalMonths: 24, nextDue: addMonths(exam, 24), remarks: '', heightWork: { value: 'NA', detail: '' },
    overall: 'Fit', restrictions: '', altFit: { enabled: false, role: '', work: '', dept: '', remarks: '' }, unfit: { role: '', work: '', dept: '', recommendation: '' }, recordedAt: '',
  };
}

function ExamModal({ row, company, initialFormType, onClose, onSaved, onError }: { row: Row; company: string; initialFormType?: 'VIII' | 'IX'; onClose: () => void; onSaved: (e: MedicalExam) => void; onError: (m: string) => void }) {
  const [exam, setExam] = useState<MedicalExam>(() => blankExam(row, company, examFor(row, initialFormType ?? 'VIII'), initialFormType));
  const [saving, setSaving] = useState(false);
  const sectionHtml = useMemo(() => formScope(row, exam.formType), [row, exam.formType]);
  const tokens = useMemo(() => new Set([...sectionHtml.matchAll(/\{\{\s*([A-Za-z0-9_.]+)\s*(?:\|[^}]*)?\}\}/g)].map(m => m[1])), [sectionHtml]);
  const has = (t: string) => tokens.has(t);
  const testKeys = useMemo(() => testTokens(sectionHtml), [sectionHtml]);
  const customDefs = useMemo(() => customTokens(sectionHtml), [sectionHtml]);

  const pa = <K extends keyof MedicalExam['partA']>(k: K, v: string) => setExam(e => ({ ...e, partA: { ...e.partA, [k]: v } }));
  const set = <K extends keyof MedicalExam>(k: K, v: MedicalExam[K]) => setExam(e => ({ ...e, [k]: v }));
  const switchFormType = (f: 'VIII' | 'IX') => { if (!formFor(row, f)) return; setExam(e => {
    const section = formScope(row, f);
    return { ...e, formType: f, tests: buildTests(section, e), customFields: buildCustomFields(section, e) };
  }); };
  const setTest = (i: number, patch: Partial<TestResult>) => setExam(e => {
    const tests = e.tests.map((t, j) => j === i ? { ...t, ...patch } : t);
    const h = parseFloat(tests.find(t => t.key === 'height')?.result.replace(/[^\d.]/g, '') ?? '');
    const w = parseFloat(tests.find(t => t.key === 'weight')?.result.replace(/[^\d.]/g, '') ?? '');
    const b = tests.findIndex(t => t.key === 'bmi');
    if (b >= 0 && h >= 50 && w > 0) tests[b] = { ...tests[b], result: (w / ((h / 100) ** 2)).toFixed(1) };
    return { ...e, tests };
  });
  const attached = exam.tests.filter(t => t.fileName).length;

  // Only the fields whose tokens exist in the adopted form are shown.
  const selfDefs: Array<{ token: string; key: keyof MedicalExam['partA']; label: string; type?: 'date' | 'select'; options?: string[]; className?: string }> = [
    { token: 'self.name', key: 'name', label: 'Full name', className: 'md:col-span-1' },
    { token: 'self.gender', key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
    { token: 'self.age_dob', key: 'dob', label: 'Date of birth', type: 'date' },
    { token: 'self.dob', key: 'dob', label: 'Date of birth', type: 'date' },
    { token: 'self.age', key: 'dob', label: 'Date of birth', type: 'date' },
    { token: 'self.company', key: 'company', label: 'Company / contractor' },
    { token: 'self.designation', key: 'designation', label: 'Designation' },
    { token: 'self.department', key: 'department', label: 'Department' },
    { token: 'self.role', key: 'role', label: 'Role' },
    { token: 'self.uan', key: 'uan', label: 'UAN' },
    { token: 'self.aadhaar', key: 'aadhaar', label: 'Aadhaar (masked, with consent)' },
    { token: 'self.mobile', key: 'mobile', label: 'Mobile' },
    { token: 'self.email', key: 'email', label: 'Email' },
    { token: 'self.address', key: 'address', label: 'Complete personal / plant address', className: 'md:col-span-2' },
  ];
  const selfFields: typeof selfDefs = [];
  const seenSelf = new Set<string>();
  for (const d of selfDefs) if (has(d.token) && !seenSelf.has(d.key)) { seenSelf.add(d.key); selfFields.push(d); }
  const showDate = has('exam.date');
  const showDoctor = has('exam.doctor');
  const showFitness = has('exam.fitness') || has('exam.diagnosis');
  const showRemarks = has('exam.remarks') || has('exam.diagnosis');
  const showSeizure = has('exam.seizure');
  const showIncharge = has('exam.incharge');
  const showIllness = has('exam.illness');
  const showNature = has('exam.nature');
  const showExamDetails = showDate || showDoctor || showFitness || showRemarks || showSeizure || showIncharge || showIllness || showNature;

  async function save() {
    // Tokens are optional — the certificate fills whatever data is available.
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
        <p className="text-[11px] text-[#14532D] flex items-center gap-2"><FileText size={14} className="shrink-0" />Certificate will be generated on the <b>{row.state}</b> Form-{exam.formType} v{formFor(row, exam.formType)?.version ?? row.form?.version} adopted by BSS.</p>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#01183A]">Form
          {(['VIII', 'IX'] as const).map(f => { const available = !!formFor(row, f); return <button key={f} type="button" disabled={!available} title={available ? undefined : `Form-${f} is not adopted for ${row.state}`} onClick={() => switchFormType(f)} className={`${BTN_SM} ${exam.formType === f ? 'bg-[#01183A] text-white' : 'bg-white border border-[#DBE3EF] text-[#01183A]'} disabled:opacity-40 disabled:cursor-not-allowed`}>Form-{f}{f === 'VIII' ? ' · factory' : ' · mines (optional)'}</button>; })}
        </div>
      </div>

      {selfFields.length > 0 && <section>
        <SubHead icon={UserRound} title="Part A — Employee & job details" hint="Only fields present as tokens in the adopted form are shown." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {selfFields.map(f => <Field key={f.key} label={f.label} className={f.className}>
            {f.type === 'select' ? <select className={INPUT} value={exam.partA[f.key]} onChange={e => pa(f.key, e.target.value)}>{(f.options ?? []).map(o => <option key={o}>{o}</option>)}</select>
              : <input type={f.type === 'date' ? 'date' : 'text'} lang={f.type === 'date' ? 'en-GB' : undefined} className={INPUT} value={exam.partA[f.key]} onChange={e => pa(f.key, e.target.value)} />}
          </Field>)}
        </div>
      </section>}

      {showExamDetails && <section>
        <SubHead icon={Stethoscope} title="Examination details" hint="Derived from the exam.* tokens in the adopted form." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {showDate && <Field label="Exam date"><input type="date" lang="en-GB" className={INPUT} value={exam.examDate} onChange={e => setExam(x => ({ ...x, examDate: e.target.value, nextDue: addMonths(e.target.value, x.intervalMonths) }))} /></Field>}
          {showDate && <Field label="Validity period"><select className={INPUT} value={exam.intervalMonths} onChange={e => setExam(x => ({ ...x, intervalMonths: Number(e.target.value), nextDue: addMonths(x.examDate, Number(e.target.value)) }))}>
            <option value={6}>6 months</option><option value={12}>1 year</option><option value={24}>2 years</option><option value={36}>3 years</option></select></Field>}
          {showDate && <Field label="Next due date (auto)"><input type="date" lang="en-GB" className={INPUT} value={exam.nextDue} readOnly disabled /></Field>}
          {showIncharge && <Field label="In-charge employer / executive contact" className="md:col-span-2"><input className={INPUT} value={exam.partA.incharge} onChange={e => pa('incharge', e.target.value)} /></Field>}
          {showIllness && <Field label="Medical illness (current) / medication" className="md:col-span-2"><input className={INPUT} value={exam.partA.illness} onChange={e => pa('illness', e.target.value)} /></Field>}
          {showNature && <Field label="Nature of job (physical / chemical / biological / ergonomic)" className="md:col-span-2"><input className={INPUT} value={exam.partA.nature} onChange={e => pa('nature', e.target.value)} /></Field>}
        </div>
        {showDoctor && <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <Field label="Doctor name"><input className={INPUT} value={exam.doctor.name} placeholder="Dr. A. K. Sharma" onChange={e => set('doctor', { ...exam.doctor, name: e.target.value })} /></Field>
          <Field label="Registration no."><input className={INPUT} value={exam.doctor.reg} placeholder="MCI-12345" onChange={e => set('doctor', { ...exam.doctor, reg: e.target.value })} /></Field>
          <Field label="Hospital / clinic"><input className={INPUT} value={exam.doctor.hospital} placeholder="City Medical Center" onChange={e => set('doctor', { ...exam.doctor, hospital: e.target.value })} /></Field>
        </div>}
        {showRemarks && <div className="mt-3"><Field label="Medical remarks / doctor’s observations"><textarea rows={2} className={TEXTAREA} value={exam.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Final diagnosis, opinion or treatment advised…" /></Field></div>}
        {showFitness && <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#DBE3EF] p-4">
            <p className="text-[11px] font-bold text-[#01183A] mb-2">Overall fitness opinion</p>
            <div className="flex flex-wrap gap-1.5 mb-3" role="radiogroup">
              {([['Fit', 'green'], ['Fit with restrictions', 'orange'], ['Unfit', 'red']] as Array<[Fitness, Tone]>).map(([v, tone]) => {
                const on = exam.overall === v;
                const c = tone === 'green' ? 'border-[#14843C] bg-[#EAF5EE] text-[#14843C]' : tone === 'orange' ? 'border-[#E45D24] bg-[#FDF0EA] text-[#C94D18]' : 'border-[#DC2626] bg-[#FDECEC] text-[#DC2626]';
                return <button key={v} type="button" role="radio" aria-checked={on} onClick={() => set('overall', v)} className={`h-8 px-3.5 rounded-full border text-xs font-bold ${on ? c : 'border-[#DBE3EF] bg-white text-bss-text-secondary'}`}>{v}</button>;
              })}
            </div>
            <Field label="Restrictions / conditions (if any)"><textarea rows={2} className={TEXTAREA} value={exam.restrictions} onChange={e => set('restrictions', e.target.value)} placeholder="e.g. Avoid night shift, no work at height" /></Field>
          </div>
        </div>}
        {showSeizure && <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Seizure disorder / difficulty working at height?"><select className={INPUT} value={exam.heightWork.value} onChange={e => set('heightWork', { ...exam.heightWork, value: e.target.value as 'NA' | 'No' | 'Yes' })}>
            <option value="NA">NA (Not applicable)</option><option value="No">No</option><option value="Yes">Yes — specify works to be avoided</option></select></Field>
          <Field label="Works to be avoided (if yes)"><input className={INPUT} disabled={exam.heightWork.value !== 'Yes'} value={exam.heightWork.detail} onChange={e => set('heightWork', { ...exam.heightWork, detail: e.target.value })} placeholder="e.g. Work at height above 2 m" /></Field>
        </div>}
      </section>}

      {testKeys.length > 0 && <section>
        <SubHead icon={ClipboardCheck} title="Part B — Medical tests, results & reports" hint="Test rows come from the test.* tokens in the adopted form."
          right={<button type="button" className={`${BTN_SM} border border-[#DBE3EF] bg-white text-[#01183A]`} onClick={() => setExam(e => ({ ...e, tests: e.tests.map(t => t.flag === 'Not Done' ? t : { ...t, flag: 'Normal' }) }))}><CheckCheck size={12} /> Mark all normal</button>} />
        <div className="rounded-2xl border border-[#DBE3EF] overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs min-w-[820px]">
              <thead className={`${TABLE_HEAD} sticky top-0 z-10`}><tr><th className="px-3 py-2 w-[30%]">Test / parameter</th><th className="px-3 py-2 w-[24%]">Result value</th><th className="px-3 py-2 w-[10%]">Unit</th><th className="px-3 py-2 w-[13%]">Interpretation</th><th className="px-3 py-2">Report upload</th></tr></thead>
              <tbody className="divide-y divide-[#DBE3EF]">
                {exam.tests.map((t, i) => <tr key={t.key} className={TABLE_ROW}>
                  <td className="px-3 py-1.5"><span className="font-semibold text-[#01183A]">{t.name}</span></td>
                  <td className="px-3 py-1.5"><input className={INPUT} value={t.result} onChange={e => setTest(i, { result: e.target.value })} /></td>
                  <td className="px-3 py-1.5"><input className={INPUT} value={t.unit} onChange={e => setTest(i, { unit: e.target.value })} /></td>
                  <td className="px-3 py-1.5"><select value={t.flag} onChange={e => setTest(i, { flag: e.target.value as TestFlag })}
                    className={`${INPUT} font-bold ${t.flag === 'Normal' ? '!bg-[#EAF5EE] !text-[#14843C] !border-[#BFE3CB]' : t.flag === 'Abnormal' ? '!bg-[#FDECEC] !text-[#DC2626] !border-[#F8C9C9]' : '!text-bss-text-muted'}`}>
                    <option>Normal</option><option>Abnormal</option><option>Not Done</option></select></td>
                  <td className="px-3 py-1.5"><div className="flex items-center gap-2">
                    <label className={`${BTN_SM} border border-[#DBE3EF] bg-white text-bss-text-secondary cursor-pointer hover:border-[#1E3A8A]/40`}><Paperclip size={11} /> Attach
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) setTest(i, { fileName: f.name }); }} /></label>
                    {t.fileName ? <span className="inline-flex items-center gap-1 max-w-[140px] rounded-md bg-[#EAF5EE] border border-[#BFE3CB] text-[#14843C] px-1.5 py-0.5 text-[10px]"><span className="truncate" title={t.fileName}>{t.fileName}</span><button type="button" aria-label="Remove file" onClick={() => setTest(i, { fileName: '' })}><X size={10} /></button></span>
                      : <span className="text-[10px] text-bss-text-muted">No file</span>}
                  </div></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-[#F2F6FC] border-t border-[#DBE3EF] flex flex-wrap justify-between gap-2 text-[11px] text-bss-text-muted">
            <span>Attach PDF / JPG / PNG reports — they are listed as annexures on the certificate.</span><span className="font-semibold text-[#01183A]">{attached} report{attached === 1 ? '' : 's'} attached</span>
          </div>
        </div>
      </section>}

      {customDefs.length > 0 && <section>
        <SubHead icon={FileText} title="Form fields" hint="Custom fields this form asks for. They are optional and flow into the certificate." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {customDefs.map(c => <Field key={c.key} label={c.label}>
            <input className={INPUT} value={exam.customFields[c.key] ?? ''} onChange={e => set('customFields', { ...exam.customFields, [c.key]: e.target.value })} placeholder="Optional" />
          </Field>)}
        </div>
      </section>}
    </div>
  </Modal>;
}

/* ───────────────────────── Certificate ───────────────────────── */

function CertificateModal({ row, exam, company, onClose }: { row: Row; exam: MedicalExam; company: string; onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const onFrame = useCallback((f: HTMLIFrameElement | null) => { frame.current = f; }, []);
  // Historic exams may predate the current form; render on the form issued to the site (or the Gazette default).
  const form = formFor(row, exam.formType);
  const html = useMemo(() => {
    const merged: MedicalExam = { ...exam, partA: { ...exam.partA, name: exam.partA.name || row.worker.name, designation: exam.partA.designation || row.worker.designation,
      company: exam.partA.company || row.worker.contractor || company, mobile: exam.partA.mobile || row.worker.mobile, role: exam.partA.role || row.worker.designation } };
    return fillForm(form?.html || OSH_FORM_HTML, merged, { workerBssId: row.worker.bssId, siteName: row.worker.site, siteLocation: row.site?.location ?? '', state: row.state, formVersion: form?.version ?? null });
  }, [row, exam, company, form]);
  return <Modal size="xl" onClose={onClose} title="Health examination certificate"
    subtitle={<>{certificateNo(exam)} · {row.worker.name} · {row.state} Form-{exam.formType}{form ? ` v${form.version}` : ' (Gazette default)'}</>}
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
