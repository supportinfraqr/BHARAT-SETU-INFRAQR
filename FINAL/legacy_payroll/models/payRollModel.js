const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },
    calculationType: { type: String, enum: ['Flat', 'Proportional'] },

    // Payroll period
    payrollMonth: { type: Number, required: true },
    payrollYear: { type: Number, required: true }, 

    // Attendance & Working Days
    totalWorkingDays: { type: Number, required: true },
    daysPresent: { type: Number, required: true },
    daysAbsent: { type: Number, default: 0 },
    leavesTaken: { type: Number, default: 0 }, // paid leaves
    unpaidLeaves: { type: Number, default: 0 },

    // Calculations
    grossEarnings: { type: Number },
    totalDeductions: { type: Number },
    netPay: { type: Number },

    // Status
    status: { type: String, enum: ['Processed', 'Pending'], default: 'Pending' },

    generatedOn: { type: Date, default: Date.now }
},
    {
        timestamps: true
    });

module.exports = payrollSchema;
