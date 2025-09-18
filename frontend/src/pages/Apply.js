import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  AppBar,
  Toolbar,
  Link,
} from '@mui/material';
import {
  Work as WorkIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from 'react-query';
import { useSnackbar } from 'notistack';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';

const Apply = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [formData, setFormData] = useState({
    candidateName: '',
    candidateEmail: '',
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [error, setError] = useState('');

  // Fetch active campaigns
  const { data: campaigns = [], isLoading } = useQuery('activeCampaigns', async () => {
    const response = await api.get('/campaigns?status=Active');
    return response.data;
  });

  // Apply mutation
  const applyMutation = useMutation(
    async (applicationData) => {
      const formData = new FormData();
      formData.append('campaignId', applicationData.campaignId);
      formData.append('candidateName', applicationData.candidateName);
      formData.append('candidateEmail', applicationData.candidateEmail);
      formData.append('resume', applicationData.resume);
      
      const response = await api.post('/applications/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        enqueueSnackbar('Application submitted successfully!', { variant: 'success' });
        setSelectedCampaign(null);
        setFormData({ candidateName: '', candidateEmail: '' });
        setResumeFile(null);
        setError('');
      },
      onError: (error) => {
        setError(error.response?.data?.message || 'Failed to submit application');
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
      setResumeFile(acceptedFiles[0]);
    },
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedCampaign) {
      setError('Please select a campaign');
      return;
    }
    
    if (!resumeFile) {
      setError('Please upload your resume');
      return;
    }

    applyMutation.mutate({
      campaignId: selectedCampaign._id,
      candidateName: formData.candidateName,
      candidateEmail: formData.candidateEmail,
      resume: resumeFile,
    });
  };

  const handleApply = (campaign) => {
    setSelectedCampaign(campaign);
    setError('');
  };

  const handleBack = () => {
    setSelectedCampaign(null);
    setError('');
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            XeyConnect Hire - Apply for Positions
          </Typography>
          <Link component={RouterLink} to="/login" color="inherit" underline="hover">
            Employee Login
          </Link>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {!selectedCampaign ? (
          // Campaign selection view
          <Box>
            <Typography variant="h3" component="h1" gutterBottom align="center">
              Join Our Team
            </Typography>
            <Typography variant="h6" component="p" gutterBottom align="center" color="text.secondary">
              Explore our open positions and apply today
            </Typography>

            <Grid container spacing={3} sx={{ mt: 4 }}>
              {campaigns.map((campaign) => (
                <Grid item xs={12} md={6} lg={4} key={campaign._id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" component="h2">
                          {campaign.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {campaign.description}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Positions Available:</strong> {campaign.numberOfPositions}
                      </Typography>
                      <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Job Description:</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {campaign.jobDescription}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => handleApply(campaign)}
                      >
                        Apply Now
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {campaigns.length === 0 && (
              <Paper sx={{ p: 4, textAlign: 'center', mt: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  No active positions available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please check back later for new opportunities.
                </Typography>
              </Paper>
            )}
          </Box>
        ) : (
          // Application form view
          <Box>
            <Button onClick={handleBack} sx={{ mb: 3 }}>
              ← Back to Positions
            </Button>
            
            <Paper sx={{ p: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                Apply for {selectedCampaign.name}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {selectedCampaign.description}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Full Name"
                      name="candidateName"
                      value={formData.candidateName}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Email Address"
                      name="candidateEmail"
                      type="email"
                      value={formData.candidateEmail}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      Upload Your Resume
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
                      {resumeFile ? (
                        <Typography variant="body1">
                          Selected: {resumeFile.name}
                        </Typography>
                      ) : (
                        <Typography variant="body1" color="text.secondary">
                          Drag & drop your resume here, or click to select
                          <br />
                          (PDF, DOC, DOCX files only)
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={applyMutation.isLoading}
                    >
                      {applyMutation.isLoading ? 'Submitting...' : 'Submit Application'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Apply;
