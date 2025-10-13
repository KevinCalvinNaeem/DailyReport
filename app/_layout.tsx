import { Redirect, Stack } from "expo-router";
import { JobProvider } from "../context/JobContext";
import { ThemeProvider } from "../context/ThemeContext";
import { SettingsProvider } from "../context/SettingsContext";
import { View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

function RootLayoutContent() {
  const { isDarkMode } = useTheme();
  
  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#090a0a' : '#fff' }}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? '#090a0a' : '#fff'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" redirect={true} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <JobProvider>
            <RootLayoutContent />
          </JobProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
