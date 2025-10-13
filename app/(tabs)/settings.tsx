import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Platform, TextInput } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJobs } from '../../context/JobContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { GlassAlert } from '../../components/GlassComponents';


export default function SettingsScreen() {
  const { theme, setTheme, isDarkMode, colors } = useTheme();
  const { expectedWorkHours, setExpectedWorkHours } = useSettings();
  const { jobs, workSessions, getCurrentWorkSession, updateJob, updateWorkSession } = useJobs();
  const insets = useSafeAreaInsets();
  const [workHoursInput, setWorkHoursInput] = useState(expectedWorkHours.toString());
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const themeOptions = [
    { label: 'Light', value: 'light', icon: 'light-mode' },
    { label: 'Dark', value: 'dark', icon: 'dark-mode' },
    { label: 'System', value: 'system', icon: 'smartphone' },
  ] as const;

  const currentSession = getCurrentWorkSession();
  const isWorkActive = Boolean(currentSession && !currentSession.clockOut);

  const handleWorkHoursChange = (text: string) => {
    setWorkHoursInput(text);
    const hours = parseFloat(text);
    if (!isNaN(hours) && hours > 0 && hours <= 24) {
      setExpectedWorkHours(hours);
    }
  };

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

      // Create a unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `work_history_${timestamp}.csv`;
      
      // Try to save to a more accessible location
      let fileUri;
      if (Platform.OS === 'android') {
        // For Android, try to save to the Downloads directory
        const downloadDir = FileSystem.documentDirectory + '../Downloads/';
        try {
          await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
          fileUri = downloadDir + filename;
        } catch {
          // Fallback to document directory if Downloads is not accessible
          fileUri = FileSystem.documentDirectory + filename;
        }
      } else {
        // For iOS, use document directory
        fileUri = FileSystem.documentDirectory + filename;
      }
      
      // Write the file
      await FileSystem.writeAsStringAsync(fileUri, csvData);

      // Share the file directly
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          UTI: 'public.comma-separated-values-text',
          mimeType: 'text/csv',
          dialogTitle: 'Save Work History'
        });
      } else {
        Alert.alert(
          'Export Successful', 
          `Work history has been saved as "${filename}"`
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to export history: ' + (error instanceof Error ? error.message : String(error)));
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
        
        setSuccessMessage(`History imported successfully: ${importedJobs.length} jobs and ${importedSessions.length} sessions`);
        setShowSuccessAlert(true);
      } else {
        console.log('Document picker canceled or no file selected');
        // No alert shown when user cancels - this is expected behavior
      }
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import history: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.background,
        paddingTop: isWorkActive ? 16 : insets.top,
        paddingBottom: isWorkActive ? 16 : insets.bottom
      }
    ]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
        <View style={styles.themeOptions}>
          {themeOptions.map((option) => (
            <View
              key={option.value}
              style={[
                styles.themeOption,
                { backgroundColor: colors.surface, borderColor: colors.border },
                theme === option.value && { backgroundColor: colors.primary }
              ]}
            >
              <TouchableOpacity
                style={styles.themeOptionContent}
                onPress={() => setTheme(option.value)}
              >
                <MaterialIcons
                  name={option.icon as any}
                  size={24}
                  color={theme === option.value ? '#FFFFFF' : colors.text}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: theme === option.value ? '#FFFFFF' : colors.text }
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
      
      <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>
          Expected Work Hours
        </Text>
        <TextInput
          style={[styles.workHoursInput, { 
            color: colors.text, 
            borderColor: colors.border,
            backgroundColor: colors.background
          }]}
          value={workHoursInput}
          onChangeText={handleWorkHoursChange}
          keyboardType="numeric"
          placeholder="8"
          placeholderTextColor={colors.textSecondary}
          maxLength={4}
        />
      </View>
      
      <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>
          Dark Mode
        </Text>
        <Switch
          value={isDarkMode}
          onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={isDarkMode ? colors.accent : colors.surface}
        />
      </View>
      
      <TouchableOpacity
        onPress={handleExport}
        style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <MaterialIcons name="file-download" size={24} color={colors.text} />
        <Text style={[styles.settingLabel, { color: colors.text }]}>Export History</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={handleImport}
        style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <MaterialIcons name="file-upload" size={24} color={colors.text} />
        <Text style={[styles.settingLabel, { color: colors.text }]}>Import History</Text>
      </TouchableOpacity>

      <GlassAlert
        visible={showSuccessAlert}
        title="Success"
        message={successMessage}
        buttons={[
          {
            text: "OK",
            onPress: () => setShowSuccessAlert(false),
            style: "default"
          }
        ]}
        onClose={() => setShowSuccessAlert(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  themeOptions: {
    gap: 12,
  },
  themeOption: {
    borderRadius: 12,
    borderWidth: 1,
  },
  themeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  themeOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  workHoursInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 60,
    maxWidth: 80,
  },
});