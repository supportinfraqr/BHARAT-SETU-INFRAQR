const mongoose = require('mongoose');

const fullAndFinalSchema = new mongoose.Schema(
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
    resignationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resignation',
    },
    lastWorkingDate: {
      type: Date,
      required: true,
    },
    settlementDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['initiated', 'pending', 'approved', 'finalized', 'paid', 'rejected'],
      default: 'initiated',
    },

    // Salary Components
    salaryDues: {
      unpaidSalary: { type: Number, default: 0 },
      workingDaysInLastMonth: { type: Number, default: 0 },
      proratedSalary: { type: Number, default: 0 },
      basicSalary: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      formula: { type: String, default: '' },
    },

    // Leave Encashment
    leaveEncashment: {
      availableLeaves: { type: Number, default: 0 },
      encashableLeaves: { type: Number, default: 0 },
      perDayRate: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      method: { type: String, default: 'basic_26' },
      basicSalary: { type: Number, default: 0 },
      grossSalary: { type: Number, default: 0 },
      formula: { type: String, default: '' },
    },

    // Bonus & Incentives
    bonusIncentives: {
      performanceBonus: { type: Number, default: 0 },
      statutoryBonus: { type: Number, default: 0 },
      incentives: { type: Number, default: 0 },
      commission: { type: Number, default: 0 },
      method: { type: String, default: '' },
      formula: { type: String, default: '' },
      monthsCounted: { type: Number, default: 0 },
      calcBase: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      eligible: { type: Boolean, default: false },
    },

    // Reimbursements Pending
    pendingReimbursements: {
      travel: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
    },

    // Deductions
    deductions: {
      noticePeriodShortfall: { type: Number, default: 0 },
      loansAdvances: { type: Number, default: 0 },
      companyAssetRecovery: { type: Number, default: 0 },
      damageLoss: { type: Number, default: 0 },
      overtimeTaken: { type: Number, default: 0 },
      otherDeductions: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
    },

    // Gratuity
    gratuity: {
      isEligible: { type: Boolean, default: false },
      yearsOfService: { type: Number, default: 0 },
      completedYears: { type: Number, default: 0 },
      lastDrawnSalary: { type: Number, default: 0 },
      gratuityAmount: { type: Number, default: 0 },
      formula: { type: String, default: '' },
      reason: { type: String, default: '' },
      capped: { type: Boolean, default: false },
    },

    // Tax Deductions
    taxDeductions: {
      tds: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      totalTax: { type: Number, default: 0 },
    },

    // Final Calculations
    totalPayables: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPayable: { type: Number, default: 0 },

    // Payment Details
    paymentDetails: {
      paymentMode: {
        type: String,
        enum: ['bank_transfer', 'cheque', 'cash'],
      },
      paymentDate: Date,
      transactionId: String,
      bankAccountNumber: String,
      ifscCode: String,
    },

    // Approvals
    approvals: [
      {
        approverName: String,
        approverRole: String,
        approvedDate: Date,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        comments: String,
      },
    ],

    // Documents
    documents: [
      {
        documentType: String,
        documentUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    remarks: String,
    finalizedAt: Date,
  },
  { timestamps: true }
);

module.exports = fullAndFinalSchema;
