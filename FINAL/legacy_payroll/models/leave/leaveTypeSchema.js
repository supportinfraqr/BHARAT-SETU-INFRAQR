const mongoose = require('mongoose');
const { Schema } = mongoose;


const leaveTypeSchema = new Schema({
  leaveNameId: { type: Schema.Types.ObjectId, ref: 'LeaveName' },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  leaveType: {
    type: String,
    enum: ['Paid', 'Unpaid', 'On Duty'],
    default: 'Paid',
  },
  creditDays: { type: Number, default: 0, min: 0 },
  isUnlimited: { type: Boolean, default: false },
  isSystemGenerated: { type: Boolean, default: false },
  monthlyAllowed: { type: Number, default: 0, min: 0 },
  typeOfLeave: {
    type: String,
    enum: ['Monthly', 'Yearly', 'Special'],
    default: 'Yearly',
  },
  yearFormat: {
    type: String,
    enum: ['financial', 'calendarYear'],
    default: 'calendarYear',
  },
  reassign: { type: Boolean, default: false },
  reassignFrequency: {
    type: String,
    enum: ['Monthly', 'Yearly', 'None'],
    default: 'None',
  },
  sandwich: { type: Boolean, default: false },
  carryForward: { type: Boolean, default: false },
  carryForwardLimit: { type: Number, default: 0, min: 0 },
  encashed: { type: Boolean, default: false },
  encashedDays: { type: Number, default: 0, min: 0 },
  validityStart: { type: Date, default: null },
  validityEnd: { type: Date, default: null },
  advancedLeave: { type: Boolean, default: false },
  advancedDayLimit: { type: Number, default: 0, min: 0 },
  applicableTo: {
    type: String,
    enum: ['All', 'Department', 'Employee', 'Custom', 'none'],
    default: 'none'
  },
  customFilters: {
    departments: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    notAssignEmployee: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
  },
  genderRestrictions: {
    type: [String],
    enum: ['All', 'Male', 'Female', 'Other'],
    default: ['All'],
  },
  restrictedDays: {
    type: [String],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    default: [],
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },

}, {
  timestamps: true,
});


module.exports = leaveTypeSchema