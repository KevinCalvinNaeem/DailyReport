import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  Modal
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useJobs } from '../../context/JobContext';
import { useSettings } from '../../context/SettingsContext';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';


// Format time helper functions
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

const calculateTotalHours = (clockIn: Date, clockOut: Date) => {
  const diff = clockOut.getTime() - clockIn.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// Format work duration for display and copying
const formatWorkDuration = (clockIn: Date, clockOut: Date | null, jobs: any[]) => {
  if (!clockOut) return 'Work in progress...';
  
  const date = formatDate(clockIn);
  const inTime = formatTime(clockIn);
  const outTime = formatTime(clockOut);
  
  let text = `Date: ${date}\n\n`;
  text += `In-Time: ${inTime}\n\n`;
  
  // Format completed jobs
  const completedJobs = jobs.filter(job => job.endTime && 
    job.startTime >= clockIn && 
    job.endTime <= clockOut
  ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  completedJobs.forEach(job => {
    text += `(${formatTime(job.startTime)}--${formatTime(job.endTime)}) ${job.name}: ${job.description}\n`;
  });
  
  text += `\nOut-time: ${outTime}\n\n`;
  text += `Total working hours: ${calculateTotalHours(clockIn, clockOut)}`;
  
  return text;
};

// Copy text helper function
const copyToClipboard = async (text: string) => {
  try {
    await Clipboard.setStringAsync(text);
    Alert.alert('Success', 'Work duration copied to clipboard!');
  } catch (error) {
    Alert.alert('Error', 'Failed to copy to clipboard');
  }
};

// Calculate remaining time based on expected work hours
const calculateRemainingTime = (clockIn: Date, currentTime: Date, expectedHours: number) => {
  const workedMs = currentTime.getTime() - clockIn.getTime();
  const workedHours = workedMs / (1000 * 60 * 60);
  const remainingHours = Math.max(0, expectedHours - workedHours);
  
  const hours = Math.floor(remainingHours);
  const minutes = Math.floor((remainingHours % 1) * 60);
  
  if (remainingHours <= 0) {
    return 'Completed!';
  }
  
  return `${hours}h ${minutes}m`;
};

// Check if encouragement should be shown (when 1 hour or less remaining)
const shouldShowEncouragement = (clockIn: Date, currentTime: Date, expectedHours: number) => {
  const workedMs = currentTime.getTime() - clockIn.getTime();
  const workedHours = workedMs / (1000 * 60 * 60);
  const remainingHours = expectedHours - workedHours;
  
  return remainingHours > 0 && remainingHours <= 1;
};

// Calculate hours worked in hh:mm format
const calculateHoursWorked = (clockIn: Date, currentTime: Date) => {
  const diff = currentTime.getTime() - clockIn.getTime();
  
  // Handle case where diff might be negative or very small (just started)
  if (diff < 0) {
    return '00:00';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  // Ensure we don't show negative values
  const safeHours = Math.max(0, hours);
  const safeMinutes = Math.max(0, minutes);
  
  return `${safeHours.toString().padStart(2, '0')}:${safeMinutes.toString().padStart(2, '0')}`;
};

export default function ActiveJobsScreen() {
  const { addJob, endJob, getActiveJobs, clockIn, clockOut, getCurrentWorkSession, jobs, updateJob } = useJobs();
  const { isDarkMode, colors } = useTheme();
  const { expectedWorkHours } = useSettings();
  const [localJobs, setLocalJobs] = useState<any[]>([]);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modal state
  const [isJobModalVisible, setIsJobModalVisible] = useState(false);
  const [modalJob, setModalJob] = useState({ name: '', description: '' });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const currentSession = getCurrentWorkSession();

  // Update local jobs whenever the jobs array or work session changes
  useEffect(() => {
    const active = getActiveJobs();
    console.log('Effect: Updating local jobs', active);
    setLocalJobs(active);
  }, [jobs, currentSession, forceUpdate]);

  // Update current time every minute for live hours tracking
  useEffect(() => {
    // Set current time immediately
    setCurrentTime(new Date());
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Update current time when session changes
  useEffect(() => {
    if (currentSession) {
      setCurrentTime(new Date());
    }
  }, [currentSession]);

  const openNewJobModal = () => {
    setIsEditMode(false);
    setModalJob({ name: '', description: '' });
    setIsJobModalVisible(true);
  };

  const openEditJobModal = (job: any) => {
    setIsEditMode(true);
    setEditingJobId(job.id);
    setModalJob({ name: job.name, description: job.description });
    setIsJobModalVisible(true);
  };

  const handleModalSave = () => {
    if (modalJob.name.trim()) {
      if (isEditMode && editingJobId) {
        // Update existing job
        updateJob(editingJobId, {
          name: modalJob.name,
          description: modalJob.description
        });
      } else {
        // Create new job
        console.log('Starting new job:', modalJob);
        addJob({
          name: modalJob.name,
          description: modalJob.description,
          startTime: new Date(),
          endTime: null
        });
      }
      closeModal();
      setForceUpdate(prev => prev + 1);
    }
  };

  const closeModal = () => {
    setIsJobModalVisible(false);
    setModalJob({ name: '', description: '' });
    setIsEditMode(false);
    setEditingJobId(null);
  };

  const copyWorkTime = () => {
    if (currentSession?.clockOut) {
      const timeText = formatWorkDuration(currentSession.clockIn, currentSession.clockOut, jobs);
      copyToClipboard(timeText);
    }
  };

  // Debug renders
  console.log('Render - Current session:', currentSession);
  console.log('Render - Local jobs:', localJobs);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!currentSession || currentSession.clockOut ? (
        <View style={styles.welcomeContainer}>
          <Image 
            source={require('../../assets/images/productivity.png')}
            style={styles.welcomeImage}
            resizeMode="contain"
          />
          <View style={[styles.welcomeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Welcome to Daily Report
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Track your work hours and manage your daily tasks efficiently
            </Text>
            <TouchableOpacity
              style={[styles.startSessionButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => {
                clockIn();
                setForceUpdate(prev => prev + 1);
              }}
            >
              <Text style={[styles.startSessionButtonText, { color: '#FFFFFF' }]}>Start Work Day</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeNavButtons}>
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/history')}
            >
              <Text style={[styles.navButtonText, { color: colors.primary }]}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/settings')}
            >
              <Text style={[styles.navButtonText, { color: colors.primary }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={[styles.workSessionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.timeDisplayContainer}>
              <View style={styles.hoursWorkedContainer}>
                <Text style={[styles.hoursWorkedLabel, { color: colors.textSecondary }]}>Hours Worked:</Text>
                <Text style={[styles.hoursWorkedTime, { color: colors.primary }]}>
                  {calculateHoursWorked(currentSession.clockIn, currentTime)}
                </Text>
              </View>
              
              <View style={styles.remainingTimeContainer}>
                <Text style={[styles.remainingTimeLabel, { color: colors.textSecondary }]}>Remaining:</Text>
                <Text style={[styles.remainingTimeText, { color: colors.primary }]}>
                  {calculateRemainingTime(currentSession.clockIn, currentTime, expectedWorkHours)}
                </Text>
              </View>
            </View>
            
            {shouldShowEncouragement(currentSession.clockIn, currentTime, expectedWorkHours) && (
              <View style={styles.encouragementContainer}>
                <Text style={[styles.encouragementText, { color: colors.primary }]}>
                  Only 1hr remaining! You're almost there! 🎯
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.endSessionButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              onPress={() => {
                clockOut();
                setForceUpdate(prev => prev + 1);
              }}
            >
              <Text style={[styles.endSessionButtonText, { color: colors.error }]}>End Work Day</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <TouchableOpacity
              style={[styles.newJobButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={openNewJobModal}
            >
              <MaterialIcons name="add" size={24} color="#FFFFFF" />
              <Text style={[styles.newJobButtonText, { color: '#FFFFFF' }]}>Start New Job</Text>
            </TouchableOpacity>

            <ScrollView style={styles.jobList}>
              {localJobs.map(job => (
                <View
                  key={job.id}
                  style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <TouchableOpacity onPress={() => openEditJobModal(job)}>
                    <Text style={[styles.jobName, { color: colors.text }]}>{job.name}</Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                      {job.description}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                    Started: {formatTime(job.startTime)}
                  </Text>
                  <TouchableOpacity
                    style={[styles.endButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    onPress={() => {
                      endJob(job.id);
                      setForceUpdate(prev => prev + 1);
                    }}
                  >
                    <Text style={[styles.endButtonText, { color: colors.error }]}>End Job</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {localJobs.length === 0 && (
                <Text style={[styles.emptyState, { color: colors.textTertiary }]}>
                  No active jobs
                </Text>
              )}
            </ScrollView>
          </View>
        </>
      )}
      
      {/* Job Modal */}
      <Modal
        visible={isJobModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <BlurView
              intensity={20}
              tint={isDarkMode ? 'dark' : 'light'}
              style={styles.modalBlur}
            >
              <View style={styles.modalContent}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {isEditMode ? 'Edit Job' : 'New Job'}
                </Text>
                
                <TextInput
                  style={[styles.modalInput, { 
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  placeholder="Job Name"
                  placeholderTextColor={colors.textTertiary}
                  value={modalJob.name}
                  onChangeText={(text) => setModalJob(prev => ({ ...prev, name: text }))}
                  autoFocus
                />
                
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea, { 
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  placeholder="Job Description"
                  placeholderTextColor={colors.textTertiary}
                  value={modalJob.description}
                  onChangeText={(text) => setModalJob(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton, { 
                      backgroundColor: colors.backgroundSecondary, 
                      borderColor: colors.border 
                    }]}
                    onPress={closeModal}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalSaveButton, { 
                      backgroundColor: colors.primary, 
                      borderColor: colors.primary 
                    }]}
                    onPress={handleModalSave}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                      {isEditMode ? 'Save' : 'Start Job'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  content: {
    flex: 1,
  },
  workSessionContainer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputContainer: {
    gap: 12,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  jobList: {
    flex: 1,
  },
  jobCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  jobName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    marginBottom: 8,
    fontSize: 14,
  },
  timeText: {
    fontSize: 14,
  },
  startJobButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  startJobButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  endSessionButton: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  endSessionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  endButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    alignItems: 'center',
  },
  endButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  copyrightText: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeImage: {
    width: '90%',
    height: 300,
    marginBottom: 24,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  startSessionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  startSessionButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  welcomeNavButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  workTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 12,
    borderRadius: 8,
  },
  workTimeText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  workDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  workDurationText: {
    fontSize: 16,
    fontWeight: '500',
  },
  hoursWorkedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  hoursWorkedLabel: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  hoursWorkedTime: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  timeDisplayContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    marginVertical: 8,
    gap: 12,
  },
  remainingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  remainingTimeLabel: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  remainingTimeText: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  encouragementContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  encouragementText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  saveButton: {
    // Additional styles can be added here if needed
  },
  cancelButton: {
    // Additional styles can be added here if needed
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  newJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  newJobButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalBlur: {
    padding: 24,
  },
  modalContent: {
    gap: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelButton: {
    // Additional styles can be added here if needed
  },
  modalSaveButton: {
    // Additional styles can be added here if needed
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});