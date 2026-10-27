const mongoose = require('mongoose');

/**
 * Main DB — maps device serial number to tenant org_uuid.
 * ADMS requests only send SN, so this lookup runs before opening the tenant DB.
 */
const biometricDeviceRegistrySchema = new mongoose.Schema(
  {
    serialNumber: { type: String, required: true, unique: true, index: true, trim: true },
    org_uuid: { type: String, required: true, index: true },
    deviceName: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BiometricDeviceRegistry', biometricDeviceRegistrySchema);
