const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const systemUserSchema = new Schema({
    systemUserEmail: { type: String, required: true },
    systemUserPassword: { type: String, required: true },
    systemUserName: { type: String, default: '' },
    systemUserStatus: { type: Boolean, default: true },
    systemUserResetPassword: { type: String, default: '' },
    systemUserAccessTokenKey: { type: String, default: '' },
    systemUserResetPasswordExpires: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpLastSent: { type: Date, default: null },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    linkSystemUser: [
        {
            organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
            employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
            status: { type: Boolean, default: true },
            adminLoginLock: { type: Boolean, default: false },
            createDatetime: { type: Date, default: Date.now },
            lastAccessDate: { type: Date, default: Date.now },
            databaseName: { type: Schema.Types.ObjectId, ref: 'Organization' },
            organizationName: { type: String, default: '' },
        }
    ],
    createOrg: [
        {
            organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
            databaseName: { type: Schema.Types.ObjectId, ref: 'Organization' },
            organizationName: { type: String, default: '' },
            createDatetime: { type: Date, default: Date.now },
            lastAccessDate: { type: Date, default: Date.now },
            status: { type: Boolean, default: true },

        }
    ],
}, {
    timestamps: true,
});

// Create the model class
const ModelClass = mongoose.model('SystemUser', systemUserSchema);

// Export the model
module.exports = ModelClass;
