const mongoose = require('mongoose');
const { Schema } = mongoose;

const leaveRequestSchema = new Schema({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    leaveReasonId: { type: Schema.Types.ObjectId, ref: 'LeaveReason', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    sandwich: { type: Boolean, default: false },
    leaveDurationType: {
        type: String,
        enum: ['Full-Day', 'Half-Day', 'Cluster'],
        default: 'Full-Day',
    },
    lastDay: {
        type: String,
        enum: ['Full-Day', 'Half-Day'],
        default: null
    },
    halfDaySession: {
        type: String,
        enum: ['firstHalf', 'secondHalf', null],
        default: null,
    },
    clusterDates: [{
        type: Date,
    }],
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Pending'
    },
    leaveDays: { type: Number, default: 0 },
    advanceDays: { type: Number, default: 0 },
    sandwichApplied: { type: Boolean, default: false },
    sandwichDays: { type: Number, default: 0 },
    totalDaysWithSandwich: { type: Number, default: 0 },
    appliedDate: { type: Date, default: Date.now },
    approvedDate: { type: Date },
    rejectedDate: { type: Date },
    canceledDate: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    comments: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
}, {
    timestamps: true
});


module.exports = leaveRequestSchema;
