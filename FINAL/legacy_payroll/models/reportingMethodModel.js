const mongoose = require("mongoose");
const { Schema } = mongoose;

const LocationSchema = new Schema(
  {
    name: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radiusMeters: { type: Number },
    radiusKm: { type: Number }
  },
  { _id: false }
);

const ReportingMethodSchema = new Schema(
  {
    name: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },

    // Type of reporting: 'geofencing', 'ipRestriction', 'self', 'none'
    type: {
      type: String,
      enum: ["geofencing", "ipRestriction", "none"],
      default: "none"
    },

    // Active/Inactive status
    isActive: {
      type: Boolean,
      default: true
    },

    // For geo-fencing validation
    locations: [LocationSchema],

    // For IP restriction validation
    allowedIps: [String],


    // Optional: Channel restrictions
    allowedChannels: {
      web: { type: Boolean, default: true },
      mobile: { type: Boolean, default: true },
      biometric: { type: Boolean, default: true },
      excel: { type: Boolean, default: false }
    },

    // Optional: Auto-detection and absence settings
    // autoDetect: { type: Boolean, default: false },
    // autoAbsent: { type: Boolean, default: false },
    // gpsRequired: { type: Boolean, default: false },

    // Employees assigned to this reporting method
    employees: [{ type: Schema.Types.ObjectId, ref: "Employee" }]
  },
  { timestamps: true }
);

module.exports = ReportingMethodSchema;
