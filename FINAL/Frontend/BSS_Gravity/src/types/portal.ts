export type PortalRole = 'Worker' | 'Contractor' | 'Employer' | 'BSS Admin' | 'BSS Staff' | 'Government';
export const PORTAL_ROLES: PortalRole[] = ['Worker', 'Contractor', 'Employer', 'BSS Admin', 'BSS Staff', 'Government'];
export const ADMIN_SUPPORT_ROLES: PortalRole[] = ['BSS Admin', 'BSS Staff', 'Government'];

export type PortalSession = {
  subject: string;
  role: PortalRole;
  sessionId: string;
  accessToken?: string;
  issuedAt: number;
  expiresAt: number;
};

export type WorkerRecord = {
  identity: {
    name: string;
    bssId: string;
    category: string;
    aadhaarVerified: boolean;
    panVerified: boolean;
    photoUrl: string;
    dob: string;
    gender: string;
    aadhaar: string;
    pan: string;
    /** Mandatory place-of-birth (native village/town & district) declared by the worker — powers state migration mapping. */
    placeOfBirth: string;
    alternateMobile?: string;
    email?: string;
    emergencyContactName?: string;
    emergencyContactNumber?: string;
    emergencyContactRelation?: string;
    disabilityTypePct?: string;
  };
  employment: {
    status: string;
    employer: string;
    contractor: string;
    site: string;
    department: string;
    designation: string;
    doj: string;
    shift: string;
    campNo?: string;
    refWorkerId?: string;
    transportFacility?: string;
    route?: string;
    busNo?: string;
    pfAccount?: string;
    natureOfJob?: string;
    typeOfWork?: string;
    idCardIssueDate?: string;
    idCardValidityTill?: string;
    contractorDetails?: { name: string; code: string; contact: string; email: string; lin: string; state?: string; address?: string };
    employerDetails?: { name: string; code: string; industry: string; email: string; lin: string; state?: string; address?: string };
    siteDetails?: { name: string; code: string; location: string; medicalOfficer: string; officerContact: string; state?: string };
  };
  compliance: {
    siteInduction: boolean;
    ppeIssued: string[];
    policeVerification: string;
    permanentGatePass: string;
    medicalFitnessDaysLeft: number;
    /** Medical examination outcome — "Completed" | "Pending" | "Expired" | "Not Required" (BssTaxonomies.MedicalExaminationStatus). Optional: absent when the upstream record has not reported it yet. */
    medicalExaminationStatus?: string;
    /** Medical fitness verdict — "Fit" | "Fit with Restrictions" | "Unfit" | "Pending" (BssTaxonomies.MedicalFitnessStatus). */
    medicalFitnessStatus?: string;
  };
  skills: {
    educations?: Array<{ id?: number; qualificationCourse?: string; boardUniversity?: string; passingYear?: string }>;
    languages?: string[];
    items?: Array<{ id?: number; name?: string; experienceYears?: string; verified?: boolean; certification?: { name?: string; number?: string; authority?: string; expiry?: string } }>;
    primary?: { name: string; level?: string; experienceYears?: string };
    secondary?: string[];
    certification?: { name: string; number?: string; authority?: string; expiry?: string; verified: boolean };
  };
  socialSecurity: { epfoUan: string; esicIp: string; eShramLinked: boolean; bocwRegistered: boolean; lwfNo?: string; wcPolicyNo?: string; eShramNo?: string; stateWorkerId?: string; bocwRegNumber?: string };
  documents: { required: number; uploaded: number; missing: string[] };
  rozgarRequests: Array<{ id: string; employer: string; site: string; status: string }>;
  grievances: { openCount: number; recent: { id: string; status: string; date: string } };
  contact: { mobile: string; alternateMobile: string; email: string; preferredLanguage: string; preferredChannel: string };
  address: { current: string; currentState: string; currentDistrict: string; currentCity: string; currentLocality: string; currentPin: string; permanent: string; permanentState: string; permanentDistrict: string; permanentCity: string; permanentLocality: string; permanentPin: string; migrant: boolean; migrationType: string; sameAsPermanent: boolean };
  personal: { maritalStatus: string; bloodGroup: string; fatherName: string; motherName: string; spouseName: string; disabilityStatus: string; religion: string; caste: string };
  banking: { bankName: string; holderName: string; accountNumber: string; ifsc: string; verificationStatus: string; upiEnabled: boolean };
  preferences: { consentToPublicPhoto: boolean; consentToDataSharing: boolean };
  settings: {
    interfaceLanguage: string; preferredChannel: string;
    jobAlerts: boolean; complianceAlerts: boolean; grievanceUpdates: boolean;
    largeText: boolean; highContrast: boolean; reduceMotion: boolean;
    consentToPublicPhoto: boolean; consentToDataSharing: boolean; bindingEnabled?: boolean;
  };
  classification: {
    workerCategory?: string; sector?: string; industry?: string; occupation?: string; skill?: string;
    currentEmploymentStatus?: string; totalWorkerExperience?: string; paymentFrequency?: string; paymentMode?: string;
    gigPlatformName?: string; gigPlatformWorkerId?: string; gigPlatformType?: string; gigDateJoined?: string;
    gigServiceArea?: string; gigVehicleType?: string; gigVehicleOwnership?: string;
    gigAvgHoursPerDay?: string; gigAvgDaysPerWeek?: string; gigDlNumber?: string; gigDlExpiry?: string;
    seBusinessName?: string; seEmployerName?: string; seBusinessType?: string; seRegistrationStatus?: string;
    seStartDate?: string; seLocation?: string; seAvgHoursPerDay?: string; seAvgDaysPerWeek?: string; seEmployeesCount?: number | string;
    seasonalJobType?: string; seasonalStartDate?: string; seasonalEndDate?: string;
    seasonalAvgHoursPerDay?: string; seasonalAvgDaysPerWeek?: string;
    seasonalLocation?: string; seasonalExpectedIncome?: string;
  };
  welfare?: {
    ppeRequired?: boolean; typesOfPpeGiven?: string; safetyTrainingCompleted?: boolean;
    siteInductionStatus?: string; insuranceStatus?: string; accommodationProvided?: string;
    policeVerification?: string; trainingDate?: string; trainerName?: string;
    tempGatePassStatus?: string; tgpNo?: string; tempGatePassStart?: string; tempGatePassEnd?: string;
    permanentGatePassStatus?: string; pgpNo?: string; permanentGatePassStart?: string; permanentGatePassEnd?: string;
    medicalExaminationStatus?: string; lastMedicalExamination?: string; medicalFitnessStatus?: string; nextMedicalDue?: string;
  };
  gatePasses?: Array<{ id:number; type:string; number:string; site:string; validFrom:string; validTo:string; status:string; requestedAt:string; requestedBy?:string; approvedBy?:string; approvedAt?:string }>;
  complianceRecords?: Array<{ date:string; record:string; detail:string; ref:string; result:string }>;
  other?: {
    registrationSource?: string; registeredBy?: string; registrationDate?: string;
    consentDate?: string; consentRegistration?: boolean; consentVerification?: boolean;
  };
  family?: {
    familyMembersCount?: number; dependantsCount?: number;
    nominees?: Array<{ id: number; name: string; dependant: string; relation: string; nomineeType: string; dob: string; age?: number; contact: string; address: string; documents: Array<string | { type: string; name: string; fileName?: string; url?: string }>; percent: number }>;
  };
};

export type ContractorWorker = {
  id: string; name: string; bssId: string; mobile: string; site: string; employer: string;
  designation: string; doj: string; compliance: 'Compliant' | 'Expiring' | 'Non-compliant';
  status: 'Active' | 'Inactive'; verified: boolean;
  refCode?: string; department?: string; gender?: string; age?: string; category?: string; skills?: string[]; photoUrl?: string;
  /** Extended identity — only present for workers bound to the requesting contractor. */
  aadhaar?: string; dob?: string; fatherName?: string; bloodGroup?: string;
  eligibility?: GatePassEligibility;
};

export type ContractorBenefitRecord = {
  id: string; worker: string; workerId: string; employer: string; period: string; amount: number; days?: number;
  reason?: string; paidOn: string; fileUrl?: string; fileName?: string; kind?: string;
  status: 'Pending verification' | 'Verified' | 'Returned' | 'Recorded' | 'Credited' | 'Processing' | 'Paid'; source: 'contractor' | 'govt-auto';
};

export type ContractorSalaryRecord = {
  id: string; worker: string; workerId: string; employer: string; site: string; period: string;
  gross: number; deductions: number; net: number; paidOn: string; fileName?: string;
  status: 'Pending verification' | 'Verified' | 'Returned'; source: 'contractor' | 'govt-auto';
};

export type WorkerBenefitsData = {
  bonus: ContractorBenefitRecord[];
  leaveEncashment: ContractorBenefitRecord[];
};

export type ContractorLicence = {
  id: string; name: string; authority: string; number: string; state: string; validFrom: string; validTo: string; status: 'Active' | 'Expiring' | 'Expired';
};

export type ContractorWorkerDocument = {
  id: string; worker: string; workerId: string; document: string; reference: string; verified: boolean; status: 'Verified' | 'Pending' | 'Missing' | 'Expired';
};

export type ContractorWorkerComplianceStatus = {
  worker: string; workerId: string; site: string; gatePass: 'Active' | 'Pending' | 'Expired'; medical: 'Done' | 'Pending' | 'Expired'; healthSafety: 'Done' | 'Pending';
  details: {
    medicalExaminationStatus: string; medicalFitnessStatus: string; lastMedicalExamination: string; nextMedicalDue: string;
    ppeRequired: boolean; typesOfPpeGiven: string; safetyTrainingCompleted: boolean; siteInductionStatus: string;
    insuranceStatus: string; accommodationProvided: string; policeVerification: string; trainingDate: string; trainerName: string;
  };
};

export type ContractorGrowthPoint = { month: string; workers: number };

export type ContractorComplianceHistory = {
  id: string; period: string; employer: string; site: string; item: string; pf: 'Filed' | 'Pending' | 'Overdue'; esic: 'Filed' | 'Pending' | 'Overdue'; amount: number; filedOn: string; status: 'Compliant' | 'Pending' | 'Non-compliant';
};

export type ContractorJobPosting = {
  id: string; title: string; trade: string; category: string; workplaceType: string; state: string; city: string; site: string; description: string; skills: string[];
  experience: string; minSalary: number; maxSalary: number; salaryVisibility: string; vacancies: number; monthlyWage: number; closingDate: string; duration: string;
  visibility: string; status: 'Draft' | 'Submitted' | 'Approved' | 'Closed'; postedOn: string; applications: number; hires: number;
};

export type ContractorBindingRequest = {
  id: string; type: 'Worker' | 'Employer'; entityName: string; bssId: string; site: string; employer: string; designation: string; wage: string; requestedOn: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled' | 'Expired';
  /** Who raised the request and who accepted it (role labels). */
  initiatedBy?: string; acceptedBy?: string;
  consentWorker?: boolean; consentContractor?: boolean;
  unbindRequested?: boolean; unbindConsentWorker?: boolean; unbindConsentContractor?: boolean;
  /** Present on Contractor ↔ Employer binding rows. */
  bindingId?: number;
  /** Per-site allotment permissions for a Contractor ↔ Employer binding. */
  allotments?: SiteAllotment[];
  /** Lifecycle timeline (requested / accepted / unbind / unbound). */
  history?: BindingHistoryEvent[];
};

export type SiteAllotment = {
  siteId: number; site: string; siteCode: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Released'; source: string;
  releaseRequested?: boolean; releaseRequestedBy?: string;
};

export type BindingHistoryEvent = { label: string; by?: string; at?: string };

export type ContractorRegister = {
  id: string; documentName: string; documentType: string; formNo: string; criticality: 'High' | 'Medium' | 'Low'; frequency: string; registerLevel: string;
};

export type ContractorComplianceBatch = {
  id: string; financialYear: string; month: string; year: string; state: string; site: string; siteCode: string; employeeCount: number; locationCount: number; generatedOn: string; generatedBy: string; status: 'Generated' | 'Pending' | 'Failed';
};

export type ContractorAuditReport = {
  id: string; uniqueNo: string; site: string; employer: string; period: string; reportDate: string; score: number; scorePercent: number; actWise: Array<{ act: string; form: string; nature: string; score: number; status: string; auditorRemarks: string; vendorRemarks: string }>;
};

export type ContractorGrievance = {
  id: string; ref: string; category: string; status: 'Open' | 'In Progress' | 'Resolved' | 'Reopened';
  worker: string; workerId: string; site: string; employer: string; contractor: string; raisedAt: string; updatedAt: string; description: string;
  audioAvailable: boolean; attachment: string | null; replyHistory: Array<{ by: 'Contractor' | 'Employer' | 'Worker'; text: string; at: string }>; resolutionConfirmed: boolean;
};

// ── Payroll (BSS_contractor_payroll.csv) ────────────────────────────────────
export type PayrollEarningComponent = {
  name: string; type: string; calculation: string; flatAmount: number | null; considerEPF: string; considerESI: string; active: boolean;
};
export type PayrollOneTimeComponent = { name: string; type: string; frequency: 'One Time' | 'Recurring'; active: boolean };
export type PayrollReimbursement = { name: string; type: string; maxAmount: number; active: boolean };
export type PayrollFullFinal = {
  leaveEncashment: { enabled: boolean; leaveType: string; encashmentOn: string; days: number; calcDays: string; custom: string };
  gratuityEncashment: { enabled: boolean; maturityYears: string; maturityMonths: string; roundingMonths: string };
  noticePenalty: { enabled: boolean; penaltyOn: string };
  excessLeaveRecovery: { enabled: boolean; penaltyOn: string };
  assumeDaysRecovery: { enabled: boolean; penaltyOn: string };
};
export type ContractorPayrollConfig = {
  paySchedule: {
    payFrequency: string; workingDays: string[]; payDay: string; firstPayPeriod: string; upcoming: Array<{ period: string; payDate: string }>;
  };
  statutory: {
    epf: { number: string; deductionCycle: string; employeeRate: string; employerRate: string; includeInSalary: boolean; edliIncluded: boolean; adminChargesIncluded: boolean; allowOverride: boolean; proRate: boolean; lopConsideration: boolean; abryEligible: boolean; sample: string };
    esi: { number: string; deductionCycle: string; employeeRate: string; employerRate: string; otherDetail: string };
    professionalTax: Array<{ location: string; ptNumber: string; state: string; cycle: string; applicable: boolean; slabs: string }>;
    labourWelfareFund: Array<{ state: string; minAmount: number; maxAmount: string; employeeShare: number; employerShare: number; cycle: string; enabled: boolean; applicable: boolean }>;
    statutoryBonus: { minWageStates: string[]; paymentCycle: string; percentage: number };
  };
  salary: {
    earnings: PayrollEarningComponent[]; deductions: PayrollOneTimeComponent[]; benefits: PayrollOneTimeComponent[]; reimbursements: PayrollReimbursement[]; fullFinal: PayrollFullFinal;
  };
  staffPortal: { portalAccess: boolean; bannerMessage: string; bannerTill: string; contact: string; showDocuments: boolean; showSalaryRevision: boolean };
};

export type PayrollWorkerRecord = {
  id: string; workerId: string; workerName: string; employer: string; site: string; period: string;
  status: 'Draft' | 'Reviewed' | 'Submitted' | 'Verified' | 'Returned' | 'Exception';
  attendanceDays: number; lopDays: number; pfWage: number;
  earnings: Array<{ component: string; amount: number }>;
  deductions: Array<{ component: string; amount: number }>;
  contributions: {
    employeePF: number; employerPF: number; eps: number; edli: number; admin: number;
    employeeESI: number; employerESI: number; employeePT: number; employerPT: number; lwfEmployee: number; lwfEmployer: number;
  };
  gross: number; totalDeductions: number; netPay: number; employerCost: number;
  updatedAt: string; updatedBy: string; errors?: string[];
  // Payroll provenance & conflict state (shared Employer ↔ Contractor model).
  source?: 'Employer' | 'Contractor';
  matchState?: 'Employer Provided' | 'Contractor Entered' | 'Matched' | 'Needs Review';
  contractor?: string; // destination contractor for Employer-entered distribution
};

export type PayrollSource = 'Employer' | 'Contractor';
export type PayrollMatchState = 'Employer Provided' | 'Contractor Entered' | 'Matched' | 'Needs Review';

export type GatePassEligibility = { medical:'Done'|'Pending'|'Expired'; healthSafety:'Done'|'Pending'; compliance:'Done'|'Pending'; safetyKit:'Done'|'Pending'; safetyTraining:'Done'|'Pending'; siteInduction:'Done'|'Pending'; aadhaar:'Done'|'Pending'; bank:'Done'|'Pending'; uan:'Done'|'Pending'; esi:'Done'|'Pending' };
export type AdvanceStatus = 'Requested'|'Approved'|'Disbursed'|'Accepted'|'Adjusted'|'Rejected';
export type WorkerAdvance = { id:string; advanceId:number; amount:number; reason:string; requestedOn:string; status:AdvanceStatus; approvedOn?:string; disbursedOn?:string; mode?:string; reference?:string; payrollPeriod?:string };
export type ContractorAdvance = WorkerAdvance & { worker:string; workerId:string };
export type ContractorLeaveApproval = { id:string; worker:string; bssId:string; type:string; from:string; to:string; days:number; reason:string; status:'Pending'|'Approved'|'Rejected'|'Cancelled'; requestedOn:string };
export type SiteCalendar = {
  siteId:number; siteName:string;
  holidays: Array<{id:number;date:string;name:string;holidayType:string;holidayTypeCode:string;isPaid:boolean;note:string}>;
  leavePolicies: Array<{id:number;leaveTypeId:number;leaveType:string;annualEntitlement:number;openingBalance:number;isActive:boolean}>;
};
export type ContractorPortalData = {
  identity: { name: string; company: string; bssId: string; incorpDate: string; entity: string; verified: boolean; rating: number; contact: string; email: string; accountStatus?: string };
  stats: { totalWorkers: number; activeSites: number; complianceScore: number; pendingAlerts: number };
  principalEmployer: { name: string; code: string; industry: string; email: string; lin: string };
  sites: Array<{ id: string; code: string; name: string; employer: string; location: string; workers: number; compliance: number; bssId?: string; state?: string; status?: string; data?: Record<string, unknown> }>;
  defaultSite?: { id: string; name: string; code: string } | null;
  workers: ContractorWorker[];
  compliances: Array<{ id: string; item: string; category: string; reference: string; employer: string; site: string; worker: string | null; issue: string; expiry: string; verification: 'Verified' | 'Pending' | 'Rejected'; status: 'Active' | 'Expiring' | 'Expired' }>;
  complianceReports: Array<{ id: string; site: string; employer: string; period: string; type: string; status: 'Compliant' | 'Pending' | 'Non-compliant' }>;
  gatePasses: Array<{ id: string; workerName: string; workerId: string; employer: string; type: 'Temporary' | 'Permanent'; site: string; validFrom: string; validTo: string; status: 'Approved' | 'Pending' | 'Rejected'; contact?: string; skill?: string; requestedAt?: string; requestedBy?: string; approvedBy?: string; approvedAt?: string; eligibility?: GatePassEligibility }>;
  applications: Array<{ id: string; workerName: string; workerId: string; employer: string; trade: string; experience: string; expectedWage: number; location: string; status: 'Pending' | 'Shortlisted' | 'Hired' | 'Rejected'; dateApplied: string; matchScore: number }>;
  employers: Array<{ id: string; name: string; employerId: string; sites: string[]; siteDetails?: Array<{ id: string; name: string; code: string; location: string; state: string }>; status: 'Active' | 'Inactive'; boundSince: string }>;
  submissions: {
    documents: Array<{ id: string; uniqueNo?: string; type: string; employer: string; site: string; state?: string; financialYear?: string; month?: string; period: string; status: string; submittedAt: string; updatedAt?: string; daysLeft?: number; mandatory?: boolean; frequency?: string; accuracy?: number; fileName?: string; checksum?: string }>;
  };
  workerBenefits: WorkerBenefitsData;
  salaries: ContractorSalaryRecord[];
  profileSections: Record<string, Array<{ label: string; value: string; sensitive?: boolean; type?: string }>>;
  // Contract-specific additions (dashboards / modules)
  licenses: ContractorLicence[];
  workerDocuments: ContractorWorkerDocument[];
  workerCompliance: ContractorWorkerComplianceStatus[];
  workforceGrowth: { sixMonths: ContractorGrowthPoint[]; oneYear: ContractorGrowthPoint[] };
  applicability: Array<{ act: string; applies: boolean; note: string }>;
  complianceHistory: ContractorComplianceHistory[];
  jobHistory: ContractorJobPosting[];
  leaveApprovals: ContractorLeaveApproval[];
  advances: ContractorAdvance[];
  siteCalendars: SiteCalendar[];
  leaveTypeCatalog: string[];
  bindingRequests: ContractorBindingRequest[];
  registers: ContractorRegister[];
  complianceBatches: ContractorComplianceBatch[];
  auditReports: ContractorAuditReport[];
  grievances: ContractorGrievance[];
  payroll: {
    config: ContractorPayrollConfig;
    records: PayrollWorkerRecord[];
    templateColumns: string[];
  };
};

export type EmployerSiteDetail = {
  type: string;
  category: string;
  entity: string;
  address: { address: string; state: string; district: string; city: string; pin: string; latitude: string; longitude: string };
  operational: Record<string, string>;
  complianceClient: Record<string, string>;
  contacts: Array<{ label: string; value: string; sensitive?: boolean }>;
  attendanceAccess: Record<string, string>;
  billingContractor: { name: string; bssId: string; label: string };
  facilities: Array<{ label: string; enabled: boolean }>;
};

export type EmployerSite = {
  id: string;
  code: string;
  name: string;
  location: string;
  state: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Planned' | 'Completed';
  contractorIds: string[];
  workers: number;
  compliance: number;
  qrToken?: string;
  bssId?: string;
  details?: EmployerSiteDetail;
  /** Raw scalar site-master fields (snake_case model column names) from the Site Detail sheet. */
  data?: Record<string, unknown>;
};

export type EmployerGatePass = {
  id: string;
  workerName: string;
  workerId: string;
  contractor: string;
  site: string;
  siteId: string;
  type: 'Permanent' | 'Temporary';
  requestedAt: string;
  validFrom: string;
  validTo: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  contact?: string;
  skill?: string;
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  eligibility?: GatePassEligibility;
};

export type EmployerSubmission = {
  id: string;
  contractor: string;
  contractorId: string;
  site: string;
  type: string;
  period: string;
  submittedAt: string;
  status: 'Pending review' | 'Verified' | 'Returned';
};

export type EmployerUser = {
  id: string;
  name: string;
  contact: string;
  role: string;
  scope: string;
  status: 'Active' | 'Inactive' | 'Pending';
  lastLogin: string | null;
};

export type EmployerPermissionRole = {
  id: string;
  role: string;
  description: string;
  modules: Array<{ module: string; permissions: string[] }>;
};

export type EmployerAudit = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  status: 'Success' | 'Failed' | 'Pending';
};

export type EmployerRoute = {
  id: string;
  name: string;
  reference: string;
  vehicle: string;
  route: string;
  workers: number;
  shifts: string;
  createdAt: string;
  status: 'Active' | 'Suspended';
};

export type EmployerWorkerDocument = {
  id: string;
  worker: string;
  workerId: string;
  contractor: string;
  site: string;
  document: string;
  status: 'Verified' | 'Pending' | 'Expiring' | 'Missing' | 'Rejected';
  expiry: string | null;
};

export type EmployerContractor = {
  id: string;
  name: string;
  bssId: string;
  contact: string;
  email: string;
  siteIds: string[];
  workers: number;
  compliance: number;
  onboardingDate: string;
  status: 'Active' | 'Pending' | 'Suspended';
  bindingId?: number;
  verified: boolean;
};

export type EmployerWorker = {
  id: string;
  name: string;
  bssId: string;
  mobile: string;
  contractorId: string;
  contractor: string;
  siteId: string;
  site: string;
  designation: string;
  doj: string;
  attendance: number;
  compliance: 'Compliant' | 'Expiring' | 'Non-compliant';
  status: 'Active' | 'Inactive';
  verified: boolean;
};

export type EmployerApproval = {
  id: string;
  entityType: 'Contractor' | 'Worker';
  entityId: string;
  name: string;
  bssId: string;
  contractor: string | null;
  site: string;
  submittedAt: string;
  checks: string[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Accepted' | 'Cancelled';
  /** Who raised the request and who accepted it (role labels). */
  initiatedBy?: string; acceptedBy?: string;
  /** Present on Contractor ↔ Employer binding rows. */
  bindingId?: string;
  consentEmployer?: boolean;
  consentContractor?: boolean;
  source?: string;
  /** Site IDs already allotted to this contractor↔employer binding. */
  siteIds?: number[];
  /** Per-site allotment permissions (requested / approved / rejected). */
  allotments?: SiteAllotment[];
  unbindRequested?: boolean;
  unbindConsentEmployer?: boolean;
  unbindConsentContractor?: boolean;
  history?: BindingHistoryEvent[];
};

export type EmployerComplianceReport = {
  id: string;
  contractorId: string;
  contractor: string;
  siteId: string;
  site: string;
  period: string;
  pf: 'Filed' | 'Pending' | 'Overdue';
  esic: 'Filed' | 'Pending' | 'Overdue';
  wage: 'Filed' | 'Pending' | 'Overdue';
  safety: 'Compliant' | 'Review' | 'Non-compliant';
  score: number;
  status: 'Compliant' | 'Pending' | 'Non-compliant';
};

export type EmployerPortalData = {
  identity: {
    name: string;
    company: string;
    bssId: string;
    entity: string;
    verified: boolean;
    contact: string;
    email: string;
    address: string;
  };
  stats: {
    totalContractors: number;
    totalWorkers: number;
    activeSites: number;
    complianceScore: number;
    pendingApprovals: number;
  };
  sites: EmployerSite[];
  defaultSite?: { id: string; name: string; code: string } | null;
  contractors: EmployerContractor[];
  workers: EmployerWorker[];
  grievances: ContractorGrievance[];
  approvals: EmployerApproval[];
  gatePasses: EmployerGatePass[];
  submissions: EmployerSubmission[];
  complianceReports: EmployerComplianceReport[];
  canAccessAdmin: boolean;
  users: EmployerUser[];
  permissionRoles: EmployerPermissionRole[];
  auditLogs: EmployerAudit[];
  routes: EmployerRoute[];
  workerDocuments: EmployerWorkerDocument[];
  activities: Array<{
    id: string;
    title: string;
    description: string;
    occurredAt: string;
    type: 'approval' | 'contractor' | 'worker' | 'compliance' | 'site';
  }>;
  govtScope: import('@/lib/labour-compliance').GovtScope;
  labourCompliance: EmployerLabourCompliance[];
  profileSections: Record<string, Array<{ label: string; value: string; sensitive?: boolean; note?: string }>>;
  payroll: {
    config: ContractorPayrollConfig;
    records: PayrollWorkerRecord[];
    templateColumns: string[];
  };
};

export type DataState<T> = { source: string; records: T[]; syncedAt: string | null };
export type WageRecord = { id:string; period:string; paidOn:string; employer:string; contractor:string; site:string; basis:string; gross:number; deductions:number; net:number; status:'Credited'|'Processing'|'Failed'; reference?:string; receiptUrl?:string };
export type AttendanceRecord = { date:string; presence:'Present'|'Absent'|'Leave'|'Holiday'|'Weekly Off'; shift?:string; site:string; checkIn?:string; checkOut?:string; status:'On time'|'Late'|'Half Day'|'Recorded'; method?:string };
export type BenefitRecord = { period:string; employeeContribution:number; employerContribution:number; creditedOn:string };
export type BonusRecord = { id:string; period:string; reason:string; amount:number; paidOn:string; status:'Credited'|'Processing'|'Pending' };
export type LeaveEncashmentRecord = { id:string; period:string; days:number; rate:number; amount:number; paidOn:string; status:'Credited'|'Processing'|'Pending' };

export type WorkerDocument = { name:string; mandatory:boolean; owner:'Worker'|'Contractor'|'System'; status:string; date:string|null; downloadUrl?:string };
export type WorkerJobRequest = { id:string; employer:string; contractor:string; site:string; designation:string; wage:number; currency:string; payPeriod:string; duration:string; facilities:string[]; status:'Pending'|'Accepted'|'Rejected'|'Cancelled'|'Expired'; dateReceived:string };
export type WorkerAvailableJob = { id:string; jobId:number; title:string; subTitle:string; employer:string; postedDate:string; description:string; wage:string; state:string; city:string; designation:string; experience:string; dobLimit:string; vacancies:number; matchBadge:boolean };
export type WorkerBindingRequest = { id:number; ref:string; contractor:string; contractorCode:string; lin:string; employer:string; site:string; designation:string; wage:string; requestedOn:string; status:'Pending'|'Accepted'|'Rejected'|'Expired'|'Cancelled'; initiatedBy?:string; acceptedBy?:string; contractorDetails?:{name:string;code:string;tradeName:string;lin:string;contactPerson:string;email:string;state:string;address:string}; consentWorker?:boolean; consentContractor?:boolean; unbindRequested?:boolean; unbindConsentWorker?:boolean; unbindConsentContractor?:boolean; history?: BindingHistoryEvent[] };export type LabourLawItem = { ruleId: import('@/lib/labour-compliance').RuleId; status: import('@/lib/labour-compliance').RuleStatus; headline: string; detail: string; updatedAt: string };
export type EmployerLabourCompliance = { ruleId: import('@/lib/labour-compliance').RuleId; scope: import('@/lib/labour-compliance').GovtScope; status: import('@/lib/labour-compliance').RuleStatus; note: string; verifiedAt: string };
export type CourseSubmissionView = { content:string; fileUrl:string; status:string; score:number|null; feedback:string; submittedAt:string };
export type CourseAssignmentView = { id:string; title:string; passScore:number; score:number|null; passed:boolean; type:'QUIZ'|'WRITING'|'UPLOAD'; instructions:string; questions:Array<{id:string;question:string;options:string[]}>; submission:CourseSubmissionView|null };
export type CourseReadingView = { id:string; title:string; body:string; url:string; duration:string };
export type CourseModuleView = { id:string; title:string; completed:boolean; lessons:Array<{id:string;title:string;duration:string;completed:boolean;videoUrl?:string}>; assignments:CourseAssignmentView[]; readings:CourseReadingView[] };
export type LearningCourse = { id:string; title:string; provider:string; duration:string; rating:number; progress:number; image:string; badge:string; category:string; description:string; instructor:string; certification:string; skillAwarded:string; status:'Not started'|'In progress'|'Completed'; certificateReady:boolean; certificateNo:string; assignmentFailedAt?:Record<string, string>; modules:CourseModuleView[] };
export type WorkerPortalData = {
  dataMode: 'demo' | 'remote';
  worker: WorkerRecord;
  govtScope: import('@/lib/labour-compliance').GovtScope;
  labourLaw: LabourLawItem[];
  wages: DataState<WageRecord>;
  advances: WorkerAdvance[];
  attendance: DataState<AttendanceRecord>;
  providentFund: DataState<BenefitRecord>;
  bonus: DataState<BonusRecord>;
  leaveEncashment: DataState<LeaveEncashmentRecord>;
  gratuity: {serviceStart:string;completedService:string;calculationBasis:string;indicativeAmount:number;eligibilityStatus:string;lastUpdated:string;schemeStatus?:'Enabled'|'Non-enabled';application?:{reference:string;submittedOn:string;status:'Submitted'|'Under examination'|'Approved'|'Disbursed'|'Rejected'} | null};
  holidays: Array<{date:string;name:string;type:string;appliesTo:string}>;
  announcements: Array<{id:string;title:string;description:string;publisher:string;published:string;eventDate:string|null;priority:'Important'|'Normal';category:string}>;
  courses: LearningCourse[];
  documents: WorkerDocument[];
  jobRequests: WorkerJobRequest[];
  availableJobs: WorkerAvailableJob[];
  bindings: WorkerBindingRequest[];
  availability: boolean;
  leaveTypes: string[];
  leaveRecords: Array<{id:string;type:string;from:string;to:string;reason:string;submitted:string;status:'Pending'|'Approved'|'Rejected'|'Cancelled';approver?:string;comment?:string}>;
  leaveBalance: Array<{type:string;opening:number;accrued:number;availed:number;pending:number;balance:number}>;
  leaveEnabled: boolean;
  cardProduct: { productId:string; cardFee:number; deliveryFee:number; currency:string; paymentProviders:Array<'razorpay'|'payu'> };
  geography: Record<string, Record<string, ReadonlyArray<{city:string;pins:readonly string[]}>>>;
};

export type GovWorker = {
  id: string; state: string; district: string; city: string;
  age: number; gender: 'Male' | 'Female' | 'Transgender';
  category: string; occupation: string;
  site: string; siteType: string; employer: string; contractor: string;
  migrant: boolean; stateOfOrigin: string;
  attendance: number; compliance: 'Compliant' | 'Pending' | 'Non-compliant';
  epfoLinked: boolean; esicLinked: boolean; wage: number;
};

export type GovernmentPortalData = {
  dataMode: 'demo' | 'remote';
  generatedAt: string;
  source: string;
  states: string[];
  workers: GovWorker[];
};
