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
  Platform
} from 'react-native';
import { useJobs } from '../../context/JobContext';
import { useTheme } from '../../context/ThemeContext';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';


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

export default function ActiveJobsScreen() {
  const { addJob, endJob, getActiveJobs, clockIn, clockOut, getCurrentWorkSession, jobs } = useJobs();
  const { isDarkMode, colors } = useTheme();
  const [newJob, setNewJob] = useState({ name: '', description: '' });
  const [localJobs, setLocalJobs] = useState<any[]>([]);
  const [forceUpdate, setForceUpdate] = useState(0);

  const currentSession = getCurrentWorkSession();

  // Update local jobs whenever the jobs array or work session changes
  useEffect(() => {
    const active = getActiveJobs();
    console.log('Effect: Updating local jobs', active);
    setLocalJobs(active);
  }, [jobs, currentSession, forceUpdate]);

  const startNewJob = () => {
    if (newJob.name.trim()) {
      console.log('Starting new job:', newJob);
      addJob({
        name: newJob.name,
        description: newJob.description,
        startTime: new Date(),
        endTime: null
      });
      setNewJob({ name: '', description: '' });
      // Force a re-render
      setForceUpdate(prev => prev + 1);
    }
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
            <TouchableOpacity
              style={styles.workDurationContainer}
              onPress={() => {
                if (currentSession?.clockOut) {
                  const timeText = formatWorkDuration(currentSession.clockIn, currentSession.clockOut, jobs);
                  copyToClipboard(timeText);
                }
              }}
            >
              <Text style={[styles.workDurationText, { color: colors.text }]}>
                {currentSession ? formatWorkDuration(currentSession.clockIn, currentSession.clockOut, jobs) : 'No active session'}
              </Text>
              <MaterialIcons 
                name="content-copy" 
                size={20} 
                color={colors.primary} 
              />
            </TouchableOpacity>
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
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                placeholder="Job Name"
                placeholderTextColor={colors.textTertiary}
                value={newJob.name}
                onChangeText={(text) => setNewJob(prev => ({ ...prev, name: text }))}
              />
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                placeholder="Job Description"
                placeholderTextColor={colors.textTertiary}
                value={newJob.description}
                onChangeText={(text) => setNewJob(prev => ({ ...prev, description: text }))}
                multiline
              />
              <TouchableOpacity
                style={[styles.startJobButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={startNewJob}
              >
                <Text style={[styles.startJobButtonText, { color: '#FFFFFF' }]}>Start New Job</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.jobList}>
              {localJobs.map(job => (
                <View
                  key={job.id}
                  style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.jobName, { color: colors.text }]}>{job.name}</Text>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {job.description}
                  </Text>
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
});