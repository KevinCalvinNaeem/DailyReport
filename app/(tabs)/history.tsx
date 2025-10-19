import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, TextInput, Platform, Animated } from 'react-native';
import { useJobs } from '../../context/JobContext';
import { useTheme } from '../../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

import { JobEntry, WorkSession } from '../../types/job';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef, useMemo } from 'react';
import * as Clipboard from 'expo-clipboard';
import { GlassAlert } from '../../components/GlassComponents';

export default function HistoryScreen() {
  const { getCompletedJobs, getWorkSessionForDate, clearHistory, updateJob, updateWorkSession, deleteSession } = useJobs();
  const { isDarkMode, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const completedJobs = getCompletedJobs();
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  
  // Filter states
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Remove animation refs for instant loading
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(1)).current;
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
  const [showClearAlert, setShowClearAlert] = useState(false);
  const [showDeleteSessionAlert, setShowDeleteSessionAlert] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Month and year helpers
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filter jobs by selected month and year
  const filteredJobs = useMemo(() => {
    return completedJobs.filter(job => {
      if (!job.endTime) return false;
      
      const jobDate = new Date(job.endTime);
      
      return jobDate.getMonth() === selectedMonth && 
             jobDate.getFullYear() === selectedYear;
    });
  }, [completedJobs, selectedMonth, selectedYear]);

  const resetToCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  const getAvailableYears = () => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear); // Always include current year
    
    completedJobs.forEach(job => {
      if (job.endTime) {
        years.add(new Date(job.endTime).getFullYear());
      }
    });
    
    return Array.from(years).sort((a, b) => b - a);
  };

  const toggleDate = (dateString: string) => {
    // Instant toggle without animations for better performance
    setExpandedDates(prev => 
      prev.includes(dateString) 
        ? prev.filter(d => d !== dateString)
        : [...prev, dateString]
    );
  };

  const handleClearHistory = () => {
    setShowClearAlert(true);
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
      return `(${startTime}--${endTime})\n *${job.name}*: ${job.description}`;
    }).join('\n');

    const outTime = workSession.clockOut ? formatTimeForCopy(workSession.clockOut) : 'ongoing';
    const totalHours = workSession.clockOut ? 
      calculateDuration(workSession.clockIn, workSession.clockOut) : 
      'ongoing';

    const textToCopy = 
      `*Date*: ${dateStr}\n-----------------------------------------\n` +
      `*In-Time*: ${inTime}\n-----------------------------------------\n` +
      `${jobsText}\n-----------------------------------------\n` +
      `*Out-time*: ${outTime}\n-----------------------------------------\n` +
      `*Total working hours*: ${totalHours}`;

    Clipboard.setString(textToCopy);
    
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
      weekday: 'short', // Changed from 'long' to 'short' to show abbreviated day names (Mon, Tue, etc.)
      year: 'numeric',
      month: 'short',
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

  const groupedJobs = groupJobsByDate(filteredJobs);

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }
    ]}>
      <ScrollView style={styles.scrollContainer}>
        {completedJobs.length > 0 && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleClearHistory}
          >
            <Text style={[styles.clearButtonText, { color: colors.error }]}>Clear History</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowFilterModal(true)}
          >
            <MaterialIcons name="calendar-today" size={24} color={colors.primary} />
            <Text style={[styles.filterButtonLabel, { color: colors.text }]}>
              {monthNames[selectedMonth]} {selectedYear}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.resetFilterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={resetToCurrentMonth}
          >
            <MaterialIcons name="today" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {groupedJobs.map(({ date, jobs }) => {
          const dateStr = date.toISOString().split('T')[0];
          const workSession = getWorkSessionForDate(dateStr);
          const isExpanded = expandedDates.includes(dateStr);
          
          return (
            <View key={date.toISOString()} style={styles.dateGroup}>
              <View style={[styles.dateHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity 
                  style={styles.dateHeaderTouchable}
                  onPress={() => toggleDate(dateStr)}
                  onLongPress={() => {
                    setSessionToDelete(dateStr);
                    setShowDeleteSessionAlert(true);
                  }}
                >
                  <View style={styles.dateHeaderContent}>
                    <Text style={[styles.dateHeaderText, { color: colors.text }]}>
                      {formatDate(date)}
                    </Text>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      {workSession?.clockOut && (
                        <Text style={[styles.totalHours, { color: colors.primary }]}>
                          {calculateDuration(workSession.clockIn, workSession.clockOut)}
                        </Text>
                      )}
                      <TouchableOpacity
                        style={[styles.actionButton, {marginLeft: 8}]}
                        onPress={() => copyDayDetails(date, workSession, jobs)}
                      >
                        <MaterialIcons 
                          name="content-copy" 
                          size={20} 
                          color={colors.primary} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.dateHeaderActions}>
                    <MaterialIcons 
                      name={isExpanded ? 'expand-less' : 'expand-more'} 
                      size={24} 
                      color={colors.text} 
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  {workSession && (
                    <View style={[styles.timeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.timeBlock}>
                        <Text style={[styles.timeText, { color: colors.text }]}>
                          In: {formatTime(workSession.clockIn)}
                        </Text>
                      </View>
                      <View style={styles.timeBlock}>
                        <Text style={[styles.timeText, { color: colors.text }]}>
                        Out: {workSession.clockOut ? formatTime(workSession.clockOut) : '--:--'}
                        </Text>
                      </View>
                  
                      <TouchableOpacity
                        style={styles.actionButton}
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
                          color={colors.primary} 
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.jobsList}>
                    {jobs.map(job => (
                      <View key={job.id} style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.jobCardHeader}>
                          <View style={styles.jobCardContent}>
                            <Text style={[styles.jobName, { color: colors.text }]}>{job.name}</Text>
                            <Text style={[styles.description, { color: colors.textSecondary }]}>
                              {job.description}
                            </Text>
                            <View style={styles.timeInfo}>
                              <Text style={[styles.jobTimeText, { color: colors.textSecondary }]}>
                                {formatTime(job.startTime)} - {job.endTime ? formatTime(job.endTime) : 'In Progress'}
                              </Text>
                              {job.endTime && (
                                <Text style={[styles.duration, { color: colors.primary }]}>
                                  {calculateDuration(job.startTime, job.endTime)}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.actionButtons}>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleEditJob(job)}
                            >
                              <MaterialIcons 
                                name="edit" 
                                size={20} 
                                color={colors.primary} 
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}
        {filteredJobs.length === 0 && completedJobs.length === 0 && (
          <Text style={[styles.emptyState, { color: colors.textTertiary }]}>
            No completed jobs yet
          </Text>
        )}
        {filteredJobs.length === 0 && completedJobs.length > 0 && (
          <Text style={[styles.emptyState, { color: colors.textTertiary }]}>
            No jobs found for {monthNames[selectedMonth]} {selectedYear}
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Job</Text>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Job Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter job name"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Enter job description"
                placeholderTextColor={colors.textTertiary}
                multiline
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Start Time (12h format)</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                value={editStartTime}
                onChangeText={setEditStartTime}
                placeholder="hh:mm AM/PM"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>End Time (12h format)</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                value={editEndTime}
                onChangeText={setEditEndTime}
                placeholder="hh:mm AM/PM"
                placeholderTextColor={colors.textTertiary}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                onPress={handleCancelEdit}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={handleSaveEdit}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
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
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Work Session</Text>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>In Time (12h format)</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                value={editInTime}
                onChangeText={setEditInTime}
                placeholder="hh:mm AM/PM"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Out Time (12h format)</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                value={editOutTime}
                onChangeText={setEditOutTime}
                placeholder="hh:mm AM/PM"
                placeholderTextColor={colors.textTertiary}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                onPress={() => setShowSessionEditModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
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
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <GlassAlert
        visible={showClearAlert}
        title="Clear History"
        message="Are you sure you want to clear all completed jobs and work sessions? This action cannot be undone."
        buttons={[
          {
            text: "Cancel",
            onPress: () => {},
            style: "cancel"
          },
          {
            text: "Clear",
            onPress: clearHistory,
            style: "destructive"
          }
        ]}
        onClose={() => setShowClearAlert(false)}
      />

      <GlassAlert
        visible={showDeleteSessionAlert}
        title="Delete Session"
        message="Are you sure you want to delete this work session and all its associated jobs? This action cannot be undone."
        buttons={[
          {
            text: "Cancel",
            onPress: () => {},
            style: "cancel"
          },
          {
            text: "Delete",
            onPress: () => {
              if (sessionToDelete) {
                deleteSession(sessionToDelete);
                setSessionToDelete(null);
              }
            },
            style: "destructive"
          }
        ]}
        onClose={() => {
          setShowDeleteSessionAlert(false);
          setSessionToDelete(null);
        }}
      />

      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.datePickerModalOverlay}>
          <View style={[styles.datePickerModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.datePickerModalTitle, { color: colors.text }]}>Select Month & Year</Text>
            
            <Text style={[styles.selectorLabel, { color: colors.text }]}>Month</Text>
            <ScrollView style={styles.monthSelector} showsVerticalScrollIndicator={false}>
              {monthNames.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.monthButton,
                    { backgroundColor: selectedMonth === index ? colors.primary : colors.background },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setSelectedMonth(index)}
                >
                  <Text style={[
                    styles.monthButtonText,
                    { color: selectedMonth === index ? colors.background : colors.text }
                  ]}>
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.selectorLabel, { color: colors.text }]}>Year</Text>
            <ScrollView style={styles.yearSelector} showsVerticalScrollIndicator={false}>
              {getAvailableYears().map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearButton,
                    { backgroundColor: selectedYear === year ? colors.primary : colors.background },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text style={[
                    styles.yearButtonText,
                    { color: selectedYear === year ? colors.background : colors.text }
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.datePickerModalButtons}>
              <TouchableOpacity
                style={[styles.datePickerResetButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={resetToCurrentMonth}
              >
                <Text style={[styles.resetButtonText, { color: colors.text }]}>Reset to Current Month</Text>
              </TouchableOpacity>
              
              <View style={styles.datePickerActionButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={[styles.applyButtonText, { color: colors.background }]}>Apply Filter</Text>
                </TouchableOpacity>
              </View>
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
  clearButton: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    gap: 8,
  },
  filterIconButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  filterButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  resetFilterButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  dateGroup: {
    marginBottom: 1,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
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
  },
  totalHours: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeCard: {
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 2,
    gap: 16,
  },
  jobsList: {
    paddingBottom: 20,
  },
  expandedContent: {
    paddingTop: 8,
  },
  timeBlock: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  jobCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobCardContent: {
    flex: 1,
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 4,
  },
  jobDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  jobTime: {
    fontSize: 12,
  },
  jobTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duration: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
  },
  emptyState: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 50,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '80%',
  },
  modalScrollView: {
    maxHeight: 300,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateHeaderTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateHeaderActions: {
    marginLeft: 8,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  datePickerModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  monthSelector: {
    maxHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  monthButton: {
    padding: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  monthButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  yearSelector: {
    maxHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  yearButton: {
    padding: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  yearButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerModalButtons: {
    marginTop: 20,
  },
  datePickerResetButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  datePickerActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

});