const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const passwordChangeLogSchema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    organizationName: { type: String, default: '' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'SystemUser', default: null, index: true },
    performedByName: { type: String, default: '' },
    performedByEmail: { type: String, default: '' },
    performedByEmployeeId: { type: Schema.Types.ObjectId, default: null },
    employeeId: { type: Schema.Types.ObjectId, required: true, index: true },
    employeeName: { type: String, default: '' },
    employeeEmail: { type: String, default: '' },
    status: {
        type: String,
        enum: ['success', 'warning', 'failed'],
        required: true,
    },
    emailSent: { type: Boolean, default: false },
    message: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
}, {
    timestamps: true,
});

passwordChangeLogSchema.index({ createdAt: -1 });

module.exports = passwordChangeLogSchema;
