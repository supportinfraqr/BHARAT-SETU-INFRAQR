const mongoose = require('mongoose');
const { Schema } = mongoose;

// Position Schema
const positionSchema = new Schema(
    {
        name: { type: String, required: true, unique: true },
        level: { type: Number },
        parent: { type: Schema.Types.ObjectId, ref: 'Position', default: null },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
        employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
        description: { type: String },
    },
    { timestamps: true }
);

module.exports = positionSchema;
