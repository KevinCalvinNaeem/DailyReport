import AsyncStorage from '@react-native-async-storage/async-storage';

async function resetStorage() {
  try {
    await AsyncStorage.clear();
    console.log('Storage cleared successfully');
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}

resetStorage();