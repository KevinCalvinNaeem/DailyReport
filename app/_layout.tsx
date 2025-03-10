import { Redirect, Stack } from "expo-router";
import { JobProvider } from "../context/JobContext";
import { ThemeProvider } from "../context/ThemeContext";
import { View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { SafeAreaProvider } from 'react-native-safe-area-context';

function RootLayoutContent() {
  const { isDarkMode } = useTheme();
  
  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : '#fff' }}>
      <JobProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" redirect={true} />
        </Stack>
      </JobProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
