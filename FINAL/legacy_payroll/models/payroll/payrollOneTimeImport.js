const mongoose = require('mongoose');

const oneTimeImportRowSchema = new mongoose.Schema(
  {
    rowNumber: { type: Number, default: 0 },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    employeeCode: { type: String, trim: true, default: '' },
    employeeName: { type: String, trim: true, default: '' },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    componentCode: { type: String, trim: true, default: '' },
    componentName: { type: String, trim: true, default: '' },
    amount: { type: Number, default: 0 },
    remarks: { type: String, trim: true, default: '' },
    valid: { type: Boolean, default: false },
    error: { type: String, default: '' },
    isAdHoc: { type: Boolean, default: false },
    matchedOrgComponent: { type: Boolean, default: false },
  },
  { _id: false }
);

const payrollOneTimeImportSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    month: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    importBatchId: { type: String, required: true, trim: true },
    fileName: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'cancelled'],
      default: 'draft',
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    confirmedAt: { type: Date, default: null },
    rows: [oneTimeImportRowSchema],
    summary: {
      totalRows: { type: Number, default: 0 },
      validRows: { type: Number, default: 0 },
      invalidRows: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

payrollOneTimeImportSchema.index(
  { organizationId: 1, month: 1, year: 1, status: 1 },
  { name: 'org_period_status' }
);
payrollOneTimeImportSchema.index({ importBatchId: 1 }, { unique: true });

module.exports = payrollOneTimeImportSchema;
