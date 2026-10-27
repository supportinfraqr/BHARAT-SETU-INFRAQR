const mongoose = require('mongoose');

const loanTypeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    loanName: {
      type: String,
      required: true,
      trim: true,
    },
    perquisiteRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

loanTypeSchema.index({ organizationId: 1, loanName: 1 }, { unique: true });

module.exports = loanTypeSchema;
