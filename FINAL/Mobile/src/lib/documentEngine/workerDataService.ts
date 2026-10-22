import { OwnerScope, GeneratedDocument, today, formatDate, inr } from './types';
import { TOKEN_BY_KEY, TOKEN_PATTERN, requiredTokensForContent } from './tokens';

// ---------------------------------------------------------------- portal view
// Loose, role-agnostic worker row accepted from Contractor/Employer Worker Masters.
export type WorkerLike = {
  id?: string;
  name: string;
  bssId: string;
  mobile?: string | null;
  site?: string;
  siteId?: string;
  employer?: string;
  employerId?: string;
  contractor?: string;
  contractorId?: string;
  designation?: string;
  department?: string;
  doj?: string;
  category?: string;
  gender?: string;
  age?: string;
  photoUrl?: string;
  status?: string;
  verified?: boolean;
  skills?: string[];
  refCode?: string;
};

export type PortalView = {
  owner: OwnerScope;
  workers: WorkerLike[];
  sites: Array<{ id?: string; bssId?: string; name?: string; location?: string; state?: string; address?: string; department?: string; workArea?: string; medicalOfficer?: string; employer?: string }>;
  contractors: Array<{ id?: string; name: string; bssId: string; contact?: string; address?: string; signatory?: string }>;
  employers: Array<{ id?: string; name: string; bssId?: string; address?: string; signatory?: string; contact?: string }>;
  payroll?: Array<{ workerId?: string; workerName?: string; employer?: string; site?: string; period?: string; netPay?: number; gross?: number; earnings?: Array<{ component: string; amount: number }> }>;
  // direct overrides used by the employer portal
  siteMap?: Record<string, { bssId?: string; location?: string; state?: string; address?: string }>;
};

// ---------------------------------------------------------------- demo supplement
// Frontend-first data source for identity particulars not present on the compact
// Contractor/Employer worker rows (real Worker portal stores these fields). Keyed by
// BSS ID so Worker A and Worker B always resolve to their own values.
const SUPPLEMENT: Record<string, Record<string, string>> = {
  BSS892199210001: { fatherName: 'Mohan Kumar', dob: '15-08-1990', gender: 'Male', address: 'Village Rampur, Post Patna, Bihar 800001', bloodGroup: 'B+', emergencyContact: 'Sunita Kumar · +91 98675 43210', mobile: '+91 98765 43210', wage: '12500', basicWage: '12500', da: '2250', retaining: '1250', other: '5750', gross: '21750' },
  BSS892199220002: { fatherName: 'Suresh Singh', dob: '03-02-1994', gender: 'Male', address: 'House 42, Sector 12, Gurugram, Haryana 122001', bloodGroup: 'O+', emergencyContact: 'Anita Singh · +91 98112 34567', mobile: '+91 97654 32100', wage: '11500', basicWage: '11500', da: '2000', retaining: '1000', other: '5000', gross: '19500' },
  BSS892199230003: { fatherName: 'Ramdas Patel', dob: '11-07-1991', gender: 'Male', address: 'Sadar Bazar, Vadodara, Gujarat 390001', bloodGroup: 'A+', emergencyContact: 'Geeta Patel · +91 98250 14001', mobile: '+91 99250 14123', wage: '13200', basicWage: '13200', da: '2400', retaining: '1300', other: '6100', gross: '23000' },
  BSS892199240004: { fatherName: 'Hari Das', dob: '27-11-1996', gender: 'Male', address: 'Village Kharagpur, West Bengal 721301', bloodGroup: 'AB+', emergencyContact: 'Maya Das · +91 98300 22001', mobile: '+91 97300 22010', wage: '9800', basicWage: '9800', da: '1600', retaining: '800', other: '3600', gross: '15800' },
  BSS892199250005: { fatherName: 'Iqbal Shaikh', dob: '19-05-1993', gender: 'Male', address: 'Byculla, Mumbai, Maharashtra 400027', bloodGroup: 'B-', emergencyContact: 'Farhan Shaikh · +91 98200 30040', mobile: '+91 98200 30041', wage: '14500', basicWage: '14500', da: '2600', retaining: '1400', other: '6900', gross: '25400' },
  BSS892199260006: { fatherName: 'Ramvilas Yadav', dob: '02-09-1989', gender: 'Male', address: 'Village Mau, Chitrakoot, Uttar Pradesh 210206', bloodGroup: 'O-', emergencyContact: 'Sunita Yadav · +91 98390 40050', mobile: '+91 98390 40051', wage: '12700', basicWage: '12700', da: '2200', retaining: '1200', other: '5600', gross: '21700' },
  BSS892199270007: { fatherName: 'Bandu Pawar', dob: '30-01-1998', gender: 'Male', address: 'Hadapsar, Pune, Maharashtra 411028', bloodGroup: 'A-', emergencyContact: 'Sneha Pawar · +91 97670 00077', mobile: '+91 97670 00078', wage: '11100', basicWage: '11100', da: '1900', retaining: '900', other: '4300', gross: '18200' },
  BSS892199280008: { fatherName: 'Ramdeo Jha', dob: '14-12-1988', gender: 'Male', address: 'Darbhanga, Bihar 846004', bloodGroup: 'B+', emergencyContact: 'Kavita Jha · +91 97080 08008', mobile: '+91 97080 08009', wage: '15600', basicWage: '15600', da: '2800', retaining: '1500', other: '7600', gross: '27500' },
  BSS234567890124: { fatherName: 'Mohan Kumar', dob: '15-08-1990', gender: 'Male', address: 'Village Rampur, Post Patna, Bihar 800001', bloodGroup: 'B+', emergencyContact: 'Sunita Kumar · +91 98675 43210', mobile: '+91 98765 43210', wage: '12500', basicWage: '12500', da: '2250', retaining: '1250', other: '5750', gross: '21750' },
};

export const DEMO_WORKERS: WorkerLike[] = [
  { id: 'WRK-001', name: 'Ravi Kumar', bssId: 'BSS892199210001', designation: 'Senior Bar Bender', department: 'Civil Works', site: 'Mumbai Metro Line 3', siteId: 'SITE-001', employer: 'L&T Construction', contractor: 'RK Buildcon Pvt. Ltd.', mobile: '+91 98765 43210', gender: 'Male', age: '36', photoUrl: '/worker-profile.png', status: 'Active', verified: true, skills: ['Bar Bending', 'Reading drawings'] },
  { id: 'WRK-002', name: 'Amit Singh', bssId: 'BSS892199220002', designation: 'Electrician', department: 'Electrification', site: 'Navi Mumbai Airport', siteId: 'SITE-002', employer: 'Shapoorji Pallonji', contractor: 'Shapoorji Engineering', mobile: '+91 97654 32100', gender: 'Male', age: '32', photoUrl: '/worker-profile.png', status: 'Active', verified: true, skills: ['Electrical wiring'] },
  { id: 'WRK-003', name: 'Suresh Patel', bssId: 'BSS892199230003', designation: 'Fitter', department: 'Mechanical', site: 'Pune Industrial Campus', siteId: 'SITE-005', employer: 'L&T Construction', contractor: 'SafeBuild Infra Services', mobile: '+91 99250 14123', gender: 'Male', age: '35', photoUrl: '/worker-profile.png', status: 'Active', verified: true, skills: ['Fitting'] },
  { id: 'WRK-004', name: 'Vikram Das', bssId: 'BSS892199240004', designation: 'Helper / General Hand', department: 'Civil Works', site: 'Coastal Road Project', siteId: 'SITE-003', employer: 'L&T Construction', contractor: 'SafeBuild Infra Services', mobile: '+91 97300 22010', gender: 'Male', age: '29', photoUrl: '/worker-profile.png', status: 'Active', verified: false, skills: ['Material handling'] },
  { id: 'WRK-005', name: 'Imran Shaikh', bssId: 'BSS892199250005', designation: 'Mason', department: 'Building Works', site: 'Mumbai Metro Line 3', siteId: 'SITE-001', employer: 'Shapoorji Pallonji', contractor: 'RK Buildcon Pvt. Ltd.', mobile: '+91 98200 30041', gender: 'Male', age: '33', photoUrl: '/worker-profile.png', status: 'Active', verified: true, skills: ['Masonry', 'Plastering'] },
  { id: 'WRK-006', name: 'Naveen Yadav', bssId: 'BSS892199260006', designation: 'Bar Bender (Rebar)', department: 'Civil Works', site: 'Pune Industrial Campus', siteId: 'SITE-005', employer: 'Shapoorji Pallonji', contractor: 'SafeBuild Infra Services', mobile: '+91 98390 40051', gender: 'Male', age: '37', photoUrl: '/worker-profile.png', status: 'Inactive', verified: true, skills: ['Bar Bending'] },
  { id: 'WRK-007', name: 'Deepak Pawar', bssId: 'BSS892199270007', designation: 'Carpenter', department: 'Formwork', site: 'Coastal Road Project', siteId: 'SITE-003', employer: 'L&T Construction', contractor: 'RK Buildcon Pvt. Ltd.', mobile: '+91 97670 00078', gender: 'Male', age: '28', photoUrl: '/worker-profile.png', status: 'Active', verified: false, skills: ['Shuttering'] },
  { id: 'WRK-008', name: 'Manoj Jha', bssId: 'BSS892199280008', designation: 'Welder', department: 'Fabrication', site: 'Mumbai Metro Line 3', siteId: 'SITE-001', employer: 'L&T Construction', contractor: 'Shapoorji Engineering', mobile: '+91 97080 08009', gender: 'Male', age: '38', photoUrl: '/worker-profile.png', status: 'Active', verified: true, skills: ['Welding', 'Reading drawings'] },
];

function supplementFor(worker: WorkerLike): Record<string, string> {
  return SUPPLEMENT[worker.bssId] ?? {};
}

// ---------------------------------------------------------------- resolver
export type ResolutionResult = {
  tokens: Record<string, string>;
  summary: Array<{ label: string; value: string }>;
  missing: Array<{ key: string; label: string }>;
  warnings: Array<string>;
};

export function resolveWorkerTokens(portal: PortalView, worker: WorkerLike): ResolutionResult {
  const extra = supplementFor(worker);
  const site = portal.sites.find(item => (item.name ?? '') === (worker.site ?? '') || (item.id ?? '') === (worker.siteId ?? '')) ?? portal.sites.find(item => (item.name ?? '') === (worker.site ?? ''));
  const employer = portal.employers.find(item => (item.name ?? '') === (worker.employer ?? '')) ?? portal.employers[0];
  const contractor = portal.contractors.find(item => (item.name ?? '') === (worker.contractor ?? '') || (item.bssId ?? '') === (worker.contractorId ?? '')) ?? portal.contractors[0];
  const own = portal.owner.ownerType === 'contractor' ? portal.contractors[0] : portal.employers[0];

  const payRecord = portal.payroll?.find(item => (item.workerId ?? '') === worker.bssId || (item.workerName ?? '') === worker.name);
  const basicWage = payRecord?.earnings?.find(item => /basic/i.test(item.component))?.amount ?? payRecord?.gross ?? Number(extra.wage ?? 0);
  const gross = payRecord?.gross ?? (Number(extra.gross ?? 0) || basicWage);
  const net = payRecord?.netPay ?? gross;

  const values: Record<string, string> = {
    // worker
    'worker.fullName': worker.name,
    'worker.bssId': worker.bssId,
    'worker.fatherName': extra.fatherName ?? '',
    'worker.dob': formatDate(extra.dob ?? (worker.age ? deriveDobFromAge(worker.age) : ''), extra.dob ?? worker.age ?? ''),
    'worker.gender': worker.gender ?? extra.gender ?? '',
    'worker.nationality': 'Indian',
    'worker.permanentAddress': extra.address ?? '',
    'worker.photo': worker.photoUrl ?? '/worker-profile.png',
    'worker.bloodGroup': extra.bloodGroup ?? '',
    'worker.emergencyContact': extra.emergencyContact ?? worker.mobile ?? '',
    'worker.mobile': worker.mobile ?? extra.mobile ?? '',
    'worker.category': worker.category ?? 'Construction Worker',
    'worker.skill': worker.skills?.[0] ?? '',
    // employment
    'employment.designation': worker.designation ?? '',
    'employment.skillCategory': worker.skills?.[0] ?? 'Skilled',
    'employment.employmentType': worker.status === 'Inactive' ? 'Separated' : 'Permanent',
    'employment.department': worker.department ?? site?.department ?? '',
    'employment.dateOfJoining': formatDate(worker.doj ?? ''),
    'employment.dateOfRelieving': worker.status === 'Inactive' ? (worker.doj ? shiftYears(worker.doj, 2) : '') : '',
    'employment.employmentStatus': worker.status === 'Inactive' ? 'Inactive' : 'Active',
    // contractor & employer (document issuer always its own parties)
    'contractor.legalName': contractor?.name ?? own?.name ?? '',
    'contractor.bssId': contractor?.bssId ?? own?.bssId ?? '',
    'contractor.registeredAddress': contractor?.address ?? own?.address ?? '',
    'contractor.authorizedSignatory': contractor?.signatory ?? '',
    'contractor.contact': contractor?.contact ?? '',
    'employer.legalName': employer?.name ?? '',
    'employer.bssId': employer?.bssId ?? '',
    'employer.registeredAddress': employer?.address ?? '',
    'employer.authorizedSignatory': employer?.signatory ?? '',
    // site
    'site.name': worker.site ?? site?.name ?? '',
    'site.bssId': site?.bssId ?? portal.siteMap?.[worker.site ?? '']?.bssId ?? '',
    'site.address': site?.location ?? site?.address ?? portal.siteMap?.[worker.site ?? '']?.location ?? '',
    'site.state': site?.state ?? portal.siteMap?.[worker.site ?? '']?.state ?? '',
    'site.department': site?.department ?? worker.department ?? '',
    'site.workArea': site?.workArea ?? '',
    'site.medicalOfficer': site?.medicalOfficer ?? '',
    // payroll
    'payroll.basicWage': inr(basicWage),
    'payroll.dearnessAllowance': inr(extra.da ?? 0),
    'payroll.retainingAllowance': inr(extra.retaining ?? 0),
    'payroll.otherComponents': inr(extra.other ?? 0),
    'payroll.grossMonthlyWage': inr(gross),
    'payroll.netPay': inr(net),
    'payroll.payPeriod': payRecord?.period ?? 'Monthly',
    // document / signatory placeholders resolved at generation time
    'document.issueDate': today(),
    'document.validTo': today(),
    'document.validFrom': today(),
    'document.referenceNumber': '',
    'document.place': '',
    'document.number': '',
    'document.workDescription': '',
    'document.reason': '',
    'document.days': '1',
    'signatory.contractor': contractor?.signatory ?? contractor?.name ?? '',
    'signatory.employer': employer?.signatory ?? employer?.name ?? '',
    'signatory.authorized': own?.signatory ?? own?.name ?? '',
  };
  // fill empty strings from supplement for a handful of keys if portal lacks them
  values['worker.dob'] = values['worker.dob'] === '—' ? extra.dob ?? '' : values['worker.dob'];

  const missing: Array<{ key: string; label: string }> = [];
  Object.keys(TOKEN_BY_KEY).forEach(key => {
    const token = TOKEN_BY_KEY[key];
    const has = values[key] !== undefined && values[key] !== '' && values[key] !== '—';
    if (token.required && !has) missing.push({ key, label: token.label });
  });

  const summary = [
    { label: 'Worker', value: `${worker.name}\n${worker.bssId}` },
    { label: 'Contractor', value: values['contractor.legalName'] },
    { label: 'Employer', value: values['employer.legalName'] },
    { label: 'Site', value: `${values['site.name']}${values['site.bssId'] ? ` (${values['site.bssId']})` : ''}` },
    { label: 'Employment', value: `${values['employment.designation']}${values['employment.skillCategory'] ? ' / ' + values['employment.skillCategory'] : ''}` },
  ];
  return { tokens: values, summary, missing, warnings: [] };
}

function deriveDobFromAge(age?: string): string {
  if (!age) return '';
  const year = new Date().getFullYear() - Number(age);
  // ISO form so formatDate() parses it (a non-ISO value falls back to the raw age).
  return `${year}-01-01`;
}
function shiftYears(iso: string, years: number): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setFullYear(date.getFullYear() + years);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Fill template content tokens with resolved values (strings only; photos are handled by the renderer). */
export function applyTokens(content: string, tokens: Record<string, string>): string {
  return content.replace(TOKEN_PATTERN, (_match, key: string) => {
    const value = tokens[key];
    if (key === 'worker.photo') return '[[PHOTO]]';
    return value ?? '';
  });
}

export function missingForTemplate(template: { sections: Array<{ content: string }> }, tokens: Record<string, string>): Array<{ key: string; label: string }> {
  const result: Array<{ key: string; label: string }> = [];
  for (const key of requiredTokensForContent(template.sections)) {
    const value = tokens[key];
    if (value === undefined || value === '' || value === '—') result.push({ key, label: TOKEN_BY_KEY[key]?.label ?? key });
  }
  return result;
}

export function documentStatusFor(doc: GeneratedDocument): string {
  return doc.status;
}

export { requiredTokensForContent };
