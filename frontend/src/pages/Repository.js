import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import api from '../services/api';

const Repository = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: '',
    remarks: '',
  });
  const [showInactive, setShowInactive] = useState(false);

  // Fetch applications grouped by campaign
  const { data: applicationGroups = [], isLoading } = useQuery('applications', async () => {
    const response = await api.get('/applications');
    return response.data;
  });

  // Review application mutation
  const reviewApplicationMutation = useMutation(
    async ({ id, ...reviewData }) => {
      const response = await api.put(`/applications/${id}/review`, reviewData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('applications');
        enqueueSnackbar('Application reviewed successfully', { variant: 'success' });
        setReviewDialog(false);
        setSelectedApplication(null);
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.message || 'Failed to review application', { variant: 'error' });
      },
    }
  );

  const handleViewApplication = (application) => {
    setSelectedApplication(application);
  };

  const handleReview = (application, status) => {
    setSelectedApplication(application);
    setReviewData({ status, remarks: '' });
    setReviewDialog(true);
  };

  const handleReviewSubmit = () => {
    if (selectedApplication) {
      reviewApplicationMutation.mutate({
        id: selectedApplication._id,
        ...reviewData,
      });
    }
  };

  const handleDownloadResume = (application) => {
    // Create a download link for the resume
    const link = document.createElement('a');
    link.href = `http://localhost:5000/${application.resume.path}`;
    link.download = application.resume.filename;
    link.click();
  };

  const filteredGroups = applicationGroups.filter(group => 
    showInactive || group.campaign.status === 'Active'
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Application Repository
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Campaign Status</InputLabel>
          <Select
            value={showInactive ? 'all' : 'active'}
            onChange={(e) => setShowInactive(e.target.value === 'all')}
            label="Campaign Status"
          >
            <MenuItem value="active">Active Campaigns Only</MenuItem>
            <MenuItem value="all">All Campaigns</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {filteredGroups.map((group) => (
        <Accordion key={group.campaign._id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography variant="h6">
                {group.campaign.name}
              </Typography>
              <Chip
                label={group.campaign.status}
                color={group.campaign.status === 'Active' ? 'success' : 'default'}
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                ({group.applications.length} applications)
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {group.campaign.description}
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Candidate Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Applied Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.applications.map((application) => (
                    <TableRow key={application._id}>
                      <TableCell>{application.candidateName}</TableCell>
                      <TableCell>{application.candidateEmail}</TableCell>
                      <TableCell>
                        {format(new Date(application.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={application.status}
                          color={
                            application.status === 'Applied' ? 'default' :
                            application.status === 'Shortlisted' ? 'success' : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleViewApplication(application)}
                          title="View Details"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadResume(application)}
                          title="Download Resume"
                        >
                          <DownloadIcon />
                        </IconButton>
                        {application.status === 'Applied' && (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleReview(application, 'Shortlisted')}
                              title="Shortlist"
                            >
                              <CheckCircleIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReview(application, 'Rejected')}
                              title="Reject"
                            >
                              <CancelIcon />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Application Details Dialog */}
      <Dialog
        open={!!selectedApplication && !reviewDialog}
        onClose={() => setSelectedApplication(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Application Details</DialogTitle>
        <DialogContent>
          {selectedApplication && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedApplication.candidateName}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Email:</strong> {selectedApplication.candidateEmail}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Applied Date:</strong> {format(new Date(selectedApplication.createdAt), 'MMM dd, yyyy')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Status:</strong> {selectedApplication.status}
              </Typography>
              {selectedApplication.reviewedBy && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Reviewed by:</strong> {selectedApplication.reviewedBy.firstName} {selectedApplication.reviewedBy.lastName}
                </Typography>
              )}
              {selectedApplication.remarks && (
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Remarks:</strong> {selectedApplication.remarks}
                </Typography>
              )}
              <Typography variant="h6" gutterBottom>
                Campaign: {selectedApplication.campaign?.name}
              </Typography>
              <Typography variant="body2">
                {selectedApplication.campaign?.description}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedApplication(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Review Application - {selectedApplication?.candidateName}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Status: <strong>{reviewData.status}</strong>
          </Typography>
          <TextField
            fullWidth
            label="Remarks"
            multiline
            rows={4}
            value={reviewData.remarks}
            onChange={(e) => setReviewData({ ...reviewData, remarks: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)}>Cancel</Button>
          <Button onClick={handleReviewSubmit} variant="contained">
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Repository;
