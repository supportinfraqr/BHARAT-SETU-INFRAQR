const mongoose = require('mongoose');

// Payroll Audit Log - Track all payroll operations
const payrollAuditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'payroll_processed',
        'payroll_approved',
        'payroll_rejected',
        'payroll_paid',
        'payroll_deleted',
        'salary_component_updated',
        'compliance_updated',
        'tds_calculated',
        'claim_approved',
        'claim_rejected',
        'settlement_initiated',
        'settlement_approved',
        'settlement_paid',
        'salary_revision_created',
        'salary_revision_deleted',
      ],
      required: true,
    },
    entityType: {
      type: String,
      enum: ['payroll', 'salary_component', 'compliance', 'tds', 'claim', 'settlement', 'salary_revision'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedByName: String,
    affectedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    affectedEmployeeName: String,
    // Before and after values for tracking changes
    beforeData: {
      type: mongoose.Schema.Types.Mixed,
    },
    afterData: {
      type: mongoose.Schema.Types.Mixed,
    },
    // For payroll specific audit
    payrollDetails: {
      month: String,
      year: Number,
      grossEarnings: Number,
      totalDeductions: Number,
      netPay: Number,
    },
    ipAddress: String,
    userAgent: String,
    remarks: String,
  },
  { timestamps: true }
);

// Indexes for efficient querying
payrollAuditLogSchema.index({ organizationId: 1, createdAt: -1 });
payrollAuditLogSchema.index({ entityId: 1 });
payrollAuditLogSchema.index({ affectedEmployee: 1 });
payrollAuditLogSchema.index({ performedBy: 1 });

module.exports = payrollAuditLogSchema;
