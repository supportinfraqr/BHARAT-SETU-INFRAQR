const mongoose = require('mongoose');
const { Schema } = mongoose;

const EventSchema = new mongoose.Schema({
    eventName: {
        type: String,
    },
    description: {
        type: String,
    },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    date: {
        type: Date,
    },
    type: {
        type: String,
    },
    status: {
        type: String,
        enum: ['Scheduled', 'Completed', 'Cancelled'],
        default: 'Scheduled',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
    },
}, { timestamps: true });

module.exports = EventSchema;
