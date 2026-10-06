// Reusable variable/token library. Tokens are readable and resolved against the
// actual BSS portal data structures by workerDataService (never hardcoded in UI).

export type TokenDef = { key: string; label: string; category: TokenCategory; required?: boolean; locked?: boolean };

export type TokenCategory = 'Worker' | 'Employment' | 'Contractor' | 'Employer' | 'Site' | 'Payroll' | 'Document' | 'Signatory';

export const TOKEN_DEFS: TokenDef[] = [
  // Worker
  { key: 'worker.fullName', label: 'Full Name', category: 'Worker', required: true, locked: true },
  { key: 'worker.bssId', label: 'Worker BSS ID', category: 'Worker', required: true, locked: true },
  { key: 'worker.fatherName', label: "Father's Name", category: 'Worker', required: true, locked: true },
  { key: 'worker.dob', label: 'Date of Birth', category: 'Worker', required: true, locked: true },
  { key: 'worker.gender', label: 'Gender', category: 'Worker', required: true, locked: true },
  { key: 'worker.nationality', label: 'Nationality', category: 'Worker', locked: true },
  { key: 'worker.permanentAddress', label: 'Permanent Address', category: 'Worker', required: true, locked: true },
  { key: 'worker.photo', label: 'Photo', category: 'Worker', locked: true },
  { key: 'worker.bloodGroup', label: 'Blood Group', category: 'Worker', locked: true },
  { key: 'worker.emergencyContact', label: 'Emergency Contact', category: 'Worker', locked: true },
  { key: 'worker.mobile', label: 'Mobile Number', category: 'Worker', locked: true },
  { key: 'worker.category', label: 'Worker Category', category: 'Worker', locked: true },
  { key: 'worker.skill', label: 'Primary Skill', category: 'Worker' },
  // Employment
  { key: 'employment.designation', label: 'Designation', category: 'Employment', required: true, locked: true },
  { key: 'employment.skillCategory', label: 'Skill Category', category: 'Employment', locked: true },
  { key: 'employment.employmentType', label: 'Employment Type', category: 'Employment', locked: true },
  { key: 'employment.department', label: 'Department', category: 'Employment', locked: true },
  { key: 'employment.dateOfJoining', label: 'Date of Joining', category: 'Employment', required: true, locked: true },
  { key: 'employment.dateOfRelieving', label: 'Date of Relieving', category: 'Employment', locked: true },
  { key: 'employment.employmentStatus', label: 'Employment Status', category: 'Employment', locked: true },
  // Contractor
  { key: 'contractor.legalName', label: 'Legal Name', category: 'Contractor', required: true, locked: true },
  { key: 'contractor.bssId', label: 'Contractor BSS ID', category: 'Contractor', required: true, locked: true },
  { key: 'contractor.registeredAddress', label: 'Registered Address', category: 'Contractor', locked: true },
  { key: 'contractor.authorizedSignatory', label: 'Authorized Signatory', category: 'Contractor', locked: true },
  { key: 'contractor.contact', label: 'Contact Number', category: 'Contractor' },
  // Employer
  { key: 'employer.legalName', label: 'Legal Name', category: 'Employer', required: true, locked: true },
  { key: 'employer.bssId', label: 'Employer BSS ID', category: 'Employer', required: true, locked: true },
  { key: 'employer.registeredAddress', label: 'Registered Address', category: 'Employer', locked: true },
  { key: 'employer.authorizedSignatory', label: 'Authorized Signatory', category: 'Employer', locked: true },
  // Site
  { key: 'site.name', label: 'Site Name', category: 'Site', required: true, locked: true },
  { key: 'site.code', label: 'Site Code', category: 'Site', locked: true },
  { key: 'site.address', label: 'Site Address / Location', category: 'Site', locked: true },
  { key: 'site.state', label: 'Site State', category: 'Site', locked: true },
  { key: 'site.department', label: 'Site Department', category: 'Site', locked: true },
  { key: 'site.workArea', label: 'Site Work Area', category: 'Site' },
  { key: 'site.medicalOfficer', label: 'Site Medical Officer', category: 'Site' },
  // Payroll / wage
  { key: 'payroll.basicWage', label: 'Basic Wage', category: 'Payroll', required: true },
  { key: 'payroll.dearnessAllowance', label: 'Dearness Allowance', category: 'Payroll' },
  { key: 'payroll.retainingAllowance', label: 'Retaining Allowance', category: 'Payroll' },
  { key: 'payroll.otherComponents', label: 'Other Components', category: 'Payroll' },
  { key: 'payroll.grossMonthlyWage', label: 'Gross Monthly Wage', category: 'Payroll', required: true },
  { key: 'payroll.netPay', label: 'Net Pay (take home)', category: 'Payroll' },
  { key: 'payroll.payPeriod', label: 'Pay Period', category: 'Payroll' },
  // Document
  { key: 'document.number', label: 'Document Number', category: 'Document', required: true, locked: true },
  { key: 'document.issueDate', label: 'Issue Date', category: 'Document', required: true },
  { key: 'document.validFrom', label: 'Valid From', category: 'Document', required: true },
  { key: 'document.validTo', label: 'Valid To', category: 'Document', required: true },
  { key: 'document.place', label: 'Place', category: 'Document' },
  { key: 'document.referenceNumber', label: 'Reference Number', category: 'Document', required: true },
  { key: 'document.workDescription', label: 'Work Description', category: 'Document' },
  { key: 'document.reason', label: 'Reason / Purpose', category: 'Document' },
  { key: 'document.days', label: 'Number of Days', category: 'Document' },
  { key: 'document.generatedAt', label: 'Generated At', category: 'Document' },
  { key: 'document.qr', label: 'Verification QR', category: 'Document' },
  // Signatory
  { key: 'signatory.contractor', label: 'Contractor Signatory Name', category: 'Signatory', locked: true },
  { key: 'signatory.employer', label: 'Principal Employer Signatory', category: 'Signatory', locked: true },
  { key: 'signatory.hod', label: 'HOD Name', category: 'Signatory' },
  { key: 'signatory.hrHead', label: 'HR Head Name', category: 'Signatory' },
  { key: 'signatory.cso', label: 'Chief Security Officer', category: 'Signatory' },
  { key: 'signatory.authorized', label: 'Authorized Signatory Name', category: 'Signatory', locked: true },
];

export const TOKEN_BY_KEY = Object.fromEntries(TOKEN_DEFS.map(token => [token.key, token])) as Record<string, TokenDef>;

export const TOKEN_CATEGORIES: TokenCategory[] = ['Worker', 'Employment', 'Contractor', 'Employer', 'Site', 'Payroll', 'Document', 'Signatory'];

export function tokenLabel(key: string): string {
  return TOKEN_BY_KEY[key]?.label ?? key.split('.').pop() ?? key;
}

export function tokenCategoryOf(key: string): TokenCategory {
  return TOKEN_BY_KEY[key]?.category ?? 'Document';
}

export const TOKEN_PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9.]*)\s*\}\}/g;

export function findTokens(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const key = match[1];
    if (!found.includes(key)) found.push(key);
  }
  return found;
}

export function requiredTokensForContent(sections: Array<{ content: string }>): string[] {
  const keys = new Set<string>();
  for (const section of sections) {
    for (const token of findTokens(section.content)) {
      if (TOKEN_BY_KEY[token]?.required) keys.add(token);
    }
  }
  return [...keys];
}
