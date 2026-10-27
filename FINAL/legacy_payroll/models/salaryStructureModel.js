const mongoose = require('mongoose');
const { Schema } = mongoose;

const salaryStructureSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        grossSalary: { type: Number, required: true, min: 0 },
        basicSalary: {
            totalAmount: { type: Number, default: 0 },
            calculationType: { type: String, enum: ['Flat', 'Formula'], required: true },
            amount: { type: Number, default: 0 },
            formula: { type: String },
            showOnPayslip: { type: Boolean, default: true },
            attendanceBased: { type: Boolean, default: false },
        },
        earnings: [
            {
                totalAmount: { type: Number, default: 0 },
                headName: { type: String, required: true },
                calculationType: { type: String, enum: ['Flat', 'Formula'], required: true },
                amount: { type: Number, default: 0 },
                formula: { type: String },
                calculationBase: { type: String, enum: ['base', 'gross'], default: 'base' },
                showOnPayslip: { type: Boolean, default: true },
                attendanceBased: { type: Boolean, default: false },
            },
        ],
        deductions: [
            {
                totalAmount: { type: Number, default: 0 },
                headName: { type: String, required: true },
                calculationType: { type: String, enum: ['Flat', 'Formula'], required: true },
                amount: { type: Number, default: 0 },
                formula: { type: String },
                calculationBase: { type: String, enum: ['base', 'gross'], default: 'base' },
                showOnPayslip: { type: Boolean, default: true },
                attendanceBased: { type: Boolean, default: false },
            },
        ],
        allowances: [
            {
                totalAmount: { type: Number, default: 0 },
                headName: { type: String, required: true },
                calculationType: { type: String, enum: ['Flat', 'Formula'], required: true },
                amount: { type: Number, default: 0 },
                formula: { type: String },
                calculationBase: { type: String, enum: ['base', 'gross'], default: 'base' },
                showOnPayslip: { type: Boolean, default: true },
                attendanceBased: { type: Boolean, default: false },
            },
        ],
        compliances: [
            {
                totalAmount: { type: Number, default: 0 },
                headName: { type: String, required: true },
                calculationType: { type: String, enum: ['Flat', 'Formula'], required: true },
                amount: { type: Number, default: 0 },
                formula: { type: String },
                calculationBase: { type: String, enum: ['base', 'gross'], default: 'base' },
                showOnPayslip: { type: Boolean, default: true },
                attendanceBased: { type: Boolean, default: false },
            },
        ],
        employees: [{
            type: Schema.Types.ObjectId,
            ref: 'Employee'
        }],
        effectiveFrom: { type: Date, default: Date.now },
        grossEarnings: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
        totalAllowances: { type: Number, default: 0 },
        totalCompliances: { type: Number, default: 0 },
        netPay: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = salaryStructureSchema;
