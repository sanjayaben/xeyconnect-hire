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
  OutlinedInput,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSnackbar } from 'notistack';
import { format, startOfWeek, addDays, isSameDay, isToday, addWeeks, subWeeks } from 'date-fns';
import api from '../services/api';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const Panels = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]); // Track selected slots for current date
  const [editingPanel, setEditingPanel] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: [],
  });
  const [availabilityData, setAvailabilityData] = useState({
    timeSlots: [{ startTime: new Date(), endTime: new Date() }],
  });
  const [error, setError] = useState('');

  // Fetch panels
  const { data: panels = [], isLoading } = useQuery('panels', async () => {
    const response = await api.get('/panels');
    return response.data;
  });

  // Fetch users for panel members
  const { data: users = [] } = useQuery('users', async () => {
    const response = await api.get('/users');
    return response.data;
  });

  // Create panel mutation
  const createPanelMutation = useMutation(
    async (panelData) => {
      const response = await api.post('/panels', panelData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('panels');
        enqueueSnackbar('Panel created successfully', { variant: 'success' });
        handleClose();
      },
      onError: (error) => {
        setError(error.response?.data?.message || 'Failed to create panel');
      },
    }
  );

  // Update panel mutation
  const updatePanelMutation = useMutation(
    async ({ id, ...panelData }) => {
      const response = await api.put(`/panels/${id}`, panelData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('panels');
        enqueueSnackbar('Panel updated successfully', { variant: 'success' });
        handleClose();
      },
      onError: (error) => {
        setError(error.response?.data?.message || 'Failed to update panel');
      },
    }
  );

  // Delete panel mutation
  const deletePanelMutation = useMutation(
    async (id) => {
      await api.delete(`/panels/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('panels');
        enqueueSnackbar('Panel deleted successfully', { variant: 'success' });
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.message || 'Failed to delete panel', { variant: 'error' });
      },
    }
  );

  // Add availability mutation
  const addAvailabilityMutation = useMutation(
    async ({ panelId, availabilityData }) => {
      const response = await api.post(`/panels/${panelId}/availability`, availabilityData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('panels');
        enqueueSnackbar('Availability added successfully', { variant: 'success' });
        // Reset form but keep dialog open
        setAvailabilityData({ timeSlots: [{ startTime: new Date(), endTime: new Date() }] });
        // Update selected slots for visual feedback
        updateSelectedSlotsForDate(selectedDate);
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.message || 'Failed to add availability', { variant: 'error' });
      },
    }
  );

  // Delete availability mutation
  const deleteAvailabilityMutation = useMutation(
    async ({ panelId, availabilityId }) => {
      const response = await api.delete(`/panels/${panelId}/availability/${availabilityId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('panels');
        enqueueSnackbar('Availability deleted successfully', { variant: 'success' });
        // Update selected slots for visual feedback
        updateSelectedSlotsForDate(selectedDate);
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.message || 'Failed to delete availability', { variant: 'error' });
      },
    }
  );

  const handleOpen = (panel = null) => {
    if (panel) {
      setEditingPanel(panel);
      setFormData({
        name: panel.name,
        description: panel.description,
        members: panel.members.map(member => member._id),
      });
    } else {
      setEditingPanel(null);
      setFormData({
        name: '',
        description: '',
        members: [],
      });
    }
    setError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingPanel(null);
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
    if (editingPanel) {
      updatePanelMutation.mutate({ id: editingPanel._id, ...formData });
    } else {
      createPanelMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this panel?')) {
      deletePanelMutation.mutate(id);
    }
  };

  const handleManageAvailability = (panel) => {
    setSelectedPanel(panel);
    setSelectedDate(new Date());
    setCurrentWeek(new Date());
    setSelectedTimeSlots([]);
    setAvailabilityOpen(true);
  };

  const handleCloseAvailability = () => {
    setAvailabilityOpen(false);
    setSelectedPanel(null);
    setSelectedDate(new Date());
    setCurrentWeek(new Date());
    setSelectedTimeSlots([]);
  };

  // Update selected slots when date changes
  const updateSelectedSlotsForDate = (date) => {
    if (!selectedPanel) return;
    
    const availabilityForDate = selectedPanel.availability?.filter(avail => 
      isSameDay(new Date(avail.date), date)
    ) || [];
    
    const slots = [];
    availabilityForDate.forEach(avail => {
      avail.timeSlots?.forEach(slot => {
        slots.push({
          id: `${avail._id}-${slot.startTime}-${slot.endTime}`,
          availabilityId: avail._id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          date: avail.date
        });
      });
    });
    
    setSelectedTimeSlots(slots);
  };

  const handleAddTimeSlot = () => {
    setAvailabilityData({
      ...availabilityData,
      timeSlots: [...availabilityData.timeSlots, { startTime: new Date(), endTime: new Date() }],
    });
  };

  const handleRemoveTimeSlot = (index) => {
    const newTimeSlots = availabilityData.timeSlots.filter((_, i) => i !== index);
    setAvailabilityData({ ...availabilityData, timeSlots: newTimeSlots });
  };

  const handleTimeSlotChange = (index, field, value) => {
    const newTimeSlots = [...availabilityData.timeSlots];
    newTimeSlots[index][field] = value;
    setAvailabilityData({ ...availabilityData, timeSlots: newTimeSlots });
  };

  const formatTimeForAPI = (date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSubmitAvailability = () => {
    if (!selectedPanel || !selectedDate) return;

    const formattedTimeSlots = availabilityData.timeSlots.map(slot => ({
      startTime: formatTimeForAPI(slot.startTime),
      endTime: formatTimeForAPI(slot.endTime),
    }));

    addAvailabilityMutation.mutate({
      panelId: selectedPanel._id,
      availabilityData: {
        date: selectedDate.toISOString(),
        timeSlots: formattedTimeSlots,
      },
    });
  };

  const getWeekDays = (weekStart) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  };

  const goToPreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(startOfWeek(today, { weekStartsOn: 1 })); // Start week on Monday
    setSelectedDate(today);
  };

  const handleTimeSlotClick = async (day, timeSlot) => {
    if (!selectedPanel) return;

    // Update selected date if different
    if (!isSameDay(day, selectedDate)) {
      setSelectedDate(day);
      updateSelectedSlotsForDate(day);
    }

    // Check if this time slot already has availability
    const existingAvailability = selectedPanel?.availability?.find(avail => 
      isSameDay(new Date(avail.date), day) && 
      avail.timeSlots?.some(slot => 
        slot.startTime <= timeSlot.time && 
        slot.endTime > timeSlot.endTime
      )
    );

    if (existingAvailability) {
      // Find the specific time slot to delete
      const slotToDelete = existingAvailability.timeSlots?.find(slot => 
        slot.startTime <= timeSlot.time && slot.endTime > timeSlot.endTime
      );
      
      if (slotToDelete && window.confirm(`Delete availability for ${timeSlot.time} - ${timeSlot.endTime}?`)) {
        try {
          // If this availability has only one time slot, delete the entire availability
          if (existingAvailability.timeSlots.length === 1) {
            await deleteAvailabilityMutation.mutateAsync({
              panelId: selectedPanel._id,
              availabilityId: existingAvailability._id,
            });
          } else {
            // Otherwise, we'd need an API to remove just this time slot
            // For now, show a message to use the form below
            enqueueSnackbar('Use the form below to modify existing availability with multiple slots', { variant: 'info' });
          }
        } catch (error) {
          console.error('Failed to delete availability:', error);
        }
      }
      return;
    }

    // Check if slot is already in temporary selection
    const isAlreadySelected = selectedTimeSlots.some(slot =>
      slot.startTime === timeSlot.time && slot.endTime === timeSlot.endTime
    );

    if (isAlreadySelected) {
      // Remove from temporary selection
      setSelectedTimeSlots(prev => 
        prev.filter(slot => !(slot.startTime === timeSlot.time && slot.endTime === timeSlot.endTime))
      );
      return;
    }

    // Add to temporary selection and save immediately
    const newSlot = {
      startTime: timeSlot.time,
      endTime: timeSlot.endTime,
    };

    // Update visual state immediately
    setSelectedTimeSlots(prev => [...prev, newSlot]);

    // Add new 30-minute availability slot
    const startTime = new Date();
    const [hours, minutes] = timeSlot.time.split(':').map(Number);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30);

    const formattedTimeSlot = {
      startTime: formatTimeForAPI(startTime),
      endTime: formatTimeForAPI(endTime),
    };

    try {
      await addAvailabilityMutation.mutateAsync({
        panelId: selectedPanel._id,
        availabilityData: {
          date: day.toISOString(),
          timeSlots: [formattedTimeSlot],
        },
      });
      
      // Remove from temporary selection after successful save
      setSelectedTimeSlots(prev => 
        prev.filter(slot => !(slot.startTime === timeSlot.time && slot.endTime === timeSlot.endTime))
      );
    } catch (error) {
      console.error('Failed to add availability:', error);
      // Remove from temporary selection on error
      setSelectedTimeSlots(prev => 
        prev.filter(slot => !(slot.startTime === timeSlot.time && slot.endTime === timeSlot.endTime))
      );
    }
  };

  const renderCalendarView = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start week on Monday
    const weekDays = getWeekDays(weekStart);
    
    // Generate 30-minute time slots from 9 AM to 6 PM
    const timeSlots = [];
    for (let hour = 9; hour <= 17; hour++) {
      // Add :00 slot
      timeSlots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        endTime: `${hour.toString().padStart(2, '0')}:30`,
        displayTime: hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`
      });
      
      // Add :30 slot (except for the last hour to avoid going past 6 PM)
      if (hour < 17) {
        timeSlots.push({
          time: `${hour.toString().padStart(2, '0')}:30`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          displayTime: hour === 11 ? '11:30 AM' : hour === 12 ? '12:30 PM' : hour > 12 ? `${hour - 12}:30 PM` : `${hour}:30 AM`
        });
      }
    }

    const getAvailabilityForDayAndTime = (day, timeSlot) => {
      return selectedPanel?.availability?.find(avail => 
        isSameDay(new Date(avail.date), day) && 
        avail.timeSlots?.some(slot => 
          slot.startTime <= timeSlot.time && slot.endTime > timeSlot.time
        )
      );
    };

    return (
      <Box>
        {/* Calendar Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            {format(weekStart, 'MMMM yyyy')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" onClick={goToToday}>Today</Button>
            <IconButton onClick={goToPreviousWeek}>
              <ChevronLeftIcon />
            </IconButton>
            <IconButton onClick={goToNextWeek}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Calendar Grid with Time Slots */}
        <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 600, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 100, bgcolor: 'background.paper', fontWeight: 'bold' }}>
                  Time
                </TableCell>
                {weekDays.map((day) => (
                  <TableCell 
                    key={day.toISOString()} 
                    align="center"
                    sx={{ 
                      bgcolor: isToday(day) ? 'primary.light' : 'background.paper',
                      color: isToday(day) ? 'primary.contrastText' : 'text.primary',
                      fontWeight: 'bold',
                      minWidth: 120
                    }}
                  >
                    <Box>
                      <Typography variant="caption" display="block">
                        {format(day, 'EEE')}
                      </Typography>
                      <Typography variant="h6">
                        {format(day, 'd')}
                      </Typography>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {timeSlots.map((timeSlot) => (
                <TableRow key={timeSlot.time}>
                  <TableCell 
                    sx={{ 
                      bgcolor: 'grey.50', 
                      borderRight: 1, 
                      borderColor: 'divider',
                      fontWeight: 'bold',
                      fontSize: '0.75rem'
                    }}
                  >
                    {timeSlot.displayTime}
                  </TableCell>
                  {weekDays.map((day) => {
                    const hasAvailability = getAvailabilityForDayAndTime(day, timeSlot);
                    const isSelected = isSameDay(day, selectedDate);
                    const isTimeSlotSelected = selectedTimeSlots.some(slot =>
                      slot.startTime === timeSlot.time && 
                      slot.endTime === timeSlot.endTime
                    );

                    return (
                      <TableCell 
                        key={`${day.toISOString()}-${timeSlot.time}`}
                        sx={{ 
                          height: 40,
                          cursor: 'pointer',
                          bgcolor: hasAvailability ? 'success.light' : 
                                   isTimeSlotSelected ? 'primary.light' :
                                   isSelected ? 'action.selected' : 'background.paper',
                          border: 1,
                          borderColor: hasAvailability ? 'success.main' :
                                       isTimeSlotSelected ? 'primary.main' : 'divider',
                          p: 0.5,
                          '&:hover': {
                            bgcolor: hasAvailability ? 'success.main' : 
                                     isTimeSlotSelected ? 'primary.main' :
                                     isSelected ? 'action.selected' : 'action.hover',
                            '& .slot-indicator': {
                              display: 'block'
                            }
                          },
                          position: 'relative'
                        }}
                        onClick={() => handleTimeSlotClick(day, timeSlot)}
                      >
                        {hasAvailability ? (
                          <Tooltip title={`Click to delete: ${timeSlot.time} - ${timeSlot.endTime}`}>
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                bgcolor: 'success.main',
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'success.contrastText',
                                fontSize: '0.7rem'
                              }}
                            >
                              ✓
                            </Box>
                          </Tooltip>
                        ) : isTimeSlotSelected ? (
                          <Tooltip title={`Selected: ${timeSlot.time} - ${timeSlot.endTime}`}>
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                bgcolor: 'primary.main',
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'primary.contrastText',
                                fontSize: '0.7rem'
                              }}
                            >
                              ●
                            </Box>
                          </Tooltip>
                        ) : (
                          <Box
                            className="slot-indicator"
                            sx={{
                              display: 'none',
                              width: '100%',
                              height: '100%',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.8rem',
                              color: 'primary.main',
                              fontWeight: 'bold'
                            }}
                          >
                            +
                          </Box>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Selected Date Info */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Panel Availability Overview
          </Typography>
          
          {/* Show all availability across all dates */}
          {selectedPanel?.availability && selectedPanel.availability.length > 0 ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'success.main' }}>
                All Scheduled Availability:
              </Typography>
              {selectedPanel.availability
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map((avail, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      {format(new Date(avail.date), 'EEEE, MMMM d, yyyy')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {avail.timeSlots?.map((slot, slotIndex) => (
                        <Chip
                          key={slotIndex}
                          label={`${slot.startTime} - ${slot.endTime}`}
                          color="success"
                          variant="outlined"
                          size="small"
                          onDelete={() => {
                            if (window.confirm(`Delete availability for ${format(new Date(avail.date), 'MMM d')} at ${slot.startTime} - ${slot.endTime}?`)) {
                              if (avail.timeSlots.length === 1) {
                                deleteAvailabilityMutation.mutate({
                                  panelId: selectedPanel._id,
                                  availabilityId: avail._id,
                                });
                              } else {
                                enqueueSnackbar('Use the form below to modify availability with multiple slots', { variant: 'info' });
                              }
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                ))
              }
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              No availability scheduled. Click on the calendar above to add time slots.
            </Alert>
          )}

          {/* Currently selected date section */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>
            Quick Add for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </Typography>

          {/* Show existing availability for selected date */}
          {selectedPanel?.availability
            ?.filter(avail => isSameDay(new Date(avail.date), selectedDate))
            ?.map((avail, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main' }}>
                  Today's Availability:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {avail.timeSlots?.map((slot, slotIndex) => (
                    <Chip
                      key={slotIndex}
                      label={`${slot.startTime} - ${slot.endTime}`}
                      color="success"
                      variant="filled"
                      sx={{ mr: 1, mb: 1 }}
                      onDelete={() => {
                        if (window.confirm(`Delete availability for ${slot.startTime} - ${slot.endTime}?`)) {
                          if (avail.timeSlots.length === 1) {
                            deleteAvailabilityMutation.mutate({
                              panelId: selectedPanel._id,
                              availabilityId: avail._id,
                            });
                          } else {
                            enqueueSnackbar('Use the form below to modify availability with multiple slots', { variant: 'info' });
                          }
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            ))
          }

          {/* Show currently selected slots from state */}
          {selectedTimeSlots.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
                Currently Selected (Being processed...):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedTimeSlots.map((slot, index) => (
                  <Chip
                    key={index}
                    label={`${slot.startTime} - ${slot.endTime}`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Quick Add Form for bulk operations */}
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Advanced Time Slot Management</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Time Slots</Typography>
              
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                {availabilityData.timeSlots.map((slot, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <TimePicker
                      label="Start Time"
                      value={slot.startTime}
                      onChange={(newValue) => handleTimeSlotChange(index, 'startTime', newValue)}
                      renderInput={(params) => <TextField {...params} size="small" />}
                    />
                    <Typography>-</Typography>
                    <TimePicker
                      label="End Time"
                      value={slot.endTime}
                      onChange={(newValue) => handleTimeSlotChange(index, 'endTime', newValue)}
                      renderInput={(params) => <TextField {...params} size="small" />}
                    />
                    <IconButton 
                      color="error" 
                      onClick={() => handleRemoveTimeSlot(index)}
                      disabled={availabilityData.timeSlots.length === 1}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
              </LocalizationProvider>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button 
                  startIcon={<AddIcon />} 
                  onClick={handleAddTimeSlot}
                  variant="outlined"
                  size="small"
                >
                  Add Time Slot
                </Button>
                <Button 
                  variant="contained" 
                  onClick={handleSubmitAvailability}
                  disabled={addAvailabilityMutation.isLoading}
                >
                  Save Availability
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Paper>

        {/* Legend */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Legend & Instructions</Typography>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 20, 
                height: 20, 
                bgcolor: 'success.light', 
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'success.contrastText',
                fontSize: '0.7rem'
              }}>
                ✓
              </Box>
              <Typography variant="caption">Available (30min slot)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 20, 
                height: 20, 
                bgcolor: 'action.hover', 
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>
                +
              </Box>
              <Typography variant="caption">Click to add 30min slot</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, bgcolor: 'action.selected', borderRadius: 1 }} />
              <Typography variant="caption">Selected Date</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, bgcolor: 'primary.light', borderRadius: 1 }} />
              <Typography variant="caption">Today</Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
            💡 Click any empty time slot to quickly add 30-minute availability, or use the form below for custom durations.
          </Typography>
        </Paper>
      </Box>
    );
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Interview Panels
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Panel
        </Button>
      </Box>

      <Grid container spacing={3}>
        {panels.map((panel) => (
          <Grid item xs={12} md={6} lg={4} key={panel._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="h2">
                    {panel.name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {panel.description}
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Members:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {panel.members.map((member) => (
                    <Chip
                      key={member._id}
                      label={`${member.firstName} ${member.lastName}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpen(panel)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  startIcon={<ScheduleIcon />}
                  onClick={() => handleManageAvailability(panel)}
                >
                  Availability
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDelete(panel._id)}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPanel ? 'Edit Panel' : 'Add New Panel'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              required
              fullWidth
              label="Panel Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              required
              fullWidth
              label="Description"
              name="description"
              multiline
              rows={3}
              value={formData.description}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Members</InputLabel>
              <Select
                multiple
                name="members"
                value={formData.members}
                onChange={handleChange}
                input={<OutlinedInput label="Members" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const user = users.find(u => u._id === value);
                      return (
                        <Chip
                          key={value}
                          label={user ? `${user.firstName} ${user.lastName}` : value}
                        />
                      );
                    })}
                  </Box>
                )}
                MenuProps={MenuProps}
              >
                {users.map((user) => (
                  <MenuItem key={user._id} value={user._id}>
                    {user.firstName} {user.lastName} - {user.designation}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingPanel ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Availability Management Dialog */}
      <Dialog open={availabilityOpen} onClose={handleCloseAvailability} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon />
            Manage Availability - {selectedPanel?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {renderCalendarView()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAvailability}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Panels;
