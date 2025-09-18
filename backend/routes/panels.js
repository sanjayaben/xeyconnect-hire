const express = require('express');
const { body, validationResult } = require('express-validator');
const Panel = require('../models/Panel');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all panels
router.get('/', auth, async (req, res) => {
  try {
    const panels = await Panel.find().populate('members', 'firstName lastName designation').sort({ name: 1 });
    res.json(panels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get panel by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const panel = await Panel.findById(req.params.id).populate('members', 'firstName lastName designation');
    if (!panel) {
      return res.status(404).json({ message: 'Panel not found' });
    }
    res.json(panel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create panel
router.post('/', [
  auth,
  body('name').notEmpty().withMessage('Panel name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('members').isArray({ min: 1 }).withMessage('At least one member is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, members } = req.body;

    const panel = new Panel({
      name,
      description,
      members
    });

    await panel.save();
    await panel.populate('members', 'firstName lastName designation');

    res.status(201).json(panel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update panel
router.put('/:id', [
  auth,
  body('name').optional().notEmpty().withMessage('Panel name cannot be empty'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('members').optional().isArray({ min: 1 }).withMessage('At least one member is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const panel = await Panel.findById(req.params.id);
    if (!panel) {
      return res.status(404).json({ message: 'Panel not found' });
    }

    const { name, description, members } = req.body;

    if (name) panel.name = name;
    if (description) panel.description = description;
    if (members) panel.members = members;

    await panel.save();
    await panel.populate('members', 'firstName lastName designation');

    res.json(panel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add availability to panel
router.post('/:id/availability', [
  auth,
  body('date').isISO8601().withMessage('Valid date is required'),
  body('timeSlots').isArray({ min: 1 }).withMessage('At least one time slot is required'),
  body('timeSlots.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time required (HH:MM)'),
  body('timeSlots.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time required (HH:MM)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const panel = await Panel.findById(req.params.id);
    if (!panel) {
      return res.status(404).json({ message: 'Panel not found' });
    }

    const { date, timeSlots } = req.body;

    // Validate time slots don't overlap
    for (let i = 0; i < timeSlots.length; i++) {
      const startTime = timeSlots[i].startTime;
      const endTime = timeSlots[i].endTime;
      
      if (startTime >= endTime) {
        return res.status(400).json({ message: `Invalid time slot: ${startTime} - ${endTime}. Start time must be before end time.` });
      }
    }

    // Check if availability for this date already exists
    const existingAvailabilityIndex = panel.availability.findIndex(
      a => a.date.toDateString() === new Date(date).toDateString()
    );

    if (existingAvailabilityIndex !== -1) {
      // Update existing availability
      panel.availability[existingAvailabilityIndex].timeSlots = timeSlots;
    } else {
      // Add new availability
      panel.availability.push({ date, timeSlots });
    }

    await panel.save();
    res.json(panel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add recurring availability to panel
router.post('/:id/recurring-availability', [
  auth,
  body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Day of week must be 0-6 (0=Sunday, 6=Saturday)'),
  body('timeSlots').isArray({ min: 1 }).withMessage('At least one time slot is required'),
  body('timeSlots.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time required (HH:MM)'),
  body('timeSlots.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time required (HH:MM)'),
  body('timeSlots.*.slotDuration').optional().isInt({ min: 15, max: 480 }).withMessage('Slot duration must be between 15 and 480 minutes')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const panel = await Panel.findById(req.params.id);
    if (!panel) {
      return res.status(404).json({ message: 'Panel not found' });
    }

    const { dayOfWeek, timeSlots } = req.body;

    // Check if recurring availability for this day already exists
    const existingRecurringIndex = panel.recurringAvailability.findIndex(
      ra => ra.dayOfWeek === dayOfWeek
    );

    if (existingRecurringIndex !== -1) {
      // Update existing recurring availability
      panel.recurringAvailability[existingRecurringIndex].timeSlots = timeSlots;
    } else {
      // Add new recurring availability
      panel.recurringAvailability.push({ dayOfWeek, timeSlots });
    }

    await panel.save();
    res.json(panel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate availability slots from recurring availability
router.post('/:id/generate-availability', [
  auth,
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const panel = await Panel.findById(req.params.id);
    if (!panel) {
      return res.status(404).json({ message: 'Panel not found' });
    }

    const { startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate availability slots based on recurring availability
    const currentDate = new Date(start);
    const generatedSlots = [];

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const recurringSlot = panel.recurringAvailability.find(ra => ra.dayOfWeek === dayOfWeek);
      
      if (recurringSlot) {
        // Check if availability for this date already exists
        const existingAvailability = panel.availability.find(
          a => a.date.toDateString() === currentDate.toDateString()
        );

        if (!existingAvailability) {
          const timeSlots = recurringSlot.timeSlots.map(ts => ({
            startTime: ts.startTime,
            endTime: ts.endTime,
            isBooked: false
          }));

          panel.availability.push({
            date: new Date(currentDate),
            timeSlots
          });

          generatedSlots.push({
            date: new Date(currentDate),
            timeSlots
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    await panel.save();
    res.json({ 
      message: `Generated ${generatedSlots.length} availability slots`,
      generatedSlots 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available time slots for a specific date range
router.get('/:id/available-slots', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const panel = await Panel.findById(req.params.id);
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
      timeSlots: availability.timeSlots.filter(slot => !slot.isBooked)
    })).filter(availability => availability.timeSlots.length > 0);

    res.json(availableSlots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get panel availability
router.get('/:id/availability', auth, async (req, res) => {
  try {
    const panel = await Panel.findById(req.params.id).select('availability');
    if (!panel) {
      return res.status(404).json({ message: 'Panel not found' });
    }

    res.json(panel.availability);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete panel
router.delete('/:id', auth, async (req, res) => {
  try {
    const panel = await Panel.findById(req.params.id);
    if (!panel) {
      return res.status(404).json({ message: 'Panel not found' });
    }

    await Panel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Panel deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete specific availability
router.delete('/:id/availability/:availabilityId', auth, async (req, res) => {
  try {
    const panel = await Panel.findById(req.params.id);
    if (!panel) {
      return res.status(404).json({ message: 'Panel not found' });
    }

    const availabilityIndex = panel.availability.findIndex(
      a => a._id.toString() === req.params.availabilityId
    );

    if (availabilityIndex === -1) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    panel.availability.splice(availabilityIndex, 1);
    await panel.save();

    res.json({ message: 'Availability deleted successfully', panel });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
