import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { initDatabase } from "../src/database/db";
import { BrandMark } from "../src/components/ui";
import { COLORS, SPACING, TYPOGRAPHY } from "../src/theme/tokens";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Initialize Database on App Start
    initDatabase();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingScreen}>
        <BrandMark />
        <Text style={styles.loadingTitle}>Preparing your store</Text>
        <Text style={styles.loadingText}>Syncing fonts and local inventory...</Text>
        <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  loadingTitle: {
    ...TYPOGRAPHY.h2,
    marginTop: SPACING.lg,
    textAlign: "center",
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  spinner: {
    marginTop: SPACING.lg,
  },
});
