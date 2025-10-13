import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useJobs } from '../../context/JobContext';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function TabLayout() {
  const { isDarkMode, colors } = useTheme();
  const { getCurrentWorkSession } = useJobs();
  const insets = useSafeAreaInsets();
  
  const currentSession = getCurrentWorkSession();
  const isWorkActive = Boolean(currentSession && !currentSession.clockOut);

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={colors.background} />
      <Tabs screenOptions={{
        tabBarStyle: {
          ...(!isWorkActive && { display: 'none' }),
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Math.max(insets.bottom + 8, Platform.OS === 'ios' ? 28 : 12),
          paddingTop: 8,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 4,
        },
        headerTintColor: colors.text,
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