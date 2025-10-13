import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface Colors {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Surface colors (for cards, modals, etc.)
  surface: string;
  surfaceSecondary: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Border and divider colors
  border: string;
  divider: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Accent colors
  accent: string;
  
  // Tab bar colors
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDarkMode: boolean;
  colors: Colors;
}

const THEME_STORAGE_KEY = '@theme_mode';
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Light theme colors - Purple palette
const lightColors: Colors = {
  // Primary colors - Light purple theme
  primary: '#8B5CF6',           // Vibrant purple
  primaryLight: '#A78BFA',      // Lighter purple
  primaryDark: '#7C3AED',       // Darker purple
  
  // Background colors - Light purple tints
  background: '#FDFCFF',        // Very light purple-white
  backgroundSecondary: '#F8F6FF', // Light purple background
  backgroundTertiary: '#F3F0FF', // Slightly more purple
  
  // Surface colors
  surface: '#FFFFFF',           // Pure white for cards
  surfaceSecondary: '#F9F7FF',  // Light purple tint
  
  // Text colors
  text: '#1F1B2E',             // Dark purple-black
  textSecondary: '#4C4464',     // Medium purple-gray
  textTertiary: '#8B7FA8',      // Light purple-gray
  
  // Border and divider colors
  border: '#E5E1F5',           // Light purple border
  divider: '#EDE9F7',          // Very light purple divider
  
  // Status colors
  success: '#10B981',          // Green
  warning: '#F59E0B',          // Orange
  error: '#EF4444',            // Red
  info: '#3B82F6',             // Blue
  
  // Accent colors
  accent: '#DDD6FE',           // Light purple accent
  
  // Tab bar colors
  tabBarBackground: 'rgba(255, 255, 255, 0.95)',
  tabBarBorder: '#E5E1F5',
  tabBarActive: '#8B5CF6',
  tabBarInactive: '#8B7FA8',
};

// Dark theme colors - Dark purple palette
const darkColors: Colors = {
  // Primary colors - Dark purple theme
  primary: '#A78BFA',           // Lighter purple for dark theme
  primaryLight: '#C4B5FD',      // Even lighter purple
  primaryDark: '#8B5CF6',       // Medium purple
  
  // Background colors - Dark purple theme
  background: '#0F0A1A',        // Very dark purple-black
  backgroundSecondary: '#1A1025', // Dark purple
  backgroundTertiary: '#251B35', // Medium dark purple
  
  // Surface colors
  surface: '#1E1B2E',           // Dark purple surface
  surfaceSecondary: '#2A2440',  // Lighter dark purple
  
  // Text colors
  text: '#F8F6FF',             // Light purple-white
  textSecondary: '#C4B5FD',     // Light purple
  textTertiary: '#8B7FA8',      // Medium purple-gray
  
  // Border and divider colors
  border: '#3A2F5A',           // Dark purple border
  divider: '#2D2142',          // Dark purple divider
  
  // Status colors
  success: '#34D399',          // Light green
  warning: '#FBBF24',          // Light orange
  error: '#F87171',            // Light red
  info: '#60A5FA',             // Light blue
  
  // Accent colors
  accent: '#6D28D9',           // Dark purple accent
  
  // Tab bar colors
  tabBarBackground: 'rgba(30, 27, 46, 0.95)',
  tabBarBorder: '#3A2F5A',
  tabBarActive: '#A78BFA',
  tabBarInactive: '#8B7FA8',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
          setThemeState(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const isDarkMode = 
    theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}