const mongoose = require('mongoose');
const { Schema } = mongoose;

const leaveBalanceSchema = new mongoose.Schema({
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
    },
    leaveTypeId: {
        type: Schema.Types.ObjectId,
        ref: 'LeaveType',
        required: true,
    },
    totalDays: { type: Number, default: 0 },
    usedDays: { type: Number, default: 0 },
    balanceDays: { type: Number, default: 0 },
    encashedDays: { type: Number, default: 0 },
    advancedDays: { type: Number, default: 0 },
    lapsDays: { type: Number, default: 0 },
    carriedForwardDays: { type: Number, default: 0 },
    yearFormat: {
        type: String,
        enum: ['financial', 'calendarYear'],
        default: 'calendarYear'
    },
    year: {
        type: Number,
    },

    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    status: { type: Boolean, default: true },
}, {
    timestamps: true
});


module.exports = leaveBalanceSchema;
