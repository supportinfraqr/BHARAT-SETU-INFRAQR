const mongoose = require('mongoose');
const { Schema } = mongoose;

const leaveReasonSchema = new Schema({
  reason: { type: String},
  description: String,
  leaveNameId: { type: Schema.Types.ObjectId, ref: 'LeaveName' },
  isSystemGenerated: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = leaveReasonSchema;