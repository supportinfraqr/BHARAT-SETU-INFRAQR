const mongoose = require('mongoose');


const statutoryComplianceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    // ----- EPF -----
    epf: {
      isEnabled: { type: Boolean, default: false },
      epfNumber: String,
      deductionCycle: { type: String, default: "monthly" },
      employeeContributionRate: { type: Number, default: 12 },
      employerContributionRate: { type: Number, default: 12 },
      restrictedPfWage: { type: Number, default: 15000 },
      contributionPreferences: {
        employerPfContribution: { type: Boolean, default: true },
        edliContribution: { type: Boolean, default: false },
        adminCharges: { type: Boolean, default: false },
      },
      allowEmployeeLevelOverride: { type: Boolean, default: false },
      eligibleForAbryScheme: { type: Boolean, default: false },
      proRateRestrictedPfWage: { type: Boolean, default: true },
      considerSalaryBasedOnLOP: { type: Boolean, default: true },
      considerAllPfComponentsAfterLopBelowCeiling: { type: Boolean, default: true },
    },

    // ----- ESI -----
    esi: {
      isEnabled: { type: Boolean, default: false },
      esiNumber: String,
      deductionCycle: { type: String, default: "monthly" },
      employeeContributionRate: { type: Number, default: 0.75 },
      employerContributionRate: { type: Number, default: 3.25 },
      wageLimit: { type: Number, default: 21000 },
      includeEmployerInSalaryStructure: { type: Boolean, default: true },
    },

    // ----- Professional Tax -----
    professionalTax: {
      isEnabled: { type: Boolean, default: false },
      deductionCycle: {
        type: String,
        enum: ['monthly', 'half-yearly'],
        default: 'monthly',
      },
      states: [
        {
          stateName: String,
          ptNumber: String,
          isApplicable: { type: Boolean, default: true },
          ptSlabs: [
            {
              salaryRangeFrom: Number,
              salaryRangeTo: Number,
              taxAmount: Number,
            },
          ],
        },
      ],
    },

    // ----- Labour Welfare Fund -----
    labourWelfareFund: {
      isEnabled: { type: Boolean, default: false },
      deductionCycle: { type: String, default: "half-yearly" }, // monthly | half-yearly | yearly
      // Optional org-level months (fallback when state.months empty). Short: Jan..Dec
      months: [{ type: String }],
      states: [
        {
          stateName: String,
          // Per-slab cycle; months derived from this when months[] empty
          deductionCycle: {
            type: String,
            enum: ["monthly", "half-yearly", "yearly"],
            default: "half-yearly",
          },
          // Deduction months: yearly uses periodFrom; half-yearly uses both.
          periodFrom: { type: String, default: "Jun" },
          periodTo: { type: String, default: "Dec" },
          minAmount: Number,
          maxAmount: mongoose.Schema.Types.Mixed, // Number or "" (no ceiling)
          // fixed = absolute ₹ amount; percentage = % of gross
          calculationType: {
            type: String,
            enum: ["fixed", "percentage"],
            default: "fixed",
          },
          employeeShare: Number, // ₹ when fixed, % when percentage
          employerShare: Number, // ₹ when fixed, % when percentage
          // Months when LWF is deducted for this state (e.g. ["Jun", "Dec"])
          months: [{ type: String }],
          isApplicable: { type: Boolean, default: true }, // legacy checkbox
          status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
          },
        },
      ],
    },

    // ----- Statutory Bonus -----
    statutoryBonus: {
      isEnabled: { type: Boolean, default: false },
      paymentCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'yearly',
      },
      paymentMonth: { type: String, default: "October" },
      percentage: { type: Number, default: 8.33 },
      minimumBonusWage: { type: Number, default: 7000 },
      eligibilityCeiling: { type: Number, default: 21000 },
      states: [
        {
          stateName: String,
          minWage: Number,
          formulaBase: {
            type: String,
            enum: ["minimumWage", "basicAndDA"],
            default: "minimumWage",
          },
          wageCategories: [
            {
              employmentCategory: {
                type: String,
                enum: ["skilled", "semiSkilled", "unskilled"],
              },
              minWage: Number,
              effectiveFrom: { type: String, default: "" },
            },
          ],
        },
      ],
    },
  },
  { timestamps: true }
);

// export default mongoose.model("StatutoryCompliance", statutoryComplianceSchema);

module.exports = statutoryComplianceSchema;
