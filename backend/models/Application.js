const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  candidateName: {
    type: String,
    required: true,
    trim: true
  },
  candidateEmail: {
    type: String,
    required: true,
    trim: true
  },
  resume: {
    filename: String,
    path: String,
    mimetype: String
  },
  status: {
    type: String,
    enum: ['Applied', 'Shortlisted', 'Rejected'],
    default: 'Applied'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewDate: {
    type: Date
  },
  remarks: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Application', applicationSchema);
