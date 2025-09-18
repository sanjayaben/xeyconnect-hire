const mongoose = require('mongoose');

const panelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  availability: [{
    date: {
      type: Date,
      required: true
    },
    timeSlots: [{
      startTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format validation
      },
      endTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format validation
      },
      isBooked: {
        type: Boolean,
        default: false
      },
      bookedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workflow'
      },
      bookedAt: {
        type: Date
      }
    }]
  }],
  recurringAvailability: [{
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6 // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    },
    timeSlots: [{
      startTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      endTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      slotDuration: {
        type: Number,
        default: 60 // Duration in minutes
      }
    }]
  }],
  timezone: {
    type: String,
    default: 'UTC'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Panel', panelSchema);
