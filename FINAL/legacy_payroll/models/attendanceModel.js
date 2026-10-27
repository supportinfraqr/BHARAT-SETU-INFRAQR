const mongoose = require('mongoose');
const { Schema } = mongoose;

const attendanceSchema = new mongoose.Schema({
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    checkIn: {
        type: Date
    },
    checkOut: {
        type: Date
    },
    breaks: [{
        breakIn: { type: Date },
        breakOut: { type: Date }
    }],
    totalHoursWorked: {
        type: Number
    },
    trackStatus: {
        type: String,
        enum: ['checkIn', 'checkOut', 'breakIn', 'null'],
        default: 'null'
    },
    arrivalStatus: {
        type: String,
        enum: ['onTime', 'late'],
        default: 'onTime'
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'HalfDay', 'Leave', 'On Duty', 'Lwp'],
        default: 'Present'
    },
    isHalfDay: { type: Boolean, default: false },
    checkOutMissing: { type: Boolean, default: false },
    overtimeHours: {
        type: Number,
        default: 0
    },
    overtimeApproved: { type: Boolean, default: false },
    reportingChannel: {
        type: String,
        enum: ['web', 'mobile', 'biometric', 'excel'],
        default: 'web'
    },
    regularized: {
        type: Boolean,
        default: false
    },
    regularizationRequestId: {
        type: Schema.Types.ObjectId,
        ref: 'RegularizationRequest'
    },
    remarks: {
        type: String
    },
    eodReport: {
        type: String,
        trim: true,
        default: ''
    },
    eodSubmittedAt: {
        type: Date
    },
    eodSkipped: {
        type: Boolean,
        default: false
    },
    eodUpdatedAt: {
        type: Date
    }
}, { timestamps: true });

module.exports = attendanceSchema;

