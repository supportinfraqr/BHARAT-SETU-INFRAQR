const mongoose = require('mongoose');

const uniqueIdSchema = new mongoose.Schema({
    name: { type: String },
    value: { type: Number, default: 0 },
}, { timestamps: true });


module.exports = uniqueIdSchema;
