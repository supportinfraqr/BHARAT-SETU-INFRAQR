const mongoose = require("mongoose");
const { Schema } = mongoose;

const RegularizationRequestSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },

  employeeId: {
    type: Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },

  categoryId: {
    type: Schema.Types.ObjectId,
    ref: "SystemUserCategory",
    required: true
  },

  regularizationMethodId: {
    type: Schema.Types.ObjectId,
    ref: "RegularizationMethod",
    required: true
  },

  type: {
    type: String,
    enum: ["OD", "MP", "FID", "OT"],
    required: true
  },

  attendanceDate: {
    type: Date,
    required: true
  },

  reason: {
    type: String,
    required: true
  },

  documentUrl: String,

  // OD Specific Fields
  odDetails: {
    location: String,
    purpose: String,
    startTime: Date,
    endTime: Date,
    isFullDay: Boolean
  },

  // MP Specific Fields
  mpDetails: {
    missingPunchType: {
      type: String,
      enum: ["checkIn", "checkOut", "both"]
    },
    actualCheckIn: Date,
    actualCheckOut: Date
  },

  // FID Specific Fields
  fidDetails: {
    actualCheckIn: Date,
    actualCheckOut: Date,
    witnessName: String,
    witnessContact: String
  },

  // OT Specific Fields
  otDetails: {
    overtimeHours: Number,
    overtimeMinutes: Number,
    overtimeReason: String,
    preApproved: Boolean,
    preApprovedBy: { type: Schema.Types.ObjectId, ref: "Employee" }
  },

  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Cancelled"],
    default: "Pending"
  },

  appliedAt: {
    type: Date,
    default: Date.now
  },

  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: "Employee"
  },

  approvedAt: Date,

  rejectionReason: String
}, { timestamps: true });

module.exports = RegularizationRequestSchema;
