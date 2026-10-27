const mongoose = require('mongoose');
const { Schema } = mongoose;

const shiftSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  shortName: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  breakDuration: {
    type: Number,
    default: 0
  },
  compulsoryWorkHours: {
    type: Number, // Stored as minutes (e.g., 450 for 07:30)
    min: 0
  },
  excludeBreakFromWorkingHours: {
    type: Boolean,
    default: true
  },

  // Half Day Settings
  allowHalfDay: {
    type: Boolean,
    default: false
  },

  firstHalfOffSecondHalfStartAt: {
    type: String // HH:mm
  },

  secondHalfOffFirstHalfEndAt: {
    type: String // HH:mm
  },

  employees: [{
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  }
  ],
  weeklyOff: {
    firstWeek: {
      days: [{
        type: String,
        enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      }]
    },
    secondWeek: {
      days: [{
        type: String,
        enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      }]
    },
    thirdWeek: {
      days: [{
        type: String,
        enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      }]
    },
    fourthWeek: {
      days: [{
        type: String,
        enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      }]
    },
    fifthWeek: {
      days: [{
        type: String,
        enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      }]
    }
  }

}, { timestamps: true });


module.exports = shiftSchema;



