const mongoose = require('mongoose');
const { Schema } = mongoose;

const preResignationSchema = new Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    resignationDate: { type: Date, default: Date.now },
    concernType: {
        type: [String],
        enum: ['Workload', 'Compensation', 'Work Environment', 'Managerial Issues', 'Growth', 'Personal', 'Others'],
        default: []
    },
    description: { type: String },
    preferredModeOfDiscussion: { type: String, enum: ['Virtual', 'In-person', 'Email'] },
    contactWith: { type: String, trim: true, default: '' },
    suggestedMeetingDate: { type: Date },
    interviewDetails: [
        {
            name: { type: String },
            date: { type: Date, required: true },
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

    followbackMessage: [{
        date: { type: Date, default: Date.now },
        title: { type: String },
        description: { type: String },
    }
    ],
    resolutionStatus: {
        type: String,
        enum: ['Pending', 'Resolved', 'Partially Resolved', 'Unresolved'],
        default: 'Pending',
    },
    nextSteps: {
        type: String,
        enum: ['Continue Employment', 'Proceed with Resignation']
    }
}, { timestamps: true });

module.exports = preResignationSchema;
