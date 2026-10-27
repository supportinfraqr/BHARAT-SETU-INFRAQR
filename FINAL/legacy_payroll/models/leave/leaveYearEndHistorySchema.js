const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeaveYearEndHistorySchema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    year: { type: Number, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },

    history: [{
        leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
        carriedForward: { type: Number, required: true },
        encashed: { type: Number, required: true },
        lapsed: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
}, {
    timestamps: true
});

module.exports = LeaveYearEndHistorySchema;

