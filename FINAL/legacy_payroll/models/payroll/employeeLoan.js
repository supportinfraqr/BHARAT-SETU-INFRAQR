const mongoose = require('mongoose');

const employeeLoanSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    loanNumber: {
      type: String,
      trim: true,
    },
    loanTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanType',
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    loanAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    disbursementDate: {
      type: Date,
      required: true,
    },
    paidThroughAccount: {
      type: String,
      trim: true,
      default: '',
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    exemptFromPerquisite: {
      type: Boolean,
      default: false,
    },
    emiStartDate: {
      type: Date,
      required: true,
    },
    installmentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalInstallments: {
      type: Number,
      required: true,
      min: 1,
    },
    lastInstallmentAmount: {
      type: Number,
      min: 0,
    },
    paidInstallments: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'cancelled'],
      default: 'active',
    },
    closedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

employeeLoanSchema.index({ organizationId: 1, loanNumber: 1 }, { unique: true, sparse: true });
employeeLoanSchema.index({ organizationId: 1, employeeId: 1 });
employeeLoanSchema.index({ organizationId: 1, loanTypeId: 1 });
employeeLoanSchema.index({ organizationId: 1, status: 1 });

module.exports = employeeLoanSchema;
