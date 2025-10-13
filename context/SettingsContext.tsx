import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsContextType {
  expectedWorkHours: number;
  setExpectedWorkHours: (hours: number) => void;
}

const SETTINGS_STORAGE_KEY = '@app_settings';
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [expectedWorkHours, setExpectedWorkHoursState] = useState<number>(8);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.expectedWorkHours) {
            setExpectedWorkHoursState(settings.expectedWorkHours);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const setExpectedWorkHours = async (hours: number) => {
    setExpectedWorkHoursState(hours);
    try {
      const currentSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      const settings = currentSettings ? JSON.parse(currentSettings) : {};
      settings.expectedWorkHours = hours;
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ expectedWorkHours, setExpectedWorkHours }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}