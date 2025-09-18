const express = require('express');
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');
const Campaign = require('../models/Campaign');
const Workflow = require('../models/Workflow');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Apply for a campaign (public route)
router.post('/apply', [
  upload.single('resume'),
  body('campaignId').notEmpty().withMessage('Campaign ID is required'),
  body('candidateName').notEmpty().withMessage('Candidate name is required'),
  body('candidateEmail').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Resume file is required' });
    }

    const { campaignId, candidateName, candidateEmail } = req.body;

    // Check if campaign exists and is active
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status !== 'Active') {
      return res.status(400).json({ message: 'Campaign is not active' });
    }

    // Check if candidate already applied for this campaign
    const existingApplication = await Application.findOne({
      campaign: campaignId,
      candidateEmail
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this campaign' });
    }

    const application = new Application({
      campaign: campaignId,
      candidateName,
      candidateEmail,
      resume: {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype
      }
    });

    await application.save();
    await application.populate('campaign', 'name description');

    res.status(201).json(application);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get applications by campaign (requires auth)
router.get('/campaign/:campaignId', auth, async (req, res) => {
  try {
    const applications = await Application.find({ campaign: req.params.campaignId })
      .populate('campaign', 'name description')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all applications grouped by campaign (requires auth)
router.get('/', auth, async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('campaign', 'name description status')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Group by campaign
    const groupedApplications = applications.reduce((acc, app) => {
      const campaignId = app.campaign._id.toString();
      if (!acc[campaignId]) {
        acc[campaignId] = {
          campaign: app.campaign,
          applications: []
        };
      }
      acc[campaignId].applications.push(app);
      return acc;
    }, {});

    res.json(Object.values(groupedApplications));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get application by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('campaign', 'name description jobDescription')
      .populate('reviewedBy', 'firstName lastName');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Review application (shortlist/reject)
router.put('/:id/review', [
  auth,
  body('status').isIn(['Shortlisted', 'Rejected']).withMessage('Status must be Shortlisted or Rejected'),
  body('remarks').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const { status, remarks } = req.body;

    application.status = status;
    application.reviewedBy = req.user._id;
    application.reviewDate = new Date();
    if (remarks) application.remarks = remarks;

    await application.save();

    // If shortlisted, create workflow
    if (status === 'Shortlisted') {
      const workflow = new Workflow({
        application: application._id,
        campaign: application.campaign,
        candidateName: application.candidateName,
        currentStage: 'Interview 1 - Set up',
        nextActivityDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });

      await workflow.save();
    }

    await application.populate([
      { path: 'campaign', select: 'name description' },
      { path: 'reviewedBy', select: 'firstName lastName' }
    ]);

    res.json(application);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
