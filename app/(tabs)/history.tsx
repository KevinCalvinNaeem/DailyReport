import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useJobs } from '../../context/JobContext';
import { useTheme } from '../../context/ThemeContext';

export default function HistoryScreen() {
  const { getCompletedJobs, getWorkSessionForDate, clearHistory } = useJobs();
  const { isDarkMode } = useTheme();
  const completedJobs = getCompletedJobs();

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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
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
      const dateKey = new Date(job.endTime).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(job);
    });

    return Object.entries(groups)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .map(([date, jobs]) => ({
        date: new Date(date),
        jobs
      }));
  };

  const groupedJobs = groupJobsByDate(completedJobs);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
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
          
          return (
            <View key={date.toISOString()} style={styles.dateGroup}>
              <View style={styles.dateHeaderContainer}>
                <View style={styles.dateRow}>
                  <Text style={[styles.dateHeader, isDarkMode && styles.textDark]}>
                    {formatDate(date)}
                  </Text>
                  {workSession && (
                    <Text style={[styles.inlineTime, isDarkMode && styles.inlineTimeDark]}>
                      {formatTime(workSession.clockIn)}
                      {workSession.clockOut && ` - ${formatTime(workSession.clockOut)}`}
                    </Text>
                  )}
                </View>
                {workSession?.clockOut && (
                  <Text style={[styles.totalDuration, isDarkMode && styles.totalDurationDark]}>
                    Total: {calculateDuration(workSession.clockIn, workSession.clockOut)}
                  </Text>
                )}
              </View>

              {jobs.map(job => (
                <View key={job.id} style={[styles.jobCard, isDarkMode && styles.jobCardDark]}>
                  <Text style={[styles.jobName, isDarkMode && styles.textDark]}>{job.name}</Text>
                  <Text style={[styles.description, isDarkMode && styles.descriptionDark]}>
                    {job.description}
                  </Text>
                  <View style={styles.timeInfo}>
                    <Text style={[styles.timeText, isDarkMode && styles.textDark]}>
                      Started: {formatTime(job.startTime)}
                    </Text>
                    <Text style={[styles.timeText, isDarkMode && styles.textDark]}>
                      Ended: {job.endTime ? formatTime(job.endTime) : 'In Progress'}
                    </Text>
                    {job.endTime && (
                      <Text style={[styles.duration, isDarkMode && styles.durationDark]}>
                        Duration: {calculateDuration(job.startTime, job.endTime)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
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
  dateHeaderContainer: {
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  inlineTime: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  inlineTimeDark: {
    color: '#aaa',
    backgroundColor: '#2d2d2d',
  },
  totalDuration: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
  },
  totalDurationDark: {
    color: '#66bb6a',
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
  timeInfo: {
    gap: 4,
  },
  timeText: {
    color: '#333',
    fontSize: 14,
  },
  duration: {
    color: '#2196F3',
    fontWeight: 'bold',
    marginTop: 4,
  },
  durationDark: {
    color: '#64B5F6',
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
  workSessionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  workSessionCardDark: {
    backgroundColor: '#2d2d2d',
    borderLeftColor: '#66BB6A',
  },
  workTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  workTimeLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  workTimeValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
  },
  workDuration: {
    color: '#4CAF50',
    fontWeight: 'bold',
    flex: 2,
  },
  workDurationDark: {
    color: '#66BB6A',
  },
  timeContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  timeBox: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  timeBoxDark: {
    backgroundColor: '#2d2d2d',
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  timeLabelDark: {
    color: '#aaa',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  timeValueDark: {
    color: '#fff',
  },
  durationBox: {
    backgroundColor: '#e8f5e9',
    minWidth: 120,
  },
  durationBoxDark: {
    backgroundColor: '#1a3524',
  },
  durationValue: {
    color: '#2e7d32',
  },
  durationValueDark: {
    color: '#66bb6a',
  },
});