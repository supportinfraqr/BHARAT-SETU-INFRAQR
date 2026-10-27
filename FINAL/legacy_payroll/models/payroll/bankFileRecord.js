const mongoose = require('mongoose');

const bankFileRecordSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, trim: true },
    format: { type: String, enum: ['CSV', 'NEFT', 'RTGS', 'UNKNOWN'], default: 'UNKNOWN' },
    month: { type: String, default: '' },
    year: { type: Number, default: null },
    totalAmount: { type: Number, default: 0 },
    employeeCount: { type: Number, default: 0 },
    status: { type: String, default: 'generated' },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    content: { type: Buffer, required: true },
  },
  {
    timestamps: true,
  }
);

module.exports = bankFileRecordSchema;
