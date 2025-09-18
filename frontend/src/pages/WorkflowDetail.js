import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Alert,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSnackbar } from 'notistack';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import api from '../services/api';

const steps = [
  'Interview 1 - Set up',
  'Interview 1',
  'Technical Test - Set up',
  'Technical Test - Review',
  'Onboarding',
  'Completed'
];

const WorkflowDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [formData, setFormData] = useState({});
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);

  // Fetch workflow details
  const { data: workflow, isLoading } = useQuery(['workflow', id], async () => {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  });

  // Fetch users and panels for dropdowns
  const { data: users = [] } = useQuery('users', async () => {
    const response = await api.get('/users');
    return response.data;
  });

  const { data: panels = [] } = useQuery('panels', async () => {
    const response = await api.get('/panels');
    return response.data;
  });

  // Fetch available slots when panel and date are selected
  const fetchAvailableSlots = async (panelId, startDate, endDate) => {
    if (!panelId || !startDate || !endDate) return;
    
    try {
      const response = await api.get(`/workflows/${id}/available-slots`, {
        params: {
          panelId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      setAvailableSlots(response.data);
      setSelectedTimeSlot(null); // Clear selected slot when new slots are fetched
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      setAvailableSlots([]);
      setSelectedTimeSlot(null);
    }
  };

  // Effect to fetch slots when panel or date changes
  useEffect(() => {
    if (currentAction === 'interview1-setup' && formData.assignedPanel && selectedDate) {
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 7); // Fetch slots for the next week
      fetchAvailableSlots(formData.assignedPanel, selectedDate, endDate);
    }
  }, [formData.assignedPanel, selectedDate, currentAction]);

  // Generic mutation for workflow updates
  const updateWorkflowMutation = useMutation(
    async ({ endpoint, data }) => {
      console.log('updateWorkflowMutation called with:', { endpoint, data });
      // Check if we need to upload a file
      const needsFileUpload = data.file || (endpoint.includes('test-setup') || endpoint.includes('test-submit') || endpoint === 'interview1-result' || endpoint === 'technical-test-result');
      console.log('needsFileUpload:', needsFileUpload, 'for endpoint:', endpoint);
      
      // Force JSON only for technical-test-result when no file is uploaded
      if (endpoint === 'technical-test-result' && !data.file) {
        console.log('Forcing JSON for technical-test-result endpoint (no file)');
        const response = await api.put(`/workflows/${id}/${endpoint}`, data, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return response.data;
      }
      
      if (needsFileUpload) {
        // Use FormData for file uploads
        const formData = new FormData();
        Object.keys(data).forEach(key => {
          if (key !== 'file' && data[key] !== undefined) {
            if (Array.isArray(data[key])) {
              formData.append(key, JSON.stringify(data[key]));
            } else {
              formData.append(key, data[key]);
            }
          }
        });
        if (data.file) {
          // Determine the correct field name based on the endpoint
          let fieldName;
          if (endpoint === 'technical-test-setup') {
            fieldName = 'testPaper';
          } else if (endpoint === 'technical-test-submit') {
            fieldName = 'answerSheet';
          } else if (endpoint === 'interview1-result') {
            fieldName = 'feedbackForm';
          } else if (endpoint === 'technical-test-result') {
            fieldName = 'resultFile';
          } else {
            fieldName = 'file'; // default fallback
          }
          console.log('Appending file with field name:', fieldName, 'for endpoint:', endpoint);
          formData.append(fieldName, data.file);
        }
        
        // Debug: Log all FormData entries
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
          console.log(key, ':', value);
        }
        
        const response = await api.put(`/workflows/${id}/${endpoint}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } else {
        // Use JSON for non-file uploads
        console.log('Using JSON for endpoint:', endpoint, 'with data:', data);
        const response = await api.put(`/workflows/${id}/${endpoint}`, data, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return response.data;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['workflow', id]);
        enqueueSnackbar('Workflow updated successfully', { variant: 'success' });
        setDialogOpen(false);
        setCurrentAction(null);
        setUploadFile(null);
        setError('');
      },
      onError: (error) => {
        setError(error.response?.data?.message || 'Failed to update workflow');
      },
    }
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setUploadFile(acceptedFiles[0]);
    },
  });

  const getActiveStep = () => {
    if (!workflow) return 0;
    switch (workflow.currentStage) {
      case 'Interview 1 - Set up': return 0;
      case 'Interview 1': return 1;
      case 'Technical Test - Set up':
      case 'Technical Test - Scheduled': return 2;
      case 'Technical Test - Review': return 3;
      case 'Onboarding': return 4;
      case 'Completed': return 5;
      default: return 0;
    }
  };

  const handleAction = (action) => {
    setCurrentAction(action);
    
    // Initialize form data with default values for specific actions
    let initialFormData = {};
    
    if (action === 'technical-test-submit' && workflow?.stages?.technicalTestSetup?.testEvaluators) {
      // Pre-populate assigned reviewers with test evaluators from the setup step
      console.log('Technical test evaluators from setup:', workflow.stages.technicalTestSetup.testEvaluators);
      initialFormData.assignedReviewers = workflow.stages.technicalTestSetup.testEvaluators.map(evaluator => 
        typeof evaluator === 'string' ? evaluator : evaluator._id
      );
      console.log('Pre-populated assigned reviewers:', initialFormData.assignedReviewers);
    }
    
    setFormData(initialFormData);
    setUploadFile(null);
    setError('');
    setSelectedDate(new Date());
    setSelectedTimeSlot(null);
    setAvailableSlots([]);
    setDialogOpen(true);
  };

  const handleFormChange = (e) => {
    console.log('handleFormChange called:', { name: e.target.name, value: e.target.value });
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    console.log('Updated formData:', { ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    console.log('handleSubmit called for action:', currentAction);
    console.log('Current formData:', formData);
    const data = { ...formData };
    if (uploadFile) {
      data.file = uploadFile;
    }

    // Add time slot information for interview setup
    if (currentAction === 'interview1-setup' && selectedTimeSlot) {
      console.log('Selected time slot:', selectedTimeSlot); // Debug log
      console.log('Available slots:', availableSlots); // Debug log
      data.timeSlotId = selectedTimeSlot._id;
      
      // Find the correct date for the selected time slot
      const selectedSlotDate = availableSlots.find(availability => 
        availability.timeSlots.some(slot => slot._id === selectedTimeSlot._id)
      )?.date;
      
      if (selectedSlotDate) {
        data.scheduledDate = new Date(selectedSlotDate).toISOString();
        console.log('Setting scheduledDate to:', selectedSlotDate); // Debug log
      } else {
        console.error('Could not find date for selected time slot');
        data.scheduledDate = selectedDate.toISOString();
      }
    }

    let endpoint = '';
    switch (currentAction) {
      case 'interview1-setup':
        endpoint = 'interview1-setup';
        break;
      case 'interview1-result':
        endpoint = 'interview1-result';
        break;
      case 'technical-test-setup':
        endpoint = 'technical-test-setup';
        break;
      case 'technical-test-submit':
        endpoint = 'technical-test-submit';
        data.assignedReviewers = formData.assignedReviewers || [];
        break;
      case 'technical-test-result':
        endpoint = 'technical-test-result';
        break;
      case 'candidate-details':
        endpoint = 'candidate-details';
        break;
      case 'onboarding':
        endpoint = 'onboarding';
        break;
      default:
        return;
    }

    console.log('About to call mutation with:', { endpoint, data });
    updateWorkflowMutation.mutate({ endpoint, data });
  };

  const renderActionButton = () => {
    if (!workflow) return null;

    switch (workflow.currentStage) {
      case 'Interview 1 - Set up':
        return (
          <Button
            variant="contained"
            onClick={() => handleAction('interview1-setup')}
          >
            Setup Interview 1
          </Button>
        );
      case 'Interview 1':
        return (
          <Button
            variant="contained"
            onClick={() => handleAction('interview1-result')}
          >
            Record Interview Result
          </Button>
        );
      case 'Technical Test - Set up':
        return (
          <Button
            variant="contained"
            onClick={() => handleAction('technical-test-setup')}
          >
            Setup Technical Test
          </Button>
        );
      case 'Technical Test - Scheduled':
        return (
          <Button
            variant="contained"
            onClick={() => handleAction('technical-test-submit')}
          >
            Submit Answer Sheet
          </Button>
        );
      case 'Technical Test - Review':
        return (
          <Button
            variant="contained"
            onClick={() => handleAction('technical-test-result')}
          >
            Review Technical Test
          </Button>
        );
      case 'Onboarding':
        return (
          <Button
            variant="contained"
            onClick={() => handleAction('onboarding')}
          >
            Manage Onboarding
          </Button>
        );
      default:
        return null;
    }
  };

  const renderDialogContent = () => {
    switch (currentAction) {
      case 'interview1-setup':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Interview Panel</InputLabel>
              <Select
                name="assignedPanel"
                value={formData.assignedPanel || ''}
                onChange={handleFormChange}
                label="Interview Panel"
              >
                {panels.map((panel) => (
                  <MenuItem key={panel._id} value={panel._id}>
                    {panel.name}
                    <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                      ({panel.members?.length || 0} members)
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {formData.assignedPanel && (
              <>
                <DatePicker
                  label="Select Date"
                  value={selectedDate}
                  onChange={(newValue) => {
                    setSelectedDate(newValue);
                    setSelectedTimeSlot(null);
                  }}
                  minDate={new Date()}
                  renderInput={(params) => <TextField {...params} fullWidth sx={{ mb: 2 }} />}
                />
                
                {availableSlots.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Available Time Slots
                    </Typography>
                    <Paper sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {availableSlots.map((availability) => (
                        <div key={availability.date}>
                          <ListSubheader>
                            {format(new Date(availability.date), 'EEEE, MMMM d, yyyy')}
                          </ListSubheader>
                          <List dense>
                            {availability.timeSlots.map((slot) => (
                              <ListItem key={slot._id} disablePadding>
                                <ListItemButton
                                  selected={selectedTimeSlot?._id === slot._id}
                                  onClick={() => {
                                    console.log('Selecting slot:', slot);
                                    console.log('Slot ID:', slot._id);
                                    setSelectedTimeSlot(slot);
                                  }}
                                >
                                  <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                                  <ListItemText
                                    primary={`${slot.startTime} - ${slot.endTime}`}
                                    secondary="Available"
                                  />
                                </ListItemButton>
                              </ListItem>
                            ))}
                          </List>
                        </div>
                      ))}
                    </Paper>
                    {selectedTimeSlot && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        Selected: {format(selectedDate, 'MMM d, yyyy')} at {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                      </Alert>
                    )}
                  </Box>
                )}
                
                {formData.assignedPanel && availableSlots.length === 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    No available time slots found for the selected panel and date range. 
                    Please check the panel's availability settings.
                  </Alert>
                )}
              </>
            )}
            
            <TextField
              fullWidth
              label="Meeting Link (Optional)"
              name="meetingLink"
              value={formData.meetingLink || ''}
              onChange={handleFormChange}
              placeholder="https://meet.google.com/xxx-xxx-xxx"
            />
          </LocalizationProvider>
        );

      case 'interview1-result':
        return (
          <>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Interview Result
            </Typography>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <RadioGroup
                name="result"
                value={formData.result || ''}
                onChange={handleFormChange}
                row
              >
                <FormControlLabel
                  value="Select"
                  control={<Radio />}
                  label="Select"
                />
                <FormControlLabel
                  value="Reject"
                  control={<Radio />}
                  label="Reject"
                />
              </RadioGroup>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Remarks"
              name="remarks"
              value={formData.remarks || ''}
              onChange={handleFormChange}
              sx={{ mb: 2 }}
            />
            
            {/* Feedback Link Field */}
            <TextField
              fullWidth
              label="Feedback Link (Optional)"
              name="feedbackLink"
              value={formData.feedbackLink || ''}
              onChange={handleFormChange}
              placeholder="https://forms.google.com/your-feedback-form"
              helperText="Add a link to an external feedback form"
              sx={{ mb: 2 }}
            />
            
            {/* Feedback Form Upload */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Upload Feedback Form (Optional)
            </Typography>
            <Paper
              {...getRootProps()}
              sx={{
                p: 3,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                cursor: 'pointer',
                textAlign: 'center',
                mb: 2
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              {uploadFile ? (
                <Typography>{uploadFile.name}</Typography>
              ) : (
                <Typography color="text.secondary">
                  Drop feedback form here or click to upload
                  <br />
                  (PDF, DOC, DOCX files supported)
                </Typography>
              )}
            </Paper>
          </>
        );

      case 'technical-test-setup':
        return (
          <>
            <TextField
              fullWidth
              type="date"
              label="Scheduled Date"
              name="scheduledDate"
              value={formData.scheduledDate || ''}
              onChange={handleFormChange}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            
            {/* Test Evaluators Selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Test Evaluators</InputLabel>
              <Select
                multiple
                name="testEvaluators"
                value={formData.testEvaluators || []}
                onChange={handleFormChange}
                label="Test Evaluators"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const user = users.find(u => u._id === value);
                      return (
                        <Chip 
                          key={value} 
                          label={user ? `${user.firstName} ${user.lastName}` : value}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {users.map((user) => (
                  <MenuItem key={user._id} value={user._id}>
                    {user.firstName} {user.lastName}
                    <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                      ({user.designation})
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Upload Test Paper
            </Typography>
            <Paper
              {...getRootProps()}
              sx={{
                p: 3,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                cursor: 'pointer',
                textAlign: 'center',
                mb: 2
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              {uploadFile ? (
                <Typography>{uploadFile.name}</Typography>
              ) : (
                <Typography color="text.secondary">
                  Drop test paper here or click to upload
                </Typography>
              )}
            </Paper>
            
            {/* Notification Options */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Notification Options
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  name="notifyCandidate"
                  checked={formData.notifyCandidate || false}
                  onChange={(e) => setFormData({ ...formData, notifyCandidate: e.target.checked })}
                />
              }
              label="Notify Candidate"
              sx={{ mb: 1, display: 'block' }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="sendAttachmentInNotification"
                  checked={formData.sendAttachmentInNotification || false}
                  onChange={(e) => setFormData({ ...formData, sendAttachmentInNotification: e.target.checked })}
                  disabled={!formData.notifyCandidate}
                />
              }
              label="Send attachment in notification"
              sx={{ mb: 2, display: 'block' }}
            />
          </>
        );

      case 'technical-test-submit':
        return (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Assigned Reviewers</InputLabel>
              <Select
                multiple
                name="assignedReviewers"
                value={formData.assignedReviewers || []}
                onChange={handleFormChange}
                label="Assigned Reviewers"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const user = users.find(u => u._id === value);
                      return (
                        <Chip 
                          key={value} 
                          label={user ? `${user.firstName} ${user.lastName}` : value}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {users.map((user) => (
                  <MenuItem key={user._id} value={user._id}>
                    {user.firstName} {user.lastName}
                    <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                      ({user.designation})
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Upload Answer Sheet
            </Typography>
            <Paper
              {...getRootProps()}
              sx={{
                p: 3,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              {uploadFile ? (
                <Typography>{uploadFile.name}</Typography>
              ) : (
                <Typography color="text.secondary">
                  Drop answer sheet here or click to upload
                </Typography>
              )}
            </Paper>
          </>
        );

      case 'technical-test-result':
        return (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Result
            </Typography>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <RadioGroup
                name="result"
                value={formData.result || ''}
                onChange={handleFormChange}
                row
              >
                <FormControlLabel value="Select" control={<Radio />} label="Select" />
                <FormControlLabel value="Reject" control={<Radio />} label="Reject" />
              </RadioGroup>
            </FormControl>
            
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Upload Answer Sheet or Video (Optional)
            </Typography>
            <Paper
              {...getRootProps()}
              sx={{
                p: 3,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                cursor: 'pointer',
                textAlign: 'center',
                mb: 2
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              {uploadFile ? (
                <Typography>{uploadFile.name}</Typography>
              ) : (
                <Typography color="text.secondary">
                  Drop answer sheet or video here or click to upload
                </Typography>
              )}
            </Paper>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Remarks"
              name="remarks"
              value={formData.remarks || ''}
              onChange={handleFormChange}
              required
            />
          </>
        );

      case 'onboarding':
        return (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  name="backgroundCheckDone"
                  checked={formData.backgroundCheckDone || false}
                  onChange={(e) => setFormData({ ...formData, backgroundCheckDone: e.target.checked })}
                />
              }
              label="Background Check Completed"
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="offerLetterReleased"
                  checked={formData.offerLetterReleased || false}
                  onChange={(e) => setFormData({ ...formData, offerLetterReleased: e.target.checked })}
                />
              }
              label="Offer Letter Released"
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="complete"
                  checked={formData.complete || false}
                  onChange={(e) => setFormData({ ...formData, complete: e.target.checked })}
                />
              }
              label="Mark as Complete"
            />
          </>
        );

      default:
        return null;
    }
  };

  const renderWorkflowHistory = () => {
    if (!workflow) {
      return <Typography color="text.secondary">No workflow data available</Typography>;
    }

    const historyItems = [];

    try {
      // Always show workflow creation
      historyItems.push({
        date: new Date(workflow.createdAt || workflow.updatedAt || Date.now()),
        stage: 'Workflow Created',
        description: `Workflow created for ${workflow.candidateName}`,
        status: 'completed'
      });

      // Add current stage info
      historyItems.push({
        date: new Date(workflow.updatedAt || Date.now()),
        stage: `Current Stage: ${workflow.currentStage}`,
        description: `Workflow is currently at ${workflow.currentStage} stage`,
        status: 'current'
      });

      // Interview 1 Setup
      if (workflow.stages?.interview1Setup?.setupDate) {
        historyItems.push({
          date: new Date(workflow.stages.interview1Setup.setupDate),
          stage: 'Interview 1 - Set up',
          description: `Interview scheduled`,
          status: 'completed'
        });
      }

      // Interview 1 Result
      if (workflow.stages?.interview1?.conductedDate) {
        historyItems.push({
          date: new Date(workflow.stages.interview1.conductedDate),
          stage: 'Interview 1 - Result',
          description: `Result: ${workflow.stages.interview1.result || 'Pending'}`,
          details: workflow.stages.interview1,
          status: 'completed'
        });
      }

      // Technical Test Setup
      if (workflow.stages?.technicalTestSetup?.scheduledDate) {
        historyItems.push({
          date: new Date(workflow.stages.technicalTestSetup.scheduledDate),
          stage: 'Technical Test - Set up',
          description: `Technical test scheduled`,
          details: workflow.stages.technicalTestSetup,
          status: 'completed'
        });
      }

      // Technical Test Review
      if (workflow.stages?.technicalTest?.reviewDate) {
        historyItems.push({
          date: new Date(workflow.stages.technicalTest.reviewDate),
          stage: 'Technical Test - Reviewed',
          description: `Result: ${workflow.stages.technicalTest.result || 'Pending'}`,
          details: workflow.stages.technicalTest,
          status: 'completed'
        });
      }

      // Sort by date (oldest first)
      historyItems.sort((a, b) => a.date - b.date);

      return (
        <List>
          {historyItems.map((item, index) => (
            <ListItem key={index} sx={{ py: 2 }}>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle1" component="div">
                    {item.stage}
                  </Typography>
                  <Chip 
                    label={item.status} 
                    size="small" 
                    color={
                      item.status === 'completed' ? 'success' : 
                      item.status === 'current' ? 'primary' : 'warning'
                    }
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {format(item.date, 'MMM d, yyyy - h:mm a')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {item.description}
                </Typography>
                
                {/* Show additional details for Interview 1 Result */}
                {item.details && item.stage === 'Interview 1 - Result' && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    {item.details.remarks && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Remarks:</strong> {item.details.remarks}
                      </Typography>
                    )}
                    {item.details.feedbackLink && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Feedback Link:</strong>{' '}
                        <a 
                          href={item.details.feedbackLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#1976d2' }}
                        >
                          {item.details.feedbackLink}
                        </a>
                      </Typography>
                    )}
                    {item.details.feedbackForm && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Feedback Form:</strong>{' '}
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => window.open(`http://localhost:5000/${item.details.feedbackForm.path}`)}
                        >
                          Download {item.details.feedbackForm.filename}
                        </Button>
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Show additional details for Technical Test Setup */}
                {item.details && item.stage === 'Technical Test - Set up' && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    {item.details.testEvaluators && item.details.testEvaluators.length > 0 && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Test Evaluators:</strong>{' '}
                        {item.details.testEvaluators.map((evaluator, idx) => (
                          <Chip 
                            key={evaluator._id || idx}
                            label={`${evaluator.firstName} ${evaluator.lastName}`}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Typography>
                    )}
                    {item.details.testPaper && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Test Paper:</strong>{' '}
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => window.open(`http://localhost:5000/${item.details.testPaper.path}`)}
                        >
                          Download {item.details.testPaper.filename}
                        </Button>
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Notify Candidate:</strong> {item.details.notifyCandidate ? 'Yes' : 'No'}
                    </Typography>
                    {item.details.notifyCandidate && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Send Attachment in Notification:</strong> {item.details.sendAttachmentInNotification ? 'Yes' : 'No'}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Show additional details for Technical Test Review */}
                {item.details && item.stage === 'Technical Test - Reviewed' && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    {item.details.remarks && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Remarks:</strong> {item.details.remarks}
                      </Typography>
                    )}
                    {item.details.resultFile && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Result File:</strong>{' '}
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => window.open(`http://localhost:5000/${item.details.resultFile.path}`)}
                        >
                          Download {item.details.resultFile.filename}
                        </Button>
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </ListItem>
          ))}
        </List>
      );
    } catch (error) {
      return (
        <Typography color="error">
          Error rendering workflow history: {error.message}
        </Typography>
      );
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!workflow) return <div>Workflow not found</div>;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/activities')}
          sx={{ mb: 2 }}
        >
          Back to Activities
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Workflow: {workflow.candidateName}
        </Typography>
        
        <Typography variant="h6" color="text.secondary">
          Campaign: {workflow.campaign?.name}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Progress
            </Typography>
            <Stepper activeStep={getActiveStep()} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Chip
                label={workflow.currentStage}
                color="primary"
                sx={{ mb: 2 }}
              />
              <br />
              {renderActionButton()}
              <Button
                variant="outlined"
                onClick={() => handleAction('candidate-details')}
                sx={{ ml: 2 }}
              >
                Update Candidate Details
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Candidate Information
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Name:</strong> {workflow.candidateName}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Email:</strong> {workflow.application?.candidateEmail}
              </Typography>
              {workflow.candidateDetails?.currentSalary && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Current Salary:</strong> ${workflow.candidateDetails.currentSalary}
                </Typography>
              )}
              {workflow.candidateDetails?.expectedSalary && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Expected Salary:</strong> ${workflow.candidateDetails.expectedSalary}
                </Typography>
              )}
              {workflow.candidateDetails?.noticePeriod && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Notice Period:</strong> {workflow.candidateDetails.noticePeriod}
                </Typography>
              )}
              {workflow.application?.resume && (
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={() => window.open(`http://localhost:5000/${workflow.application.resume.path}`)}
                  sx={{ mt: 1 }}
                >
                  Download Resume
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Campaign Details
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Name:</strong> {workflow.campaign?.name}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Description:</strong> {workflow.campaign?.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Job Description:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                {workflow.campaign?.jobDescription}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Workflow History */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Workflow History
            </Typography>
            {renderWorkflowHistory()}
          </Paper>
        </Grid>
      </Grid>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentAction && currentAction.charAt(0).toUpperCase() + currentAction.slice(1).replace('-', ' ')}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {renderDialogContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={
              currentAction === 'interview1-setup' && 
              (!formData.assignedPanel || !selectedTimeSlot)
            }
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WorkflowDetail;
