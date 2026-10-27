const mongoose = require('mongoose');
const { Schema } = mongoose;

const biometricPunchLogSchema = new Schema(
  {
    serialNumber: { type: String, required: true, index: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'BiometricDevice', default: null },
    pin: { type: String, required: true, index: true },
    punchTime: { type: Date, required: true, index: true },
    statusCode: { type: String, default: '' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    attendanceId: { type: Schema.Types.ObjectId, ref: 'Attendance', default: null },
    action: {
      type: String,
      enum: ['checkIn', 'checkOut', 'duplicate', 'unmapped', 'skipped', 'extra'],
      default: 'skipped'
    },
    message: { type: String, default: '' },
    raw: { type: String, default: '' }
  },
  { timestamps: true }
);

biometricPunchLogSchema.index({ serialNumber: 1, pin: 1, punchTime: 1 }, { unique: true });

module.exports = biometricPunchLogSchema;
