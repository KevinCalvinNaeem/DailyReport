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
    hour12: false
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
  const { isDarkMode } = useTheme();
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
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {!currentSession || currentSession.clockOut ? (
        <View style={styles.welcomeContainer}>
          <Image 
            source={require('../../assets/images/Productivity.png')}
            style={styles.welcomeImage}
            resizeMode="contain"
          />
          <View style={[styles.welcomeCard, isDarkMode && styles.welcomeCardDark]}>
            <Text style={[styles.welcomeTitle, isDarkMode && styles.textDark]}>
              Welcome to DailyReport
            </Text>
            <Text style={[styles.welcomeSubtitle, isDarkMode && styles.textDark]}>
              Click Start Work Day to track your working hours
            </Text>
            <TouchableOpacity
              style={[styles.sessionButton, styles.startSessionButton]}
              onPress={() => {
                clockIn();
                setForceUpdate(prev => prev + 1);
              }}
            >
              <Text style={styles.sessionButtonText}>Start Work Day</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeNavButtons}>
            <TouchableOpacity
              style={[styles.navButton, isDarkMode && styles.navButtonDark]}
              onPress={() => router.push('/history')}
            >
              <MaterialIcons name="history" size={24} color={isDarkMode ? '#fff' : '#2196F3'} />
              <Text style={[styles.navButtonText, isDarkMode && styles.navButtonTextDark]}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, isDarkMode && styles.navButtonDark]}
              onPress={() => router.push('/settings')}
            >
              <MaterialIcons name="settings" size={24} color={isDarkMode ? '#fff' : '#2196F3'} />
              <Text style={[styles.navButtonText, isDarkMode && styles.navButtonTextDark]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={[styles.workSessionContainer, isDarkMode && styles.workSessionContainerDark]}>
            <TouchableOpacity
              style={styles.workDurationContainer}
              onPress={() => {
                if (currentSession?.clockOut) {
                  const timeText = formatWorkDuration(currentSession.clockIn, currentSession.clockOut, jobs);
                  copyToClipboard(timeText);
                }
              }}
            >
              <Text style={[styles.workDurationText, isDarkMode && styles.textDark]}>
                {currentSession ? formatWorkDuration(currentSession.clockIn, currentSession.clockOut, jobs) : 'No active session'}
              </Text>
              <MaterialIcons 
                name="content-copy" 
                size={20} 
                color={isDarkMode ? '#fff' : '#666'} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sessionButton, styles.endSessionButton]}
              onPress={() => {
                clockOut();
                setForceUpdate(prev => prev + 1);
              }}
            >
              <Text style={styles.sessionButtonText}>End Work Day</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, isDarkMode && styles.inputDark]}
                placeholder="Job Name"
                placeholderTextColor={isDarkMode ? '#888' : '#666'}
                value={newJob.name}
                onChangeText={(text) => setNewJob(prev => ({ ...prev, name: text }))}
              />
              <TextInput
                style={[styles.input, isDarkMode && styles.inputDark]}
                placeholder="Job Description"
                placeholderTextColor={isDarkMode ? '#888' : '#666'}
                value={newJob.description}
                onChangeText={(text) => setNewJob(prev => ({ ...prev, description: text }))}
                multiline
              />
              <TouchableOpacity 
                style={[styles.startJobButton, isDarkMode && styles.startJobButtonDark]}
                onPress={startNewJob}
              >
                <Text style={styles.startJobButtonText}>Start New Job</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.jobList}>
              {localJobs.map(job => (
                <View
                  key={job.id}
                  style={[styles.jobCard, isDarkMode && styles.jobCardDark]}
                >
                  <Text style={[styles.jobName, isDarkMode && styles.textDark]}>{job.name}</Text>
                  <Text style={[styles.description, isDarkMode && styles.descriptionDark]}>
                    {job.description}
                  </Text>
                  <Text style={[styles.timeText, isDarkMode && styles.textDark]}>
                    Started: {formatTime(job.startTime)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.endButton}
                    onPress={() => {
                      endJob(job.id);
                      setForceUpdate(prev => prev + 1);
                    }}
                  >
                    <Text style={styles.endButtonText}>End Job</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {localJobs.length === 0 && (
                <Text style={[styles.emptyState, isDarkMode && styles.textDark]}>
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
    backgroundColor: '#fff',
    padding: 16,
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  workSessionContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  workSessionContainerDark: {
    backgroundColor: '#2d2d2d',
  },
  inputContainer: {
    gap: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#fff',
  },
  inputDark: {
    borderColor: '#444',
    backgroundColor: '#2d2d2d',
    color: '#fff',
  },
  jobList: {
    flex: 1,
  },
  jobCard: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  jobCardDark: {
    backgroundColor: '#2d2d2d',
  },
  jobName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
  },
  description: {
    color: '#666',
    marginBottom: 8,
  },
  descriptionDark: {
    color: '#aaa',
  },
  timeText: {
    color: '#333',
  },
  textDark: {
    color: '#fff',
  },
  sessionButton: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  startSessionButton: {
    backgroundColor: '#4CAF50',
  },
  endSessionButton: {
    backgroundColor: '#FF9800',
  },
  sessionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startJobButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startJobButtonDark: {
    backgroundColor: '#1976D2',
  },
  startJobButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  endButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    alignItems: 'center',
  },
  endButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyState: {
    textAlign: 'center',
    marginTop: 40,
    color: '#666',
    fontSize: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
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
    backgroundColor: '#f5f5f5',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeCardDark: {
    backgroundColor: '#2d2d2d',
  },
  welcomeNavButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  navButtonDark: {
    backgroundColor: '#2d2d2d',
  },
  navButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  navButtonTextDark: {
    color: '#fff',
  },
  workTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
  },
  workTimeText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
    color: '#000',
  },
  workDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: 'transparent',
    gap: 8,
  },
  workDurationText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});