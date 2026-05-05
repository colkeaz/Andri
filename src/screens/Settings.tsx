import { RotateCcw, SlidersHorizontal } from "lucide-react-native";
import React from "react";
import { Alert, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { BigButton } from "../components/BigButton";
import { dbService } from "../database/db";
import { COLORS, SPACING, TYPOGRAPHY } from "../theme/tokens";

export const SettingsScreen: React.FC = () => {
  const [isResetting, setIsResetting] = React.useState(false);

  const handleResetDemoData = async () => {
    if (isResetting) return;

    Alert.alert(
      "Reset Demo Data",
      "This will wipe current local data and load a fresh demo catalog.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              setIsResetting(true);
              await dbService.resetDemoData();
              Alert.alert("Done", "Demo data reset complete.");
            } catch {
              Alert.alert(
                "Reset Failed",
                "Unable to reset demo data right now.",
              );
            } finally {
              setIsResetting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <SlidersHorizontal color={COLORS.primary} size={28} />
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Demo Tools</Text>
        <Text style={styles.cardBody}>
          Reset the local SQLite data so your next pitch starts from a clean
          baseline.
        </Text>
        <BigButton
          title={isResetting ? "RESETTING..." : "RESET DEMO DATA"}
          onPress={handleResetDemoData}
          color={COLORS.danger}
          icon={<RotateCcw color={COLORS.white} size={24} />}
          style={styles.resetButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: 10,
  },
  title: {
    ...TYPOGRAPHY.h2,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.bodyLarge,
    marginBottom: 8,
  },
  cardBody: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
  },
  resetButton: {
    marginTop: SPACING.md,
    height: 74,
  },
});
