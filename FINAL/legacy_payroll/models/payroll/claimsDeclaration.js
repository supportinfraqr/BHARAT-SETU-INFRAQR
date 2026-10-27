const mongoose = require('mongoose');

const reimbursementClaimSchema = new mongoose.Schema(
  {
    headId: { type: mongoose.Schema.Types.ObjectId },
    headName: String,
    headCode: String,
    claimNo: String,
    /** Same id for all lines created in one submit (multi-head form) */
    claimGroupId: String,
    name: String,
    type: String,
    claimDate: Date,
    billNo: String,
    particulars: String,
    claimedAmount: Number,
    approvedAmount: Number,
    proofUrl: String,
    description: String,
    employeeComments: String,
    attachmentUrls: { type: [String], default: [] },
    submittedOn: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    includedInPayrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRun',
    },
  },
  { _id: true }
);

const claimsDeclarationSchema = new mongoose.Schema(
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

    flexibleBenefitPlan: [
      {
        componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryCompensation' },
        componentName: String,
        amount: Number,
        month: String,
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      },
    ],

    reimbursements: {
      type: [reimbursementClaimSchema],
      default: [],
    },

    incomeTaxDeclarations: [
      {
        section: String,
        subSection: String,
        amountDeclared: Number,
        amountApproved: Number,
      },
    ],

    investmentProofs: [
      {
        declarationId: String,
        fileUrl: String,
        verifiedBy: String,
        status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
      },
    ],
  },
  { timestamps: true }
);

module.exports = claimsDeclarationSchema;
