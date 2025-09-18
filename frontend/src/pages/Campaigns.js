import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Work as WorkIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSnackbar } from 'notistack';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';

const Campaigns = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    description: '',
    jobDescription: '',
    numberOfPositions: 1,
    status: 'Active',
    workflow: '',
  });
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [error, setError] = useState('');

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery('campaigns', async () => {
    const response = await api.get('/campaigns');
    return response.data;
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation(
    async (campaignData) => {
      const formData = new FormData();
      Object.keys(campaignData).forEach(key => {
        if (key !== 'jobDescriptionFile') {
          formData.append(key, campaignData[key]);
        }
      });
      if (campaignData.jobDescriptionFile) {
        formData.append('jobDescriptionFile', campaignData.jobDescriptionFile);
      }
      
      const response = await api.post('/campaigns', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('campaigns');
        enqueueSnackbar('Campaign created successfully', { variant: 'success' });
        handleClose();
      },
      onError: (error) => {
        setError(error.response?.data?.message || 'Failed to create campaign');
      },
    }
  );

  // Update campaign mutation
  const updateCampaignMutation = useMutation(
    async ({ id, ...campaignData }) => {
      const formData = new FormData();
      Object.keys(campaignData).forEach(key => {
        if (key !== 'jobDescriptionFile') {
          formData.append(key, campaignData[key]);
        }
      });
      if (campaignData.jobDescriptionFile) {
        formData.append('jobDescriptionFile', campaignData.jobDescriptionFile);
      }
      
      const response = await api.put(`/campaigns/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('campaigns');
        enqueueSnackbar('Campaign updated successfully', { variant: 'success' });
        handleClose();
      },
      onError: (error) => {
        setError(error.response?.data?.message || 'Failed to update campaign');
      },
    }
  );

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation(
    async (id) => {
      await api.delete(`/campaigns/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('campaigns');
        enqueueSnackbar('Campaign deleted successfully', { variant: 'success' });
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.message || 'Failed to delete campaign', { variant: 'error' });
      },
    }
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setJobDescriptionFile(acceptedFiles[0]);
    },
  });

  const handleOpen = (campaign = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name,
        client: campaign.client || '',
        description: campaign.description,
        jobDescription: campaign.jobDescription,
        numberOfPositions: campaign.numberOfPositions,
        status: campaign.status,
        workflow: campaign.workflow || '',
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: '',
        client: '',
        description: '',
        jobDescription: '',
        numberOfPositions: 1,
        status: 'Active',
        workflow: '',
      });
    }
    setJobDescriptionFile(null);
    setError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCampaign(null);
    setJobDescriptionFile(null);
    setError('');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (jobDescriptionFile) {
      submitData.jobDescriptionFile = jobDescriptionFile;
    }
    
    if (editingCampaign) {
      updateCampaignMutation.mutate({ id: editingCampaign._id, ...submitData });
    } else {
      createCampaignMutation.mutate(submitData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      deleteCampaignMutation.mutate(id);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Hiring Campaigns
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Campaign
        </Button>
      </Box>

      <Grid container spacing={3}>
        {campaigns.map((campaign) => (
          <Grid item xs={12} md={6} lg={4} key={campaign._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="h2">
                    {campaign.name}
                  </Typography>
                </Box>
                {campaign.client && (
                  <Typography variant="body2" color="primary" sx={{ mb: 1, fontWeight: 'medium' }}>
                    <strong>Client:</strong> {campaign.client}
                  </Typography>
                )}
                {campaign.workflow && (
                  <Typography variant="body2" color="secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
                    <strong>Workflow:</strong> {campaign.workflow}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {campaign.description}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Positions:</strong> {campaign.numberOfPositions}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Created by:</strong> {campaign.createdBy?.firstName} {campaign.createdBy?.lastName}
                  </Typography>
                </Box>
                <Chip
                  label={campaign.status}
                  color={campaign.status === 'Active' ? 'success' : 'default'}
                  size="small"
                />
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpen(campaign)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDelete(campaign._id)}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCampaign ? 'Edit Campaign' : 'Add New Campaign'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Campaign Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Client</InputLabel>
                  <Select
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    label="Client"
                  >
                    <MenuItem value="Bourque Logistics (BL)">Bourque Logistics (BL)</MenuItem>
                    <MenuItem value="Industrial Networks (INET)">Industrial Networks (INET)</MenuItem>
                    <MenuItem value="Tank and Container Management Systems (TCMS)">Tank and Container Management Systems (TCMS)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Hiring Workflow</InputLabel>
                  <Select
                    name="workflow"
                    value={formData.workflow}
                    onChange={handleChange}
                    label="Hiring Workflow"
                  >
                    <MenuItem value="workflow1">Workflow 1</MenuItem>
                    <MenuItem value="workflow2">Workflow 2</MenuItem>
                    <MenuItem value="workflow3">Workflow 3</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Description"
                  name="description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Job Description"
                  name="jobDescription"
                  multiline
                  rows={5}
                  value={formData.jobDescription}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Number of Positions"
                  name="numberOfPositions"
                  type="number"
                  value={formData.numberOfPositions}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label="Status"
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Job Description File (Optional)
                </Typography>
                <Paper
                  {...getRootProps()}
                  sx={{
                    p: 3,
                    border: '2px dashed',
                    borderColor: isDragActive ? 'primary.main' : 'grey.300',
                    backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <input {...getInputProps()} />
                  <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  {jobDescriptionFile ? (
                    <Typography variant="body2">
                      Selected: {jobDescriptionFile.name}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Drag & drop a job description file here, or click to select
                      <br />
                      (PDF, DOC, DOCX files only)
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingCampaign ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Campaigns;
