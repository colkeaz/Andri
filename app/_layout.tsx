import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDatabase } from '../src/database/db';

export default function RootLayout() {
  useEffect(() => {
    // Initialize Database on App Start
    initDatabase();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
