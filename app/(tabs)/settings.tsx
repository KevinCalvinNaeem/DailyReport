import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { theme, setTheme, isDarkMode } = useTheme();

  const themeOptions = [
    { label: 'Light', value: 'light', icon: 'light-mode' },
    { label: 'Dark', value: 'dark', icon: 'dark-mode' },
    { label: 'System', value: 'system', icon: 'smartphone' },
  ] as const;

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
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
});