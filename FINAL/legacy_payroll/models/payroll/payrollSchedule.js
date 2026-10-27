const mongoose = require('mongoose');

const payrollScheduleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    payFrequency: {
      type: String,
      enum: ['monthly', 'bi-weekly', 'weekly', 'semi-monthly'],
      default: 'monthly',
      required: true,
    },

    workingDays: [
      {
        type: String,
        enum: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
      },
    ],

    payDay: {
      type: String,
      required: true,
      default: '7',
    },

    // Payroll implementation date. TDS is calculated from this date
    // through 31 March of the current financial year.
    firstPayPeriod: {
      type: Date,
      required: true,
    },

    upcomingPayrolls: [
      {
        period: String,
        payDate: Date,
      },
    ],

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    // Auto payroll on pay day (cron)
    autoProcessEnabled: {
      type: Boolean,
      default: true,
    },

    // HH:mm 24h — e.g. "13:00"
    autoProcessTime: {
      type: String,
      default: '13:00',
      trim: true,
    },

    lastAutoRunAt: { type: Date, default: null },
    lastAutoRunKey: { type: String, default: '' }, // e.g. "2026-Jul"
    lastAutoRunStatus: { type: String, default: '' },
    lastAutoRunMessage: { type: String, default: '' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = payrollScheduleSchema;
