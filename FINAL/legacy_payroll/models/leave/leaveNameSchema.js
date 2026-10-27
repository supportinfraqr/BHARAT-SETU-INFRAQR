const mongoose = require('mongoose');
const { Schema } = mongoose;

const leaveNameSchema = new Schema({
    name: { type: String },
    code: String,
    shortName: String,
    isSystemGenerated: { type: Boolean, default: false },
    description: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },


}, { timestamps: true });

module.exports = leaveNameSchema;
