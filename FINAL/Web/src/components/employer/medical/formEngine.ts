/** Turns a state form (HTML authored by BSS Staff) plus a recorded examination
 *  into the printable certificate the employer sees. Browser-only (DOMParser).
 *
 *  The HTML is token-driven — there is no hardcoded field map:
 *    {{self.name}} {{exam.certNo}} {{test.height}} {{site.name}} {{state}} {{version}}
 *    {{custom.<key>}}  ← asked from the Medical Officer, stored on the exam
 */

import { ageFrom, fmtDate } from './catalog';
import { TOKEN_PLACEHOLDER } from './tokens';
import type { MedicalExam, TestResult } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function testValue(t: TestResult | undefined) {
  if (!t) return '';
  if (t.flag === 'Not Done') return 'Not done';
  if (!t.result.trim()) return t.flag === 'Abnormal' ? 'Abnormal' : '';
  const unit = t.unit && t.unit !== '—' ? ` ${t.unit}` : '';
  return `${t.result.trim()}${unit}${t.flag === 'Abnormal' ? ' (Abnormal)' : ''}`;
}

export function certificateNo(exam: Pick<MedicalExam, 'examDate' | 'workerId'>) {
  const y = exam.examDate ? exam.examDate.slice(0, 4) : String(new Date().getFullYear());
  return `MED/${y}/${exam.workerId.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase()}`;
}

export function fitnessStatement(exam: MedicalExam) {
  const role = exam.partA.role || exam.partA.designation || 'the assigned role';
  const dept = exam.partA.department ? ` in the ${exam.partA.department} department` : '';
  if (exam.overall === 'Fit') return `Medically FIT for ${role}${dept}, without restrictions.`;
  if (exam.overall === 'Fit with restrictions') return `Medically FIT WITH RESTRICTIONS for ${role}${dept}${exam.restrictions ? ` — ${exam.restrictions}` : ''}.`;
  return `Medically UNFIT for ${role}${dept}.`;
}

/** Resolve every system token from the recorded exam + context. Empty values
 *  fall back to the blank Gazette placeholder so unfilled forms still look right. */
export function resolveSystemTokens(
  exam: MedicalExam,
  ctx: { workerBssId: string; siteName: string; siteLocation: string; state: string; formVersion: number | null },
): Record<string, string> {
  const t = Object.fromEntries(exam.tests.map(x => [x.key, x]));
  const [insp = '', expi = ''] = (t.chest?.result ?? '').split('/').map(s => s.trim());
  const [vaR = '', vaL = ''] = (t.vision?.result ?? '').split(/[,/]\s*(?=\d)|,/).map(s => s.trim());
  const [hearR = '', hearL = ''] = (t.audiometry?.result ?? '').split(/[,/]/).map(s => s.trim());
  const named = new Set(['height', 'weight', 'chest', 'waist', 'bmi', 'vision', 'colour', 'bp', 'cbc', 'fbs', 'ppbs', 'spo2', 'urea', 'creatinine', 'bilirubin', 'sgot', 'sgpt', 'lipid', 'tsh', 'xray', 'ecg', 'pulse']);
  const others = exam.tests.filter(x => !named.has(x.key) && testValue(x)).map(x => `${x.name}: ${testValue(x)}`).join('; ');
  const age = ageFrom(exam.partA.dob);
  const diagnosis = [fitnessStatement(exam), exam.remarks].filter(Boolean).join(' ');
  const doctor = [exam.doctor.name, exam.doctor.reg && `Reg. No. ${exam.doctor.reg}`, exam.doctor.hospital].filter(Boolean).join(' · ');
  const abnormals = exam.tests.filter(x => x.flag === 'Abnormal').map(x => x.name).join(', ');
  const or = (v: unknown) => (v === undefined || v === null || String(v).trim() === '' ? TOKEN_PLACEHOLDER : String(v));

  const values: Record<string, string> = {
    'self.name': or(exam.partA.name), 'self.bssId': or(ctx.workerBssId), 'self.aadhaar': or(exam.partA.aadhaar),
    'self.mobile': or(exam.partA.mobile), 'self.dob': or(exam.partA.dob ? fmtDate(exam.partA.dob) : ''),
    'self.age': or(age ? `${age} yrs` : ''), 'self.age_dob': or([age && `${age} yrs`, exam.partA.dob && `(DOB ${fmtDate(exam.partA.dob)})`].filter(Boolean).join(' ')),
    'self.gender': or(exam.partA.gender), 'self.address': or(exam.partA.address), 'self.email': or(exam.partA.email),
    'self.company': or(exam.partA.company), 'self.designation': or(exam.partA.designation),
    'self.department': or(exam.partA.department), 'self.role': or(exam.partA.role), 'self.uan': or(exam.partA.uan),
    'exam.certNo': or(certificateNo(exam)), 'exam.date': or((exam.examDate ? fmtDate(exam.examDate) : '')),
    'exam.fitness': or(exam.overall), 'exam.doctor': or(doctor), 'exam.nextDue': or((exam.nextDue ? fmtDate(exam.nextDue) : '')),
    'exam.remarks': or(exam.remarks), 'exam.diagnosis': or(diagnosis), 'exam.incharge': or(exam.partA.incharge),
    'exam.illness': or(exam.partA.illness), 'exam.nature': or(exam.partA.nature), 'exam.others': or(others),
    'exam.seizure': or(exam.heightWork.value === 'Yes' ? `Yes — ${exam.heightWork.detail || 'works to be avoided to be specified'}` : exam.heightWork.value === 'No' ? 'No' : 'NA'),
    'exam.otherAbnormality': or(abnormals),
    'site.name': or(ctx.siteName), 'site.location': or(ctx.siteLocation), state: or(ctx.state), version: or(ctx.formVersion ? String(ctx.formVersion) : ''),
    'test.chest.insp': or(insp), 'test.chest.exp': or(expi),
    'test.vision.right': or(vaR), 'test.vision.left': or(vaL),
    'test.audiometry.right': or(hearR), 'test.audiometry.left': or(hearL),
  };
  for (const x of exam.tests) {
    values[`test.${x.key}`] = or(testValue(x));
    values[`test.${x.key}.unit`] = or(x.unit);
    values[`test.${x.key}.flag`] = or(x.flag);
  }
  return values;
}

function annexure(exam: MedicalExam, ctx: { workerBssId: string; siteName: string; state: string; formVersion: number | null }) {
  const certNo = certificateNo(exam);
  const verId = `${certNo.replace(/\//g, '-')}-${ctx.workerBssId.slice(-4)}`;
  const tone = exam.overall === 'Fit' ? '#14843C' : exam.overall === 'Unfit' ? '#DC2626' : '#E45D24';
  const rows = exam.tests.filter(t => t.result.trim() || t.flag !== 'Normal').map(t => `<tr><td>${esc(t.name)}</td><td><b>${esc(t.result || '—')}</b></td><td>${esc(t.unit || '—')}</td><td style="font-weight:700;color:${t.flag === 'Abnormal' ? '#b91c1c' : t.flag === 'Not Done' ? '#64748b' : '#047857'}">${esc(t.flag)}</td><td>${esc(t.fileName || '—')}</td></tr>`).join('')
    || '<tr><td colspan="5" style="text-align:center;color:#94a3b8">No test results recorded.</td></tr>';
  const files = exam.tests.filter(t => t.fileName);
  const block = (title: string, color: string, bg: string, lines: Array<[string, string]>) => {
    const body = lines.filter(([, v]) => v).map(([k, v]) => `<tr><td style="width:130px;font-weight:700;color:${color};padding:2px 0">${k}</td><td style="padding:2px 0">${esc(v)}</td></tr>`).join('');
    return body ? `<div style="border:1px solid ${color}55;background:${bg};border-radius:6px;padding:8px 12px;margin-top:8px"><div style="font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${color};margin-bottom:4px">${title}</div><table style="width:100%;font-size:11px;border-collapse:collapse">${body}</table></div>` : '';
  };
  return `
<div class="page bss-annex" style="height:auto;min-height:8.5in;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#0f172a">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #01183A;padding-bottom:8px">
    <div>
      <div style="font-size:9px;letter-spacing:.14em;font-weight:700;color:#E45D24">BHARAT SHRAM SETU · ANNEXURE TO HEALTH EXAMINATION</div>
      <div style="font-size:17px;font-weight:800;color:#01183A;margin-top:3px">Fitness Determination &amp; Test Report Summary</div>
      <div style="font-size:10px;color:#475569">${esc(ctx.state)} state form${ctx.formVersion ? ` · v${ctx.formVersion}` : ''} · Form-${exam.formType} · ${esc(ctx.siteName)}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#475569">Certificate No.<br><b style="color:#01183A;font-size:12px">${esc(certNo)}</b><br>Worker BSS ID: <b>${esc(ctx.workerBssId)}</b><br>Exam date: <b>${fmtDate(exam.examDate)}</b> · Valid until: <b>${fmtDate(exam.nextDue)}</b></div>
  </div>
  <div style="margin-top:10px;padding:8px 12px;border-left:4px solid ${tone};background:#F2F6FC;font-size:12px"><b style="color:${tone}">${esc(exam.overall.toUpperCase())}</b> — ${esc(fitnessStatement(exam))}${exam.restrictions ? `<div style="margin-top:4px"><b style="color:#b45309">Restrictions / conditions:</b> ${esc(exam.restrictions)}</div>` : ''}</div>
  ${exam.altFit.enabled ? block('Fit for alternate deployment', '#047857', '#ecfdf5', [['Role', exam.altFit.role], ['Work / Activity', exam.altFit.work], ['Department', exam.altFit.dept], ['Remarks', exam.altFit.remarks]]) : ''}
  ${block('Unfit for — exclusions', '#b91c1c', '#fef2f2', [['Role', exam.unfit.role], ['Work / Activity', exam.unfit.work], ['Department', exam.unfit.dept], ['Recommendation', exam.unfit.recommendation]])}
  <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:10.5px" border="1" cellpadding="4">
    <thead style="background:#F2F6FC;color:#01183A;text-transform:uppercase;font-size:9px;letter-spacing:.04em"><tr><th align="left" style="width:36%">Test / Parameter</th><th align="left">Result</th><th align="left">Unit</th><th align="left">Interpretation</th><th align="left">Report file</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top:8px;font-size:10px;color:#475569"><b style="color:#0f172a">Annexures:</b> ${files.length ? files.map((t, i) => `Annexure ${String.fromCharCode(65 + i)} — ${esc(t.name)} (${esc(t.fileName)})`).join(' · ') : 'No reports attached.'}</div>
  <div style="margin-top:16px;padding-top:8px;border-top:1px dashed #cbd5e1">
    <div style="font-size:9px;color:#64748b">Examining authority: <b style="color:#0f172a">${esc(exam.doctor.name || '—')}</b> · Reg. No. ${esc(exam.doctor.reg || '—')} · ${esc(exam.doctor.hospital || '—')}<br>Computer-generated through Bharat Shram Setu. Verification ID: <b>${esc(verId)}</b></div>
  </div>
</div>`;
}

/** Fill the state form with an exam. Only the chosen form (VIII or IX) is kept,
 *  and a BSS annexure page with the fitness determination is appended. */
export function fillForm(html: string, exam: MedicalExam, ctx: { workerBssId: string; siteName: string; siteLocation: string; state: string; formVersion: number | null }) {
  const values = resolveSystemTokens(exam, ctx);
  for (const [key, value] of Object.entries(exam.customFields ?? {})) values[`custom.${key}`] = value || '';

  // Substitute any {{ token }} (optionally with a |label used only for custom prompts).
  const source = (html || '').replace(/\{\{\s*([A-Za-z0-9_.]+)\s*(?:\|[^}]*)?\}\}/g, (_m, key: string) => values[key] ?? '');

  const doc = new DOMParser().parseFromString(source, 'text/html');
  const sections = doc.querySelectorAll<HTMLElement>('section[data-form]');
  if (sections.length > 1) sections.forEach(s => { if (s.dataset.form !== exam.formType) s.remove(); });
  doc.body.insertAdjacentHTML('beforeend', annexure(exam, ctx));
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}
