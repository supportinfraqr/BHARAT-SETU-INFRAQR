const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
    {
        name: { type: String, },
        format: { type: String },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    },
    { timestamps: true }
);

module.exports = templateSchema;
