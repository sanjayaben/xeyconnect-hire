const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  client: {
    type: String,
    required: true,
    enum: ['Bourque Logistics (BL)', 'Industrial Networks (INET)', 'Tank and Container Management Systems (TCMS)']
  },
  workflow: {
    type: String,
    required: true,
    enum: ['workflow1', 'workflow2', 'workflow3']
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  jobDescription: {
    type: String,
    required: true
  },
  jobDescriptionFile: {
    filename: String,
    path: String,
    mimetype: String
  },
  numberOfPositions: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Campaign', campaignSchema);
