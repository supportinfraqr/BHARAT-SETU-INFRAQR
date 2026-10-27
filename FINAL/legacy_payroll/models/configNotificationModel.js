const mongoose = require("mongoose");

const NotificationConfigSchema = new mongoose.Schema({
    key: [
        {
            keyName: { type: String, required: true },

            title: { type: String, required: true },

            channels: {
                email: { type: Boolean, default: false },
                inApp: { type: Boolean, default: false },
                inWeb: { type: Boolean, default: false }
            },


            active: { type: Boolean, default: true },
        }
    ]

}, {
    timestamps: true
});

module.exports = mongoose.model("NotificationConfig", NotificationConfigSchema);
