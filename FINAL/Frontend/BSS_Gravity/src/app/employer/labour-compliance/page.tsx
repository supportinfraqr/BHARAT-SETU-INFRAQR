"use client";

import { useState } from 'react';
import { Landmark, Moon, Scale, ShieldCheck, Timer, Users2 } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import { classifyWorker, computeDeductionCheck, gratuityDeadline, LIMITS, overtimeStatus, validateShowCause } from '@/lib/labour-compliance';

export default function EmployerLabourCompliancePage() {
  const { employer } = useEmployer();
  const [wage, setWage] = useState(31500);
  const [deductions, setDeductions] = useState(3000);
  const [advance, setAdvance] = useState(0);
  const [showCauseDays, setShowCauseDays] = useState(7);
  const [replyConsidered, setReplyConsidered] = useState(true);
  const [ruleBreak, setRuleBreak] = useState<number>(2);

  const [dailyHours, setDailyHours] = useState(10);
  const [weeklyHours, setWeeklyHours] = useState(52);
  const [otHours, setOtHours] = useState(4);
  const [otConsent, setOtConsent] = useState(true);

  const [gratReceived, setGratReceived] = useState('2026-08-25');

  const [role, setRole] = useState<'manager' | 'supervisory' | 'worker'>('worker');
  const [salary, setSalary] = useState(16000);

  const [nightConsent, setNightConsent] = useState(true);
  const [nightAmenities, setNightAmenities] = useState({ transport: true, lighting: true, amenities: true, emergency: true, cctv: true });

  const deduction = computeDeductionCheck(wage, deductions, advance);
  const ot = overtimeStatus(dailyHours, weeklyHours, otConsent, otHours);
  const grat = gratuityDeadline(gratReceived);
  const cls = classifyWorker(role, salary);
  const showCauseOk = ruleBreak === 1 || ruleBreak === 2 ? validateShowCause('damage', showCauseDays, replyConsidered) : true;
  const nightComplete = Object.values(nightAmenities).every(Boolean) && nightConsent;

  const items: Array<{ ruleId: string; title: string; ok: boolean | null; note: string }> = [
    { ruleId: 'fines_display', title: 'Fines display & approved list', ok: true, note: 'Approved fine schedule displayed; fines limited to the approved list.' },
    { ruleId: 'deduction_cap', title: 'Deduction cap (50%)', ok: deduction.totalApproved && deduction.advanceApproved, note: `Total cap ${money(deduction.totalCap)} · advance cap ${money(deduction.advanceCap)} · excess carries forward ${money(deduction.carriedForward)}` },
    { ruleId: 'show_cause', title: '7-day show-cause before deduction', ok: showCauseOk, note: `Show-cause ${showCauseDays} days · reply considered ${replyConsidered ? 'yes' : 'no'}` },
    { ruleId: 'overtime', title: 'Overtime 2× + consent + records', ok: ot.consentOk && ot.withinNorm, note: `${ot.detail}; this period OT ${ot.otHours}h @ ${ot.otRate}×` },
    { ruleId: 'gratuity', title: 'Gratuity 15-day response', ok: grat.ok, note: `Received ${gratReceived} — ${grat.noticeDays} days elapsed (${grat.due} window)` },
    { ruleId: 'commuting_accident', title: 'Commuting accidents covered', ok: true, note: 'Commuting accidents treated as employment-related.' },
    { ruleId: 'worksite_notice', title: 'Worksite notice', ok: true, note: 'Particulars + 5-year dangerous occurrences displayed.' },
    { ruleId: 'worker_classification', title: 'Worker vs non-worker mapping', ok: true, note: 'Managerial/administrative & supervisory (₹>18,000/mo) excluded from worker rolls.' },
    { ruleId: 'emergency_plan', title: 'Emergency & disaster control plan', ok: true, note: 'Written plan covering worker health & safety, communicated to workers and public nearby.' },
    { ruleId: 'night_shift', title: 'Women night shift (7PM–6AM)', ok: nightComplete, note: nightComplete ? 'Consent + transport + lighting + amenities + emergency contacts + CCTV ready.' : 'Missing consent or an amenity for night shift.' },
  ];

  return <div className="relative space-y-6">
    <div aria-hidden className="pointer-events-none select-none absolute inset-0 z-20 overflow-hidden">
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-x-20 gap-y-28 -rotate-[24deg] scale-[1.6]">
        {Array.from({ length: 14 }).map((_, i) => <span key={i} className="text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-black/5 whitespace-nowrap">Under Development</span>)}
      </div>
    </div>

    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Governance</p><div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">Labour Law Compliance</h1><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">Central Rules</span></div><p className="text-sm text-gray-500 mt-1">Ten central-government requirements enforced and surfaced to workers on fulfilment.</p></header>
    <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs">Employer constitution: <strong>{employer.govtScope === 'central' ? 'Central Government / PSU / central-govt governed' : 'State Government / state-owned entity'}</strong>. For a state-governed employer some rules may differ (see per-rule state notes).</div>

    <div className="grid lg:grid-cols-2 gap-5">
      {/* Deduction cap + show-cause */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5"><h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Scale size={16} className="text-blue-700" />Deduction cap (50%) & show-cause</h2>
        <div className="grid grid-cols-3 gap-3 mt-4"><Field label="Gross wage" value={wage} onChange={setWage} /><Field label="Total deductions" value={deductions} onChange={setDeductions} /><Field label="Advance recovery" value={advance} onChange={setAdvance} /></div>
        <div className="grid grid-cols-3 gap-3 mt-3 text-xs"><Info label="Total cap" value={money(deduction.totalCap)} /><Info label="Advance cap" value={money(deduction.advanceCap)} /><Info label="Carry-forward" value={money(deduction.carriedForward)} tone={deduction.totalExcess > 0 || deduction.advanceExcess > 0 ? 'text-red-700' : 'text-green-700'} /></div>
        <p className={`mt-2 text-xs font-semibold ${deduction.totalApproved && deduction.advanceApproved ? 'text-green-700' : 'text-red-700'}`}>{deduction.totalApproved && deduction.advanceApproved ? 'Within the 50% ceiling — no excess.' : 'Excess over the cap will be carried forward to the next pay period.'}</p>
        <div className="border-t border-gray-100 mt-3 pt-3"><div className="flex items-center gap-2 text-xs font-semibold text-gray-700">Rule break (for show-cause):<select value={ruleBreak} onChange={e => setRuleBreak(Number(e.target.value))} className="h-9 border border-gray-200 rounded-lg px-2 text-xs bg-white"><option value={1}>Fines</option><option value={2}>Damage/loss</option><option value={3}>Advance</option></select></div>
          {(ruleBreak === 2 || ruleBreak === 1) && <div className="grid grid-cols-2 gap-3 mt-3 text-xs"><Field label="Show-cause days" value={showCauseDays} onChange={setShowCauseDays} /><label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mt-4"><input type="checkbox" checked={replyConsidered} onChange={e => setReplyConsidered(e.target.checked)} className="w-4 h-4" />Reply considered</label></div>}
          <p className={`mt-2 text-xs font-semibold ${showCauseOk ? 'text-green-700' : 'text-red-700'}`}>{showCauseOk ? 'Show-cause requirement satisfied.' : 'Damage/loss deduction blocked — 7-day show-cause + considered reply required.'}</p>
        </div>
      </section>

      {/* Overtime */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5"><h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Timer size={16} className="text-blue-700" />Overtime (2×, consent, records)</h2>
        <div className="grid grid-cols-3 gap-3 mt-4"><Field label="Hrs/day" value={dailyHours} onChange={setDailyHours} /><Field label="Hrs/week" value={weeklyHours} onChange={setWeeklyHours} /><Field label="OT hrs paid" value={otHours} onChange={setOtHours} /></div>
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mt-3"><input type="checkbox" checked={otConsent} onChange={e => setOtConsent(e.target.checked)} className="w-4 h-4" />Written consent on file</label>
        <dl className="mt-3 text-xs space-y-1"><Row label="OT rate" value={`${ot.otRate}× ordinary rate`} /><Row label="Norm" value={ot.detail} /><Row label="Consent" value={ot.consentOk ? 'Yes' : 'Missing'} /></dl>
        <p className={`mt-2 text-xs font-semibold ${ot.consentOk && ot.withinNorm ? 'text-green-700' : 'text-red-700'}`}>{ot.consentOk && ot.withinNorm ? 'OT compliant — 2× rate, consent, records.' : 'OT check failed (consent or beyond norm).'}</p>
      </section>

      {/* Gratuity + classification */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5"><h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Landmark size={16} className="text-blue-700" />Gratuity (15-day window)</h2>
        <div className="grid grid-cols-2 gap-3 mt-4"><label className="text-xs font-semibold text-gray-700">Application received<input type="date" value={gratReceived} onChange={e => setGratReceived(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-xs bg-white" /></label><div className="text-xs"><Info label="Days elapsed" value={`${grat.noticeDays}`} /><Info label="Window" value={grat.due} /></div></div>
        <p className={`mt-3 text-xs font-semibold ${grat.ok ? 'text-green-700' : 'text-red-700'}`}>{grat.ok ? 'Within window — issue amount+date notice or rejection reasons.' : 'Exceeded the 15-day response window — needs immediate action.'}</p>
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mt-5 pt-4 border-t border-gray-100"><Users2 size={16} className="text-blue-700" />Worker classification</h2>
        <div className="grid grid-cols-2 gap-3 mt-3"><label className="text-xs font-semibold text-gray-700">Capacity<select value={role} onChange={e => setRole(e.target.value as typeof role)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-xs bg-white"><option value="worker">Worker</option><option value="supervisory">Supervisory</option><option value="manager">Managerial / Admin</option></select></label><Field label="Monthly salary" value={salary} onChange={setSalary} /></div>
        <p className={`mt-3 text-xs font-semibold ${cls.isWorker ? 'text-green-700' : 'text-red-700'}`}>{cls.isWorker ? 'Classified as a Worker.' : 'NOT a worker — ' + cls.reason}</p>
        <p className="text-[11px] text-gray-400 mt-1">Supervisory threshold: ₹{LIMITS.nonWorkerSupervisorySalary.toLocaleString('en-IN')}/month.</p>
      </section>

      {/* Night shift */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5"><h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Moon size={16} className="text-blue-700" />Women night shift (7PM–6AM)</h2>
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mt-3"><input type="checkbox" checked={nightConsent} onChange={e => setNightConsent(e.target.checked)} className="w-4 h-4" />Explicit written consent</label>
        <div className="grid grid-cols-2 gap-2 mt-3">{Object.entries(nightAmenities).map(([key, value]) => <label key={key} className="flex items-center gap-2 text-xs font-semibold text-gray-600"><input type="checkbox" checked={value} onChange={e => setNightAmenities(a => ({ ...a, [key]: e.target.checked }))} className="w-4 h-4" />{(key.charAt(0).toUpperCase() + key.slice(1))}</label>)}</div>
        <dl className="mt-3 text-xs space-y-1"><Row label="Amenities ready" value={Object.values(nightAmenities).filter(Boolean).length + '/5'} /><Row label="Window" value={`${LIMITS.nightShiftStart} – ${LIMITS.nightShiftEnd}`} /></dl>
        <p className={`mt-2 text-xs font-semibold ${nightComplete ? 'text-green-700' : 'text-red-700'}`}>{nightComplete ? 'Night-shift compliant (consent + transport, lighting, amenities, emergency contacts, CCTV).' : 'Missing consent or an amenity — night shift not allowed.'}</p>
      </section>
    </div>

    {/* Rules registry */}
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck size={16} className="text-blue-700" />Compliance registry (10 rules)</h2><p className="text-[11px] text-gray-400 mt-0.5">These statuses flow to the worker dashboard on fulfilment.</p></header>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500"><tr>{['#', 'Rule', 'Status', 'Notes'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{items.map((it, i) => <tr key={it.ruleId} className="hover:bg-gray-50"><td className="px-4 py-3 text-gray-400">{i + 1}</td><td className="px-4 py-3 text-gray-800">{it.title}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-bold ${it.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{it.ok ? 'Compliant' : 'Check'}</span></td><td className="px-4 py-3 text-gray-500 max-w-[320px]">{it.note}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) { return <label className="text-xs font-semibold text-gray-700">{label}<input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm" /></label>; }
function Info({ label, value, tone = 'text-gray-800' }: { label: string; value: string; tone?: string }) { return <div><dt className="text-[10px] uppercase text-gray-400">{label}</dt><dd className={`text-sm font-bold mt-0.5 ${tone}`}>{value}</dd></div>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between"><span className="text-gray-500">{label}</span><strong className="text-gray-800">{value}</strong></div>; }
function money(v: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v); }
