const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrganizationSchema = new Schema({
    organizationName: { type: String, required: true, trim: true },
    domainName: { type: String, default: '' },
    brn: { type: String, default: '', trim: true },
    gst: { type: String, default: '', trim: true },
    industryId: { type: Number, default: 0 },
    industry: { type: String, default: '' },
    systemUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    sideId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    foundedDate: { type: Date, default: Date.now },
    lastOrgAccessed: { type: Date, default: Date.now },
    taxId: { type: String, default: '' },
    organizationType: { type: String, default: '' },
    logo: { type: String, default: '' },
    status: { type: Boolean, default: true },
    organizationIcon: { type: String, default: '' },
    organizationAddress: {
        address1: { type: String, default: '', trim: true },
        address2: { type: String, default: '', trim: true },
        city: { type: String, default: '', trim: true },
        state: { type: String, default: '', trim: true },
        country: { type: String, default: '', trim: true },
        zip: { type: String, default: '', trim: true },
        timezone: { type: String, default: 'UTC', trim: true },
        lng: { type: String, default: '', trim: true },
        lat: { type: String, default: '', trim: true }
    },
    contactDetails: [{
        contactPerson: { type: String, default: '', trim: true },
        contactNo: { type: String, default: '' },
        mobile: { type: String, default: '' },
        website: { type: String, default: '', trim: true }
    }],
    email: { type: String, required: true, unique: true, trim: true },
    sendGridEmail: { type: String, trim: true },
    sendEmailConfig: {
        provider: {
            type: String,
            enum: ['gmail', 'outlook', 'office365', 'yahoo', 'iCloud', 'Zoho Mail', 'ProtonMail', 'AOL Mail', 'GMX', 'Yandex', 'FastMail'],
            default: 'gmail'
        },
        email: { type: String },
        appPassword: { type: String, default: null },
        status: { type: Boolean, default: false },
    },
    phoneNumber: { type: String, default: '', trim: true },
    registrationDate: { type: Date, default: Date.now },
    employeesCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    orgPolicy: {
        geoAttendance: {
            lng: { type: String, default: '', trim: true },
            lat: { type: String, default: '', trim: true },
            allowDistance: { type: Number, default: 0 },
            isValid: { type: Boolean, default: false }

        },
        attendanceLateTime: { type: Number, default: 0 }
    }
}, {
    timestamps: true,
});

module.exports = OrganizationSchema;
