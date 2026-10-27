const mongoose = require('mongoose');
const { Schema } = mongoose;


const holidaySchema = new mongoose.Schema({
    holidayName: {
        type: String
    },
    location: { type: Schema.Types.ObjectId, ref: 'Organization' },
    date: {
        type: Date
    },
    description: {
        type: String
    },
    type: {
        type: String,
        enum: ['Public', 'Company', 'Optional', 'weekoff'],
        default: 'Public'
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Employee'
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
}, {
    timestamps: true
});

module.exports = holidaySchema;
