/**
 * Shared payroll engine types. Shapes mirror the legacy payroll JSON exactly
 * (camelCase keys, `_id` string ids). Module-specific shapes live next to the
 * module that uses them; only cross-module types belong here.
 */

export type Address = { address: string; street: string; city: string; state: string; pin: string; country: string };

export type ComponentOverride = { category: 'earnings' | 'deductions' | 'benefits' | 'reimbursements'; code: string; name: string; overrideAmount: number | null; disabled: boolean };

export type PayrollEmployee = {
  _id: string;
  id: string;
  organizationId: string;
  workerId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  name: string;
  email: string;
  uniqueId: string;
  customId: string;
  dateOfJoining: string | null;
  status: 'Active' | 'Inactive' | 'Probation';
  jobTitle: string;
  department: string;
  categoryName: string;
  employeeType: string;
  fatherSpouse: string;
  siteId: string;
  siteName: string;
  workState: string;
  phone: { mobile: string; home: string };
  demographics: { dob: string | null; gender: string };
  presentAddress: Address;
  permanentAddress: Address;
  nationalID: { pan: string; nameInPan: string; [key: string]: unknown };
  bankInfo: { bankName: string; branchName: string; ifscCode: string; bankAccountNumber: string; accountHolderName: string; accountType: string; isVerified: boolean; [key: string]: unknown };
  payrollInfo: {
    baseSalary: number; grossSalary: number; ctc: number; paymentFrequency: string; currency: string;
    taxRegime: 'Old' | 'New'; variablePay: number; incentives: number; salaryEffectiveFrom: string | null;
    componentOverrides: ComponentOverride[]; defaultComponents: Array<Record<string, unknown>>;
  };
  payrollPreferences: {
    holdSalary: boolean; holdReason: string; loanDeduction: number; advanceDeduction: number; paymentMode: string;
    vpf: { enabled: boolean; contributionType: 'percentage' | 'fixed'; percentage: number; fixedAmount: number; status: string; acknowledged: boolean; requestedAt: string | null; effectiveFrom: string | null };
  };
  taxInfo: Record<string, unknown>;
  statutoryInfo: {
    pfAccountNumber: string; uan: string; esiNumber: string; esiApplicable: boolean; esiOptedOut: boolean;
    ptApplicable: boolean; ptState: string; gratuityApplicable: boolean; lwfApplicable: boolean; lwfState: string;
    employmentCategory: '' | 'skilled' | 'semiSkilled' | 'unskilled'; epfApplicable: boolean;
    epfOverride: { enabled: boolean; employeeContributionRate: number | null; employerContributionRate: number | null; restrictedPfWage: number | null; applyCeiling: boolean };
  };
  exitData: { exitStatus: string; date: string | null; reason: string; authorizedBy: string | null; lastWorkingDay: string | null };
  createdAt: string;
  updatedAt: string;
};

export type OrgProfile = { _id: string; name: string; type: string; address: string; state: string; pan: string; tan: string; gstin: string; email: string; phone: string; logo: string };

export type PayrollContextData = {
  role: string;
  isAdmin: boolean;
  isEmployee: boolean;
  organization: OrgProfile | null;
  organizations?: Array<{ _id: string; name: string; type: string }>;
  employee?: PayrollEmployee | null;
};

export type ModuleProps = {
  ctx: PayrollContextData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  /** Jump to another module, optionally with params (e.g. an employee id). */
  navigate: (module: string, params?: Record<string, string>) => void;
  params: Record<string, string>;
};
