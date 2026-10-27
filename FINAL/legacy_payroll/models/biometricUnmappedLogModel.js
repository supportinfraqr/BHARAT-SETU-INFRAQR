const mongoose = require('mongoose');

/**
 * Main DB — ATTLOG received from a serial that is not registered yet.
 * Reprocessed when the device is registered.
 */
const biometricUnmappedLogSchema = new mongoose.Schema(
  {
    serialNumber: { type: String, required: true, index: true, trim: true },
    tableName: { type: String, default: 'ATTLOG' },
    body: { type: String, default: '' },
    processed: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BiometricUnmappedLog', biometricUnmappedLogSchema);
