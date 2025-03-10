import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Button } from 'react-native';
import { useJobs } from '../../context/JobContext';
import { useTheme } from '../../context/ThemeContext';

export default function ActiveJobsScreen() {
  const { addJob, endJob, getActiveJobs, clockIn, clockOut, getCurrentWorkSession } = useJobs();
  const { isDarkMode } = useTheme();
  const [newJob, setNewJob] = useState({ name: '', description: '' });

  const currentSession = getCurrentWorkSession();
  const activeJobs = getActiveJobs();

  const startNewJob = () => {
    if (newJob.name.trim()) {
      addJob({
        name: newJob.name,
        description: newJob.description,
        startTime: new Date(),
        endTime: null,
      });
      setNewJob({ name: '', description: '' });
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.workSessionContainer, isDarkMode && styles.workSessionContainerDark]}>
        {currentSession?.clockOut || !currentSession ? (
          <TouchableOpacity
            style={[styles.sessionButton, styles.startSessionButton]}
            onPress={clockIn}
          >
            <Text style={styles.sessionButtonText}>Start Work Day</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sessionButton, styles.endSessionButton]}
            onPress={clockOut}
          >
            <Text style={styles.sessionButtonText}>End Work Day</Text>
          </TouchableOpacity>
        )}
      </View>

      {currentSession && !currentSession.clockOut ? (
        <>
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
            {activeJobs.map(job => (
              <View key={job.id} style={[styles.jobCard, isDarkMode && styles.jobCardDark]}>
                <Text style={[styles.jobName, isDarkMode && styles.textDark]}>{job.name}</Text>
                <Text style={[styles.description, isDarkMode && styles.descriptionDark]}>{job.description}</Text>
                <Text style={[styles.timeText, isDarkMode && styles.textDark]}>
                  Started: {job.startTime.toLocaleTimeString()}
                </Text>
                <TouchableOpacity 
                  style={styles.endButton}
                  onPress={() => endJob(job.id)}
                >
                  <Text style={styles.endButtonText}>End Job</Text>
                </TouchableOpacity>
              </View>
            ))}
            {activeJobs.length === 0 && (
              <Text style={[styles.emptyState, isDarkMode && styles.textDark]}>No active jobs</Text>
            )}
          </ScrollView>
        </>
      ) : (
        <View style={styles.startWorkPrompt}>
          <Text style={[styles.startWorkText, isDarkMode && styles.textDark]}>
            {currentSession?.clockOut 
              ? "Work day has ended. Start a new work day to add jobs."
              : "Start your work day to begin tracking jobs."
            }
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  jobName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
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
  workSessionContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
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
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  workSessionContainerDark: {
    backgroundColor: '#2d2d2d',
  },
  textDark: {
    color: '#fff',
  },
  inputDark: {
    borderColor: '#444',
    backgroundColor: '#2d2d2d',
    color: '#fff',
  },
  jobCardDark: {
    backgroundColor: '#2d2d2d',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  description: {
    color: '#666',
  },
  descriptionDark: {
    color: '#aaa',
  },
  timeText: {
    color: '#333',
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
  startWorkPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  startWorkText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});