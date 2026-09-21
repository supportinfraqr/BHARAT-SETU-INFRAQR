// BSS Admin masters — mock data & schema configs (BSS_Admin.csv source of truth).
// Structured so each master can later be wired to an API endpoint.

import { INDIA_STATES } from '@/data/indiaStates';

export type AdminFieldType = 'text' | 'number' | 'select' | 'date' | 'textarea' | 'checkbox' | 'multi';
export type AdminField = { name: string; label: string; type: AdminFieldType; options?: string[]; required?: boolean; placeholder?: string };
export type AdminRow = Record<string, string | number | boolean | string[]>;

export type MasterConfig = {
  key: string;
  title: string;
  description: string;
  columns: Array<{ id: string; header: string; value: (r: AdminRow) => string | number; render?: (r: AdminRow) => React.ReactNode }>;
  fields: AdminField[];
  rows: AdminRow[];
  statusField?: string;
  canDelete?: boolean;
  // Read-only master — records are managed elsewhere (e.g. Users); the page
  // shows the data with no Add / Edit / Deactivate / Delete actions.
  readOnly?: boolean;
  initial?: AdminRow;
};

const STATES = INDIA_STATES;
const YES_NO = ['Yes', 'No'];
const ACTIVE_STATUS = ['Active', 'Inactive'];

export const DOCUMENTS = ['Form XII — Register of Contract Workers', 'Form XVI — Muster Roll', 'Form XVII — Wages Register', 'PF Challan — Form V', 'ESIC Contribution Challan', 'Register of Fines'];

export const PT_MASTER: MasterConfig = {
  key: 'professional-tax', title: 'Professional Tax Master', description: 'State-wise Professional Tax configuration — deduction cycle, PT number, applicability, fees, security deposit, payment link and tax slabs.',
  statusField: 'status',
  columns: [
    { id: 'state', header: 'State', value: r => String(r.state) },
    { id: 'ptNumber', header: 'PT Number', value: r => String(r.ptNumber) },
    { id: 'cycle', header: 'Deduction Cycle', value: r => String(r.cycle) },
    { id: 'applicable', header: 'Applicability', value: r => String(r.applicable), render: r => <Badge ok={r.applicable === 'Yes'}/> },
    { id: 'effective', header: 'Effective From / To', value: r => `${r.effectiveFrom} → ${r.effectiveTo}` },
    { id: 'govtFees', header: 'Government Fees', value: r => String(r.govtFees) },
    { id: 'status', header: 'Status', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
  ],
  fields: [
    { name: 'state', label: 'State', type: 'select', options: STATES, required: true },
    { name: 'status', label: 'Status', type: 'select', options: ACTIVE_STATUS, required: true },
    { name: 'cycle', label: 'Deduction Cycle', type: 'select', options: ['Monthly', 'Half Yearly', 'Yearly'], required: true },
    { name: 'ptNumber', label: 'PT Number', type: 'text', required: true },
    { name: 'applicable', label: 'Applicability', type: 'select', options: YES_NO, required: true },
    { name: 'effectiveFrom', label: 'Effective From', type: 'date', required: true },
    { name: 'effectiveTo', label: 'Effective To', type: 'date' },
    { name: 'govtFees', label: 'Government Fees (₹)', type: 'number' },
    { name: 'securityDeposit', label: 'Security Deposit Amount (₹)', type: 'number' },
    { name: 'paymentLink', label: 'Payment & Application Link', type: 'text', placeholder: 'https://…' },
    { name: 'taxSlabs', label: 'Tax Slab Configuration', type: 'textarea', placeholder: '₹0–2,500: Nil; ₹2,500–5,000: ₹200; …' },
  ],
  rows: [],
  initial: { state: 'Gujarat', status: 'Active', cycle: 'Monthly', ptNumber: '', applicable: 'Yes', effectiveFrom: '2026-04-01', effectiveTo: '2027-03-31', govtFees: 200, securityDeposit: 0, paymentLink: '', taxSlabs: '' },
};

export const LWF_MASTER: MasterConfig = {
  key: 'lwf', title: 'LWF Master', description: 'Labour Welfare Fund master per state — minimum/maximum amount, employee & employer share, month & type, designation applicability and effective dates.',
  statusField: 'status',
  columns: [
    { id: 'state', header: 'State', value: r => String(r.state) },
    { id: 'range', header: 'Minimum / Maximum', value: r => `${r.minAmount} – ${r.maxAmount}` },
    { id: 'shares', header: 'Employee / Employer Share', value: r => `₹${r.employeeShare} / ₹${r.employerShare}` },
    { id: 'monthType', header: 'Month & Type', value: r => String(r.monthType) },
    { id: 'designations', header: 'Designation Applicability', value: r => String(r.designationApplicability) },
    { id: 'effective', header: 'Effective From / To', value: r => `${r.effectiveFrom} → ${r.effectiveTo}` },
    { id: 'status', header: 'Status', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
  ],
  fields: [
    { name: 'state', label: 'State', type: 'select', options: STATES, required: true },
    { name: 'status', label: 'Status', type: 'select', options: ACTIVE_STATUS, required: true },
    { name: 'minAmount', label: 'Minimum Amount (₹)', type: 'number', required: true },
    { name: 'maxAmount', label: 'Maximum Amount', type: 'text', required: true, placeholder: '₹ amount or Unlimited' },
    { name: 'employeeShare', label: 'Employee Share (₹)', type: 'number', required: true },
    { name: 'employerShare', label: 'Employer Share (₹)', type: 'number', required: true },
    { name: 'monthType', label: 'Month & Type', type: 'text', placeholder: 'e.g. Half Yearly (Apr & Oct)', required: true },
    { name: 'designationApplicability', label: 'Designation Applicability', type: 'text', placeholder: 'All designations / Manual workers only' },
    { name: 'effectiveFrom', label: 'Effective From', type: 'date', required: true },
    { name: 'effectiveTo', label: 'Effective To', type: 'date' },
  ],
  rows: [],
  initial: { state: 'Gujarat', status: 'Active', minAmount: 6, maxAmount: 'Unlimited', employeeShare: 6, employerShare: 12, monthType: 'Half Yearly (Apr & Oct)', designationApplicability: 'All designations', effectiveFrom: '2026-04-01', effectiveTo: '2027-03-31' },
};

export const LICENSE_MASTER: MasterConfig = {
  key: 'license', title: 'License Management', description: 'Statutory license master — state + industry applicability, government fee, security deposit, payment frequency, bonus, grade/employment category and wage zone.',
  statusField: 'status',
  columns: [
    { id: 'name', header: 'License Name', value: r => String(r.name) },
    { id: 'state', header: 'State', value: r => String(r.state) },
    { id: 'industry', header: 'Industry', value: r => String(r.industry) },
    { id: 'applicabilityCount', header: 'Applicability Count', value: r => Number(r.applicabilityCount) },
    { id: 'fee', header: 'Government Fee (₹)', value: r => String(r.govtFee) },
    { id: 'effective', header: 'Effective From / To', value: r => `${r.effectiveFrom} → ${r.effectiveTo}` },
    { id: 'status', header: 'License Status', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
  ],
  fields: [
    { name: 'name', label: 'License Name', type: 'text', required: true },
    { name: 'state', label: 'State', type: 'select', options: STATES, required: true },
    { name: 'industry', label: 'Industry', type: 'select', options: ['Construction', 'Manufacturing', 'Textile', 'Mining', 'All Industries'], required: true },
    { name: 'applicabilityCount', label: 'Applicability Count', type: 'number', required: true },
    { name: 'govtFee', label: 'Government Fee Amount (₹)', type: 'number' },
    { name: 'securityDeposit', label: 'Security Deposit Amount (₹)', type: 'number' },
    { name: 'effectiveFrom', label: 'Effective From', type: 'date', required: true },
    { name: 'effectiveTo', label: 'Effective To', type: 'date' },
    { name: 'status', label: 'License Status', type: 'select', options: ACTIVE_STATUS, required: true },
    { name: 'minWageApplicability', label: 'Minimum Wages Applicability', type: 'select', options: YES_NO, required: true },
    { name: 'paymentFrequency', label: 'Payment Frequency', type: 'select', options: ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'] },
    { name: 'bonusPercent', label: 'Yearly Percentage of Bonus', type: 'number', placeholder: '8.33' },
    { name: 'bonusPayoutMonth', label: 'Bonus Payout Month', type: 'text', placeholder: 'October' },
    { name: 'grade', label: 'Grade', type: 'text', placeholder: 'Grade A / B / C' },
    { name: 'employmentCategory', label: 'Employment Category', type: 'text', placeholder: 'Skilled / Semi-skilled / Unskilled' },
    { name: 'wageZone', label: 'Wage Zone', type: 'text', placeholder: 'Zone 1 / 2 / 3' },
  ],
  rows: [],
  initial: { name: '', state: 'Maharashtra', industry: 'Construction', applicabilityCount: 1, govtFee: 1000, securityDeposit: 0, effectiveFrom: '2026-04-01', effectiveTo: '2027-03-31', status: 'Active', minWageApplicability: 'Yes', paymentFrequency: 'Yearly', bonusPercent: 8.33, bonusPayoutMonth: 'October', grade: '', employmentCategory: '', wageZone: '' },
};

export const MINIMUM_WAGE_MASTER: MasterConfig = {
  key: 'minimum-wage', title: 'Minimum Wage Configuration', description: 'Zone-wise minimum wage — Basic, VDA, Total, Minimum Wage and Floor Wage per grade + employment category, effective-date based.',
  statusField: 'status',
  columns: [
    { id: 'state', header: 'State', value: r => String(r.state) },
    { id: 'zone', header: 'Wage Zone', value: r => String(r.zone) },
    { id: 'grade', header: 'Grade + Employment Category', value: r => `${r.grade} · ${r.employmentCategory}` },
    { id: 'basic', header: 'Basic / Month', value: r => `₹${r.basicPerMonth}` },
    { id: 'vda', header: 'VDA / Month', value: r => `₹${r.vdaPerMonth}` },
    { id: 'total', header: 'Total / Month', value: r => `₹${r.totalPerMonth}` },
    { id: 'minWage', header: 'Minimum Wage', value: r => `₹${r.minimumWage}` },
    { id: 'floor', header: 'Floor Wage', value: r => `₹${r.floorWage}` },
  ],
  fields: [
    { name: 'state', label: 'State', type: 'select', options: STATES, required: true },
    { name: 'zone', label: 'Wage Zone', type: 'text', required: true, placeholder: 'Zone 1' },
    { name: 'grade', label: 'Grade', type: 'text', required: true, placeholder: 'Grade A' },
    { name: 'employmentCategory', label: 'Employment Category', type: 'select', options: ['Skilled', 'Semi-skilled', 'Unskilled'], required: true },
    { name: 'basicPerMonth', label: 'Basic Per Month (₹)', type: 'number', required: true },
    { name: 'vdaPerMonth', label: 'VDA Per Month (₹)', type: 'number', required: true },
    { name: 'totalPerMonth', label: 'Total Per Month (₹)', type: 'number', required: true },
    { name: 'minimumWage', label: 'Minimum Wage (₹)', type: 'number', required: true },
    { name: 'floorWage', label: 'Floor Wage (₹)', type: 'number', required: true },
    { name: 'effectiveFrom', label: 'Effective From', type: 'date', required: true },
    { name: 'effectiveTo', label: 'Effective To', type: 'date' },
  ],
  rows: [],
  initial: { state: 'Maharashtra', zone: 'Zone 1', grade: 'Grade A', employmentCategory: 'Skilled', basicPerMonth: 10000, vdaPerMonth: 350, totalPerMonth: 10350, minimumWage: 10350, floorWage: 10000, effectiveFrom: '2026-04-01', effectiveTo: '2027-03-31' },
};

export const DOCUMENT_MASTER: MasterConfig = {
  key: 'document', title: 'Document Master', description: 'Statutory document master — name, type, frequency, state, form number, criticality, format, act mapping, mandatory flag and validation mapping.',
  statusField: 'status',
  columns: [
    { id: 'name', header: 'Document Name', value: r => String(r.name) },
    { id: 'type', header: 'Document Type', value: r => String(r.type) },
    { id: 'form', header: 'Form Number', value: r => String(r.formNumber) },
    { id: 'frequency', header: 'Frequency', value: r => String(r.frequency) },
    { id: 'criticality', header: 'Criticality', value: r => String(r.criticality), render: r => <Criticality value={String(r.criticality)}/> },
    { id: 'act', header: 'Act Mapping', value: r => String(r.act) },
    { id: 'mandatory', header: 'Mandatory', value: r => String(r.mandatory), render: r => <Badge ok={r.mandatory === 'Yes'}/> },
    { id: 'status', header: 'Status', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
  ],
  fields: [
    { name: 'name', label: 'Document Name', type: 'text', required: true },
    { name: 'type', label: 'Document Type', type: 'select', options: ['Register', 'Challan', 'Return', 'Certificate', 'Form'], required: true },
    { name: 'frequency', label: 'Frequency', type: 'select', options: ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'Monthly-Annual'], required: true },
    { name: 'state', label: 'State Mapping', type: 'select', options: ['All India', ...STATES], required: true },
    { name: 'formNumber', label: 'Form Number', type: 'text', required: true, placeholder: 'FORM XII' },
    { name: 'criticality', label: 'Criticality', type: 'select', options: ['High', 'Medium', 'Low'], required: true },
    { name: 'formatType', label: 'Format Type', type: 'select', options: ['PDF', 'XLS', 'Both'] },
    { name: 'note', label: 'Note', type: 'textarea' },
    { name: 'act', label: 'Act Mapping', type: 'text', placeholder: 'CLRA / Factories / Minimum Wages Act' },
    { name: 'mandatory', label: 'Mandatory Document Flag', type: 'select', options: YES_NO, required: true },
    { name: 'validationMapping', label: 'Validation Mapping', type: 'textarea', placeholder: 'OCR fields to validate' },
    { name: 'status', label: 'Active/Inactive Status', type: 'select', options: ACTIVE_STATUS, required: true },
  ],
  rows: [],
  initial: { name: '', type: 'Register', frequency: 'Monthly', state: 'All India', formNumber: '', criticality: 'High', formatType: 'PDF', note: '', act: '', mandatory: 'Yes', validationMapping: '', status: 'Active' },
};

export const COMPLIANCE_MASTER: MasterConfig = {
  key: 'compliance', title: 'Compliance Master', description: 'Compliance items for audit scoring — act mapping, form mapping, nature of compliance, remark and maximum score.',
  columns: [
    { id: 'act', header: 'Act Mapping', value: r => String(r.act) },
    { id: 'form', header: 'Form Mapping', value: r => String(r.form) },
    { id: 'nature', header: 'Nature of Compliance', value: r => String(r.nature) },
    { id: 'remark', header: 'Remark', value: r => String(r.remark) },
    { id: 'maxScore', header: 'Maximum Score', value: r => Number(r.maxScore), render: r => <span className="font-bold text-blue-700">{r.maxScore}</span> },
  ],
  fields: [
    { name: 'act', label: 'Act Mapping', type: 'text', required: true, placeholder: 'Minimum Wages Act' },
    { name: 'form', label: 'Form Mapping', type: 'text', required: true, placeholder: 'FORM VII / Wage slip' },
    { name: 'nature', label: 'Nature of Compliance', type: 'select', options: ['Statutory', 'Registration', 'Payment', 'Return Filing', 'Safety', 'Welfare'], required: true },
    { name: 'remark', label: 'Remark', type: 'textarea' },
    { name: 'maxScore', label: 'Maximum Score', type: 'number', required: true },
  ],
  rows: [],
  initial: { act: '', form: '', nature: 'Statutory', remark: '', maxScore: 10 },
};

export const REGISTER_DOC_MASTER: MasterConfig = {
  key: 'register-doc', title: 'Register Document Master', description: 'Statutory register document master — register name, type, frequency, state, form number, criticality, format and mandatory flag.',
  statusField: 'status',
  columns: [
    { id: 'name', header: 'Register Document Name', value: r => String(r.name) },
    { id: 'type', header: 'Register Type', value: r => String(r.type) },
    { id: 'form', header: 'Form Number', value: r => String(r.formNumber) },
    { id: 'frequency', header: 'Frequency', value: r => String(r.frequency) },
    { id: 'criticality', header: 'Criticality', value: r => String(r.criticality), render: r => <Criticality value={String(r.criticality)}/> },
    { id: 'mandatory', header: 'Mandatory', value: r => String(r.mandatory), render: r => <Badge ok={r.mandatory === 'Yes'}/> },
    { id: 'status', header: 'Active Status', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
  ],
  fields: [
    { name: 'name', label: 'Register Document Name', type: 'text', required: true },
    { name: 'type', label: 'Register Type', type: 'select', options: ['Register', 'Return', 'Certificate', 'Form'], required: true },
    { name: 'frequency', label: 'Frequency', type: 'select', options: ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'], required: true },
    { name: 'state', label: 'State Mapping', type: 'select', options: ['All India', ...STATES], required: true },
    { name: 'formNumber', label: 'Form Number', type: 'text', required: true },
    { name: 'criticality', label: 'Criticality', type: 'select', options: ['High', 'Medium', 'Low'], required: true },
    { name: 'formatType', label: 'Format Type', type: 'select', options: ['PDF', 'XLS', 'Both'] },
    { name: 'mandatory', label: 'Mandatory Flag', type: 'select', options: YES_NO, required: true },
    { name: 'status', label: 'Active Status', type: 'select', options: ACTIVE_STATUS, required: true },
  ],
  rows: [],
  initial: { name: '', type: 'Register', frequency: 'Monthly', state: 'All India', formNumber: '', criticality: 'Medium', formatType: 'PDF', mandatory: 'No', status: 'Active' },
};

export const PARTY_MASTER: MasterConfig = {
  key: 'party', title: 'Party Master', description: 'Global party master — party type, address, contact, limits (store/contractor/site/user), validity, industry and state/city mapping. Full CRUD including delete with confirmation.',
  statusField: 'status',
  canDelete: true,
  columns: [
    { id: 'name', header: 'Party Name', value: r => String(r.name) },
    { id: 'type', header: 'Party Type', value: r => String(r.type) },
    { id: 'state', header: 'State / City', value: r => `${r.state} · ${r.city}` },
    { id: 'contact', header: 'Email & Contact', value: r => String(r.email) },
    { id: 'limits', header: 'Limits (Store / Contractor / Site / User)', value: r => `${r.storeLimit}/${r.contractorLimit}/${r.siteLimit}/${r.userLimit}` },
    { id: 'validDate', header: 'Valid Date', value: r => String(r.validDate) },
    { id: 'status', header: 'Active / Inactive', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
  ],
  fields: [
    { name: 'type', label: 'Party Type', type: 'select', options: ['Employer', 'Contractor', 'Worker', 'Government', 'Other'], required: true },
    { name: 'name', label: 'Party Name', type: 'text', required: true },
    { name: 'address', label: 'Party Address', type: 'textarea', required: true },
    { name: 'email', label: 'Email ID', type: 'text', required: true },
    { name: 'contact', label: 'Contact Number', type: 'text', required: true },
    { name: 'contactPerson', label: 'Contact Person', type: 'text' },
    { name: 'mobile', label: 'Mobile', type: 'text' },
    { name: 'industry', label: 'Industry', type: 'select', options: ['Construction', 'Manufacturing', 'Textile', 'IT', 'Other'] },
    { name: 'state', label: 'State', type: 'select', options: STATES, required: true },
    { name: 'city', label: 'City', type: 'text', required: true },
    { name: 'storeLimit', label: 'Store Limit', type: 'number' },
    { name: 'contractorLimit', label: 'Contractor Limit', type: 'number' },
    { name: 'siteLimit', label: 'Site Limit', type: 'number' },
    { name: 'userLimit', label: 'User Limit', type: 'number' },
    { name: 'validDate', label: 'Valid Date', type: 'date' },
    { name: 'monthExpired', label: 'Month Expired', type: 'text', placeholder: 'e.g. 3 months' },
    { name: 'status', label: 'Active / Inactive Status', type: 'select', options: ACTIVE_STATUS, required: true },
  ],
  rows: [],
  initial: { type: 'Employer', name: '', address: '', email: '', contact: '', contactPerson: '', mobile: '', industry: 'Construction', state: 'Maharashtra', city: '', storeLimit: 0, contractorLimit: 0, siteLimit: 0, userLimit: 0, validDate: '', monthExpired: '', status: 'Active' },
};

export const USERS_MASTER: MasterConfig = {
  key: 'users', title: 'User Registration', description: 'Global user registration — read-only list of user accounts and their party mappings. Accounts are managed through the registration / sign-up flows; admin cannot edit these records.',
  statusField: 'status',
  readOnly: true,
  columns: [
    { id: 'username', header: 'User Name', value: r => String(r.username), render: r => <span className="font-mono text-blue-700">{r.username}</span> },
    { id: 'name', header: 'Name', value: r => String(r.name) },
    { id: 'partyType', header: 'Party Type', value: r => String(r.partyType) },
    { id: 'partyName', header: 'Party Name Mapping', value: r => String(r.partyName) },
    { id: 'contact', header: 'Contact & Email', value: r => `${r.mobile} · ${r.email}` },
    { id: 'status', header: 'Status', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
  ],
  fields: [
    { name: 'partyType', label: 'Party Type Selection', type: 'select', options: ['Employer', 'Contractor', 'Worker', 'BSS Staff', 'BSS Admin'], required: true },
    { name: 'partyName', label: 'Party Name Mapping', type: 'text', required: true },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'username', label: 'User Name', type: 'text', required: true },
    { name: 'password', label: 'Password', type: 'text', required: true },
    { name: 'mobile', label: 'Contact Number', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Pending'], required: true },
  ],
  rows: [],
  initial: { partyType: 'Employer', partyName: '', name: '', username: '', password: '', mobile: '', email: '', status: 'Active' },
};

export const EMPLOYER_DOCUMENT_MAPPING: MasterConfig = {
  key: 'employer-document', title: 'Employer Document Mapping', description: 'Client/Employer-wise document mapping — assign documents from the Document Master to each employer.',
  statusField: 'status',
  columns: [
    { id: 'employer', header: 'Employer Selection', value: r => String(r.employer) },
    { id: 'document', header: 'Document', value: r => String(r.document) },
    { id: 'status', header: 'Mapping Status', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
  ],
  fields: [
    { name: 'employer', label: 'Employer Selection', type: 'select', options: ['L&T Construction', 'ABC Manufacturing Pvt. Ltd.', 'Tata Projects'], required: true },
    { name: 'document', label: 'Document', type: 'select', options: DOCUMENTS, required: true },
    { name: 'status', label: 'Mapping Status', type: 'select', options: ACTIVE_STATUS, required: true },
  ],
  rows: [],
  initial: { employer: 'L&T Construction', document: DOCUMENTS[0], status: 'Active' },
};

export const EMPLOYER_ACT_MAPPING: MasterConfig = {
  key: 'employer-act', title: 'Employer Act Mapping', description: 'Map statutory Acts (with forms) to each employer/client for compliance scope.',
  statusField: 'status',
  columns: [
    { id: 'employer', header: 'Employer/Client Selection', value: r => String(r.employer) },
    { id: 'act', header: 'Act', value: r => String(r.act) },
    { id: 'status', header: 'Mapping Status', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
  ],
  fields: [
    { name: 'employer', label: 'Employer/Client Selection', type: 'select', options: ['L&T Construction', 'ABC Manufacturing Pvt. Ltd.', 'Tata Projects'], required: true },
    { name: 'act', label: 'Act', type: 'select', options: ['CLRA 1970', 'Factories Act 1948', 'Minimum Wages Act 1948', 'Payment of Wages Act 1936', 'EPF & MP Act 1952', 'ESIC Act 1948'], required: true },
    { name: 'status', label: 'Mapping Status', type: 'select', options: ACTIVE_STATUS, required: true },
  ],
  rows: [],
  initial: { employer: 'L&T Construction', act: 'CLRA 1970', status: 'Active' },
};

export const EMPLOYER_REGISTER_MAPPING: MasterConfig = {
  key: 'employer-register', title: 'Employer Register Mapping', description: 'Map statutory register documents to each employer/client.',
  statusField: 'status',
  columns: [
    { id: 'employer', header: 'Employer/Client Selection', value: r => String(r.employer) },
    { id: 'register', header: 'Register Document', value: r => String(r.register) },
    { id: 'status', header: 'Mapping Status', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
  ],
  fields: [
    { name: 'employer', label: 'Employer/Client Selection', type: 'select', options: ['L&T Construction', 'ABC Manufacturing Pvt. Ltd.', 'Tata Projects'], required: true },
    { name: 'register', label: 'Register Document', type: 'select', options: ['Register of Fines', 'Register of Advances', 'Accident Register'], required: true },
    { name: 'status', label: 'Mapping Status', type: 'select', options: ACTIVE_STATUS, required: true },
  ],
  rows: [],
  initial: { employer: 'L&T Construction', register: 'Register of Fines', status: 'Active' },
};

export const ACTIVITY_LOG: AdminRow[] = [];

export const MENU_PERMISSIONS: Record<string, string[]> = {
  'Worker': ['Dashboard', 'Rozgar', 'Binding', 'Attendance', 'Leave', 'Skills', 'Documents', 'Earnings', 'Benefits', 'Grievances'],
  'Contractor': ['Dashboard', 'Gate Pass', 'Rozgar Setu', 'Compliance', 'Worker Master', 'Payroll', 'Submissions', 'Grievances', 'QR / Binding'],
  'Employer': ['Dashboard', 'Workers', 'Contractors', 'Sites', 'Gate Pass', 'Compliance', 'Payroll', 'Approvals', 'QR / Binding', 'Reports'],
  'BSS Staff': ['Case Queue', 'Service Health', 'Incidents', 'Audit Trail'],
  'BSS Admin': ['Overview', 'Users & Roles', 'Masters', 'Mappings', 'Activity Report'],
};

export const PERMISSION_MODULES = ['Workers', 'Contractors', 'Employers', 'Sites', 'Compliance', 'Payroll', 'Gate Pass', 'QR / Binding', 'Masters', 'Reports'];
export const PERMISSION_ACTIONS = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Export', 'Manage'];

export const STATUTORY_MASTER: MasterConfig = {
  key: 'statutory', title: 'Statutory Master', description: 'Central statutory component rules & rates (EPF 12%, ESIC 3.25%, LWF, Bonus, Gratuity) locked for platform compliance.',
  statusField: 'status',
  columns: [
    { id: 'component', header: 'Statutory Component', value: r => String(r.component) },
    { id: 'rate', header: 'Rate / Value', value: r => String(r.rate) },
    { id: 'rateType', header: 'Rate Type / Unit', value: r => String(r.rateType) },
    { id: 'condition', header: 'Applicability Condition', value: r => String(r.condition) },
    { id: 'status', header: 'Status', value: r => String(r.status), render: r => <StatusBadge value={String(r.status)}/> },
  ],
  fields: [
    { name: 'component', label: 'Statutory Component', type: 'select', options: ['EPF (Employer PF)', 'ESIC (Employer)', 'Bonus', 'Gratuity', 'Labour Welfare Fund', 'Leave Reserve', 'Weekly Off', 'National Holidays'], required: true },
    { name: 'status', label: 'Status', type: 'select', options: ACTIVE_STATUS, required: true },
    { name: 'rate', label: 'Default Rate / %', type: 'number', required: true },
    { name: 'rateType', label: 'Rate Type', type: 'select', options: ['Percent of wages', 'Fixed amount', 'Days'], required: true },
    { name: 'condition', label: 'Applicability Condition', type: 'text', placeholder: 'e.g. Wage <= 21,000 / Establishments with 20+ workers' },
  ],
  rows: [
    { id: 1, component: 'EPF (Employer PF)', rate: 12, rateType: 'Percent of wages', condition: 'Establishments with 20+ employees', status: 'Active' },
    { id: 2, component: 'ESIC (Employer)', rate: 3.25, rateType: 'Percent of wages', condition: 'Conditional (wage <= 21,000 threshold)', status: 'Active' },
    { id: 3, component: 'Bonus', rate: 8.33, rateType: 'Percent of wages', condition: 'Eligible workers under Payment of Bonus Act', status: 'Active' },
    { id: 4, component: 'Gratuity', rate: 4.81, rateType: 'Percent of wages', condition: '5+ years continuous service', status: 'Active' },
    { id: 5, component: 'Labour Welfare Fund (LWF)', rate: 0.75, rateType: 'Percent of wages', condition: 'State specific LWF rules', status: 'Active' },
  ],
  initial: { component: 'EPF (Employer PF)', status: 'Active', rate: 12, rateType: 'Percent of wages', condition: 'Establishments with 20+ employees' },
};

export const ADMIN_MASTERS: MasterConfig[] = [PARTY_MASTER, USERS_MASTER, STATUTORY_MASTER, PT_MASTER, LWF_MASTER, LICENSE_MASTER, MINIMUM_WAGE_MASTER, DOCUMENT_MASTER, COMPLIANCE_MASTER, REGISTER_DOC_MASTER, EMPLOYER_DOCUMENT_MAPPING, EMPLOYER_ACT_MAPPING, EMPLOYER_REGISTER_MAPPING];

// ── tiny shared badge helpers ────────────────────────────────────────────────
export function StatusBadge({ value }: { value: string }) {
  const tone = value === 'Active' ? 'bg-green-50 text-green-700' : value === 'Inactive' ? 'bg-gray-100 text-gray-500' : value === 'Pending' ? 'bg-orange-50 text-orange-700' : value === 'Warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tone}`}>{value}</span>;
}
export function Badge({ ok }: { ok: boolean }) { return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ok ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{ok ? 'Yes' : 'No'}</span>; }
export function Criticality({ value }: { value: string }) { const tone = value === 'High' ? 'bg-red-50 text-red-700' : value === 'Medium' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'; return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tone}`}>{value}</span>; }

export const MASTER_BY_KEY: Record<string, MasterConfig> = {
  party: PARTY_MASTER,
  users: USERS_MASTER,
  statutory: STATUTORY_MASTER,
  'professional-tax': PT_MASTER,
  lwf: LWF_MASTER,
  license: LICENSE_MASTER,
  'minimum-wage': MINIMUM_WAGE_MASTER,
  document: DOCUMENT_MASTER,
  compliance: COMPLIANCE_MASTER,
  'register-doc': REGISTER_DOC_MASTER,
  'employer-document': EMPLOYER_DOCUMENT_MAPPING,
  'employer-act': EMPLOYER_ACT_MAPPING,
  'employer-register': EMPLOYER_REGISTER_MAPPING,
};
