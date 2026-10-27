const mongoose = require('mongoose');

/**
 * Main DB — light copy of Pay Schedule for auto-payroll cron.
 * Minute cron reads only this; tenant DB opens only on match.
 */
const autoPayrollRegistrySchema = new mongoose.Schema(
  {
    org_uuid: { type: String, required: true, unique: true, index: true },
    organizationName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    autoProcessEnabled: { type: Boolean, default: true },
    autoProcessTime: { type: String, default: '13:00' },
    payFrequency: {
      type: String,
      enum: ['monthly', 'bi-weekly', 'weekly', 'semi-monthly'],
      default: 'monthly',
    },
    payDay: { type: String, default: '7' },
    firstPayPeriod: { type: Date, default: null },
    upcomingPayrolls: [
      {
        period: String,
        payDate: Date,
      },
    ],
    lastAutoRunKey: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AutoPayrollRegistry', autoPayrollRegistrySchema);
