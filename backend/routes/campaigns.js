const express = require('express');
const { body, validationResult } = require('express-validator');
const Campaign = require('../models/Campaign');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    
    if (status) {
      filter.status = status;
    }

    const campaigns = await Campaign.find(filter)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json(campaigns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create campaign
router.post('/', [
  auth,
  upload.single('jobDescriptionFile'),
  body('name').notEmpty().withMessage('Campaign name is required'),
  body('client').notEmpty().withMessage('Client is required').isIn(['Bourque Logistics (BL)', 'Industrial Networks (INET)', 'Tank and Container Management Systems (TCMS)']).withMessage('Invalid client selection'),
  body('workflow').notEmpty().withMessage('Workflow is required').isIn(['workflow1', 'workflow2', 'workflow3']).withMessage('Invalid workflow selection'),
  body('description').notEmpty().withMessage('Description is required'),
  body('jobDescription').notEmpty().withMessage('Job description is required'),
  body('numberOfPositions').isInt({ min: 1 }).withMessage('Number of positions must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, client, workflow, description, jobDescription, numberOfPositions, status } = req.body;

    const campaignData = {
      name,
      client,
      workflow,
      description,
      jobDescription,
      numberOfPositions: parseInt(numberOfPositions),
      status: status || 'Active',
      createdBy: req.user._id
    };

    if (req.file) {
      campaignData.jobDescriptionFile = {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype
      };
    }

    const campaign = new Campaign(campaignData);
    await campaign.save();
    await campaign.populate('createdBy', 'firstName lastName');

    res.status(201).json(campaign);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update campaign
router.put('/:id', [
  auth,
  upload.single('jobDescriptionFile'),
  body('name').optional().notEmpty().withMessage('Campaign name cannot be empty'),
  body('client').optional().isIn(['Bourque Logistics (BL)', 'Industrial Networks (INET)', 'Tank and Container Management Systems (TCMS)']).withMessage('Invalid client selection'),
  body('workflow').optional().isIn(['workflow1', 'workflow2', 'workflow3']).withMessage('Invalid workflow selection'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('jobDescription').optional().notEmpty().withMessage('Job description cannot be empty'),
  body('numberOfPositions').optional().isInt({ min: 1 }).withMessage('Number of positions must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const { name, client, workflow, description, jobDescription, numberOfPositions, status } = req.body;

    if (name) campaign.name = name;
    if (client) campaign.client = client;
    if (workflow) campaign.workflow = workflow;
    if (description) campaign.description = description;
    if (jobDescription) campaign.jobDescription = jobDescription;
    if (numberOfPositions) campaign.numberOfPositions = parseInt(numberOfPositions);
    if (status) campaign.status = status;

    if (req.file) {
      campaign.jobDescriptionFile = {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype
      };
    }

    await campaign.save();
    await campaign.populate('createdBy', 'firstName lastName');

    res.json(campaign);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete campaign
router.delete('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
