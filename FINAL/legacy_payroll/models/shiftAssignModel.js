const mongoose = require('mongoose');
const { Schema } = mongoose;

const shiftAssignModel = new Schema({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift' },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date }
}, { timestamps: true });


module.exports = shiftAssignModel;
