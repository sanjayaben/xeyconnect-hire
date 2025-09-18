const express = require('express');
const { body, validationResult } = require('express-validator');
const Workflow = require('../models/Workflow');
const Application = require('../models/Application');
const Panel = require('../models/Panel');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Get all workflows (activities)
router.get('/', auth, async (req, res) => {
  try {
    const { groupBy } = req.query;
    
    const workflows = await Workflow.find()
      .populate('application', 'candidateName candidateEmail resume')
      .populate('campaign', 'name description')
      .populate('stages.interview1Setup.assignedPanel', 'name members')
      .sort({ nextActivityDate: 1, createdAt: -1 });

    if (groupBy === 'date') {
      // Group workflows by next activity date
      const groupedWorkflows = workflows.reduce((acc, workflow) => {
        const date = workflow.nextActivityDate 
          ? workflow.nextActivityDate.toDateString()
          : 'No Date';
        
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(workflow);
        return acc;
      }, {});

      res.json(groupedWorkflows);
    } else {
      res.json(workflows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get workflow by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
      .populate('application', 'candidateName candidateEmail resume')
      .populate('campaign', 'name description jobDescription')
      .populate('stages.interview1Setup.assignedPanel', 'name members')
      .populate('stages.interview1Setup.assignedBy', 'firstName lastName')
      .populate('stages.interview1.reviewedBy', 'firstName lastName')
      .populate('stages.technicalTestSetup.setupBy', 'firstName lastName')
      .populate('stages.technicalTest.assignedReviewers', 'firstName lastName')
      .populate('stages.technicalTest.reviewedBy', 'firstName lastName')
      .populate('stages.onboarding.completedBy', 'firstName lastName');

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available panel slots for interview scheduling
router.get('/:id/available-slots', auth, async (req, res) => {
  try {
    const { panelId, startDate, endDate } = req.query;
    
    if (!panelId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Panel ID, start date, and end date are required' });
    }

    const panel = await Panel.findById(panelId);
    if (!panel) {
      return res.status(404).json({ message: 'Panel not found' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const availableSlots = panel.availability.filter(availability => {
      const availabilityDate = new Date(availability.date);
      return availabilityDate >= start && availabilityDate <= end;
    }).map(availability => ({
      date: availability.date,
      timeSlots: availability.timeSlots.filter(slot => !slot.isBooked).map(slot => ({
        _id: slot._id.toString(), // Ensure ID is string
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: slot.isBooked
      }))
    })).filter(availability => availability.timeSlots.length > 0);

    console.log('Available slots being returned:', JSON.stringify(availableSlots, null, 2)); // Debug log
    res.json(availableSlots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update workflow stage - Interview 1 Setup
router.put('/:id/interview1-setup', [
  auth,
  body('assignedPanel').notEmpty().withMessage('Panel is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('timeSlotId').notEmpty().withMessage('Time slot selection is required'),
  body('meetingLink').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(value)) {
        throw new Error('Valid meeting link required');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    console.log('Interview 1 Setup Request:', req.body); // Debug log
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array()); // Debug log
      return res.status(400).json({ errors: errors.array() });
    }

    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (workflow.currentStage !== 'Interview 1 - Set up') {
      return res.status(400).json({ message: 'Invalid stage for this action' });
    }

    const { assignedPanel, scheduledDate, timeSlotId, meetingLink } = req.body;

    // Find the panel and check if the time slot is available
    const panel = await Panel.findById(assignedPanel);
    if (!panel) {
      return res.status(404).json({ message: 'Panel not found' });
    }

    console.log('Panel found, availability count:', panel.availability?.length || 0);

    const scheduledDateTime = new Date(scheduledDate);
    console.log('Scheduled date time:', scheduledDateTime);
    console.log('Scheduled date string:', scheduledDateTime.toDateString());
    
    // Log all availability dates
    panel.availability?.forEach((avail, index) => {
      console.log(`Availability ${index} - Date:`, avail.date, 'DateString:', avail.date.toDateString());
      console.log(`Availability ${index} - TimeSlots:`, avail.timeSlots?.map(slot => ({
        id: slot._id.toString(),
        time: `${slot.startTime}-${slot.endTime}`,
        isBooked: slot.isBooked
      })));
    });

    const availability = panel.availability.find(a => 
      a.date.toDateString() === scheduledDateTime.toDateString()
    );

    console.log('Found availability:', availability ? 'Yes' : 'No');

    if (!availability) {
      return res.status(400).json({ message: 'No availability found for selected date' });
    }

    // Find the time slot by ID
    console.log('Looking for timeSlotId:', timeSlotId);
    const timeSlot = availability.timeSlots.find(slot => {
      console.log('Comparing slot ID:', slot._id.toString(), 'with target:', timeSlotId.toString());
      return slot._id.toString() === timeSlotId.toString();
    });
    
    if (!timeSlot) {
      console.log('Time slot not found! Available time slots:', availability.timeSlots.map(s => ({ 
        id: s._id.toString(), 
        startTime: s.startTime, 
        endTime: s.endTime,
        isBooked: s.isBooked 
      })));
      console.log('Target timeSlotId:', timeSlotId.toString());
      return res.status(400).json({ message: 'Time slot not found' });
    }

    if (timeSlot.isBooked) {
      return res.status(400).json({ message: 'Time slot is already booked' });
    }

    // Book the time slot
    timeSlot.isBooked = true;
    timeSlot.bookedBy = workflow._id;
    timeSlot.bookedAt = new Date();

    await panel.save();

    // Update workflow
    workflow.stages.interview1Setup = {
      assignedPanel,
      scheduledDate: scheduledDateTime,
      scheduledTime: `${timeSlot.startTime} - ${timeSlot.endTime}`,
      timeSlotId: timeSlot._id,
      meetingLink: meetingLink || '',
      assignedBy: req.user._id,
      setupDate: new Date()
    };

    workflow.currentStage = 'Interview 1';
    workflow.nextActivityDate = scheduledDateTime;

    await workflow.save();
    await workflow.populate([
      { path: 'application', select: 'candidateName candidateEmail' },
      { path: 'campaign', select: 'name description' },
      { path: 'stages.interview1Setup.assignedPanel', select: 'name members' },
      { path: 'stages.interview1Setup.assignedBy', select: 'firstName lastName' }
    ]);

    res.json(workflow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update workflow stage - Interview 1 Result
router.put('/:id/interview1-result', [
  auth,
  upload.single('feedbackForm'),
  body('result').isIn(['Select', 'Reject']).withMessage('Result must be Select or Reject'),
  body('remarks').notEmpty().withMessage('Remarks are required'),
  body('feedbackLink').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(value)) {
        throw new Error('Valid feedback link required');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (workflow.currentStage !== 'Interview 1') {
      return res.status(400).json({ message: 'Invalid stage for this action' });
    }

    const { result, remarks, feedbackLink } = req.body;

    workflow.stages.interview1 = {
      conductedDate: new Date(),
      remarks,
      result,
      reviewedBy: req.user._id,
      feedbackLink: feedbackLink || null
    };

    // Add feedback form file if uploaded
    if (req.file) {
      workflow.stages.interview1.feedbackForm = {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype
      };
    }

    if (result === 'Reject') {
      workflow.currentStage = 'Rejected';
      workflow.nextActivityDate = null;
    } else {
      workflow.currentStage = 'Technical Test - Set up';
      workflow.nextActivityDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    }

    await workflow.save();
    await workflow.populate([
      { path: 'application', select: 'candidateName candidateEmail' },
      { path: 'campaign', select: 'name description' },
      { path: 'stages.interview1.reviewedBy', select: 'firstName lastName' }
    ]);

    res.json(workflow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update workflow stage - Technical Test Setup
router.put('/:id/technical-test-setup', [
  auth,
  upload.single('testPaper')
], async (req, res) => {
  try {
    console.log('Technical test setup - Body:', req.body);
    console.log('Technical test setup - File:', req.file);
    console.log('Technical test setup - Files:', req.files);
    
    // Validate scheduled date manually
    if (!req.body.scheduledDate) {
      return res.status(400).json({ message: 'Scheduled date is required' });
    }
    
    // Parse testEvaluators if it's a string (from multipart form data)
    let testEvaluators = req.body.testEvaluators;
    console.log('Raw testEvaluators:', testEvaluators, 'Type:', typeof testEvaluators);
    
    if (typeof testEvaluators === 'string') {
      try {
        testEvaluators = JSON.parse(testEvaluators);
        console.log('Parsed testEvaluators:', testEvaluators);
      } catch (e) {
        console.error('Error parsing testEvaluators:', e);
        testEvaluators = [];
      }
    } else if (!Array.isArray(testEvaluators)) {
      testEvaluators = [];
    }
    
    // Parse boolean values if they're strings
    const notifyCandidate = req.body.notifyCandidate === 'true' || req.body.notifyCandidate === true;
    const sendAttachmentInNotification = req.body.sendAttachmentInNotification === 'true' || req.body.sendAttachmentInNotification === true;
    
    console.log('Parsed values:', {
      testEvaluators,
      notifyCandidate,
      sendAttachmentInNotification
    });

    if (!req.file) {
      return res.status(400).json({ message: 'Test paper file is required' });
    }

    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (workflow.currentStage !== 'Technical Test - Set up') {
      return res.status(400).json({ message: 'Invalid stage for this action' });
    }

    const { scheduledDate } = req.body;

    workflow.stages.technicalTestSetup = {
      testPaper: {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype
      },
      scheduledDate: new Date(scheduledDate),
      testEvaluators: testEvaluators || [],
      notifyCandidate: notifyCandidate || false,
      sendAttachmentInNotification: sendAttachmentInNotification || false,
      setupBy: req.user._id
    };

    workflow.currentStage = 'Technical Test - Scheduled';
    workflow.nextActivityDate = new Date(scheduledDate);

    await workflow.save();
    await workflow.populate([
      { path: 'application', select: 'candidateName candidateEmail' },
      { path: 'campaign', select: 'name description' },
      { path: 'stages.technicalTestSetup.setupBy', select: 'firstName lastName' },
      { path: 'stages.technicalTestSetup.testEvaluators', select: 'firstName lastName designation' }
    ]);

    res.json(workflow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Middleware to parse JSON strings in FormData
const parseFormDataJSON = (req, res, next) => {
  if (req.body.assignedReviewers && typeof req.body.assignedReviewers === 'string') {
    try {
      req.body.assignedReviewers = JSON.parse(req.body.assignedReviewers);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid assignedReviewers format' });
    }
  }
  next();
};

// Upload answer sheet and assign reviewers
router.put('/:id/technical-test-submit', [
  auth,
  upload.single('answerSheet'),
  parseFormDataJSON, // Parse JSON before validation
  body('assignedReviewers').isArray({ min: 1 }).withMessage('At least one reviewer is required')
], async (req, res) => {
  try {
    console.log('Technical test submit - Body:', req.body);
    console.log('Technical test submit - File:', req.file);
    console.log('Technical test submit - Files:', req.files);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Answer sheet file is required' });
    }

    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (workflow.currentStage !== 'Technical Test - Scheduled') {
      return res.status(400).json({ message: 'Invalid stage for this action' });
    }

    const { assignedReviewers } = req.body;

    // Preserve only specific fields and don't spread undefined fields
    const existingTechnicalTest = workflow.stages.technicalTest || {};
    workflow.stages.technicalTest = {
      testPaper: existingTechnicalTest.testPaper,
      notifyCandidate: existingTechnicalTest.notifyCandidate,
      sendAttachmentInNotification: existingTechnicalTest.sendAttachmentInNotification,
      testEvaluators: existingTechnicalTest.testEvaluators,
      scheduledDate: existingTechnicalTest.scheduledDate,
      answerSheet: {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype
      },
      assignedReviewers,
      submittedDate: new Date()
    };

    workflow.currentStage = 'Technical Test - Review';
    workflow.nextActivityDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

    await workflow.save();
    await workflow.populate([
      { path: 'application', select: 'candidateName candidateEmail' },
      { path: 'campaign', select: 'name description' },
      { path: 'stages.technicalTest.assignedReviewers', select: 'firstName lastName' }
    ]);

    res.json(workflow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Technical Test Review Result
router.put('/:id/technical-test-result', [
  auth,
  upload.single('resultFile'),
  body('result').isIn(['Select', 'Reject']).withMessage('Result must be Select or Reject'),
  body('remarks').notEmpty().withMessage('Remarks are required')
], async (req, res) => {
  try {
    console.log('Technical test result - Body:', req.body);
    console.log('Technical test result - File:', req.file);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Technical test result validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (workflow.currentStage !== 'Technical Test - Review') {
      return res.status(400).json({ message: 'Invalid stage for this action' });
    }

    const { result, remarks } = req.body;

    // Update only the specific fields instead of replacing the entire object
    if (!workflow.stages.technicalTest) {
      workflow.stages.technicalTest = {};
    }
    
    // Update only the result-related fields
    workflow.stages.technicalTest.result = result;
    workflow.stages.technicalTest.remarks = remarks;
    workflow.stages.technicalTest.reviewedBy = req.user._id;
    workflow.stages.technicalTest.reviewDate = new Date();

    // Add result file if uploaded
    if (req.file) {
      workflow.stages.technicalTest.resultFile = {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype
      };
    }

    if (result === 'Reject') {
      workflow.currentStage = 'Rejected';
      workflow.nextActivityDate = null;
    } else {
      workflow.currentStage = 'Onboarding';
      workflow.nextActivityDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    }

    await workflow.save();
    await workflow.populate([
      { path: 'application', select: 'candidateName candidateEmail' },
      { path: 'campaign', select: 'name description' },
      { path: 'stages.technicalTest.reviewedBy', select: 'firstName lastName' }
    ]);

    res.json(workflow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update candidate details
router.put('/:id/candidate-details', [
  auth,
  body('currentSalary').optional().isNumeric().withMessage('Current salary must be a number'),
  body('expectedSalary').optional().isNumeric().withMessage('Expected salary must be a number'),
  body('noticePeriod').optional().isString(),
  body('remarks').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    const { currentSalary, expectedSalary, noticePeriod, remarks } = req.body;

    workflow.candidateDetails = {
      currentSalary: currentSalary ? parseFloat(currentSalary) : workflow.candidateDetails?.currentSalary,
      expectedSalary: expectedSalary ? parseFloat(expectedSalary) : workflow.candidateDetails?.expectedSalary,
      noticePeriod: noticePeriod || workflow.candidateDetails?.noticePeriod,
      remarks: remarks || workflow.candidateDetails?.remarks
    };

    await workflow.save();
    res.json(workflow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update onboarding stage
router.put('/:id/onboarding', [
  auth,
  body('backgroundCheckDone').optional().isBoolean(),
  body('offerLetterReleased').optional().isBoolean(),
  body('complete').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (workflow.currentStage !== 'Onboarding') {
      return res.status(400).json({ message: 'Invalid stage for this action' });
    }

    const { backgroundCheckDone, offerLetterReleased, complete } = req.body;

    workflow.stages.onboarding = {
      backgroundCheckDone: backgroundCheckDone !== undefined ? backgroundCheckDone : workflow.stages.onboarding?.backgroundCheckDone || false,
      offerLetterReleased: offerLetterReleased !== undefined ? offerLetterReleased : workflow.stages.onboarding?.offerLetterReleased || false,
      completedDate: complete ? new Date() : workflow.stages.onboarding?.completedDate,
      completedBy: complete ? req.user._id : workflow.stages.onboarding?.completedBy
    };

    if (complete) {
      workflow.currentStage = 'Completed';
      workflow.nextActivityDate = null;
    }

    await workflow.save();
    await workflow.populate([
      { path: 'application', select: 'candidateName candidateEmail' },
      { path: 'campaign', select: 'name description' },
      { path: 'stages.onboarding.completedBy', select: 'firstName lastName' }
    ]);

    res.json(workflow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
