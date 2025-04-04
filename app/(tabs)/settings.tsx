import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJobs } from '../../context/JobContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export default function SettingsScreen() {
  const { theme, setTheme, isDarkMode } = useTheme();
  const { jobs, workSessions, getCurrentWorkSession, updateJob, updateWorkSession } = useJobs();
  const insets = useSafeAreaInsets();

  const themeOptions = [
    { label: 'Light', value: 'light', icon: 'light-mode' },
    { label: 'Dark', value: 'dark', icon: 'dark-mode' },
    { label: 'System', value: 'system', icon: 'smartphone' },
  ] as const;

  const currentSession = getCurrentWorkSession();
  const isWorkActive = Boolean(currentSession && !currentSession.clockOut);

  const handleExport = async () => {
    try {
      const csvData = [
        ['Type', 'ID', 'Date', 'StartTime', 'EndTime', 'Name', 'Description'],
        ...jobs.map(job => [
          'job',
          job.id,
          job.endTime?.toISOString().split('T')[0] || '',
          job.startTime.toISOString(),
          job.endTime?.toISOString() || '',
          job.name,
          job.description
        ]),
        ...workSessions.map(session => [
          'session',
          session.date,
          session.date,
          session.clockIn.toISOString(),
          session.clockOut?.toISOString() || '',
          '',
          ''
        ])
      ].map(row => row.join(',')).join('\n');

      const fileUri = FileSystem.documentDirectory + 'work_history.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvData);
      await Sharing.shareAsync(fileUri, {
        UTI: 'public.comma-separated-values-text',
        mimeType: 'text/csv'
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to export history');
    }
  };

  const handleImport = async () => {
    try {
      // Using the updated DocumentPicker API
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'application/csv', 'text/x-csv', 'application/x-csv', 'text/comma-separated-values', 'text/x-comma-separated-values'],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('File selected:', file.uri);
        const csvContent = await FileSystem.readAsStringAsync(file.uri);
        console.log('CSV content length:', csvContent.length);
        
        // Normalize line endings to handle different CSV formats
        const normalizedContent = csvContent.replace(/\r\n|\r/g, '\n');
        const lines = normalizedContent.split('\n');
        console.log('Number of lines:', lines.length);
        
        if (lines.length < 2) {
          throw new Error('CSV file is empty or has no data rows');
        }
        
        const headers = lines[0].split(',');
        console.log('Headers:', headers);
        
        // Validate headers
        const requiredHeaders = ['Type', 'ID', 'Date', 'StartTime', 'EndTime', 'Name', 'Description'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          throw new Error(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
        }
        
        const importedJobs = [];
        const importedSessions = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue; // Skip empty lines
          
          const values = lines[i].split(',');
          console.log(`Line ${i}:`, values);
          
          // Ensure we have enough values
          if (values.length < 5) {
            console.error(`Line ${i} has insufficient values, skipping`);
            continue;
          }
          
          try {
            if (values[0] === 'job') {
              // Validate job data
              if (!values[1] || !values[3]) {
                console.error(`Line ${i} has invalid job data, skipping`);
                continue;
              }
              
              const job = {
                id: values[1],
                name: values[5] || '',
                description: values[6] || '',
                startTime: new Date(values[3]),
                endTime: values[4] ? new Date(values[4]) : null
              };
              
              // Validate dates
              if (isNaN(job.startTime.getTime())) {
                console.error(`Line ${i} has invalid start time, skipping`);
                continue;
              }
              
              if (job.endTime && isNaN(job.endTime.getTime())) {
                console.error(`Line ${i} has invalid end time, skipping`);
                continue;
              }
              
              console.log('Importing job:', job);
              importedJobs.push(job);
            } else if (values[0] === 'session') {
              // Validate session data
              if (!values[2] || !values[3]) {
                console.error(`Line ${i} has invalid session data, skipping`);
                continue;
              }
              
              const session = {
                date: values[2],
                clockIn: new Date(values[3]),
                clockOut: values[4] ? new Date(values[4]) : null
              };
              
              // Validate dates
              if (isNaN(session.clockIn.getTime())) {
                console.error(`Line ${i} has invalid clock in time, skipping`);
                continue;
              }
              
              if (session.clockOut && isNaN(session.clockOut.getTime())) {
                console.error(`Line ${i} has invalid clock out time, skipping`);
                continue;
              }
              
              console.log('Importing session:', session);
              importedSessions.push(session);
            }
          } catch (lineError) {
            console.error(`Error processing line ${i}:`, lineError);
            // Continue with next line instead of failing the whole import
          }
        }
        
        console.log('Total jobs to import:', importedJobs.length);
        console.log('Total sessions to import:', importedSessions.length);
        
        if (importedJobs.length === 0 && importedSessions.length === 0) {
          throw new Error('No valid data found in the CSV file');
        }
        
        // Use the updateJob and updateWorkSession functions from the component scope
        // First, add or update jobs
        if (importedJobs.length > 0) {
          importedJobs.forEach(job => {
            console.log('Processing job:', job.id);
            // For jobs, we need to ensure we're using the correct format
            const jobUpdate = {
              name: job.name,
              description: job.description,
              startTime: job.startTime,
              endTime: job.endTime
            };
            updateJob(job.id, jobUpdate);
          });
        }
        
        // Then, add or update work sessions
        if (importedSessions.length > 0) {
          importedSessions.forEach(session => {
            console.log('Processing session:', session.date);
            // For sessions, we need to ensure we're using the correct format
            const sessionUpdate = {
              // id is passed separately as the first parameter to updateWorkSession
              clockIn: session.clockIn,
              clockOut: session.clockOut
            };
            updateWorkSession(session.date, sessionUpdate);
          });
        }
        
        Alert.alert('Success', `History imported successfully: ${importedJobs.length} jobs and ${importedSessions.length} sessions`);
      } else {
        console.log('Document picker canceled or no file selected');
        Alert.alert('Import Canceled', 'No file was selected for import.');
      }
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import history: ' + error.message);
    }
  };

  return (
    <View style={[
      styles.container, 
      isDarkMode && styles.containerDark,
      {
        paddingTop: isWorkActive ? 16 : insets.top,
        paddingBottom: isWorkActive ? 16 : insets.bottom
      }
    ]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Theme</Text>
        <View style={styles.themeOptions}>
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.themeOption,
                theme === option.value && styles.themeOptionSelected,
                isDarkMode && styles.themeOptionDark,
                theme === option.value && isDarkMode && styles.themeOptionSelectedDark,
              ]}
              onPress={() => setTheme(option.value)}
            >
              <MaterialIcons
                name={option.icon as any}
                size={24}
                color={theme === option.value ? '#fff' : isDarkMode ? '#fff' : '#000'}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  isDarkMode && styles.textDark,
                  theme === option.value && styles.themeOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={[styles.settingCard, isDarkMode && styles.settingCardDark]}>
        <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>
          Dark Mode
        </Text>
        <Switch
          value={isDarkMode}
          onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isDarkMode ? '#2196F3' : '#f4f3f4'}
        />
      </View>
      <View style={[styles.settingCard, isDarkMode && styles.settingCardDark]}>
        <TouchableOpacity onPress={handleExport} style={styles.importExportButton}>
          <MaterialIcons name="file-download" size={24} color={isDarkMode ? '#fff' : '#000'} />
          <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>Export History</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.settingCard, isDarkMode && styles.settingCardDark]}>
        <TouchableOpacity onPress={handleImport} style={styles.importExportButton}>
          <MaterialIcons name="file-upload" size={24} color={isDarkMode ? '#fff' : '#000'} />
          <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>Import History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  textDark: {
    color: '#fff',
  },
  themeOptions: {
    gap: 12,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 12,
  },
  themeOptionDark: {
    backgroundColor: '#2d2d2d',
    borderColor: '#444',
    borderWidth: 1,
  },
  themeOptionSelected: {
    backgroundColor: '#2196F3',
  },
  themeOptionSelectedDark: {
    backgroundColor: '#1976D2',
    borderWidth: 0,
  },
  themeOptionText: {
    fontSize: 16,
    color: '#000',
  },
  themeOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  settingCardDark: {
    backgroundColor: '#2d2d2d',
  },
  settingLabel: {
    fontSize: 16,
    color: '#000',
  },
  importExportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
});