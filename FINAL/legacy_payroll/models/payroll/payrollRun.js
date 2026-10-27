const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema(
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
    month: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },

    // Earnings breakdown
    earnings: [
      {
        componentName: String,
        fixedAmount: Number,
        amount: Number,
        calculationType: String,
        componentId: { type: mongoose.Schema.Types.ObjectId },
      },
    ],

    // Deductions breakdown
    deductions: [
      {
        componentName: String,
        fixedAmount: Number,
        amount: Number,
        calculationType: String,
        componentId: { type: mongoose.Schema.Types.ObjectId },
      },
    ],

    // Benefits breakdown
    benefits: [
      {
        componentName: String,
        fixedAmount: Number,
        amount: Number,
        calculationType: String,
        componentId: { type: mongoose.Schema.Types.ObjectId },
      },
    ],

    // Reimbursements
    reimbursements: [
      {
        componentName: String,
        amount: Number,
        calculationType: String,
        claimId: { type: mongoose.Schema.Types.ObjectId },
      },
    ],

    // Summary amounts
    grossEarnings: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    netPay: {
      type: Number,
      default: 0,
    },

    // Employer-side contributions (CTC components, not employee deductions)
    employerContributions: {
      epf: { type: Number, default: 0 },
      edli: { type: Number, default: 0 },
      adminCharges: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      lwf: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    // EPF audit trail for the month (for PF returns / reconciliation)
    epfDetails: {
      applicable: { type: Boolean, default: false },
      epfWage: { type: Number, default: 0 },
      employeeRate: { type: Number, default: 0 },
      employerRate: { type: Number, default: 0 },
      ceilingApplied: { type: Boolean, default: true },
      effectiveCeiling: { type: Number, default: 0 },
      abryApplied: { type: Boolean, default: false },
      overrideUsed: { type: Boolean, default: false },
    },

    // ESI audit trail (for ESIC returns)
    esiDetails: {
      applicable: { type: Boolean, default: false },
      wageUsed: { type: Number, default: 0 },
      employeeRate: { type: Number, default: 0 },
      employerRate: { type: Number, default: 0 },
      wageLimit: { type: Number, default: 0 },
      includeEmployerInCtc: { type: Boolean, default: true },
    },

    // Professional Tax audit trail (state-wise PT returns)
    ptDetails: {
      applicable: { type: Boolean, default: false },
      stateUsed: { type: String, default: '' },
      ptNumber: { type: String, default: '' },
      cycle: { type: String, default: 'monthly' },
      amount: { type: Number, default: 0 },
    },

    // Labour Welfare Fund audit trail
    lwfDetails: {
      applicable: { type: Boolean, default: false },
      stateUsed: { type: String, default: '' },
      cycle: { type: String, default: 'half-yearly' },
      employeeShare: { type: Number, default: 0 },
      employerShare: { type: Number, default: 0 },
    },

    // Statutory Bonus payment audit trail
    bonusDetails: {
      applicable: { type: Boolean, default: false },
      amount: { type: Number, default: 0 },
      cycle: { type: String, default: 'yearly' },
      paymentMonth: { type: String, default: '' },
      calcBase: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },

    // Attendance data for the month
    workingDays: {
      type: Number,
      default: 26,
    },
    presentDays: {
      type: Number,
      default: 26,
    },
    absentDays: {
      type: Number,
      default: 0,
    },
    lopDays: {
      type: Number,
      default: 0,
    },

    // Pay status
    payStatus: {
      type: String,
      enum: ['pending', 'processed', 'approved', 'rejected', 'on_hold', 'paid'],
      default: 'pending',
    },

    // Processing metadata
    processedDate: {
      type: Date,
    },
    approvedDate: {
      type: Date,
    },
    paidDate: {
      type: Date,
    },
    paymentMode: {
      type: String,
      enum: ['bank_transfer', 'cash', 'cheque'],
    },
    transactionId: String,

    // Remarks
    remarks: String,
  },
  { timestamps: true }
);

// Create compound index to prevent duplicate payroll for same employee/month/year
payrollRunSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

module.exports = payrollRunSchema;
