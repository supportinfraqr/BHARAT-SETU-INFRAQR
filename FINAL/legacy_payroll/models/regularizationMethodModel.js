// models/RegularizationMethod.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const RegularizationMethodSchema = new Schema({
  name: { type: String, required: true },      // On Duty, Missing Punch, Forgot ID, Overtime
  shortName: { type: String, required: true }, // OD, MP, FID, OT
  
  type: { 
    type: String, 
    enum: ["OD", "MP", "FID", "OT"], 
    required: true 
  }, // Regularization Type

  organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },

  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },

  applicableCategories: [{
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },

    canRaise: Boolean,
    canApprove: Boolean,

    allowPastDaysUpto: Number,        // Max days in past to apply
    maxRequestsPerMonth: Number,      // Monthly limit per employee

    cutOffDay: Number,                // Day of month for cutoff
    graceDays: Number                 // Grace period after cutoff
  }],

  // Type-specific rules
  rules: {
    // OD (On Duty) Rules
    odRules: {
      requireLocation: Boolean,       // GPS location required
      requireProof: Boolean,          // Document proof required
      allowPartialDay: Boolean,       // Half day OD allowed
      markFullDayPresent: Boolean     // Mark full day as present
    },

    // MP (Missing Punch) Rules
    mpRules: {
      allowSinglePunch: Boolean,      // Allow if only one punch missing
      allowBothMissing: Boolean,      // Allow if both punches missing
      useShiftTiming: Boolean,        // Use shift timings for missing punch
      requireManagerApproval: Boolean // Manager approval needed
    },

    // FID (Forgot ID) Rules
    fidRules: {
      allowManualEntry: Boolean,      // Allow manual time entry
      requireWitness: Boolean,        // Witness/proof required
      useShiftTiming: Boolean,        // Use shift timings
      maxHoursPerDay: Number          // Max hours allowed per day
    },

    // OT (Overtime) Rules
    otRules: {
      requirePreApproval: Boolean,    // Pre-approval before OT
      minOvertimeMinutes: Number,     // Minimum OT minutes
      maxOvertimeHours: Number        // Multiplier (e.g., 1.5x, 2x)
    }
  },

  documentRequired: Boolean,
  preventDuplicate: Boolean,
  
  description: String                 // Additional info/instructions
}, { timestamps: true });


module.exports = RegularizationMethodSchema;
