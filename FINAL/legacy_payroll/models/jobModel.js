const mongoose = require('mongoose');
const { Schema } = mongoose;

const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    responsibilities: { type: String },
    requirements: { type: String },
    skills: [{ type: String }],
    employmentType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
        required: true
    },
    location: { type: Schema.Types.ObjectId, ref: 'Organization' },
    remoteAllowed: { type: Boolean, default: false },
    experienceLevel: { type: String, enum: ['Fresher', 'Mid-level', 'Senior'] },
    education: { type: String },
    salaryRange: { min: Number, max: Number },
    experienceYears: { type: String },
    status: { type: String, enum: ['Open', 'Close', 'Draft'], default: 'Open' },
    postedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    hiringManager: { type: Schema.Types.ObjectId, ref: 'Employee' },
    hiringDepartment: { type: Schema.Types.ObjectId, ref: 'Department' },
    position: { type: Number, default: 0 },
    genderPreference:{ type: String },
    tat:{ type: Number, default: 0 },
    budgetedData:[],
    hiringPosition:{ type: String },
    hiringProcess: [{
        stage: { type: String },
        description: { type: String },
        isCompleted: { type: Boolean, default: false }
    }],

    questions: [{
        questionText: { type: String },
        level: { type: String },

    }],
    candidates: [{
        type: Schema.Types.ObjectId,
        ref: 'Candidate'
    }]
}, {
    timestamps: true
});

module.exports = jobSchema;
