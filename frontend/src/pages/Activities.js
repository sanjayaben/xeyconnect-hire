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
  Box,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';

const getStageColor = (stage) => {
  switch (stage) {
    case 'Interview 1 - Set up':
      return 'warning';
    case 'Interview 1':
      return 'info';
    case 'Technical Test - Set up':
    case 'Technical Test - Scheduled':
    case 'Technical Test - Review':
      return 'secondary';
    case 'Onboarding':
      return 'primary';
    case 'Completed':
      return 'success';
    case 'Rejected':
      return 'error';
    default:
      return 'default';
  }
};

const Activities = () => {
  const navigate = useNavigate();
  const [groupBy, setGroupBy] = useState('date');

  // Fetch workflows
  const { data: workflows = [], isLoading } = useQuery(['workflows', groupBy], async () => {
    const response = await api.get(`/workflows?groupBy=${groupBy}`);
    return response.data;
  });

  const handleWorkflowClick = (workflowId) => {
    navigate(`/workflow/${workflowId}`);
  };

  if (isLoading) return <div>Loading...</div>;

  const renderWorkflowTable = (workflowList) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Campaign</TableCell>
            <TableCell>Candidate</TableCell>
            <TableCell>Current Stage</TableCell>
            <TableCell>Next Activity Date</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {workflowList.map((workflow) => (
            <TableRow key={workflow._id}>
              <TableCell>{workflow.campaign?.name}</TableCell>
              <TableCell>{workflow.candidateName}</TableCell>
              <TableCell>
                <Chip
                  label={workflow.currentStage}
                  color={getStageColor(workflow.currentStage)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {workflow.nextActivityDate
                  ? format(new Date(workflow.nextActivityDate), 'MMM dd, yyyy')
                  : '-'
                }
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleWorkflowClick(workflow._id)}
                >
                  View Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Activities
          </Typography>
        </Box>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Group By</InputLabel>
          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            label="Group By"
          >
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="none">No Grouping</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {groupBy === 'date' && typeof workflows === 'object' && !Array.isArray(workflows) ? (
        // Grouped by date view
        Object.entries(workflows).map(([date, workflowList]) => (
          <Accordion key={date} sx={{ mb: 2 }} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6">
                  {date === 'No Date' ? 'No Scheduled Date' : format(new Date(date), 'EEEE, MMM dd, yyyy')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({workflowList.length} activities)
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {renderWorkflowTable(workflowList)}
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        // Regular table view
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            All Activities ({Array.isArray(workflows) ? workflows.length : 0})
          </Typography>
          {renderWorkflowTable(Array.isArray(workflows) ? workflows : [])}
        </Box>
      )}

      {((groupBy === 'date' && Object.keys(workflows).length === 0) || 
        (groupBy !== 'date' && workflows.length === 0)) && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No activities found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Activities will appear here when candidates are shortlisted.
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default Activities;
