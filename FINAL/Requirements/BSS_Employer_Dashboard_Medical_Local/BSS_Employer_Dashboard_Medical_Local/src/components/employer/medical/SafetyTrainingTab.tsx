"use client";

/** Employer · Safety Office workspace ("Health and Safety Training.html" in BSS style).
 *  Every worker with PPE kit issue, safety trainings, compliance and site access. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Ban, BookOpenCheck, Boxes, CheckCheck, CheckCircle2, Eraser, Eye, FileCheck2, GraduationCap, HardHat, PackageOpen, Printer, ShieldCheck, UserCog } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { EmptyFiltered, FilterChips, Pager, SearchBox, TABLE_HEAD, TABLE_ROW, type Tone } from '@/components/employer/DashboardUI';
import type { EmployerSite, EmployerWorker } from '@/types/portal';
import { medicalApi } from './api';
import { KIT_TEMPLATE, TRAINING_TEMPLATE, addMonths, daysUntil, fmtDate, normaliseState, todayIso } from './catalog';
import type { KitItemRecord, SafetyRecord, TrainingRecord } from './types';
import { BTN_ACCENT, BTN_GHOST, BTN_PRIMARY, BTN_SM, Field, FormFrame, INPUT, KpiTile, Modal, Pill, SubHead, TEXTAREA, initials, printFrame, useToast } from './ui';

type Compliance = 'Compliant' | 'Due Soon' | 'Non-Compliant';
const PAGE = 12;
const C_TONE: Record<Compliance, Tone> = { Compliant: 'green', 'Due Soon': 'orange', 'Non-Compliant': 'red' };

function kitStats(r?: SafetyRecord) {
  let issued = 0, dueSoon = 0, overdue = 0; let earliest = '';
  KIT_TEMPLATE.forEach(k => {
    const it = r?.kitItems[k.key];
    if (!it?.issued) return;
    issued++;
    const due = addMonths(it.issueDate, k.replMonths);
    const d = daysUntil(due);
    if (d !== null && d < 0) overdue++; else if (d !== null && d <= 30) dueSoon++;
    if (due && (!earliest || due < earliest)) earliest = due;
  });
  const mandatoryMissing = KIT_TEMPLATE.filter(k => k.mandatory && !r?.kitItems[k.key]?.issued).length;
  return { issued, total: KIT_TEMPLATE.length, earliest, dueSoon, overdue, mandatoryMissing };
}
function trainingStats(r?: SafetyRecord) {
  let valid = 0, expired = 0, expiring = 0, pending = 0, mandatoryMissing = 0;
  TRAINING_TEMPLATE.forEach(t => {
    const rec = r?.trainings[t.key];
    if (!rec?.completed || !rec.validUntil) { pending++; if (t.mandatory) mandatoryMissing++; return; }
    const d = daysUntil(rec.validUntil) ?? -1;
    if (d < 0) { expired++; if (t.mandatory) mandatoryMissing++; } else if (d <= 30) expiring++; else valid++;
  });
  return { valid, expired, expiring, pending, mandatoryMissing, total: TRAINING_TEMPLATE.length };
}
function compliance(r?: SafetyRecord): Compliance {
  const k = kitStats(r), t = trainingStats(r);
  if (t.mandatoryMissing > 0 || k.mandatoryMissing > 0 || k.overdue > 0) return 'Non-Compliant';
  if (t.expiring > 0 || t.expired > 0 || k.dueSoon > 0 || k.issued < k.total) return 'Due Soon';
  return 'Compliant';
}
function access(c: Compliance) {
  return c === 'Compliant' ? { label: 'Allowed', tone: 'green' as Tone, icon: CheckCircle2 } : c === 'Due Soon' ? { label: 'Conditional', tone: 'orange' as Tone, icon: AlertTriangle } : { label: 'Blocked', tone: 'red' as Tone, icon: Ban };
}

type Row = { worker: EmployerWorker; site?: EmployerSite; rec?: SafetyRecord; status: Compliance };

export default function SafetyTrainingTab() {
  const { employer } = useEmployer();
  const { toast, node: toastNode } = useToast();
  const [records, setRecords] = useState<Record<string, SafetyRecord>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [site, setSite] = useState('all');
  const [status, setStatus] = useState<'all' | Compliance>('all');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<string | null>(null);
  const [kit, setKit] = useState<string | null>(null);
  const [training, setTraining] = useState<string | null>(null);
  const [cert, setCert] = useState<string | null>(null);

  const ids = useMemo(() => employer.workers.map(w => w.id), [employer.workers]);
  useEffect(() => {
    let live = true;
    (ids.length ? medicalApi.safety(ids) : Promise.resolve({}))
      .then(r => { if (live) { setRecords(r); setError(''); } })
      .catch(e => { if (live) setError((e as Error).message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [ids]);

  const siteById = useMemo(() => new Map(employer.sites.map(s => [s.id, s])), [employer.sites]);
  const rows: Row[] = useMemo(() => employer.workers.map(w => ({ worker: w, site: siteById.get(w.siteId), rec: records[w.id], status: compliance(records[w.id]) })), [employer.workers, siteById, records]);
  const byId = (id: string | null) => rows.find(r => r.worker.id === id);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(r => (site === 'all' || r.worker.siteId === site) && (status === 'all' || r.status === status)
      && (!needle || `${r.worker.name} ${r.worker.bssId} ${r.worker.mobile} ${r.worker.designation} ${r.worker.contractor} ${r.worker.site}`.toLowerCase().includes(needle)));
  }, [rows, q, site, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * PAGE, cur * PAGE);
  const count = (s: Compliance) => rows.filter(r => r.status === s).length;

  async function save(rec: SafetyRecord, msg: string) {
    try { const saved = await medicalApi.saveSafety(rec); setRecords(m => ({ ...m, [saved.workerId]: saved })); toast(msg); return true; }
    catch (e) { toast((e as Error).message, 'red'); return false; }
  }

  return <div className="space-y-5">
    {toastNode}
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiTile label="Total workers" value={rows.length} icon={HardHat} tone="blue" hint={`${count('Compliant')} fully compliant`} />
      <KpiTile label="Kits fully issued" value={rows.filter(r => kitStats(r.rec).issued === KIT_TEMPLATE.length).length} icon={ShieldCheck} tone="green" hint="All 12 PPE items" />
      <KpiTile label="Kits due for replacement" value={rows.filter(r => { const k = kitStats(r.rec); return k.dueSoon + k.overdue > 0; }).length} icon={Boxes} tone="orange" hint="Overdue or within 30 days" />
      <KpiTile label="Trainings expired" value={rows.filter(r => trainingStats(r.rec).expired > 0).length} icon={AlertTriangle} tone="red" hint="Workers with ≥ 1 lapsed programme" />
    </section>

    <section className="rounded-3xl bg-white border border-[#DBE3EF] overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-[#DBE3EF] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="text-sm font-bold text-[#01183A]">Safety compliance records</h3><p className="text-[11px] text-bss-text-muted">PPE kits, trainings and site-entry eligibility for every worker</p></div>
          <SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search name, BSS ID, role…" className="w-full sm:w-72" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-bss-text-muted">Site
            <select value={site} onChange={e => { setSite(e.target.value); setPage(1); }} className="h-8 rounded-full border border-[#DBE3EF] bg-white px-2.5 text-xs text-[#01183A]">
              <option value="all">All sites</option>{employer.sites.map(s => <option key={s.id} value={s.id}>{s.name} · {s.state}</option>)}
            </select></label>
          <FilterChips value={status} onChange={v => { setStatus(v); setPage(1); }} options={[
            { value: 'all', label: 'All compliance', count: rows.length },
            { value: 'Compliant', label: 'Compliant', dot: '#14843C', count: count('Compliant') },
            { value: 'Due Soon', label: 'Due soon', dot: '#E45D24', count: count('Due Soon') },
            { value: 'Non-Compliant', label: 'Non-compliant', dot: '#DC2626', count: count('Non-Compliant') },
          ]} />
        </div>
      </div>
      {error && <p role="alert" className="m-4 rounded-2xl bg-[#FDECEC] text-[#DC2626] text-xs p-3">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[1120px]">
          <thead className={TABLE_HEAD}><tr>
            <th className="pl-5 pr-3 py-2.5">Worker details</th><th className="px-3 py-2.5">Designation</th><th className="px-3 py-2.5">Contractor / site</th><th className="px-3 py-2.5">Kit items</th>
            <th className="px-3 py-2.5">Last kit issue</th><th className="px-3 py-2.5">Next replacement</th><th className="px-3 py-2.5">Trainings valid</th><th className="px-3 py-2.5">Compliance</th><th className="px-3 py-2.5">Site access</th><th className="pl-3 pr-5 py-2.5 text-right">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-[#DBE3EF]">
            {loading && !Object.keys(records).length ? <tr><td colSpan={10} className="py-10 text-center text-bss-text-muted">Loading safety records…</td></tr>
              : slice.length === 0 ? <tr><td colSpan={10}><EmptyFiltered onReset={() => { setQ(''); setSite('all'); setStatus('all'); }} /></td></tr>
              : slice.map(r => {
                const k = kitStats(r.rec), t = trainingStats(r.rec), a = access(r.status);
                const tint = r.status === 'Non-Compliant' ? 'bg-[#FDECEC]/30' : r.status === 'Due Soon' ? 'bg-[#FDF0EA]/40' : '';
                return <tr key={r.worker.id} className={`${TABLE_ROW} ${tint}`}>
                  <td className="pl-5 pr-3 py-3"><div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-[#01183A] text-white grid place-items-center text-[10px] font-bold shrink-0">{initials(r.worker.name)}</span>
                    <div><p className="font-semibold text-[#01183A] whitespace-nowrap">{r.worker.name}</p><p className="font-mono text-[10px] text-bss-text-muted whitespace-nowrap">{r.worker.bssId} · {r.worker.mobile}</p></div></div></td>
                  <td className="px-3 py-3 whitespace-nowrap text-[#01183A]">{r.worker.designation}</td>
                  <td className="px-3 py-3 whitespace-nowrap"><p className="text-[#01183A]">{r.worker.contractor}</p><p className="text-[10px] text-bss-text-muted">{r.worker.site} · {normaliseState(r.site?.state)}</p></td>
                  <td className="px-3 py-3 whitespace-nowrap"><p className="font-bold text-[#01183A] tabular-nums">{k.issued} / {k.total}</p><p className={`text-[10px] ${k.issued === k.total ? 'text-[#14843C]' : 'text-[#E45D24]'}`}>{k.issued === k.total ? 'All issued' : `${k.total - k.issued} pending`}</p></td>
                  <td className="px-3 py-3 whitespace-nowrap text-[#01183A]">{fmtDate(r.rec?.kitItems.helmet?.issueDate)}</td>
                  <td className="px-3 py-3 whitespace-nowrap"><p className={k.overdue ? 'text-[#DC2626] font-semibold' : k.dueSoon ? 'text-[#E45D24] font-semibold' : 'text-[#01183A]'}>{fmtDate(k.earliest)}</p><p className="text-[10px] text-bss-text-muted">Earliest PPE due</p></td>
                  <td className="px-3 py-3 whitespace-nowrap"><p className="font-bold text-[#01183A] tabular-nums">{t.valid} / {t.total}</p><p className={`text-[10px] ${t.expired ? 'text-[#DC2626] font-semibold' : t.expiring ? 'text-[#E45D24]' : 'text-bss-text-muted'}`}>{t.expired ? `${t.expired} expired` : t.expiring ? `${t.expiring} expiring` : `${t.pending} not taken`}</p></td>
                  <td className="px-3 py-3"><Pill tone={C_TONE[r.status]}>{r.status}</Pill></td>
                  <td className="px-3 py-3"><Pill tone={a.tone} dot={false}><a.icon size={11} />{a.label}</Pill></td>
                  <td className="pl-3 pr-5 py-3"><div className="flex justify-end gap-1.5">
                    {r.status === 'Compliant'
                      ? <button type="button" onClick={() => setCert(r.worker.id)} className={`${BTN_SM} bg-[#EEF2FB] text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white`}><FileCheck2 size={12} /> Certificate</button>
                      : <button type="button" onClick={() => setKit(r.worker.id)} className={`${BTN_SM} text-white ${r.status === 'Non-Compliant' ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'bg-[#01183A] hover:bg-[#022B5E]'}`}><PackageOpen size={12} /> Issue kit</button>}
                    <button type="button" onClick={() => setView(r.worker.id)} className={`${BTN_SM} border border-[#DBE3EF] bg-white text-[#01183A] hover:border-[#1E3A8A]/40`}><Eye size={12} /> View</button>
                  </div></td>
                </tr>;
              })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-[#DBE3EF] bg-[#F2F6FC]/50"><Pager page={cur} pages={pages} total={filtered.length} noun="worker" onPage={setPage} /></div>
    </section>

    {byId(view) && <ProfileModal row={byId(view)!} onClose={() => setView(null)} onKit={() => { setKit(view); setView(null); }} onTraining={() => { setTraining(view); setView(null); }} onCert={() => { setCert(view); setView(null); }} />}
    {byId(kit) && <KitModal row={byId(kit)!} onClose={() => setKit(null)} onSave={async rec => { if (await save(rec, 'Kit record saved.')) setKit(null); }} />}
    {byId(training) && <TrainingModal row={byId(training)!} onClose={() => setTraining(null)} onSave={async rec => { if (await save(rec, 'Training record saved.')) setTraining(null); }} />}
    {byId(cert) && <CertModal row={byId(cert)!} company={employer.identity.company} onClose={() => setCert(null)} />}
  </div>;
}

function kitState(item: (typeof KIT_TEMPLATE)[number], it?: KitItemRecord) {
  if (!it?.issued) return { label: 'Not issued', cls: 'text-[#DC2626]', box: 'border-dashed border-[#F8C9C9] bg-[#FDECEC]/40', due: '' };
  const due = addMonths(it.issueDate, item.replMonths), d = daysUntil(due);
  if (d !== null && d < 0) return { label: 'Replace now', cls: 'text-[#DC2626]', box: 'border-[#F8C9C9] bg-[#FDECEC]/40', due };
  if (d !== null && d <= 30) return { label: 'Replace soon', cls: 'text-[#E45D24]', box: 'border-[#F5C6B2] bg-[#FDF0EA]/50', due };
  return { label: 'In use', cls: 'text-[#14843C]', box: 'border-[#BFE3CB] bg-[#EAF5EE]/50', due };
}
function trnState(rec?: TrainingRecord) {
  if (!rec?.completed || !rec.validUntil) return { label: 'Not completed', cls: 'text-bss-text-muted', box: 'border-[#DBE3EF] bg-white' };
  const d = daysUntil(rec.validUntil) ?? -1;
  if (d < 0) return { label: 'Expired', cls: 'text-[#DC2626]', box: 'border-[#F8C9C9] bg-[#FDECEC]/40' };
  if (d <= 30) return { label: `Expiring in ${d}d`, cls: 'text-[#E45D24]', box: 'border-[#F5C6B2] bg-[#FDF0EA]/50' };
  return { label: 'Valid', cls: 'text-[#14843C]', box: 'border-[#BFE3CB] bg-[#EAF5EE]/50' };
}

function ProfileModal({ row, onClose, onKit, onTraining, onCert }: { row: Row; onClose: () => void; onKit: () => void; onTraining: () => void; onCert: () => void }) {
  const k = kitStats(row.rec), t = trainingStats(row.rec);
  const info: Array<[string, string]> = [['Worker name', row.worker.name], ['BSS ID', row.worker.bssId], ['Phone', row.worker.mobile], ['Designation', row.worker.designation], ['Contractor', row.worker.contractor], ['Site', `${row.worker.site} · ${normaliseState(row.site?.state)}`], ['Joining date', fmtDate(row.worker.doj)], ['Compliance', row.status], ['Site access', access(row.status).label]];
  return <Modal size="xl" onClose={onClose} title="Worker safety profile" subtitle="PPE kit & training records · scan QR for site verification"
    footer={<><button type="button" className={BTN_GHOST} onClick={onClose}>Close</button>
      {row.status === 'Compliant' && <button type="button" className={BTN_GHOST} onClick={onCert}><FileCheck2 size={14} /> Certificate</button>}
      <button type="button" className={BTN_PRIMARY} onClick={onKit}><PackageOpen size={14} /> Issue / update kit</button>
      <button type="button" className={BTN_ACCENT} onClick={onTraining}><GraduationCap size={14} /> Record training</button></>}>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 rounded-2xl border border-[#DBE3EF] bg-[#F2F6FC]/60 p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {info.map(([a, b]) => <div key={a}><p className="text-[10px] uppercase tracking-wider font-semibold text-bss-text-muted">{a}</p><p className="text-xs font-semibold text-[#01183A]">{b}</p></div>)}
        </div>
        <div className="rounded-2xl border border-[#DBE3EF] bg-[#F2F6FC]/60 p-4 flex flex-col items-center md:w-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Safety ID QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`SAFE|${row.worker.bssId}`)}`} className="w-32 h-32 bg-white border border-[#DBE3EF] rounded-xl p-1" />
          <p className="mt-2 text-xs font-bold text-[#01183A]">Safety ID QR</p><p className="text-[10px] text-bss-text-muted">Scan at site entry gate</p>
        </div>
      </div>
      <div>
        <SubHead icon={HardHat} title="PPE kit — issued items" right={<span className="text-[11px] font-semibold text-bss-text-secondary">{k.issued} of {k.total} items issued</span>} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {KIT_TEMPLATE.map(item => { const it = row.rec?.kitItems[item.key], s = kitState(item, it); return <div key={item.key} className={`rounded-2xl border p-3 ${s.box}`}>
            <p className="text-xs font-bold text-[#01183A] truncate">{item.name}</p><p className={`text-[10px] font-bold ${s.cls}`}>{s.label}{item.mandatory ? ' · mandatory' : ''}</p>
            {it?.issued && <p className="mt-1 text-[10px] text-bss-text-muted leading-relaxed">Size <b className="text-[#01183A]">{it.size || '—'}</b> · issued {fmtDate(it.issueDate)}<br />Due <b className="text-[#01183A]">{fmtDate(s.due)}</b> · {it.condition}</p>}
          </div>; })}
        </div>
      </div>
      <div>
        <SubHead icon={BookOpenCheck} title="Safety trainings" right={<span className="text-[11px] font-semibold text-bss-text-secondary">{t.valid} valid · {t.expiring} expiring · {t.expired} expired · {t.pending} pending</span>} />
        <div className="grid md:grid-cols-2 gap-2.5">
          {TRAINING_TEMPLATE.map(p => { const r = row.rec?.trainings[p.key], s = trnState(r); return <div key={p.key} className={`rounded-2xl border p-3 flex justify-between gap-3 ${s.box}`}>
            <div className="min-w-0"><p className="text-xs font-bold text-[#01183A]">{p.name}{p.mandatory && <span className="ml-1 text-[9px] font-extrabold text-[#DC2626]">● MANDATORY</span>}</p>
              <p className="text-[10px] text-bss-text-muted">Duration {p.duration} · validity {p.validityMonths} mo</p>
              {r?.completed && <p className="text-[10px] text-bss-text-muted">Trainer <b className="text-[#01183A]">{r.trainer || '—'}</b> · {fmtDate(r.date)} · {r.score} · valid until {fmtDate(r.validUntil)}</p>}</div>
            <span className={`text-[10px] font-bold whitespace-nowrap ${s.cls}`}>{s.label}</span>
          </div>; })}
        </div>
      </div>
    </div>
  </Modal>;
}

function KitModal({ row, onClose, onSave }: { row: Row; onClose: () => void; onSave: (r: SafetyRecord) => void }) {
  const [items, setItems] = useState(() => KIT_TEMPLATE.map(k => ({ ...k, ...{ issued: false, issueDate: '', size: '', condition: 'Good', remarks: '' }, ...row.rec?.kitItems[k.key] })));
  const [meta, setMeta] = useState({ issuedBy: row.rec?.issuedBy || 'Safety Officer', storeRef: row.rec?.storeRef || '', kitCondition: row.rec?.kitCondition || 'Good', notes: row.rec?.notes || '' });
  const upd = (i: number, p: Partial<(typeof items)[number]>) => setItems(list => list.map((x, j) => j === i ? { ...x, ...p, issueDate: p.issued && !x.issueDate ? todayIso() : (p.issueDate ?? x.issueDate) } : x));
  const submit = () => onSave({ workerId: row.worker.id, updatedAt: '', trainings: {}, ...meta,
    kitItems: Object.fromEntries(items.map(x => [x.key, x.issued ? { issued: true, issueDate: x.issueDate, size: x.size, condition: x.condition, remarks: x.remarks } : { issued: false, remarks: x.remarks }])) });
  return <Modal size="xl" onClose={onClose} title="Issue / update safety kit" subtitle={<>{row.worker.name} · {row.worker.bssId} · {row.worker.designation}</>}
    footer={<><button type="button" className={BTN_GHOST} onClick={onClose}>Cancel</button><button type="button" className={BTN_PRIMARY} onClick={submit}><PackageOpen size={14} /> Save kit record</button></>}>
    <SubHead icon={Boxes} title="PPE items" hint="Mark items issued, set size / condition and dates. Replacement due is auto-calculated."
      right={<div className="flex gap-1.5">
        <button type="button" className={`${BTN_SM} border border-[#DBE3EF] bg-white text-[#01183A]`} onClick={() => setItems(l => l.map(x => ({ ...x, issued: true, issueDate: x.issueDate || todayIso() })))}><CheckCheck size={12} /> Mark all issued</button>
        <button type="button" className={`${BTN_SM} border border-[#F8C9C9] bg-white text-[#DC2626]`} onClick={() => setItems(l => l.map(x => ({ ...x, issued: false })))}><Eraser size={12} /> Clear all</button></div>} />
    <div className="rounded-2xl border border-[#DBE3EF] overflow-x-auto">
      <table className="w-full text-xs text-left min-w-[880px]">
        <thead className={TABLE_HEAD}><tr><th className="px-3 py-2 w-14 text-center">Issued</th><th className="px-3 py-2">Item</th><th className="px-3 py-2 w-24">Size</th><th className="px-3 py-2 w-36">Issue date</th><th className="px-3 py-2 w-32">Replacement due</th><th className="px-3 py-2 w-40">Condition</th><th className="px-3 py-2">Remarks</th></tr></thead>
        <tbody className="divide-y divide-[#DBE3EF]">{items.map((x, i) => { const due = x.issued ? addMonths(x.issueDate, x.replMonths) : ''; const late = (daysUntil(due) ?? 1) < 0; return <tr key={x.key} className={TABLE_ROW}>
          <td className="px-3 py-1.5 text-center"><input type="checkbox" className="w-4 h-4 accent-[#14843C]" checked={x.issued} onChange={e => upd(i, { issued: e.target.checked })} /></td>
          <td className="px-3 py-1.5"><p className="font-semibold text-[#01183A]">{x.name}</p>{x.mandatory && <p className="text-[9px] font-extrabold text-[#DC2626]">MANDATORY</p>}</td>
          <td className="px-3 py-1.5"><input className={INPUT} disabled={!x.issued} value={x.size} placeholder="M / 9 / Std" onChange={e => upd(i, { size: e.target.value })} /></td>
          <td className="px-3 py-1.5"><input type="date" className={INPUT} disabled={!x.issued} value={x.issueDate} onChange={e => upd(i, { issueDate: e.target.value })} /></td>
          <td className="px-3 py-1.5"><input readOnly className={`${INPUT} ${late ? '!bg-[#FDECEC] !text-[#DC2626] font-bold' : ''}`} value={due} placeholder="auto" /></td>
          <td className="px-3 py-1.5"><select className={INPUT} disabled={!x.issued} value={x.condition} onChange={e => upd(i, { condition: e.target.value })}><option>Good</option><option>Fair</option><option>Needs Replacement</option></select></td>
          <td className="px-3 py-1.5"><input className={INPUT} disabled={!x.issued} value={x.remarks} placeholder="Optional" onChange={e => upd(i, { remarks: e.target.value })} /></td>
        </tr>; })}</tbody>
      </table>
      <p className="px-4 py-2 bg-[#F2F6FC] border-t border-[#DBE3EF] text-[11px] text-bss-text-muted flex justify-between"><span>Standard PPE panel — tick to issue, untick to mark not issued.</span><b className="text-[#01183A]">{items.filter(x => x.issued).length} / {items.length} items issued</b></p>
    </div>
    <div className="mt-6"><SubHead icon={UserCog} title="Issuance details" />
      <div className="grid md:grid-cols-3 gap-3">
        <Field label="Issued by"><input className={INPUT} value={meta.issuedBy} onChange={e => setMeta({ ...meta, issuedBy: e.target.value })} /></Field>
        <Field label="Store reference"><input className={INPUT} value={meta.storeRef} placeholder="e.g. STORE-2026-0871" onChange={e => setMeta({ ...meta, storeRef: e.target.value })} /></Field>
        <Field label="Overall kit condition"><select className={INPUT} value={meta.kitCondition} onChange={e => setMeta({ ...meta, kitCondition: e.target.value })}><option>Good</option><option>Fair</option><option>Needs Replacement</option></select></Field>
        <Field label="Notes" className="md:col-span-3"><textarea rows={2} className={TEXTAREA} value={meta.notes} onChange={e => setMeta({ ...meta, notes: e.target.value })} /></Field>
      </div></div>
    <p className="mt-4 rounded-2xl bg-[#EEF2FB]/70 border border-[#DBE3EF] p-3 text-[11px] text-[#1E3A8A]">Store, contractor and worker are notified 15 days before each item&apos;s replacement date.</p>
  </Modal>;
}

function TrainingModal({ row, onClose, onSave }: { row: Row; onClose: () => void; onSave: (r: SafetyRecord) => void }) {
  const [list, setList] = useState(() => TRAINING_TEMPLATE.map(t => ({ ...t, completed: false, date: '', trainer: '', score: 'Pass', remarks: '', ...row.rec?.trainings[t.key] })));
  const upd = (i: number, p: Partial<(typeof list)[number]>) => setList(l => l.map((x, j) => j === i ? { ...x, ...p, ...(p.completed && !x.date ? { date: todayIso() } : {}), ...(p.completed && !x.trainer ? { trainer: 'Safety Officer' } : {}) } : x));
  const submit = () => onSave({ workerId: row.worker.id, updatedAt: '', kitItems: {},
    trainings: Object.fromEntries(list.map(x => [x.key, x.completed ? { completed: true, date: x.date, trainer: x.trainer, score: x.score, validUntil: addMonths(x.date, x.validityMonths), remarks: x.remarks } : { completed: false, remarks: x.remarks }])) });
  return <Modal size="xl" onClose={onClose} title="Record safety training" subtitle={<>{row.worker.name} · {row.worker.bssId} · {row.worker.designation}</>}
    footer={<><button type="button" className={BTN_GHOST} onClick={onClose}>Cancel</button><button type="button" className={BTN_ACCENT} onClick={submit}><GraduationCap size={14} /> Save training record</button></>}>
    <SubHead icon={GraduationCap} title="Training programmes" hint="Tick programmes completed and fill in date, trainer and result."
      right={<div className="flex gap-1.5">
        <button type="button" className={`${BTN_SM} border border-[#DBE3EF] bg-white text-[#01183A]`} onClick={() => setList(l => l.map(x => ({ ...x, completed: true, date: x.date || todayIso(), trainer: x.trainer || 'Safety Officer' })))}><CheckCheck size={12} /> Mark all completed</button>
        <button type="button" className={`${BTN_SM} border border-[#F8C9C9] bg-white text-[#DC2626]`} onClick={() => setList(l => l.map(x => ({ ...x, completed: false })))}><Eraser size={12} /> Clear all</button></div>} />
    <div className="rounded-2xl border border-[#DBE3EF] overflow-x-auto">
      <table className="w-full text-xs text-left min-w-[900px]">
        <thead className={TABLE_HEAD}><tr><th className="px-3 py-2 w-14 text-center">Done</th><th className="px-3 py-2">Training programme</th><th className="px-3 py-2 w-36">Date</th><th className="px-3 py-2 w-36">Trainer</th><th className="px-3 py-2 w-28">Result</th><th className="px-3 py-2 w-32">Valid until</th><th className="px-3 py-2">Remarks</th></tr></thead>
        <tbody className="divide-y divide-[#DBE3EF]">{list.map((x, i) => { const vu = x.completed ? addMonths(x.date, x.validityMonths) : ''; return <tr key={x.key} className={TABLE_ROW}>
          <td className="px-3 py-1.5 text-center"><input type="checkbox" className="w-4 h-4 accent-[#14843C]" checked={x.completed} onChange={e => upd(i, { completed: e.target.checked })} /></td>
          <td className="px-3 py-1.5"><p className="font-semibold text-[#01183A]">{x.name}</p><p className="text-[10px] text-bss-text-muted">{x.duration} · validity {x.validityMonths} mo{x.mandatory && <b className="text-[#DC2626]"> · MANDATORY</b>}</p></td>
          <td className="px-3 py-1.5"><input type="date" className={INPUT} disabled={!x.completed} value={x.date} onChange={e => upd(i, { date: e.target.value })} /></td>
          <td className="px-3 py-1.5"><input className={INPUT} disabled={!x.completed} value={x.trainer} onChange={e => upd(i, { trainer: e.target.value })} /></td>
          <td className="px-3 py-1.5"><select className={INPUT} disabled={!x.completed} value={x.score} onChange={e => upd(i, { score: e.target.value })}><option>Pass</option><option>Fail</option><option>Absent</option></select></td>
          <td className="px-3 py-1.5"><input readOnly className={`${INPUT} ${vu ? '!bg-[#EAF5EE] !text-[#14843C] font-bold' : ''}`} value={vu} placeholder="auto" /></td>
          <td className="px-3 py-1.5"><input className={INPUT} disabled={!x.completed} value={x.remarks} placeholder="Optional" onChange={e => upd(i, { remarks: e.target.value })} /></td>
        </tr>; })}</tbody>
      </table>
      <p className="px-4 py-2 bg-[#F2F6FC] border-t border-[#DBE3EF] text-[11px] text-bss-text-muted flex justify-between"><span>Validity is set from each programme&apos;s standard period.</span><b className="text-[#01183A]">{list.filter(x => x.completed).length} / {list.length} programmes completed</b></p>
    </div>
    <p className="mt-4 rounded-2xl bg-[#EEF2FB]/70 border border-[#DBE3EF] p-3 text-[11px] text-[#1E3A8A]">Workers are notified 30 days before a training expires. Site access is blocked on expiry of a mandatory programme.</p>
  </Modal>;
}

const e = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function certificateHtml(row: Row, company: string) {
  const k = kitStats(row.rec), t = trainingStats(row.rec);
  const certNo = `SAFE/${new Date().getFullYear()}/${row.worker.bssId.slice(-6)}`;
  const kitRows = KIT_TEMPLATE.filter(i => row.rec?.kitItems[i.key]?.issued).map(i => { const it = row.rec!.kitItems[i.key]; return `<tr><td>${e(i.name)}</td><td>${e(it.size || '—')}</td><td>${fmtDate(it.issueDate)}</td><td>${fmtDate(addMonths(it.issueDate, i.replMonths))}</td><td>${e(it.condition || '—')}</td></tr>`; }).join('');
  const trnRows = TRAINING_TEMPLATE.filter(p => row.rec?.trainings[p.key]?.completed).map(p => { const r = row.rec!.trainings[p.key]; return `<tr><td>${e(p.name)}${p.mandatory ? ' <b style="color:#DC2626;font-size:8px">● MAND</b>' : ''}</td><td>${fmtDate(r.date)}</td><td>${e(r.trainer)}</td><td>${e(r.score)}</td><td>${fmtDate(r.validUntil)}</td><td>${e(trnState(r).label)}</td></tr>`; }).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${certNo}</title><style>
  @page{size:A4;margin:0}body{margin:0;background:#E6E9EE;font-family:Arial,Helvetica,sans-serif;color:#0f172a}
  .page{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:14mm;box-sizing:border-box;box-shadow:0 2px 10px rgba(0,0,0,.15)}
  h1{font-size:18px;margin:4px 0 0;color:#01183A}.band{background:#01183A;color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:3px;display:inline-block;margin:16px 0 8px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px}.l{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:700}.v{font-size:12px;font-weight:700}
  table{width:100%;border-collapse:collapse;font-size:10.5px}th{background:#F2F6FC;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#01183A}th,td{border:1px solid #DBE3EF;padding:4px 6px}
  .sig{display:flex;gap:24px;margin-top:34px}.sig div{flex:1;border-top:1px solid #94a3b8;padding-top:4px;font-size:10px;font-weight:700}
  @media print{body{background:#fff}.page{margin:0;box-shadow:none}}</style></head><body><div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #01183A;padding-bottom:10px">
   <div><div style="font-size:10px;font-weight:800;letter-spacing:.14em"><span style="color:#01183A">BHARAT</span> <span style="color:#E45D24">SHRAM</span> <span style="color:#14843C">SETU</span></div>
   <h1>HEALTH &amp; SAFETY COMPLIANCE RECORD</h1><div style="font-size:11px;color:#475569">PPE Kit Issue &amp; Safety Training Certificate</div>
   <div style="font-size:9px;color:#94a3b8;margin-top:3px">Occupational Safety, Health &amp; Working Conditions Code, 2020</div></div>
   <div style="text-align:right;font-size:10px;color:#64748b">Certificate No.<br><b style="color:#01183A;font-size:12px">${certNo}</b><br>Issued on <b style="color:#0f172a">${fmtDate(todayIso())}</b></div></div>
  <div style="display:flex;height:4px;margin-top:2px"><span style="flex:1;background:#E45D24"></span><span style="flex:1;background:#fff"></span><span style="flex:1;background:#14843C"></span></div>
  <div class="band">Section A — Worker identity</div><div class="grid">
   ${[['Worker name', row.worker.name], ['BSS ID', row.worker.bssId], ['Designation', row.worker.designation], ['Contractor', row.worker.contractor], ['Principal employer', company], ['Site', `${row.worker.site}, ${normaliseState(row.site?.state)}`], ['Joining date', fmtDate(row.worker.doj)], ['Compliance', row.status], ['Site access', access(row.status).label]].map(([a, b]) => `<div><div class="l">${a}</div><div class="v">${e(b)}</div></div>`).join('')}</div>
  <div class="band">Section B — PPE kit issued (${k.issued}/${k.total})</div><table><thead><tr><th>Item</th><th>Size</th><th>Issued</th><th>Replacement due</th><th>Condition</th></tr></thead><tbody>${kitRows || '<tr><td colspan="5">No items issued.</td></tr>'}</tbody></table>
  <div class="band">Section C — Safety trainings (${t.valid}/${t.total} valid)</div><table><thead><tr><th>Programme</th><th>Date</th><th>Trainer</th><th>Result</th><th>Valid until</th><th>Status</th></tr></thead><tbody>${trnRows || '<tr><td colspan="6">No trainings recorded.</td></tr>'}</tbody></table>
  <p style="font-size:10px;color:#475569;margin-top:14px;line-height:1.6">This certifies that the worker named above has been issued the PPE listed and has completed the safety trainings recorded, and is <b style="color:#14843C">${e(access(row.status).label.toUpperCase())}</b> site entry as on the date of issue.</p>
  <div class="sig"><div>Worker signature</div><div>Safety Officer · ${e(row.rec?.issuedBy || '')}</div><div>Employer / authorised signatory</div></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:22px;padding-top:8px;border-top:1px dashed #cbd5e1;font-size:9px;color:#94a3b8">
   <span>Computer-generated through Bharat Shram Setu · verification via QR</span><img alt="QR" style="width:70px;height:70px" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${certNo}|${row.worker.bssId}`)}"></div>
  </div></body></html>`;
}

function CertModal({ row, company, onClose }: { row: Row; company: string; onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const onFrame = useCallback((f: HTMLIFrameElement | null) => { frame.current = f; }, []);
  const html = useMemo(() => certificateHtml(row, company), [row, company]);
  return <Modal size="lg" onClose={onClose} title="Health & safety compliance certificate" subtitle="PPE kit issue & training record · site entry verification"
    footer={<><button type="button" className={BTN_GHOST} onClick={onClose}>Close</button><button type="button" className={BTN_PRIMARY} onClick={() => printFrame(frame.current)}><Printer size={14} /> Download / print PDF</button></>}>
    <FormFrame html={html} title="Safety certificate" className="h-[70vh] rounded-2xl" onFrame={onFrame} />
  </Modal>;
}
