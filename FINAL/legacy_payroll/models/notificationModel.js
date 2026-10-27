const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },

    // MULTIPLE SELECT ENUM
    type: [{
        type: String,
        enum: ['global', 'ess', 'admin', 'hr', 'none'],
        default: 'none'
    }],

    title: { type: String },
    message: { type: String },

    status: { type: String, enum: ["unread", "read"], default: "unread" }
}, {
    timestamps: true
});

module.exports = notificationSchema;
