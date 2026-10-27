const mongoose = require('mongoose');
const { Schema } = mongoose;

const leaveBalanceSchema = new mongoose.Schema({
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    leaveTypeId: {
        type: Schema.Types.ObjectId,
        ref: 'LeaveType',
        required: true
    },

    periodType: {
        type: String,
        enum: ['monthly', 'yearly'],
        required: true
    },

    year: {
        type: Number,
        required: true
    },

    month: {
        type: Number, // 1–12, only for monthly
        min: 1,
        max: 12
    },

    startDate: Date,
    endDate: Date,

    totalDays: { type: Number, default: 0 },
    usedDays: { type: Number, default: 0 },
    balanceDays: { type: Number, default: 0 },
    carriedForwardDays: { type: Number, default: 0 },
    lapsDays: { type: Number, default: 0 },
    encashedDays: { type: Number, default: 0 },
    advancedDays: { type: Number, default: 0 },

    status: { type: Boolean, default: true }
}, { timestamps: true });


module.exports = leaveBalanceSchema;
