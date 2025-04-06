import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useJobs } from '../../context/JobContext';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function TabLayout() {
  const { isDarkMode } = useTheme();
  const { getCurrentWorkSession } = useJobs();
  const insets = useSafeAreaInsets();
  
  const currentSession = getCurrentWorkSession();
  const isWorkActive = Boolean(currentSession && !currentSession.clockOut);

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? '#090a0a' : '#F9FAF9'} />
      <Tabs screenOptions={{
        tabBarStyle: {
          ...(!isWorkActive && { display: 'none' }),
          backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
          borderTopColor: isDarkMode ? '#090a0a' : '#e0e0e0',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Math.max(insets.bottom + 8, Platform.OS === 'ios' ? 28 : 12),
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: isDarkMode ? '#888' : '#666',
        headerStyle: {
          backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
        },
        headerTintColor: isDarkMode ? '#fff' : '#000',
        headerShown: isWorkActive,
      }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Active Jobs',
            tabBarIcon: ({ color }) => <MaterialIcons name="work" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Job History',
            tabBarIcon: ({ color }) => <MaterialIcons name="history" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}