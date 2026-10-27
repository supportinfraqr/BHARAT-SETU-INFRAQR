const mongoose = require('mongoose');

// Arrears Model - Handle salary arrears/corrections
const arrearsSchema = new mongoose.Schema(
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
    arrearsType: {
      type: String,
      enum: ['salary_revision', 'correction', 'bonus', 'incentive', 'allowance', 'other'],
      required: true,
    },
    // Period for which arrears apply
    periodFrom: {
      month: String,
      year: Number,
    },
    periodTo: {
      month: String,
      year: Number,
    },
    // Components
    components: [
      {
        componentName: String,
        oldAmount: Number,
        newAmount: Number,
        difference: Number,
        months: Number,
        totalArrears: Number,
      },
    ],
    // Totals
    totalArrearsAmount: {
      type: Number,
      required: true,
    },
    tdsOnArrears: {
      type: Number,
      default: 0,
    },
    netArrearsPayable: {
      type: Number,
      default: 0,
    },
    // Which payroll month should include this arrears on the salary slip
    payInMonth: String,
    payInYear: Number,
    // Payment Details
    status: {
      type: String,
      enum: ['calculated', 'approved', 'paid', 'rejected'],
      default: 'calculated',
    },
    paidInMonth: String,
    paidInYear: Number,
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRun',
    },
    paidDate: Date,
    // Reference
    salaryRevisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryRevision',
    },
    remarks: String,
  },
  { timestamps: true }
);

// Index
arrearsSchema.index({ employeeId: 1, status: 1 });
arrearsSchema.index({ organizationId: 1, status: 1 });
arrearsSchema.index({ organizationId: 1, status: 1, payInMonth: 1, payInYear: 1 });

module.exports = arrearsSchema;
