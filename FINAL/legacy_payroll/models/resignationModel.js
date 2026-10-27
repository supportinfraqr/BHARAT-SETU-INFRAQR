const mongoose = require('mongoose');
const { Schema } = mongoose;

const resignationSchema = new Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    resignationDate: { type: Date, default: Date.now },
    lastWorkingDay: { type: Date },
    reasonForLeaving: { type: String },
    concernType: {
        type: [String],
        enum: ['Workload', 'Compensation', 'Work Environment', 'Managerial Issues', 'Growth', 'Personal', 'Others'],
        default: []
    },
    description: { type: String },
    exitInterviewDetails: [
        {
            name: { type: String },
            date: { type: Date },
            startTime: { type: Date },
            endTime: { type: Date },
            meetingLink: { type: String },
            panel: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
            feedback: { type: String },
            status: {
                type: String,
                enum: ['Scheduled', 'Rescheduled', 'Completed', 'Canceled'],
                default: 'Scheduled',
            },
        },
    ],
    handoverDetails: {
        pendingTasks: { type: String },
        knowledgeTransfer: { type: String },
        completed: { type: Boolean, default: false },
    },
    approval: [
        {
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
            comments: { type: String },
            date: { type: Date, default: Date.now }
        }
    ],
    earlyResignationRequest: {
        reason: { type: String },
        requested: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending',
        },
    },
    followbackMessage: [{
        date: { type: Date, default: Date.now },
        title: { type: String },
        description: { type: String },
    }
    ],
    actualNoticePeriodDays: { type: Number },
    actualNoticePeriodEnd: { type: Date },
    acceptedNoticePeriodDays: { type: Number },
    acceptedNoticePeriodEnd: { type: Date },
    finalSettlement: {
        duesCleared: { type: Boolean, default: false },
        remarks: { type: String },
    },
       status: {
        type: String,
        enum: ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Completed'],
        default: 'Submitted',
    },
    resignationType: {
        type: String,
        enum: ['Voluntary', 'InVoluntary'],
        default: 'Voluntary',
    }
}, { timestamps: true });

module.exports = resignationSchema;
