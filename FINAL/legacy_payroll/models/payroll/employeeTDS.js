const mongoose = require('mongoose');

// Employee TDS Record - Monthly TDS deductions
const employeeTDSSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    financialYear: {
      type: String,
      required: true,
    },
    // Tax Regime Selection
    taxRegime: {
      type: String,
      enum: ['old', 'new'],
      default: 'new',
    },
    // Annual Projections
    projectedAnnualIncome: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      otherIncome: { type: Number, default: 0 },
      loanPerquisite: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    // Deductions Declared
    declaredDeductions: {
      section80C: { type: Number, default: 0 },
      section80CCC: { type: Number, default: 0 },
      section80CCD1: { type: Number, default: 0 },
      section80CCD1B: { type: Number, default: 0 },
      section80CCD2: { type: Number, default: 0 },
      section80D: { type: Number, default: 0 },
      section80DD: { type: Number, default: 0 },
      section80DDSevere: { type: Boolean, default: false },
      section80DDB: { type: Number, default: 0 },
      section80E: { type: Number, default: 0 },
      section80EE: { type: Number, default: 0 },
      section80EEA: { type: Number, default: 0 },
      section80G: { type: Number, default: 0 },
      section80GG: { type: Number, default: 0 },
      section80GGA: { type: Number, default: 0 },
      section80GGC: { type: Number, default: 0 },
      section80TTA: { type: Number, default: 0 },
      section80TTB: { type: Number, default: 0 },
      section80U: { type: Number, default: 0 },
      section80DSelf: { type: Number, default: 0 },
      section80DParents: { type: Number, default: 0 },
      section80DPreventive: { type: Number, default: 0 },
      section80DPreventiveSelf: { type: Number, default: 0 },
      section80DPreventiveParents: { type: Number, default: 0 },
      section80DMedicalSelf: { type: Number, default: 0 },
      section80DMedicalParents: { type: Number, default: 0 },
      section80DSelfSenior: { type: Boolean, default: false },
      section80DParentsSenior: { type: Boolean, default: false },
      section80DDBReimbursed: { type: Number, default: 0 },
      section80G50: { type: Number, default: 0 },
      section80G100Limited: { type: Number, default: 0 },
      section80G50Limited: { type: Number, default: 0 },
      section80EStartYear: { type: Number, default: 0 },
      section24: { type: Number, default: 0 }, // Home loan interest
      standardDeduction: { type: Number, default: 50000 },
      professionalTax: { type: Number, default: 0 },
      otherDeductions: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    // Line-wise declarations from employee ESS (admin UI uses declaredDeductions totals)
    investments80C: [
      {
        investmentType: { type: String, trim: true, default: '' },
        amount: { type: Number, default: 0, min: 0 },
        attachment: { type: String, trim: true, default: '' },
      },
    ],
    investments80D: [
      {
        investmentType: { type: String, trim: true, default: '' },
        amount: { type: Number, default: 0, min: 0 },
        attachment: { type: String, trim: true, default: '' },
      },
    ],
    // Full ESS IT declaration (rent, loan, toggles, other lines) — round-trip for UI; aggregates sync into declaredDeductions
    itDeclaration: {
      stayingInRentedHouse: { type: Boolean, default: false },
      rentEntries: [
        {
          fromDate: { type: String, trim: true, default: '' },
          toDate: { type: String, trim: true, default: '' },
          rentMonthly: { type: Number, default: 0, min: 0 },
          rentAnnual: { type: Number, default: 0, min: 0 },
          address: { type: String, trim: true, default: '' },
          landlordName: { type: String, trim: true, default: '' },
          urbanizationType: { type: String, trim: true, default: '' },
          urbanizationType2: { type: String, trim: true, default: '' },
          isMetroCity: { type: Boolean, default: false },
          attachment: { type: String, trim: true, default: '' },
        },
      ],
      homeLoanSelfOccupied: {
        enabled: { type: Boolean, default: false },
        principalPaid: { type: Number, default: 0, min: 0 },
        interestPaid: { type: Number, default: 0, min: 0 },
        lenderName: { type: String, trim: true, default: '' },
        lenderPAN: { type: String, trim: true, default: '' },
        attachment: { type: String, trim: true, default: '' },
      },
      letOutPropertyEnabled: { type: Boolean, default: false },
      letOutPropertyAttachment: { type: String, trim: true, default: '' },
      investmentsOther: [
        {
          investmentType: { type: String, trim: true, default: '' },
          amount: { type: Number, default: 0, min: 0 },
          attachment: { type: String, trim: true, default: '' },
        },
      ],
      otherIncomeBreakdown: {
        incomeFromOtherSources: { type: Number, default: 0, min: 0 },
        interestSavings: { type: Number, default: 0, min: 0 },
        interestFD: { type: Number, default: 0, min: 0 },
        interestNSC: { type: Number, default: 0, min: 0 },
        attachment: { type: String, trim: true, default: '' },
      },
      toggles: {
        section80C: { type: Boolean, default: true },
        section80D: { type: Boolean, default: true },
        otherInvestments: { type: Boolean, default: false },
      },
      chapterVIA: {
        section80CCC: { type: Number, default: 0, min: 0 },
        section80CCD1: { type: Number, default: 0, min: 0 },
        section80CCD1B: { type: Number, default: 0, min: 0 },
        section80CCD2: { type: Number, default: 0, min: 0 },
        section80DD: { type: Number, default: 0, min: 0 },
        section80DDSevere: { type: Boolean, default: false },
        section80DDB: { type: Number, default: 0, min: 0 },
        section80EE: { type: Number, default: 0, min: 0 },
        section80EEA: { type: Number, default: 0, min: 0 },
        section80GG: { type: Number, default: 0, min: 0 },
        section80GGA: { type: Number, default: 0, min: 0 },
        section80GGC: { type: Number, default: 0, min: 0 },
        section80TTA: { type: Number, default: 0, min: 0 },
        section80G50: { type: Number, default: 0, min: 0 },
        section80G100Limited: { type: Number, default: 0, min: 0 },
        section80G50Limited: { type: Number, default: 0, min: 0 },
        section80EStartYear: { type: Number, default: 0, min: 0 },
        section80DParents: { type: Number, default: 0, min: 0 },
        section80DPreventive: { type: Number, default: 0, min: 0 },
        section80DMedicalSelf: { type: Number, default: 0, min: 0 },
        section80DMedicalParents: { type: Number, default: 0, min: 0 },
        section80DSelfSenior: { type: Boolean, default: false },
        section80DParentsSenior: { type: Boolean, default: false },
      },
      salaryExemptions: {
        childrenCount: { type: Number, default: 0, min: 0 },
        childrenEducationReceived: { type: Number, default: 0, min: 0 },
        hostelAllowanceReceived: { type: Number, default: 0, min: 0 },
        ltaEligibleTravel: { type: Number, default: 0, min: 0 },
        disabledTransportReceived: { type: Number, default: 0, min: 0 },
        gratuityReceived: { type: Number, default: 0, min: 0 },
        leaveEncashmentReceived: { type: Number, default: 0, min: 0 },
        retrenchmentReceived: { type: Number, default: 0, min: 0 },
        vrsReceived: { type: Number, default: 0, min: 0 },
        officialDutySpent: { type: Number, default: 0, min: 0 },
        lifeInsuranceExempt: { type: Number, default: 0, min: 0 },
      },
    },
    // Exemptions
    hraExemption: {
      actualHRA: { type: Number, default: 0 },
      rentPaid: { type: Number, default: 0 },
      basic: { type: Number, default: 0 },
      rentMinusTenPercent: { type: Number, default: 0 },
      percentOfBasic: { type: Number, default: 0 },
      isMetro: { type: Boolean, default: false },
      exemptAmount: { type: Number, default: 0 },
    },
    section10Exemptions: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Tax Calculation
    taxableIncome: { type: Number, default: 0 },
    taxPayable: {
      incomeTax: { type: Number, default: 0 },
      surcharge: { type: Number, default: 0 },
      surchargeRate: { type: Number, default: 0 },
      cess: { type: Number, default: 0 },
      cessRate: { type: Number, default: 4 },
      total: { type: Number, default: 0 },
      slabBreakdown: [
        {
          incomeFrom: { type: Number, default: 0 },
          incomeTo: { type: Number, default: 0 },
          rate: { type: Number, default: 0 },
          taxableAmount: { type: Number, default: 0 },
          tax: { type: Number, default: 0 },
        },
      ],
    },
    rebateApplicable: { type: Boolean, default: false },
    rebateAmount: { type: Number, default: 0 },
    // Month-by-month salary counted from Effective From through 31 March
    incomeBreakdown: {
      monthlyGross: { type: Number, default: 0 },
      equivalentMonths: { type: Number, default: 0 },
      salaryIncome: { type: Number, default: 0 },
      otherIncome: { type: Number, default: 0 },
      loanPerquisite: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      months: [
        {
          label: { type: String, default: '' },
          daysInMonth: { type: Number, default: 0 },
          applicableDays: { type: Number, default: 0 },
          excludedBefore: { type: Number, default: 0 },
          partial: { type: Boolean, default: false },
          amount: { type: Number, default: 0 },
        },
      ],
    },
    // Monthly TDS used on the salary slip (implementation date → 31 March)
    monthlyTDS: { type: Number, default: 0 },
    tdsPeriod: {
      start: { type: Date, default: null },
      end: { type: Date, default: null },
      equivalentMonths: { type: Number, default: 12 },
      payrollImplementationDate: { type: Date, default: null },
      payrollScheduleDate: { type: Date, default: null },
      joiningDate: { type: Date, default: null },
      startDateSource: { type: String, default: '' },
      openingMonth: {
        label: { type: String, default: '' },
        daysInMonth: { type: Number, default: 0 },
        applicableDays: { type: Number, default: 0 },
        excludedBefore: { type: Number, default: 0 },
        countedFrom: { type: Number, default: 0 },
        countedTo: { type: Number, default: 0 },
      },
    },
    // Full financial year (1 Apr–31 Mar) shown beside the actual figure
    fullYearComparison: {
      gross: { type: Number, default: 0 },
      totalIncome: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      hraExemption: { type: Number, default: 0 },
      taxableIncome: { type: Number, default: 0 },
      taxPayable: { type: Number, default: 0 },
      monthlyTDS: { type: Number, default: 0 },
      periodStart: { type: Date, default: null },
      periodEnd: { type: Date, default: null },
    },
    // Monthly Breakup
    monthlyDeductions: [
      {
        month: String,
        year: Number,
        tdsDeducted: Number,
        payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun' },
      },
    ],
    // Total TDS deducted till date
    totalTDSDeducted: { type: Number, default: 0 },
    // Per-line proof review. Requested stays the employee's original amount.
    // Accepted is written back onto the declaration and is what TDS uses.
    proofItems: [
      {
        lineKey: { type: String, trim: true, default: '' },
        sectionName: { type: String, trim: true, default: '' },
        deductionHead: { type: String, trim: true, default: '' },
        requestedAmount: { type: Number, default: 0, min: 0 },
        acceptedAmount: { type: Number, default: 0, min: 0 },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        remark: { type: String, trim: true, default: '' },
      },
    ],
    // Proof submission status
    proofSubmitted: { type: Boolean, default: false },
    proofVerified: { type: Boolean, default: false },
    proofStatus: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      default: 'pending',
    },
    proofRemarks: { type: String, trim: true, default: '' },
    proofReviewedBy: { type: String, trim: true, default: '' },
    proofReviewedAt: { type: Date, default: null },
    // Lock status (after proof verification)
    isLocked: { type: Boolean, default: false },
    // Employee TDS list shows this row only after admin clicks Calculate TDS
    adminCalculated: { type: Boolean, default: false },
    // Set true on save and false when the employee deletes it. Missing means an older saved declaration.
    hasInvestmentDeclaration: { type: Boolean },
  },
  { timestamps: true }
);

// Index for quick lookups
employeeTDSSchema.index({ employeeId: 1, financialYear: 1 }, { unique: true });

module.exports = employeeTDSSchema;
