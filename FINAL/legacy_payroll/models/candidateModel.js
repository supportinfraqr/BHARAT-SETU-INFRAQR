const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        appliedFor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            required: true,
        },
        resume: {
            type: String,
        },
        experience: {
            type: Number,
            min: 0,
        },
        skills: [
            {
                type: String,
                trim: true,
            },
        ],
        hiringProcess: { type: String },
        hiringStage: {
            type: [String],
            default: ['Applied'],
        },
        status: {
            type: String,
            enum: ['Applied', 'In Review', 'Interview Scheduled', 'Hired', 'Rescheduled', 'Shortlisted', 'Rejected', 'Offer Accepted', 'Offer Extended', 'PostPoned', 'Offer Rejected', 'Onboarding'],
            default: 'Applied',
        },
        declinedReason: {
            type: String,
            enum: ['','Salary/Benefites', 'CareerGrowth', 'CounterOffer', 'PersonalReasons', 'ProcessIssues', 'Others'],
            required: false,
        },
        statusDate: { type: Date },
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
                    enum: ['Scheduled', 'reScheduled', 'Completed', 'Canceled'],
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
        notes: {
            type: String,
        },
        documents: [{
            name: { type: String },
            url: { type: String },
        }],
        documentsBox: [
            {
                name: { type: String },
            }
        ],
        uploadTokenExpiry: { type: Date },
        bgvVerification: {
            type: String,
            enum: ['Pending', 'Reject', 'Verified', 'Under Review'],
        },
        bgvUplodeDate: { type: Date },
    },
    {
        timestamps: true,
    }
);

module.exports = candidateSchema;
