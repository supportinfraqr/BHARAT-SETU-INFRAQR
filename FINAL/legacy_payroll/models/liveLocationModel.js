const mongoose = require('mongoose');
const { Schema } = mongoose;

const trailPointSchema = new Schema(
    {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        accuracy: { type: Number, default: null },
        at: { type: Date, default: Date.now }
    },
    { _id: false }
);

const liveLocationSchema = new Schema(
    {
        employeeId: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true
        },
        date: {
            type: String,
            required: true,
            index: true
        },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        accuracy: { type: Number, default: null },
        source: {
            type: String,
            enum: ['web', 'mobile'],
            default: 'web'
        },
        isOnline: { type: Boolean, default: true },
        isCheckedIn: { type: Boolean, default: false },
        lastUpdatedAt: { type: Date, default: Date.now },
        trail: {
            type: [trailPointSchema],
            default: []
        }
    },
    { timestamps: true }
);

liveLocationSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = liveLocationSchema;
