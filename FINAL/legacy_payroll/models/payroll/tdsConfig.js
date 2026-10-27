const mongoose = require('mongoose');

// TDS Configuration Model - Income Tax Slabs & Deductions
const tdsConfigSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    financialYear: {
      type: String,
      required: true,
    },
    // Income Tax Slabs (New Regime & Old Regime)
    taxRegime: {
      type: String,
      enum: ['old', 'new'],
      default: 'new',
    },
    // New Tax Regime Slabs (FY 2025-26)
    newRegimeSlabs: [
      {
        incomeFrom: { type: Number, required: true },
        incomeTo: { type: Number, required: true },
        taxRate: { type: Number, required: true }, // in percentage
      },
    ],
    // Old Tax Regime Slabs — below 60, 60–79, and 80+
    oldRegimeSlabs: [
      {
        incomeFrom: { type: Number, required: true },
        incomeTo: { type: Number, required: true },
        taxRate: { type: Number, required: true },
      },
    ],
    oldRegimeSlabsSenior: [
      {
        incomeFrom: { type: Number, required: true },
        incomeTo: { type: Number, required: true },
        taxRate: { type: Number, required: true },
      },
    ],
    oldRegimeSlabsSuperSenior: [
      {
        incomeFrom: { type: Number, required: true },
        incomeTo: { type: Number, required: true },
        taxRate: { type: Number, required: true },
      },
    ],
    // Standard Deduction (new regime default for FY 2025-26+)
    standardDeduction: {
      type: Number,
      default: 75000,
    },
    standardDeductionOld: {
      type: Number,
      default: 50000,
    },
    // Section 80C Limit
    section80CLimit: {
      type: Number,
      default: 150000,
    },
    // Surcharge & Cess. surchargeSlabs = new regime (25% cap above ₹5 crore).
    // surchargeSlabsOld = old regime (37% above ₹5 crore).
    surchargeSlabs: [
      {
        incomeFrom: Number,
        incomeTo: Number,
        surchargeRate: Number,
      },
    ],
    surchargeSlabsOld: [
      {
        incomeFrom: Number,
        incomeTo: Number,
        surchargeRate: Number,
      },
    ],
    healthEducationCess: {
      type: Number,
      default: 4, // 4% on income tax + surcharge
    },
    // Rebate under Section 87A (new regime defaults)
    rebateLimit: {
      type: Number,
      default: 1200000,
    },
    rebateAmount: {
      type: Number,
      default: 60000,
    },
    rebateLimitOld: {
      type: Number,
      default: 500000,
    },
    rebateAmountOld: {
      type: Number,
      default: 12500,
    },
    // Deduction and Section 10 caps. Null on an optional head means no cap.
    exemptionLimits: {
      section80D: { type: Number, default: 100000 },
      section80DSelf: { type: Number, default: 25000 },
      section80DSenior: { type: Number, default: 50000 },
      section80DPreventive: { type: Number, default: 5000 },
      section80E: { type: Number, default: null },
      section80G: { type: Number, default: null },
      section80CCD1Percent: { type: Number, default: 10 },
      section80CCD1B: { type: Number, default: 50000 },
      section80CCD2Percent: { type: Number, default: 14 },
      section80CCD2PercentOld: { type: Number, default: 10 },
      section80DD: { type: Number, default: 75000 },
      section80DDSevere: { type: Number, default: 125000 },
      section80DDB: { type: Number, default: 40000 },
      section80DDBSenior: { type: Number, default: 100000 },
      section80EE: { type: Number, default: 50000 },
      section80EEA: { type: Number, default: 150000 },
      section80GGMonthly: { type: Number, default: 5000 },
      section80GGA: { type: Number, default: null },
      section80GGC: { type: Number, default: null },
      section80TTA: { type: Number, default: 10000 },
      section80TTB: { type: Number, default: 50000 },
      section80U: { type: Number, default: 75000 },
      section80USevere: { type: Number, default: 125000 },
      section24: { type: Number, default: 200000 },
      otherDeductions: { type: Number, default: null },
      childrenEducationPerMonth: { type: Number, default: 100 },
      childrenEducationMaxChildren: { type: Number, default: 2 },
      childrenEducationAnnualCap: { type: Number, default: 2400 },
      hostelPerMonth: { type: Number, default: 300 },
      hostelMaxChildren: { type: Number, default: 2 },
      hostelAnnualCap: { type: Number, default: 7200 },
      lta: { type: Number, default: null },
      disabledTransportPerMonth: { type: Number, default: 3200 },
      gratuity: { type: Number, default: 2000000 },
      leaveEncashment: { type: Number, default: 2500000 },
      retrenchment: { type: Number, default: 500000 },
      vrs: { type: Number, default: 500000 },
      officialDuty: { type: Number, default: null },
      lifeInsurance: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

module.exports = tdsConfigSchema;
