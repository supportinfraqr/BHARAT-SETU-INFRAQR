const mongoose = require("mongoose");

const componentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String },
  description: String,
  type: {
    type: String,
    enum: ["earning", "deduction", "benefit", "reimbursement"],
    required: true,
  },
  calculationType: {
    type: String,
    enum: ["fixed", "variable", "percentage"],
    default: "fixed",
  },
  value: { type: Number, default: 0 },
  basedOn: {
    type: String,
    enum: ["basic", "gross", "ctc", "manual", "none"],
    default: "none",
  },
  considerForEPF: { type: Boolean, default: false },
  considerForESI: { type: Boolean, default: false },
  calculateOnProRata: { type: Boolean, default: false },
  taxable: { type: Boolean, default: true },
  frequency: {
    type: String,
    enum: ["one-time", "recurring", "monthly", "yearly"],
    default: "monthly",
  },
  paymentMonth: {
    type: String,
    default: "",
  },
  maxLimit: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
});

const salaryCompensationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    category: {
      type: String,
      enum: ["earnings", "deductions", "benefits", "reimbursements"],
      required: true,
    },
    components: [componentSchema],
  },
  { timestamps: true }
);

module.exports = salaryCompensationSchema;
