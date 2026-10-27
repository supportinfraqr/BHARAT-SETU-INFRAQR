const mongoose = require('mongoose');

const componentOverrideSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['earnings', 'deductions', 'benefits', 'reimbursements'],
    },
    code: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    overrideAmount: { type: Number, default: null },
    disabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const salaryComponentAmountSchema = new mongoose.Schema(
  {
    componentName: { type: String, trim: true, default: '' },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const defaultComponentSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['earnings', 'deductions', 'benefits', 'reimbursements'],
    },
    code: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    componentName: { type: String, trim: true, default: '' },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const salaryRevisionImportRowSchema = new mongoose.Schema(
  {
    rowNumber: { type: Number, default: 0 },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    employeeCode: { type: String, trim: true, default: '' },
    employeeName: { type: String, trim: true, default: '' },
    revisionType: { type: String, trim: true, default: '' },
    effectiveFrom: { type: Date, default: null },
    baseSalary: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    // Kept for drafts created before gross salary became the primary import input.
    grossSalaryInput: { type: Number, default: null },
    ctcInput: { type: Number, default: null },
    state: { type: String, trim: true, default: '' },
    taxRegime: { type: String, trim: true, default: '' },
    paymentFrequency: { type: String, trim: true, default: '' },
    arrearsApplicable: { type: Boolean, default: false },
    arrearsFromDate: { type: Date, default: null },
    autoApprove: { type: Boolean, default: false },
    autoImplement: { type: Boolean, default: false },
    remarks: { type: String, trim: true, default: '' },
    employeeComponentOverrides: [componentOverrideSchema],
    excelComponentOverrides: [componentOverrideSchema],
    defaultComponents: [defaultComponentSchema],
    oldSalary: {
      ctc: { type: Number, default: 0 },
      grossSalary: { type: Number, default: 0 },
      basicSalary: { type: Number, default: 0 },
      components: [salaryComponentAmountSchema],
      componentOverrides: [componentOverrideSchema],
    },
    newSalary: {
      ctc: { type: Number, default: 0 },
      grossSalary: { type: Number, default: 0 },
      basicSalary: { type: Number, default: 0 },
      components: [salaryComponentAmountSchema],
      componentOverrides: [componentOverrideSchema],
      defaultComponents: [defaultComponentSchema],
    },
    incrementAmount: { type: Number, default: 0 },
    incrementPercentage: { type: Number, default: 0 },
    arrearsAmount: { type: Number, default: 0 },
    plannedStatus: { type: String, trim: true, default: 'pending' },
    warnings: [{ type: String }],
    valid: { type: Boolean, default: false },
    error: { type: String, default: '' },
    revisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryRevision', default: null },
    appliedStatus: { type: String, trim: true, default: '' },
    // Excel statutory toggles — must persist on draft so confirm can apply them
    statutoryFlags: {
      epfApplicable: { type: Boolean },
      pfOnActuals: { type: Boolean },
      esiApplicable: { type: Boolean },
      lwfApplicable: { type: Boolean },
      ptApplicable: { type: Boolean },
    },
    revisionTypeLabel: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const payrollSalaryRevisionImportSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    importBatchId: { type: String, required: true, trim: true },
    fileName: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'cancelled'],
      default: 'draft',
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    confirmedAt: { type: Date, default: null },
    rows: [salaryRevisionImportRowSchema],
    summary: {
      totalRows: { type: Number, default: 0 },
      validRows: { type: Number, default: 0 },
      invalidRows: { type: Number, default: 0 },
      revisionsCreated: { type: Number, default: 0 },
      approved: { type: Number, default: 0 },
      implemented: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

payrollSalaryRevisionImportSchema.index({ organizationId: 1, status: 1 });
payrollSalaryRevisionImportSchema.index({ importBatchId: 1 }, { unique: true });

module.exports = payrollSalaryRevisionImportSchema;
