const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttendancePolicySchema = new Schema({
    name: { type: String, required: true },
    displayName: String,

    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },

    isActive: { type: Boolean, default: true },

    /* ---- LATE / EARLY ---- */
    lateMarkRuleEnabled: {
        type: Boolean,
        default: false
    },
    lateMarkMinutes: {
        type: Number,
        default: 0
    },
    earlyExitRuleEnabled: {
        type: Boolean,
        default: false
    },
    earlyExitMinutes: {
        type: Number,
        default: 0
    },

    autoHalfDayFromLate: {
        type: Boolean,
        default: false
    },
    autoHalfDayLateMinutesThreshold: {
        type: Number,
        default: 0
    },
    autoHalfDayFromEarlyExit: {
        type: Boolean,
        default: false
    },
    earlyExitToHalfDayMinutesThreshold: {
        type: Number,
        default: 0
    },

    /* ---- PUNCH WINDOW ---- */
    punchRelaxation: {
        beforeShiftMinutes: { type: Number, default: 0 },
        afterShiftMinutes: { type: Number, default: 0 }
    },

    /* ---- OVERTIME ---- */
    overtimeAllowed: {
        type: Boolean,
        default: false
    },
    overtimeStartAfterMinutes: {
        type: Number,
        default: 0
    },
    overtimeMaxHoursPerDay: {
        type: Number,
        default: 4
    },
    overtimeApprovalRequired: {
        type: Boolean,
        default: false
    },
    overtimeCalculationType: {
        type: String,
        enum: ["daily", "weekly"],
        default: "daily"
    },

    /* ---- ABSENT / MISSING ---- */
    missingCheckoutAction: {
        type: String,
        enum: ["autoCheckout", "missingCheckout"],
        default: "autoCheckout"
    },

    autoAbsentEnabled: {
        type: Boolean,
        default: false
    },
    allowSinglePunchPresent: {
        type: Boolean,
        default: false
    },

    /* ---- WORK TYPES ---- */
    wfhAllowed: Boolean,
    wfhRequiresApproval: Boolean,
    maxWfhDaysPerMonth: Number,

    odAllowed: Boolean,
    odRequiresApproval: Boolean,

    /* ---- HOLIDAY / WEEK OFF ---- */
    holidayWorkingPolicy: {
        type: String,
        enum: ["doubleWages", "compOff", "overtime", "normal"],
        default: "normal"
    },

    weeklyOffWorkingPolicy: {
        type: String,
        enum: ["doubleWages", "compOff", "overtime", "ignore"],
        default: "ignore"
    },

    /* ---- LEAVE ---- */
    sandwichRule: Boolean,

    /* ---- SECURITY ---- */
    gpsValidationRequired: Boolean,
    autoAbsentIfOutsideGeo: Boolean,
    blockMockLocation: Boolean,

    employees: [{ type: Schema.Types.ObjectId, ref: "Employee" }]
}, { timestamps: true });


module.exports = AttendancePolicySchema;

