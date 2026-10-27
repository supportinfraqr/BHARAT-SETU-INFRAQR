const mongoose = require('mongoose');

const loanRepaymentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeLoan',
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    repaymentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    repaymentDate: {
      type: Date,
      required: true,
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque'],
      required: true,
    },
    depositToAccount: {
      type: String,
      trim: true,
      default: '',
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    repaymentType: {
      type: String,
      enum: ['manual', 'payroll'],
      default: 'manual',
    },
    payrollMonth: {
      type: String,
      trim: true,
      default: null,
    },
    payrollYear: {
      type: Number,
      default: null,
    },
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRun',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

loanRepaymentSchema.index({ organizationId: 1, loanId: 1, repaymentDate: -1 });
loanRepaymentSchema.index({ organizationId: 1, employeeId: 1 });
loanRepaymentSchema.index(
  { organizationId: 1, loanId: 1, repaymentType: 1, payrollMonth: 1, payrollYear: 1 },
  { unique: true, partialFilterExpression: { repaymentType: 'payroll' } }
);

module.exports = loanRepaymentSchema;
