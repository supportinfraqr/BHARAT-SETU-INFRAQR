/**
 * Form state <-> legacy payload helpers for the investment declaration.
 * Payload keys mirror `mergeItDeclaration` / `sanitize*` in legacy tdsManagement.js.
 */

import type { ChapterVIA, EmployeeTdsRecord, FormState, InvestmentLine, Keyed, PendingFiles, RentEntry, SalaryExemptions } from './types';

let seq = 0;
export const newKey = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : 0; };
const s = (v: unknown) => (v == null ? '' : String(v));
const b = (v: unknown) => v === true || v === 'true' || v === 1;

export const SALARY_EXEMPTION_FIELDS: Array<{ key: keyof SalaryExemptions; label: string; hint?: string; count?: boolean }> = [
  { key: 'childrenCount', label: 'Number of children', hint: 'Used for children education / hostel allowance (max 2)', count: true },
  { key: 'childrenEducationReceived', label: 'Children education allowance received', hint: 'Old regime · ₹100/month per child' },
  { key: 'hostelAllowanceReceived', label: 'Hostel allowance received', hint: 'Old regime · ₹300/month per child' },
  { key: 'ltaEligibleTravel', label: 'Leave travel (LTA) eligible travel cost', hint: 'Old regime · Sec 10(5)' },
  { key: 'disabledTransportReceived', label: 'Transport allowance (specified disability)', hint: 'Old regime · ₹3,200/month' },
  { key: 'gratuityReceived', label: 'Gratuity received', hint: 'Sec 10(10)' },
  { key: 'leaveEncashmentReceived', label: 'Leave encashment received', hint: 'Sec 10(10AA)' },
  { key: 'retrenchmentReceived', label: 'Retrenchment compensation received', hint: 'Sec 10(10B)' },
  { key: 'vrsReceived', label: 'VRS compensation received', hint: 'Sec 10(10C)' },
  { key: 'officialDutySpent', label: 'Allowance spent on official duty', hint: 'Sec 10(14)(i)' },
  { key: 'lifeInsuranceExempt', label: 'Life insurance maturity (exempt)', hint: 'Sec 10(10D) · both regimes' },
];

export const CHAPTER_VIA_FIELDS: Array<{ key: Exclude<keyof ChapterVIA, 'section80DDSevere'>; label: string; hint?: string }> = [
  { key: 'section80CCC', label: '80CCC · Pension fund contribution', hint: 'Counts within the ₹1.5 lakh 80C limit' },
  { key: 'section80CCD1', label: '80CCD(1) · Own NPS contribution', hint: 'Up to 10% of salary, within 80C limit' },
  { key: 'section80CCD1B', label: '80CCD(1B) · Additional NPS', hint: 'Up to ₹50,000' },
  { key: 'section80CCD2', label: '80CCD(2) · Employer NPS contribution', hint: 'Allowed in both regimes' },
  { key: 'section80DD', label: '80DD · Disabled dependant', hint: 'Fixed ₹75,000 (₹1,25,000 severe)' },
  { key: 'section80DDB', label: '80DDB · Treatment of specified diseases', hint: 'Up to ₹40,000 (₹1,00,000 senior)' },
  { key: 'section80EE', label: '80EE · Home loan interest (first home, FY 2016-17)', hint: 'Up to ₹50,000' },
  { key: 'section80EEA', label: '80EEA · Affordable housing loan interest', hint: 'Up to ₹1,50,000 · not with 80EE' },
  { key: 'section80GG', label: '80GG · Rent paid (no HRA received)', hint: 'Up to ₹5,000/month' },
  { key: 'section80GGA', label: '80GGA · Donations for scientific research' },
  { key: 'section80GGC', label: '80GGC · Donations to political parties' },
  { key: 'section80TTA', label: '80TTA / 80TTB · Interest on savings / deposits', hint: '₹10,000 (₹50,000 for seniors under 80TTB)' },
];

export const OPTIONS_80C = [
  'Public Provident Fund (PPF)', 'Employee Provident Fund (EPF / VPF)', 'Life Insurance Premium', 'ELSS Mutual Fund',
  'National Savings Certificate (NSC)', 'Children Tuition Fees', '5-Year Tax Saving Fixed Deposit', 'Sukanya Samriddhi Yojana',
  'Senior Citizen Savings Scheme', 'Unit Linked Insurance Plan (ULIP)', 'Stamp Duty & Registration Charges', 'NABARD Rural Bonds', 'Other 80C Investment',
];

/** Wording matters: legacy aggregate80DFromLines buckets lines by keywords (parent / senior / prevent / medical exp). */
export const OPTIONS_80D = [
  'Medical Insurance Premium - Self, Spouse & Children', 'Medical Insurance Premium - Self (Senior Citizen)',
  'Medical Insurance Premium - Parents', 'Medical Insurance Premium - Parents (Senior Citizen)',
  'Preventive Health Check-up - Self', 'Preventive Health Check-up - Parents',
  'Medical Expenditure - Self (Senior Citizen, uninsured)', 'Medical Expenditure - Parents (Senior Citizen, uninsured)',
];

export const OPTIONS_OTHER = ['Education Loan Interest', 'Donation', 'Disability (Self)', 'Other Deduction'];

const line = (x: Partial<InvestmentLine> | null | undefined): Keyed<InvestmentLine> => ({ key: newKey(), investmentType: s(x?.investmentType), amount: n(x?.amount), attachment: s(x?.attachment) });
const rent = (x: Partial<RentEntry> | null | undefined): Keyed<RentEntry> => ({
  key: newKey(), fromDate: s(x?.fromDate), toDate: s(x?.toDate), rentMonthly: n(x?.rentMonthly), rentAnnual: n(x?.rentAnnual),
  address: s(x?.address), landlordName: s(x?.landlordName), urbanizationType: s(x?.urbanizationType), urbanizationType2: s(x?.urbanizationType2),
  isMetroCity: b(x?.isMetroCity), attachment: s(x?.attachment),
});
export const emptyLine = () => line(null);
export const emptyRent = () => rent(null);

export function formFromRecord(rec: EmployeeTdsRecord): FormState {
  const it = rec.itDeclaration ?? {};
  const se = (it.salaryExemptions ?? {}) as Partial<SalaryExemptions>;
  const ch = (it.chapterVIA ?? {}) as Partial<ChapterVIA>;
  const dd = rec.declaredDeductions ?? {};
  const salaryExemptions = Object.fromEntries(SALARY_EXEMPTION_FIELDS.map(f => [f.key, n(se[f.key])])) as SalaryExemptions;
  const chapterVIA = { ...Object.fromEntries(CHAPTER_VIA_FIELDS.map(f => [f.key, n(ch[f.key])])), section80DDSevere: b(ch.section80DDSevere) } as ChapterVIA;
  const hl = it.homeLoanSelfOccupied;
  const oi = it.otherIncomeBreakdown;
  return {
    taxRegime: rec.taxRegime === 'old' ? 'old' : 'new',
    investments80C: (rec.investments80C ?? []).map(line),
    investments80D: (rec.investments80D ?? []).map(line),
    it: {
      stayingInRentedHouse: b(it.stayingInRentedHouse),
      rentEntries: (it.rentEntries ?? []).map(rent),
      homeLoanSelfOccupied: { enabled: b(hl?.enabled), principalPaid: n(hl?.principalPaid), interestPaid: n(hl?.interestPaid), lenderName: s(hl?.lenderName), lenderPAN: s(hl?.lenderPAN), attachment: s(hl?.attachment) },
      letOutPropertyEnabled: b(it.letOutPropertyEnabled),
      letOutPropertyAttachment: s(it.letOutPropertyAttachment),
      investmentsOther: (it.investmentsOther ?? []).map(line),
      otherIncomeBreakdown: { incomeFromOtherSources: n(oi?.incomeFromOtherSources), interestSavings: n(oi?.interestSavings), interestFD: n(oi?.interestFD), interestNSC: n(oi?.interestNSC), attachment: s(oi?.attachment) },
      toggles: { section80C: it.toggles?.section80C !== false, section80D: it.toggles?.section80D !== false, otherInvestments: b(it.toggles?.otherInvestments) },
      salaryExemptions,
      chapterVIA,
    },
    section80E: n(dd.section80E),
    section80G: n(dd.section80G),
    professionalTax: n(dd.professionalTax),
  };
}

const strip = <T extends { key: string }>(line: T): Omit<T, 'key'> => {
  const rest: Partial<T> = { ...line };
  delete rest.key;
  return rest as Omit<T, 'key'>;
};

/**
 * Legacy multer maps uploaded files to lines by array index
 * (`rentAttachments[i]` -> `rentEntries[i]`). Lines with a newly picked file are
 * therefore sent first, in the same order as their files.
 */
function orderForUpload<T extends { key: string }>(lines: T[], files: PendingFiles): { lines: T[]; files: File[] } {
  const withFile = lines.filter(l => files[l.key]);
  const rest = lines.filter(l => !files[l.key]);
  return { lines: [...withFile, ...rest], files: withFile.map(l => files[l.key]) };
}

export function buildPayload(f: FormState, financialYear: string, files: PendingFiles = {}) {
  const c = orderForUpload(f.investments80C, files);
  const d = orderForUpload(f.investments80D, files);
  const r = orderForUpload(f.it.rentEntries, files);
  const o = orderForUpload(f.it.investmentsOther, files);
  const body = {
    financialYear,
    taxRegime: f.taxRegime,
    investments80C: c.lines.map(strip),
    investments80D: d.lines.map(strip),
    itDeclaration: { ...f.it, rentEntries: r.lines.map(strip), investmentsOther: o.lines.map(strip) },
    declaredDeductions: { section80E: f.section80E, section80G: f.section80G, professionalTax: f.professionalTax },
  };
  return { body, uploads: { investment80CAttachments: c.files, investment80DAttachments: d.files, rentAttachments: r.files, otherInvestmentAttachments: o.files } };
}

/** Multipart form for PUT tds/submitInvestmentproof (object fields JSON-encoded, as parseInvestmentRequestBody expects). */
export function buildProofForm(f: FormState, financialYear: string, files: PendingFiles): FormData {
  const { body, uploads } = buildPayload(f, financialYear, files);
  const form = new FormData();
  form.append('financialYear', body.financialYear);
  form.append('taxRegime', body.taxRegime);
  form.append('investments80C', JSON.stringify(body.investments80C));
  form.append('investments80D', JSON.stringify(body.investments80D));
  form.append('itDeclaration', JSON.stringify(body.itDeclaration));
  form.append('declaredDeductions', JSON.stringify(body.declaredDeductions));
  for (const [field, list] of Object.entries(uploads)) list.forEach(file => form.append(field, file));
  if (files.homeLoan) form.append('homeLoanAttachment', files.homeLoan);
  if (files.letOut) form.append('letOutPropertyAttachment', files.letOut);
  if (files.otherIncome) form.append('otherIncomeAttachment', files.otherIncome);
  return form;
}

export const sumAmounts = (lines: Array<{ amount: number }>) => lines.reduce((a, l) => a + (Number(l.amount) || 0), 0);
