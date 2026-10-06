// Labour-compliance rule engine for the BSS compliance modules.
// Rules are the ten central-government requirements (worker employed by / through a Central
// Government Undertaking / PSU / central-govt employer). Numeric caps and the 15-day window are
// enforced here; statutory references are noted, and a state-governed employer may differ (flagged
// via `govtScope`).

export type GovtScope = 'central' | 'state';
export type RuleStatus = 'fulfilled' | 'pending' | 'attention' | 'exempt';

export type RuleId =
  | 'fines_display'
  | 'deduction_cap'
  | 'show_cause'
  | 'overtime'
  | 'gratuity'
  | 'commuting_accident'
  | 'worksite_notice'
  | 'worker_classification'
  | 'emergency_plan'
  | 'night_shift';

export interface RuleMeta {
  id: RuleId;
  title: string;
  application: string;
  central: boolean;
  stateNote: string;
}

export const RULES: RuleMeta[] = [
  { id:'fines_display', title:'Fines: displayed & limited to approved acts/omissions', application:'Display approved acts & omissions for which fines may be imposed; levy fines only for those.', central:true, stateNote:'State law may specify its own approved fine schedule per the state Shops & Establishments / BOCW rules.' },
  { id:'deduction_cap', title:'Total deductions capped at 50% of wages', application:'Fines + damage/loss recovery + advance recovery ≤ 50% of wages per pay period; excess carry-forward. Advance recovery separately capped at 50%.', central:true, stateNote:'Some state BOCW/PE rules align with the 50% ceiling.' },
  { id:'show_cause', title:'7-day show-cause before damage/loss deduction', application:'A 7-day show-cause notice is mandatory before deducting for damage or loss; deduction proceeds only after the employee explanation is received and considered.', central:true, stateNote:'Intent to mirror under state PE/civil works rules.' },
  { id:'overtime', title:'Overtime at double rate · written consent · records', application:'OT paid at 2× the ordinary rate for hours beyond 8/day or 48/week; prior written employee consent; OT records maintained.', central:true, stateNote:'State rules may adjust the OT multiplier / normal hours.' },
  { id:'gratuity', title:'Gratuity examined · 15-day response window', application:'Examine the gratuity application; within 15 days of receipt issue a notice stating the payable amount + payment date, or communicate reasons for rejection.', central:true, stateNote:'Payment of Gratuity Act applies; state bodies follow the same 15-day ceiling.' },
  { id:'commuting_accident', title:'Commuting accidents treated as employment-related', application:'An accident while commuting to/from the workplace is deemed employment-related and covered.', central:true, stateNote:'ESIC/state schemes may define commuting-window rules.' },
  { id:'worksite_notice', title:'Worksite notice (establishment particulars)', application:'Post at conspicuous points: name & address of the establishment, working hours, wage period, wage payment date, and accidents/dangerous occurrences in the preceding five years.', central:true, stateNote:'State formats may require additional fields.' },
  { id:'worker_classification', title:'Worker vs Non-worker classification', application:'Anyone in a managerial/administrative capacity, or supervisory capacity earning > ₹18,000/month, is NOT a worker. Employer must map the full workforce.', central:true, stateNote:'The ₹18,000 supervisory threshold is a central CW/NPS floor; state bodies may adopt it.' },
  { id:'emergency_plan', title:'On-site emergency & disaster control plan', application:'Prepare a written health & safety plan covering workers; communicate it to workers and the general public near the establishment.', central:true, stateNote:'State disaster-management authorities may require revalidation/registration.' },
  { id:'night_shift', title:'Women night shift (7PM–6AM) — consent + amenities', application:'Permitted only with explicit written consent; employer must provide pick-up & drop transport, proper lighting, basic amenities, emergency contact details and CCTV surveillance.', central:true, stateNote:'State rules may restrict night-work timing or require police/transport approvals.' },
];

export const LIMITS = {
  maxDeductionPercent: 50,
  maxAdvancePercent: 50,
  otDailyHours: 8,
  otWeeklyHours: 48,
  otMultiplier: 2,
  gratuityNoticeDays: 15,
  nonWorkerSupervisorySalary: 18_000,
  nightShiftStart: '19:00',
  nightShiftEnd: '06:00',
};

export interface DeductionCheck {
  totalCap: number; advanceCap: number; totalExcess: number; advanceExcess: number; totalApproved: boolean; advanceApproved: boolean; carriedForward: number;
}

/** Rule 2 — total deductions (fines + damage/loss + advance) ≤ maxDeductionPercent% of wages; advance separately capped; excess carried forward. */
export function computeDeductionCheck(grossWage: number, totalDeductions: number, advanceDeduction: number): DeductionCheck {
  const totalCap = grossWage * LIMITS.maxDeductionPercent / 100;
  const advanceCap = grossWage * LIMITS.maxAdvancePercent / 100;
  const totalExcess = Math.max(0, totalDeductions - totalCap);
  const advanceExcess = Math.max(0, advanceDeduction - advanceCap);
  return { totalCap, advanceCap, totalExcess, advanceExcess, totalApproved: totalExcess === 0, advanceApproved: advanceExcess === 0, carriedForward: totalExcess + advanceExcess };
}

/** Rule 3 — damage/loss deduction requires a 7-day show-cause notice and a considered reply. */
export function validateShowCause(deductionType: 'damage' | 'loss' | 'fines' | 'advance', noticeDays: number, replyConsidered: boolean): boolean {
  if (deductionType !== 'damage' && deductionType !== 'loss') return true;
  return noticeDays >= 7 && replyConsidered;
}

/** Rule 4 — overtime hours beyond the daily/weekly norm, at 2× the ordinary rate, with written consent. */
export function overtimeStatus(dailyHours: number | null, weeklyHours: number, consent: boolean, otHours: number): { otHours: number; otRate: number; consentOk: boolean; withinNorm: boolean; detail: string } {
  const dailyExcess = dailyHours != null ? Math.max(0, dailyHours - LIMITS.otDailyHours) : 0;
  const weeklyIsBeyond = weeklyHours > LIMITS.otWeeklyHours;
  const otForWeek = Math.max(dailyExcess, weeklyIsBeyond ? weeklyHours - LIMITS.otWeeklyHours : 0);
  return { otHours, otRate: LIMITS.otMultiplier, consentOk: consent, withinNorm: otHours <= otForWeek, detail: `${LIMITS.otMultiplier}× ordinary rate for hours beyond ${LIMITS.otDailyHours}/day or ${LIMITS.otWeeklyHours}/week` };
}

/** Rule 5 — gratuity must be answered within the 15-day window. */
export function gratuityDeadline(receivedAt: string): { noticeDays: number; due: string; ok: boolean } {
  const received = new Date(receivedAt).getTime();
  const days = Math.max(1, Math.floor((Date.now() - received) / 86_400_000));
  return { noticeDays: days, due: `${LIMITS.gratuityNoticeDays} days`, ok: days <= LIMITS.gratuityNoticeDays };
}

/** Rule 8 — worker classification. */
export function classifyWorker(role: 'manager' | 'supervisory' | 'worker', monthlySalary: number): { isWorker: boolean; reason: string } {
  if (role === 'manager') return { isWorker: false, reason: 'Managerial / administrative capacity is not a worker.' };
  if (role === 'supervisory' && monthlySalary > LIMITS.nonWorkerSupervisorySalary) return { isWorker: false, reason: `Supervisory role earning above ₹${LIMITS.nonWorkerSupervisorySalary.toLocaleString('en-IN')}/month is not a worker.` };
  return { isWorker: true, reason: 'Classified as a worker.' };
}

export function ruleById(id: RuleId): RuleMeta { return RULES.find(r => r.id === id)!; }
