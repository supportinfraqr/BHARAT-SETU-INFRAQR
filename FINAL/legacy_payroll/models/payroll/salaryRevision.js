const mongoose = require('mongoose');

// Salary Revision Model - Track salary changes
const salaryRevisionSchema = new mongoose.Schema(
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
    revisionType: {
      type: String,
      enum: ['increment', 'promotion', 'adjustment', 'new_joiner', 'annual_hike'],
      required: true,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    // Old Salary Structure
    oldSalary: {
      ctc: { type: Number, default: 0 },
      grossSalary: { type: Number, default: 0 },
      basicSalary: { type: Number, default: 0 },
      components: [
        {
          componentName: String,
          amount: Number,
        },
      ],
      componentOverrides: [
        {
          category: {
            type: String,
            enum: ['earnings', 'deductions', 'benefits', 'reimbursements'],
          },
          code: String,
          name: String,
          overrideAmount: Number,
          disabled: { type: Boolean, default: false },
        },
      ],
    },
    // New Salary Structure
    newSalary: {
      ctc: { type: Number, required: true },
      grossSalary: { type: Number, required: true },
      basicSalary: { type: Number, required: true },
      components: [
        {
          componentName: String,
          amount: Number,
        },
      ],
      componentOverrides: [
        {
          category: {
            type: String,
            enum: ['earnings', 'deductions', 'benefits', 'reimbursements'],
          },
          code: String,
          name: String,
          overrideAmount: Number,
          disabled: { type: Boolean, default: false },
        },
      ],
      defaultComponents: [
        {
          category: {
            type: String,
            enum: ['earnings', 'deductions', 'benefits', 'reimbursements'],
          },
          code: String,
          name: String,
          componentName: String,
          amount: Number,
        },
      ],
    },
    // Increment Details
    incrementAmount: { type: Number, default: 0 },
    incrementPercentage: { type: Number, default: 0 },
    // Arrears Calculation
    arrearsApplicable: { type: Boolean, default: false },
    arrearsFromDate: Date,
    arrearsToDate: Date,
    arrearsAmount: { type: Number, default: 0 },
    arrearsPaid: { type: Boolean, default: false },
    // Bulk Excel statutory toggles (only keys present in file are set)
    statutoryApplicability: {
      epfApplicable: { type: Boolean },
      pfOnActuals: { type: Boolean },
      esiApplicable: { type: Boolean },
      lwfApplicable: { type: Boolean },
      ptApplicable: { type: Boolean },
    },
    // Approval Workflow
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'implemented'],
      default: 'pending',
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvals: [
      {
        employeeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee',
          default: null,
        },
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
    implementedDate: Date,
    remarks: String,
    state: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// Index for querying
salaryRevisionSchema.index({ employeeId: 1, effectiveFrom: -1 });
salaryRevisionSchema.index({ organizationId: 1, status: 1 });

module.exports = salaryRevisionSchema;
