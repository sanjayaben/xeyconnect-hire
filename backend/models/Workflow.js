const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  candidateName: {
    type: String,
    required: true
  },
  currentStage: {
    type: String,
    enum: [
      'Interview 1 - Set up',
      'Interview 1',
      'Technical Test - Set up',
      'Technical Test - Scheduled',
      'Technical Test - Review',
      'Onboarding',
      'Completed',
      'Rejected'
    ],
    default: 'Interview 1 - Set up'
  },
  nextActivityDate: {
    type: Date
  },
  stages: {
    interview1Setup: {
      assignedPanel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Panel'
      },
      scheduledDate: Date,
      scheduledTime: String,
      timeSlotId: {
        type: mongoose.Schema.Types.ObjectId
      },
      meetingLink: String,
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      setupDate: Date
    },
    interview1: {
      conductedDate: Date,
      remarks: String,
      result: {
        type: String,
        enum: ['Select', 'Reject']
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      feedbackLink: String,
      feedbackForm: {
        filename: String,
        path: String,
        mimetype: String
      }
    },
    technicalTestSetup: {
      testPaper: {
        filename: String,
        path: String,
        mimetype: String
      },
      scheduledDate: Date,
      testEvaluators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      notifyCandidate: {
        type: Boolean,
        default: false
      },
      sendAttachmentInNotification: {
        type: Boolean,
        default: false
      },
      setupBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    technicalTest: {
      answerSheet: {
        filename: String,
        path: String,
        mimetype: String
      },
      assignedReviewers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      submittedDate: Date,
      result: {
        type: String,
        enum: ['Select', 'Reject']
      },
      remarks: String,
      resultFile: {
        filename: String,
        path: String,
        mimetype: String
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reviewDate: Date
    },
    onboarding: {
      backgroundCheckDone: {
        type: Boolean,
        default: false
      },
      offerLetterReleased: {
        type: Boolean,
        default: false
      },
      completedDate: Date,
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  },
  candidateDetails: {
    currentSalary: Number,
    expectedSalary: Number,
    noticePeriod: String,
    remarks: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Workflow', workflowSchema);
