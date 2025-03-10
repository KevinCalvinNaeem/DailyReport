import { Redirect, Stack } from "expo-router";
import { JobProvider } from "../context/JobContext";
import { ThemeProvider } from "../context/ThemeContext";
import { View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

function RootLayoutContent() {
  const { isDarkMode } = useTheme();
  
  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : '#fff' }}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? '#1a1a1a' : '#fff'} />
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
        <JobProvider>
          <RootLayoutContent />
        </JobProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
