import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Clipboard } from 'react-native';
import { useJobs } from '../../context/JobContext';
import { useTheme } from '../../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { JobEntry, WorkSession } from '../../types/job';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

export default function HistoryScreen() {
  const { getCompletedJobs, getWorkSessionForDate, clearHistory } = useJobs();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const completedJobs = getCompletedJobs();
  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  const toggleDate = (dateString: string) => {
    setExpandedDates(prev => 
      prev.includes(dateString) 
        ? prev.filter(d => d !== dateString)
        : [...prev, dateString]
    );
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
    
    const jobsText = jobs.map(job => {
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
        jobs
      }));
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
                  {workSession?.clockOut && (
                    <Text style={[styles.totalHours, isDarkMode && styles.totalHoursDark]}>
                      {calculateDuration(workSession.clockIn, workSession.clockOut)}
                    </Text>
                  )}
                </View>
                <MaterialIcons 
                  name={isExpanded ? 'expand-less' : 'expand-more'} 
                  size={24} 
                  color={isDarkMode ? '#fff' : '#000'} 
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  {workSession && (
                    <View style={[styles.timeRow, isDarkMode && styles.timeRowDark]}>
                      <View style={styles.timeBlock}>
                        <Text style={[styles.timeLabel, isDarkMode && styles.timeLabelDark]}>In:</Text>
                        <Text style={[styles.timeText, isDarkMode && styles.textDark]}>
                          {formatTime(workSession.clockIn)}
                        </Text>
                      </View>
                      <View style={styles.timeBlock}>
                        <Text style={[styles.timeLabel, isDarkMode && styles.timeLabelDark]}>Out:</Text>
                        <Text style={[styles.timeText, isDarkMode && styles.textDark]}>
                          {workSession.clockOut ? formatTime(workSession.clockOut) : '--:--'}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.jobsList}>
                    {jobs.map(job => (
                      <View key={job.id} style={[styles.jobCard, isDarkMode && styles.jobCardDark]}>
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
                    ))}
                  </View>
                </View>
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
    marginBottom: 24,
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
    marginTop: 8,
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
    marginBottom: 2,
  },
  timeLabelDark: {
    color: '#aaa',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
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
    gap: 4,
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
    gap: 16, // Add spacing between time row and jobs list
  },
  jobsList: {
    gap: 8, // Add consistent spacing between job cards
  },
});