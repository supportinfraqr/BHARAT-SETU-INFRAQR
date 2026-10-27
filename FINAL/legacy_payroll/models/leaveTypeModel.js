const mongoose = require('mongoose');
const { Schema } = mongoose;


const leaveTypeSchema = new Schema({
    leaveName: { type: String, required: true, unique: true, trim: true },
    leaveDescription: { type: String, default: '', trim: true },
    leaveType: {
        type: String,
        enum: ['Paid', 'Unpaid', 'On Duty'],
        default: 'Paid',
    },
    creditDays: { type: Number, default: 0, min: 0 },
    monthlyAllowed: { type: Number, default: 0, min: 0 },
    typeOfLeave: {
        type: String,
        enum: ['Monthly', 'Yearly', 'Special'],
        default: 'Yearly',
    },
    yearFormat: {
        type: String,
        enum: ['financial', 'calendarYear'],
        default: 'calendarYear',
    },
    reassign: { type: Boolean, default: false },
    reassignFrequency: {
        type: String,
        enum: ['Monthly', 'Yearly', 'None'],
        default: 'None',
    },
    sandwich: { type: Boolean, default: false },
    carryForward: { type: Boolean, default: false },
    carryForwardLimit: { type: Number, default: 0, min: 0 },
    encashed: { type: Boolean, default: false },
    encashedDays: { type: Number, default: 0, min: 0 },
    validityStart: { type: Date, default: null },
    validityEnd: { type: Date, default: null },
    advancedLeave: { type: Boolean, default: false },
    advancedDayLimit: { type: Number, default: 0, min: 0 },
    status: { type: Boolean, default: true },
    applicableTo: {
        type: String,
        enum: ['All', 'Department', 'Organization', 'Employee', 'Custom', 'none'],
        default: 'none'
    },
    customFilters: {
        departments: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
        organizations: [{ type: Schema.Types.ObjectId, ref: 'Organization' }],
        employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
        notAssignEmployee: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    },
    genderRestrictions: {
        type: [String],
        enum: ['All', 'Male', 'Female', 'Other'],
        default: ['All'],
    },
    restrictedDays: {
        type: [String],
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        default: [],
    },
}, {
    timestamps: true,
});


module.exports = leaveTypeSchema