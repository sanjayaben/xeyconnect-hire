import React from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
} from '@mui/material';
import {
  People as PeopleIcon,
  Campaign as CampaignIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

const StatCard = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            p: 1,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Campaigns"
            value="5"
            icon={<CampaignIcon sx={{ color: 'white' }} />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Applications"
            value="23"
            icon={<PeopleIcon sx={{ color: 'white' }} />}
            color="#388e3c"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Workflows"
            value="12"
            icon={<AssignmentIcon sx={{ color: 'white' }} />}
            color="#f57c00"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed Hires"
            value="8"
            icon={<CheckCircleIcon sx={{ color: 'white' }} />}
            color="#7b1fa2"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activities
            </Typography>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • John Doe - Interview 1 scheduled for Software Engineer position
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Jane Smith - Technical test submitted for Data Analyst role
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Mike Johnson - Onboarding completed for DevOps Engineer
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Sarah Wilson - Application received for UI/UX Designer
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Create new hiring campaign
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Set up interview panel
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Review pending applications
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Schedule interviews
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
