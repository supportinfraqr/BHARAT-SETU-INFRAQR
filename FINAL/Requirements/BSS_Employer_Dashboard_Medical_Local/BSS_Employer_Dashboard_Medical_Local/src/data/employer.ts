/**
 * PREVIEW HARNESS MOCK DATA — the single source for the mock employer.
 * Used by the mock EmployerContext and by every mock API route under
 * src/app/api/employer/**. Sites deliberately sit in different Indian states
 * (Uttar Pradesh, Haryana, Maharashtra, Karnataka) so state-specific features
 * (e.g. Medical) can be exercised.
 *
 * Nothing here is real. Do not migrate into the production app.
 */
import type {
  EmployerApproval, EmployerComplianceReport, EmployerContractor, EmployerGatePass, EmployerPayrollRecord,
  EmployerPortalData, EmployerSite, EmployerSubmission, EmployerWorker, EmployerWorkerDocument,
} from '@/types/portal';

export const COMPANY = 'Talent India Group Pvt Ltd';
export const EMPLOYER_BSS_ID = 'BSSE7K2M9Q4X';

/** GPS centre per site (used by attendance events / geo-fence). */
export const SITE_GEO: Record<string, { lat: number; lng: number; address: string; type: string }> = {
  'site-noida': { lat: 28.5021, lng: 77.4100, address: 'Plot 7, Sector 136, Noida, Uttar Pradesh 201304', type: 'Office' },
  'site-gurugram': { lat: 28.4595, lng: 77.0266, address: 'Plot 214, Udyog Vihar Phase IV, Gurugram, Haryana 122015', type: 'Factory' },
  'site-pune': { lat: 18.7606, lng: 73.8636, address: 'Gat No. 312, MIDC Chakan Phase II, Pune, Maharashtra 410501', type: 'Plant' },
  'site-blr': { lat: 12.9698, lng: 77.7500, address: 'Survey 48, EPIP Zone, Whitefield, Bengaluru, Karnataka 560066', type: 'Warehouse' },
};

export const sites: EmployerSite[] = [
  { id: 'site-noida', code: 'UP-NOI-136', name: 'Office Noida 136', location: 'Noida', district: 'Gautam Buddh Nagar', state: 'Uttar Pradesh', startDate: '2023-04-01', endDate: '2028-03-31', status: 'Active', contractorIds: ['ctr-tci', 'ctr-buildright'], workers: 4, compliance: 94 },
  { id: 'site-gurugram', code: 'HR-GGN-FU2', name: 'Factory Unit 2', location: 'Gurugram', district: 'Gurugram', state: 'Haryana', startDate: '2022-07-15', endDate: '2027-07-14', status: 'Active', contractorIds: ['ctr-buildright', 'ctr-safehands'], workers: 4, compliance: 86 },
  { id: 'site-pune', code: 'MH-PUN-CKN', name: 'Chakan Plant', location: 'Pune', district: 'Pune', state: 'Maharashtra', startDate: '2021-11-01', endDate: '2029-10-31', status: 'Active', contractorIds: ['ctr-tci', 'ctr-safehands'], workers: 4, compliance: 91 },
  { id: 'site-blr', code: 'KA-BLR-WFD', name: 'Whitefield Warehouse', location: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', startDate: '2024-02-01', endDate: '2027-01-31', status: 'Active', contractorIds: ['ctr-tci', 'ctr-buildright'], workers: 4, compliance: 78 },
];

export const contractors: EmployerContractor[] = [
  { id: 'ctr-tci', name: 'Talent Compliance India', bssId: 'BSSC4T9K2M7P', contact: '+91 98110 45231', email: 'ops@talentcompliance.example', siteIds: ['site-noida', 'site-pune', 'site-blr'], workers: 6, compliance: 96, onboardingDate: '2023-04-03', status: 'Active', verified: true },
  { id: 'ctr-buildright', name: 'BuildRight Contractors', bssId: 'BSSC8B3R5N1Q', contact: '+91 99582 11873', email: 'hr@buildright.example', siteIds: ['site-gurugram', 'site-noida', 'site-blr'], workers: 6, compliance: 91, onboardingDate: '2022-07-20', status: 'Active', verified: true },
  { id: 'ctr-safehands', name: 'SafeHands Manpower', bssId: 'BSSC2S6H8W4D', contact: '+91 97300 62519', email: 'contact@safehands.example', siteIds: ['site-gurugram', 'site-pune'], workers: 4, compliance: 82, onboardingDate: '2023-01-09', status: 'Active', verified: true },
];

const C = { tci: 'Talent Compliance India', br: 'BuildRight Contractors', sh: 'SafeHands Manpower' } as const;
const S = { noida: 'Office Noida 136', ggn: 'Factory Unit 2', pune: 'Chakan Plant', blr: 'Whitefield Warehouse' } as const;

export const workers: EmployerWorker[] = [
  { id: 'wkr-001', name: 'Ramesh Kumar Yadav', bssId: 'BSSW3R7K1Y2A', mobile: '+91 98101 23401', contractorId: 'ctr-buildright', contractor: C.br, siteId: 'site-gurugram', site: S.ggn, designation: 'Machine Operator', doj: '2022-08-01', attendance: 96, compliance: 'Compliant', status: 'Active', verified: true, gender: 'Male', age: 34, bloodGroup: 'B+', category: 'Semi-skilled', migrant: true, stateOfOrigin: 'Bihar', wage: 19800, epfoLinked: true, esicLinked: true },
  { id: 'wkr-002', name: 'Sunita Devi', bssId: 'BSSW5S2D8V4B', mobile: '+91 98102 23402', contractorId: 'ctr-tci', contractor: C.tci, siteId: 'site-noida', site: S.noida, designation: 'Quality Analyst', doj: '2023-05-12', attendance: 98, compliance: 'Compliant', status: 'Active', verified: true, gender: 'Female', age: 29, bloodGroup: 'O+', category: 'Skilled', migrant: false, stateOfOrigin: 'Uttar Pradesh', wage: 24500, epfoLinked: true, esicLinked: true },
  { id: 'wkr-003', name: 'Mohammed Arif Khan', bssId: 'BSSW9M4A6K1C', mobile: '+91 98103 23403', contractorId: 'ctr-safehands', contractor: C.sh, siteId: 'site-gurugram', site: S.ggn, designation: 'Welder', doj: '2023-02-20', attendance: 91, compliance: 'Expiring', status: 'Active', verified: true, gender: 'Male', age: 38, bloodGroup: 'A+', category: 'Skilled', migrant: true, stateOfOrigin: 'Uttar Pradesh', wage: 23200, epfoLinked: true, esicLinked: true },
  { id: 'wkr-004', name: 'Priya Sharma', bssId: 'BSSW2P8S3H5D', mobile: '+91 98104 23404', contractorId: 'ctr-tci', contractor: C.tci, siteId: 'site-noida', site: S.noida, designation: 'Supervisor', doj: '2023-04-10', attendance: 99, compliance: 'Compliant', status: 'Active', verified: true, gender: 'Female', age: 33, bloodGroup: 'AB+', category: 'Highly skilled', migrant: false, stateOfOrigin: 'Uttar Pradesh', wage: 32000, epfoLinked: true, esicLinked: false },
  { id: 'wkr-005', name: 'Suresh Patil', bssId: 'BSSW7S1P4T9E', mobile: '+91 98105 23405', contractorId: 'ctr-tci', contractor: C.tci, siteId: 'site-pune', site: S.pune, designation: 'Fitter', doj: '2022-01-17', attendance: 94, compliance: 'Compliant', status: 'Active', verified: true, gender: 'Male', age: 41, bloodGroup: 'B+', category: 'Skilled', migrant: false, stateOfOrigin: 'Maharashtra', wage: 22800, epfoLinked: true, esicLinked: true },
  { id: 'wkr-006', name: 'Anil Gaikwad', bssId: 'BSSW4A9G2K6F', mobile: '+91 98106 23406', contractorId: 'ctr-safehands', contractor: C.sh, siteId: 'site-pune', site: S.pune, designation: 'Forklift Operator', doj: '2024-03-04', attendance: 82, compliance: 'Non-compliant', status: 'Active', verified: true, gender: 'Male', age: 27, bloodGroup: 'O-', category: 'Semi-skilled', migrant: false, stateOfOrigin: 'Maharashtra', wage: 18900, epfoLinked: false, esicLinked: true },
  { id: 'wkr-007', name: 'Lakshmi Narayanan', bssId: 'BSSW6L3N7R2G', mobile: '+91 98107 23407', contractorId: 'ctr-buildright', contractor: C.br, siteId: 'site-blr', site: S.blr, designation: 'Quality Analyst', doj: '2024-02-15', attendance: 97, compliance: 'Compliant', status: 'Active', verified: true, gender: 'Female', age: 31, bloodGroup: 'A+', category: 'Skilled', migrant: true, stateOfOrigin: 'Tamil Nadu', wage: 25600, epfoLinked: true, esicLinked: true },
  { id: 'wkr-008', name: 'Manjunath Gowda', bssId: 'BSSW8M5G1D3H', mobile: '+91 98108 23408', contractorId: 'ctr-tci', contractor: C.tci, siteId: 'site-blr', site: S.blr, designation: 'Electrician', doj: '2024-02-20', attendance: 90, compliance: 'Expiring', status: 'Active', verified: true, gender: 'Male', age: 36, bloodGroup: 'B-', category: 'Skilled', migrant: false, stateOfOrigin: 'Karnataka', wage: 24100, epfoLinked: true, esicLinked: true },
  { id: 'wkr-009', name: 'Rajesh Chauhan', bssId: 'BSSW1R6C9H4J', mobile: '+91 98109 23409', contractorId: 'ctr-buildright', contractor: C.br, siteId: 'site-noida', site: S.noida, designation: 'Helper', doj: '2025-06-02', attendance: 79, compliance: 'Non-compliant', status: 'Active', verified: true, gender: 'Male', age: 23, bloodGroup: 'O+', category: 'Unskilled', migrant: true, stateOfOrigin: 'Madhya Pradesh', wage: 14200, epfoLinked: false, esicLinked: false },
  { id: 'wkr-010', name: 'Kavita Singh', bssId: 'BSSW3K7S5N8K', mobile: '+91 98110 23410', contractorId: 'ctr-buildright', contractor: C.br, siteId: 'site-gurugram', site: S.ggn, designation: 'Machine Operator', doj: '2023-09-11', attendance: 95, compliance: 'Compliant', status: 'Active', verified: true, gender: 'Female', age: 28, bloodGroup: 'A-', category: 'Semi-skilled', migrant: true, stateOfOrigin: 'Rajasthan', wage: 19500, epfoLinked: true, esicLinked: true },
  { id: 'wkr-011', name: 'Deepak Verma', bssId: 'BSSW5D2V8M1L', mobile: '+91 98111 23411', contractorId: 'ctr-safehands', contractor: C.sh, siteId: 'site-gurugram', site: S.ggn, designation: 'Electrician', doj: '2023-03-27', attendance: 93, compliance: 'Compliant', status: 'Active', verified: true, gender: 'Male', age: 35, bloodGroup: 'B+', category: 'Skilled', migrant: false, stateOfOrigin: 'Haryana', wage: 23900, epfoLinked: true, esicLinked: true },
  { id: 'wkr-012', name: 'Vikram Jadhav', bssId: 'BSSW9V4J3D7M', mobile: '+91 98112 23412', contractorId: 'ctr-safehands', contractor: C.sh, siteId: 'site-pune', site: S.pune, designation: 'Welder', doj: '2022-12-05', attendance: 88, compliance: 'Expiring', status: 'Active', verified: true, gender: 'Male', age: 39, bloodGroup: 'O+', category: 'Skilled', migrant: false, stateOfOrigin: 'Maharashtra', wage: 23400, epfoLinked: true, esicLinked: true },
  { id: 'wkr-013', name: 'Pooja Kulkarni', bssId: 'BSSW2P5K6L9N', mobile: '+91 98113 23413', contractorId: 'ctr-tci', contractor: C.tci, siteId: 'site-pune', site: S.pune, designation: 'Supervisor', doj: '2021-11-15', attendance: 98, compliance: 'Compliant', status: 'Active', verified: true, gender: 'Female', age: 37, bloodGroup: 'AB-', category: 'Highly skilled', migrant: false, stateOfOrigin: 'Maharashtra', wage: 33500, epfoLinked: true, esicLinked: false },
  { id: 'wkr-014', name: 'Ravi Shankar Reddy', bssId: 'BSSW7R1R4S2P', mobile: '+91 98114 23414', contractorId: 'ctr-buildright', contractor: C.br, siteId: 'site-blr', site: S.blr, designation: 'Forklift Operator', doj: '2024-04-08', attendance: 92, compliance: 'Compliant', status: 'Active', verified: true, gender: 'Male', age: 30, bloodGroup: 'B+', category: 'Semi-skilled', migrant: true, stateOfOrigin: 'Andhra Pradesh', wage: 19200, epfoLinked: true, esicLinked: true },
  { id: 'wkr-015', name: 'Shabana Begum', bssId: 'BSSW4S8B2G5Q', mobile: '+91 98115 23415', contractorId: 'ctr-tci', contractor: C.tci, siteId: 'site-blr', site: S.blr, designation: 'Helper', doj: '2025-01-20', attendance: 64, compliance: 'Non-compliant', status: 'Inactive', verified: false, gender: 'Female', age: 26, bloodGroup: 'A+', category: 'Unskilled', migrant: true, stateOfOrigin: 'West Bengal', wage: 13800, epfoLinked: false, esicLinked: true },
  { id: 'wkr-016', name: 'Amit Tiwari', bssId: 'BSSW6A3T9W1R', mobile: '+91 98116 23416', contractorId: 'ctr-buildright', contractor: C.br, siteId: 'site-noida', site: S.noida, designation: 'Fitter', doj: '2025-08-18', attendance: 89, compliance: 'Compliant', status: 'Active', verified: false, gender: 'Male', age: 25, bloodGroup: 'O+', category: 'Skilled', migrant: true, stateOfOrigin: 'Bihar', wage: 21600, epfoLinked: true, esicLinked: true },
];

export const approvals: EmployerApproval[] = [
  { id: 'apr-101', entityType: 'Worker', entityId: 'wkr-p01', name: 'Sandeep Rawat', bssId: 'BSSW8S2R6T3X', contractor: C.br, site: S.ggn, submittedAt: '2026-10-15T10:24:00+05:30', checks: ['Aadhaar e-KYC', 'Police verification', 'Medical fitness'], status: 'Pending' },
  { id: 'apr-102', entityType: 'Worker', entityId: 'wkr-p02', name: 'Meena Kumari', bssId: 'BSSW1M9K4D7Y', contractor: C.tci, site: S.noida, submittedAt: '2026-10-15T15:02:00+05:30', checks: ['Aadhaar e-KYC', 'Bank account'], status: 'Pending' },
  { id: 'apr-103', entityType: 'Contractor', entityId: 'ctr-p01', name: 'Sahyadri Facility Services', bssId: 'BSSC5S7F2V9Z', contractor: null, site: S.pune, submittedAt: '2026-10-14T11:40:00+05:30', checks: ['Contract labour licence', 'PF registration', 'ESIC registration', 'GST'], status: 'Pending' },
  { id: 'apr-104', entityType: 'Worker', entityId: 'wkr-016', name: 'Amit Tiwari', bssId: 'BSSW6A3T9W1R', contractor: C.br, site: S.noida, submittedAt: '2026-08-14T09:15:00+05:30', checks: ['Aadhaar e-KYC'], status: 'Approved' },
];

export const gatePasses: EmployerGatePass[] = [
  { id: 'gp-501', workerName: 'Mohammed Arif Khan', workerId: 'wkr-003', contractor: C.sh, site: S.ggn, siteId: 'site-gurugram', type: 'Permanent', requestedAt: '2026-10-14T09:30:00+05:30', validFrom: '2026-10-16', validTo: '2027-10-15', status: 'Pending' },
  { id: 'gp-502', workerName: 'Amit Tiwari', workerId: 'wkr-016', contractor: C.br, site: S.noida, siteId: 'site-noida', type: 'Temporary', requestedAt: '2026-10-15T12:10:00+05:30', validFrom: '2026-10-16', validTo: '2026-11-15', status: 'Pending' },
  { id: 'gp-503', workerName: 'Suresh Patil', workerId: 'wkr-005', contractor: C.tci, site: S.pune, siteId: 'site-pune', type: 'Permanent', requestedAt: '2026-01-10T10:00:00+05:30', validFrom: '2026-01-12', validTo: '2027-01-11', status: 'Approved' },
  { id: 'gp-504', workerName: 'Lakshmi Narayanan', workerId: 'wkr-007', contractor: C.br, site: S.blr, siteId: 'site-blr', type: 'Permanent', requestedAt: '2026-02-18T10:00:00+05:30', validFrom: '2026-02-20', validTo: '2027-02-19', status: 'Approved' },
  { id: 'gp-505', workerName: 'Shabana Begum', workerId: 'wkr-015', contractor: C.tci, site: S.blr, siteId: 'site-blr', type: 'Temporary', requestedAt: '2026-09-02T10:00:00+05:30', validFrom: '2026-09-03', validTo: '2026-10-02', status: 'Rejected' },
];

export const submissions: EmployerSubmission[] = [
  { id: 'sub-801', contractor: C.tci, contractorId: 'ctr-tci', site: S.pune, type: 'Form XVII — Register of Wages', period: 'September 2026', submittedAt: '2026-10-07T17:20:00+05:30', status: 'Pending review' },
  { id: 'sub-802', contractor: C.sh, contractorId: 'ctr-safehands', site: S.ggn, type: 'ECR — PF challan', period: 'September 2026', submittedAt: '2026-10-12T11:05:00+05:30', status: 'Pending review' },
  { id: 'sub-803', contractor: C.br, contractorId: 'ctr-buildright', site: S.blr, type: 'ESIC contribution', period: 'September 2026', submittedAt: '2026-10-10T16:45:00+05:30', status: 'Verified' },
  { id: 'sub-804', contractor: C.sh, contractorId: 'ctr-safehands', site: S.pune, type: 'Form XVI — Muster Roll', period: 'August 2026', submittedAt: '2026-09-09T14:00:00+05:30', status: 'Returned' },
];

export const complianceReports: EmployerComplianceReport[] = [
  { id: 'cr-01', contractorId: 'ctr-tci', contractor: C.tci, siteId: 'site-noida', site: S.noida, period: 'September 2026', pf: 'Filed', esic: 'Filed', wage: 'Filed', safety: 'Compliant', score: 98, status: 'Compliant' },
  { id: 'cr-02', contractorId: 'ctr-tci', contractor: C.tci, siteId: 'site-pune', site: S.pune, period: 'September 2026', pf: 'Filed', esic: 'Filed', wage: 'Pending', safety: 'Compliant', score: 92, status: 'Compliant' },
  { id: 'cr-03', contractorId: 'ctr-tci', contractor: C.tci, siteId: 'site-blr', site: S.blr, period: 'September 2026', pf: 'Filed', esic: 'Pending', wage: 'Filed', safety: 'Review', score: 84, status: 'Pending' },
  { id: 'cr-04', contractorId: 'ctr-buildright', contractor: C.br, siteId: 'site-gurugram', site: S.ggn, period: 'September 2026', pf: 'Filed', esic: 'Filed', wage: 'Filed', safety: 'Compliant', score: 95, status: 'Compliant' },
  { id: 'cr-05', contractorId: 'ctr-buildright', contractor: C.br, siteId: 'site-blr', site: S.blr, period: 'September 2026', pf: 'Overdue', esic: 'Filed', wage: 'Pending', safety: 'Non-compliant', score: 61, status: 'Non-compliant' },
  { id: 'cr-06', contractorId: 'ctr-buildright', contractor: C.br, siteId: 'site-noida', site: S.noida, period: 'September 2026', pf: 'Filed', esic: 'Filed', wage: 'Filed', safety: 'Compliant', score: 93, status: 'Compliant' },
  { id: 'cr-07', contractorId: 'ctr-safehands', contractor: C.sh, siteId: 'site-gurugram', site: S.ggn, period: 'September 2026', pf: 'Pending', esic: 'Filed', wage: 'Filed', safety: 'Review', score: 79, status: 'Pending' },
  { id: 'cr-08', contractorId: 'ctr-safehands', contractor: C.sh, siteId: 'site-pune', site: S.pune, period: 'September 2026', pf: 'Filed', esic: 'Overdue', wage: 'Filed', safety: 'Compliant', score: 74, status: 'Non-compliant' },
];

export const workerDocuments: EmployerWorkerDocument[] = [
  { id: 'doc-01', worker: 'Mohammed Arif Khan', workerId: 'wkr-003', contractor: C.sh, site: S.ggn, document: 'Medical fitness certificate', status: 'Expiring', expiry: '2026-10-29' },
  { id: 'doc-02', worker: 'Manjunath Gowda', workerId: 'wkr-008', contractor: C.tci, site: S.blr, document: 'Electrical wireman licence', status: 'Expiring', expiry: '2026-11-04' },
  { id: 'doc-03', worker: 'Vikram Jadhav', workerId: 'wkr-012', contractor: C.sh, site: S.pune, document: 'Welding safety certification', status: 'Expiring', expiry: '2026-11-10' },
  { id: 'doc-04', worker: 'Anil Gaikwad', workerId: 'wkr-006', contractor: C.sh, site: S.pune, document: 'Forklift operator licence', status: 'Missing', expiry: null },
  { id: 'doc-05', worker: 'Rajesh Chauhan', workerId: 'wkr-009', contractor: C.br, site: S.noida, document: 'Police verification', status: 'Pending', expiry: null },
  { id: 'doc-06', worker: 'Shabana Begum', workerId: 'wkr-015', contractor: C.tci, site: S.blr, document: 'Aadhaar e-KYC', status: 'Rejected', expiry: null },
  { id: 'doc-07', worker: 'Amit Tiwari', workerId: 'wkr-016', contractor: C.br, site: S.noida, document: 'Aadhaar e-KYC', status: 'Pending', expiry: null },
  { id: 'doc-08', worker: 'Ramesh Kumar Yadav', workerId: 'wkr-001', contractor: C.br, site: S.ggn, document: 'Medical fitness certificate', status: 'Verified', expiry: '2027-03-31' },
  { id: 'doc-09', worker: 'Sunita Devi', workerId: 'wkr-002', contractor: C.tci, site: S.noida, document: 'Police verification', status: 'Verified', expiry: null },
  { id: 'doc-10', worker: 'Suresh Patil', workerId: 'wkr-005', contractor: C.tci, site: S.pune, document: 'Medical fitness certificate', status: 'Verified', expiry: '2027-01-15' },
  { id: 'doc-11', worker: 'Lakshmi Narayanan', workerId: 'wkr-007', contractor: C.br, site: S.blr, document: 'Medical fitness certificate', status: 'Verified', expiry: '2027-02-28' },
  { id: 'doc-12', worker: 'Kavita Singh', workerId: 'wkr-010', contractor: C.br, site: S.ggn, document: 'Health & safety induction', status: 'Verified', expiry: null },
];

const PERIOD = 'September 2026';
function pay(id: string, w: EmployerWorker, status: EmployerPayrollRecord['status'], matchState: EmployerPayrollRecord['matchState'], errors?: string[]): EmployerPayrollRecord {
  const gross = w.wage ?? 18000;
  const deductions = Math.round(gross * 0.12 + (w.esicLinked ? gross * 0.0075 : 0) + 200);
  return {
    id, workerId: w.id, workerName: w.name, employer: COMPANY, site: w.site, period: PERIOD, status, matchState, errors,
    contractor: w.contractor, source: matchState === 'Employer Provided' ? 'Employer' : 'Contractor',
    attendanceDays: Math.round(26 * (w.attendance / 100)), lopDays: Math.max(0, 26 - Math.round(26 * (w.attendance / 100))),
    gross, totalDeductions: deductions, netPay: gross - deductions, employerCost: Math.round(gross * 1.1475),
    updatedAt: '2026-10-05T18:00:00+05:30', updatedBy: w.contractor,
  };
}
const W = Object.fromEntries(workers.map(w => [w.id, w])) as Record<string, EmployerWorker>;
export const payrollRecords: EmployerPayrollRecord[] = [
  pay('pr-001', W['wkr-001'], 'Verified', 'Matched'),
  pay('pr-002', W['wkr-002'], 'Verified', 'Matched'),
  pay('pr-003', W['wkr-003'], 'Submitted', 'Contractor Entered'),
  pay('pr-004', W['wkr-004'], 'Verified', 'Employer Provided'),
  pay('pr-005', W['wkr-005'], 'Verified', 'Matched'),
  pay('pr-006', W['wkr-006'], 'Exception', 'Needs Review', ['Net pay below state minimum wage (Maharashtra, semi-skilled)']),
  pay('pr-007', W['wkr-007'], 'Verified', 'Matched'),
  pay('pr-008', W['wkr-008'], 'Reviewed', 'Contractor Entered'),
  pay('pr-009', W['wkr-009'], 'Returned', 'Needs Review', ['Attendance days differ: Employer 21 vs Contractor 24', 'PF UAN missing']),
  pay('pr-010', W['wkr-010'], 'Verified', 'Matched'),
  pay('pr-011', W['wkr-011'], 'Draft', 'Contractor Entered'),
  pay('pr-012', W['wkr-012'], 'Submitted', 'Matched'),
  pay('pr-013', W['wkr-013'], 'Verified', 'Employer Provided'),
  pay('pr-014', W['wkr-014'], 'Verified', 'Matched'),
  pay('pr-016', W['wkr-016'], 'Draft', 'Needs Review', ['Gross wage differs from Employer-provided amount']),
];

export const activities: EmployerPortalData['activities'] = [
  { id: 'act-01', title: 'Gate pass requested — Amit Tiwari', description: 'BuildRight Contractors requested a temporary gate pass for Office Noida 136.', occurredAt: '2026-10-15T12:10:00+05:30', type: 'approval' },
  { id: 'act-02', title: 'PF challan submitted — SafeHands Manpower', description: 'ECR for September 2026 submitted for Factory Unit 2 and awaiting your review.', occurredAt: '2026-10-12T11:05:00+05:30', type: 'compliance' },
  { id: 'act-03', title: 'Worker binding request — Meena Kumari', description: 'Talent Compliance India requested binding to Office Noida 136 (Quality Analyst).', occurredAt: '2026-10-15T15:02:00+05:30', type: 'approval' },
  { id: 'act-04', title: 'Medical fitness expiring — Mohammed Arif Khan', description: 'Certificate expires on 29 Oct 2026 at Factory Unit 2 (Haryana).', occurredAt: '2026-10-14T08:00:00+05:30', type: 'worker' },
  { id: 'act-05', title: 'Safety audit flagged — Whitefield Warehouse', description: 'BuildRight Contractors scored 61% on the September safety audit (Karnataka).', occurredAt: '2026-10-11T17:30:00+05:30', type: 'compliance' },
  { id: 'act-06', title: 'Contractor onboarding — Sahyadri Facility Services', description: 'New contractor application for Chakan Plant pending licence verification.', occurredAt: '2026-10-14T11:40:00+05:30', type: 'contractor' },
];

export const mockEmployer: EmployerPortalData = {
  identity: {
    name: 'Neha Agarwal', company: COMPANY, bssId: EMPLOYER_BSS_ID, entity: 'Private Limited Company', verified: true,
    contact: '+91 120 455 9000', email: 'compliance@talentindia.example', address: 'Tower B, Plot 7, Sector 136, Noida, Uttar Pradesh 201304',
  },
  stats: {
    totalContractors: contractors.length,
    totalWorkers: workers.length,
    activeSites: sites.filter(s => s.status === 'Active').length,
    complianceScore: 89,
    pendingApprovals: approvals.filter(a => a.status === 'Pending').length,
  },
  sites,
  contractors,
  workers,
  approvals,
  gatePasses,
  submissions,
  complianceReports,
  canAccessAdmin: true,
  users: [
    { id: 'usr-1', name: 'Neha Agarwal', contact: 'neha.agarwal@talentindia.example', role: 'Employer Admin', scope: 'All sites', status: 'Active', lastLogin: '2026-10-16T09:02:00+05:30' },
    { id: 'usr-2', name: 'Rohit Malhotra', contact: 'rohit.malhotra@talentindia.example', role: 'Site Manager', scope: 'Factory Unit 2', status: 'Active', lastLogin: '2026-10-15T18:44:00+05:30' },
    { id: 'usr-3', name: 'Dr. Kavya Iyer', contact: 'kavya.iyer@talentindia.example', role: 'Medical Officer', scope: 'Whitefield Warehouse', status: 'Pending', lastLogin: null },
  ],
  permissionRoles: [
    { id: 'role-admin', role: 'Employer Admin', description: 'Full access to all modules and sites', modules: [{ module: 'All', permissions: ['view', 'edit', 'approve'] }] },
    { id: 'role-site', role: 'Site Manager', description: 'Site-scoped operations', modules: [{ module: 'Attendance', permissions: ['view', 'edit'] }, { module: 'Gate pass', permissions: ['view', 'approve'] }] },
  ],
  auditLogs: [
    { id: 'aud-1', timestamp: '2026-10-15T12:11:00+05:30', actor: 'BuildRight Contractors', action: 'Gate pass requested', entity: 'gp-502', status: 'Success' },
    { id: 'aud-2', timestamp: '2026-10-12T11:06:00+05:30', actor: 'SafeHands Manpower', action: 'Compliance submission', entity: 'sub-802', status: 'Pending' },
  ],
  routes: [
    { id: 'rt-1', name: 'Greater Noida shuttle', reference: 'RT-NOI-01', vehicle: 'UP16 AT 4412', route: 'Pari Chowk → Sector 136', workers: 3, shifts: 'General', createdAt: '2026-03-01', status: 'Active' },
  ],
  workerDocuments,
  activities,
  govtScope: 'state',
  labourCompliance: [],
  profileSections: {
    Company: [
      { label: 'Legal name', value: COMPANY },
      { label: 'CIN', value: 'U74140UP2015PTC071234' },
      { label: 'PAN', value: 'AAKCT1234F', sensitive: true },
    ],
  },
  payroll: { period: PERIOD, records: payrollRecords },
};

export default mockEmployer;
