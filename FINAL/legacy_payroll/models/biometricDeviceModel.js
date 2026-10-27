const mongoose = require('mongoose');
const { Schema } = mongoose;

const biometricDeviceSchema = new Schema(
  {
    serialNumber: { type: String, required: true, unique: true, trim: true, index: true },
    deviceName: { type: String, required: true, trim: true },
    shortName: { type: String, default: '', trim: true },
    location: { type: String, default: '' },
    deviceType: { type: String, default: 'Attendance + Access' },
    direction: {
      type: String,
      enum: ['alternateInOut', 'in', 'out'],
      default: 'alternateInOut'
    },
    connectionType: { type: String, default: 'Tcp/IP' },
    ipAddress: { type: String, default: '' },
    commKey: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: null },
    lastPunchAt: { type: Date, default: null },
    lastError: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = biometricDeviceSchema;
