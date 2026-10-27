const mongoose = require('mongoose');
const { Schema } = mongoose;

const jobTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    responsibilities: { type: String },
    requirements: { type: String },
    skills: [{ type: String }],
    employmentType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship']
    },
    location: { type: Schema.Types.ObjectId, ref: 'Organization' },
    remoteAllowed: { type: Boolean, default: false },
    experienceLevel: { type: String, enum: ['Fresher', 'Mid-level', 'Senior'] },
    experienceYears: { type: String },
    education: { type: String },
    salaryRange: { min: Number, max: Number },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
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

}, {
    timestamps: true
});

module.exports = jobTemplateSchema;
