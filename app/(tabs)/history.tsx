import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Clipboard, Modal, TextInput, Platform, Animated } from 'react-native';
import { useJobs } from '../../context/JobContext';
import { useTheme } from '../../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { JobEntry, WorkSession } from '../../types/job';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef } from 'react';

export default function HistoryScreen() {
  const { getCompletedJobs, getWorkSessionForDate, clearHistory, updateJob, updateWorkSession } = useJobs();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const completedJobs = getCompletedJobs();
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [editingJob, setEditingJob] = useState<JobEntry | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [showSessionEditModal, setShowSessionEditModal] = useState(false);

  const toggleDate = (dateString: string) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setExpandedDates(prev => 
        prev.includes(dateString) 
          ? prev.filter(d => d !== dateString)
          : [...prev, dateString]
      );
      
      if (!expandedDates.includes(dateString)) {
        fadeAnim.setValue(0);
        slideAnim.setValue(0);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear all completed jobs and work sessions? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          onPress: clearHistory,
          style: "destructive"
        }
      ]
    );
  };

  const formatTimeForCopy = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateForCopy = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const copyDayDetails = (date: Date, workSession: WorkSession | null, jobs: JobEntry[]) => {
    if (!workSession) return;

    const dateStr = formatDateForCopy(date);
    const inTime = formatTimeForCopy(workSession.clockIn);
    
    const jobsText = jobs.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()).map(job => {
      const startTime = formatTimeForCopy(job.startTime);
      const endTime = job.endTime ? formatTimeForCopy(job.endTime) : 'ongoing';
      return `(${startTime}--${endTime}) ${job.name}: ${job.description}`;
    }).join('\n');

    const outTime = workSession.clockOut ? formatTimeForCopy(workSession.clockOut) : 'ongoing';
    const totalHours = workSession.clockOut ? 
      calculateDuration(workSession.clockIn, workSession.clockOut) : 
      'ongoing';

    const textToCopy = 
      `Date: ${dateStr}\n\n` +
      `In-Time: ${inTime}\n\n` +
      `${jobsText}\n\n` +
      `Out-time: ${outTime}\n\n` +
      `Total working hours: ${totalHours}`;

    Clipboard.setString(textToCopy);
    //Alert.alert('Copied', 'Day details copied to clipboard');
  };

  const calculateDuration = (start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) {
      return `${remainingMinutes}m`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (date.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const groupJobsByDate = (jobs: ReturnType<typeof getCompletedJobs>) => {
    const groups: { [key: string]: typeof jobs } = {};
    
    jobs.forEach(job => {
      if (!job.endTime) return;
      const dateKey = job.endTime.toISOString().split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(job);
    });

    return Object.entries(groups)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([date, jobs]) => ({
        date: new Date(date + 'T00:00:00.000Z'),
        jobs: jobs.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      }));
  };

  const formatTimeForInput = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const parseTimeInput = (timeStr: string, baseDate: Date) => {
    if (!timeStr) return null;
    // Parse time in 12-hour format (e.g., "11:30 AM" or "2:45 PM")
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;

    let [, hours, minutes, period] = match;
    let hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);

    // Convert to 24-hour format for internal storage
    if (period.toLowerCase() === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period.toLowerCase() === 'am' && hour === 12) {
      hour = 0;
    }

    const newDate = new Date(baseDate);
    newDate.setHours(hour, minute);
    return newDate;
  };

  const handleEditJob = (job: JobEntry) => {
    setEditingJob(job);
    setEditName(job.name);
    setEditDescription(job.description);
    setEditStartTime(formatTimeForInput(job.startTime));
    setEditEndTime(job.endTime ? formatTimeForInput(job.endTime) : '');
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (editingJob && editName.trim() && editDescription.trim()) {
      const baseDate = editingJob.startTime;
      const newStartTime = parseTimeInput(editStartTime, baseDate);
      const newEndTime = editEndTime ? parseTimeInput(editEndTime, baseDate) : null;

      if (!newStartTime || (editEndTime && !newEndTime)) {
        Alert.alert('Invalid Time', 'Please enter valid times in 24-hour format (HH:mm)');
        return;
      }

      if (newEndTime && newStartTime > newEndTime) {
        Alert.alert('Invalid Time Range', 'Start time must be before end time');
        return;
      }

      updateJob(editingJob.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        startTime: newStartTime,
        endTime: newEndTime
      });
      setShowEditModal(false);
      setEditingJob(null);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingJob(null);
  };

  const groupedJobs = groupJobsByDate(completedJobs);

  return (
    <View style={[
      styles.container, 
      isDarkMode && styles.containerDark,
      { paddingTop: insets.top, paddingBottom: insets.bottom }
    ]}>
      {completedJobs.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearHistory}
        >
          <Text style={styles.clearButtonText}>Clear History</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.scrollContainer}>
        {groupedJobs.map(({ date, jobs }) => {
          const dateStr = date.toISOString().split('T')[0];
          const workSession = getWorkSessionForDate(dateStr);
          const isExpanded = expandedDates.includes(dateStr);
          
          return (
            <View key={date.toISOString()} style={styles.dateGroup}>
              <TouchableOpacity 
                style={[styles.dateHeader, isDarkMode && styles.dateHeaderDark]}
                onPress={() => toggleDate(dateStr)}
              >
                <View style={styles.dateHeaderContent}>
                  <Text style={[styles.dateHeaderText, isDarkMode && styles.textDark]}>
                    {formatDate(date)}
                  </Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {workSession?.clockOut && (
                      <Text style={[styles.totalHours, isDarkMode && styles.totalHoursDark]}>
                        {calculateDuration(workSession.clockIn, workSession.clockOut)}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[styles.actionButton, isDarkMode && styles.actionButtonDark, {marginLeft: 8}]}
                      onPress={() => copyDayDetails(date, workSession, jobs)}
                    >
                      <MaterialIcons 
                        name="content-copy" 
                        size={20} 
                        color={isDarkMode ? '#fff' : '#666'} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.dateHeaderActions}>
                  <MaterialIcons 
                    name={isExpanded ? 'expand-less' : 'expand-more'} 
                    size={24} 
                    color={isDarkMode ? '#fff' : '#000'} 
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <Animated.View 
                  style={[
                    styles.expandedContent,
                    {
                      opacity: fadeAnim,
                      transform: [{
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0]
                        })
                      }]
                    }
                  ]}
                >
                  {workSession && (
                    <View style={[styles.timeRow, isDarkMode && styles.timeRowDark]}>
                      <View style={styles.timeBlock}>
                        {/* <Text style={[styles.timeLabel, isDarkMode && styles.timeLabelDark]}>In:</Text> */}
                        <Text style={[styles.timeText, isDarkMode && styles.textDark]}>
                          In: {formatTime(workSession.clockIn)}
                        </Text>
                      </View>
                      <View style={styles.timeBlock}>
                        {/* <Text style={[styles.timeLabel, isDarkMode && styles.timeLabelDark]}>Out:</Text> */}
                        <Text style={[styles.timeText, isDarkMode && styles.textDark]}>
                        Out: {workSession.clockOut ? formatTime(workSession.clockOut) : '--:--'}
                        </Text>
                      </View>
                  

                   <TouchableOpacity
                              style={[styles.actionButton, isDarkMode && styles.actionButtonDark]}
                              onPress={() => {
                                setEditingSession(workSession);
                                setEditInTime(formatTimeForInput(workSession.clockIn));
                                setEditOutTime(workSession.clockOut ? formatTimeForInput(workSession.clockOut) : '');
                                setShowSessionEditModal(true);
                              }}
                            >
                              <MaterialIcons 
                                name="edit" 
                                size={20} 
                                color={isDarkMode ? '#fff' : '#666'} 
                              />
                            </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.jobsList}>
                    {jobs.map(job => (
                      <View key={job.id} style={[styles.jobCard, isDarkMode && styles.jobCardDark]}>
                        <View style={styles.jobCardHeader}>
                          <View style={styles.jobCardContent}>
                            <Text style={[styles.jobName, isDarkMode && styles.textDark]}>{job.name}</Text>
                            <Text style={[styles.description, isDarkMode && styles.descriptionDark]}>
                              {job.description}
                            </Text>
                            <View style={styles.timeInfo}>
                              <Text style={[styles.jobTimeText, isDarkMode && styles.textDark]}>
                                {formatTime(job.startTime)} - {job.endTime ? formatTime(job.endTime) : 'In Progress'}
                              </Text>
                              {job.endTime && (
                                <Text style={[styles.duration, isDarkMode && styles.durationDark]}>
                                  {calculateDuration(job.startTime, job.endTime)}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.actionButtons}>
                            
                            <TouchableOpacity
                              style={[styles.actionButton, isDarkMode && styles.actionButtonDark]}
                              onPress={() => handleEditJob(job)}
                            >
                              <MaterialIcons 
                                name="edit" 
                                size={20} 
                                color={isDarkMode ? '#fff' : '#666'} 
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              )}
            </View>
          );
        })}
        {completedJobs.length === 0 && (
          <Text style={[styles.emptyState, isDarkMode && styles.textDark]}>
            No completed jobs yet
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>Edit Job</Text>
            
            <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Job Name</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter job name"
              placeholderTextColor={isDarkMode ? '#888' : '#666'}
            />

            <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Description</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Enter job description"
              placeholderTextColor={isDarkMode ? '#888' : '#666'}
              multiline
            />

            <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Start Time (12h format)</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={editStartTime}
              onChangeText={setEditStartTime}
              placeholder="hh:mm AM/PM"
              placeholderTextColor={isDarkMode ? '#888' : '#666'}
            />

            <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>End Time (12h format)</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={editEndTime}
              onChangeText={setEditEndTime}
              placeholder="hh:mm AM/PM"
              placeholderTextColor={isDarkMode ? '#888' : '#666'}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelEdit}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSessionEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSessionEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>Edit Work Session</Text>
            
            <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>In Time (12h format)</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={editInTime}
              onChangeText={setEditInTime}
              placeholder="hh:mm AM/PM"
              placeholderTextColor={isDarkMode ? '#888' : '#666'}
            />

            <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Out Time (12h format)</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={editOutTime}
              onChangeText={setEditOutTime}
              placeholder="hh:mm AM/PM"
              placeholderTextColor={isDarkMode ? '#888' : '#666'}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSessionEditModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  if (editingSession) {
                    const baseDate = editingSession.clockIn;
                    const newInTime = parseTimeInput(editInTime, baseDate);
                    const newOutTime = editOutTime ? parseTimeInput(editOutTime, baseDate) : null;

                    if (!newInTime || (editOutTime && !newOutTime)) {
                      Alert.alert('Invalid Time', 'Please enter valid times in 12-hour format (hh:mm AM/PM)');
                      return;
                    }

                    if (newOutTime && newInTime > newOutTime) {
                      Alert.alert('Invalid Time Range', 'In time must be before out time');
                      return;
                    }

                    updateWorkSession(editingSession.date, {
                      clockIn: newInTime,
                      clockOut: newOutTime,
                    });
                    setShowSessionEditModal(false);
                    setEditingSession(null);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  clearButton: {
    backgroundColor: '#ff4444',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateGroup: {
    marginBottom: 1,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateHeaderDark: {
    backgroundColor: '#2d2d2d',
  },
  dateHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 8,
  },
  dateHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  totalHours: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  totalHoursDark: {
    color: '#64B5F6',
  },
  timeCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  timeCardDark: {
    backgroundColor: '#2d2d2d',
  },
  timeRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 2,
    gap: 16,
  },
  timeRowDark: {
    backgroundColor: '#2d2d2d',
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 0,
    marginTop:5
  },
  timeLabelDark: {
    color: '#aaa',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginTop:6
  },
  jobTimeText: {
    color: '#333',
    fontSize: 14,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  durationTextDark: {
    color: '#66bb6a',
  },
  timeInfo: {
    gap: 2,
  },
  duration: {
    color: '#2196F3',
    fontWeight: 'bold',
    marginTop: 4,
  },
  durationDark: {
    color: '#64B5F6',
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
    shadowOpacity: 0.2,
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
  textDark: {
    color: '#fff',
  },
  emptyState: {
    textAlign: 'center',
    marginTop: 40,
    color: '#666',
    fontSize: 16,
  },
  copyButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  copyButtonDark: {
    backgroundColor: '#333',
  },
  expandedContent: {
    gap: 7, // Add spacing between time row and jobs list
    opacity: 0,
  },
  jobsList: {
    gap: 1, // Add consistent spacing between job cards
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  jobCardContent: {
    flex: 1,
    marginRight: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  editButtonDark: {
    backgroundColor: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContentDark: {
    backgroundColor: '#2d2d2d',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
  },
  inputDark: {
    borderColor: '#444',
    backgroundColor: '#1a1a1a',
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  actionButtonDark: {
    backgroundColor: '#333',
  },
  dateHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});