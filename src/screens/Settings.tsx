import { Info, RotateCcw, SlidersHorizontal } from "lucide-react-native";
import React from "react";
import { Alert, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { BigButton } from "../components/BigButton";
import { dbService } from "../database/db";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

export const SettingsScreen: React.FC = () => {
  const [isResetting, setIsResetting] = React.useState(false);

  const handleResetDemoData = async () => {
    if (isResetting) return;

    Alert.alert(
      "Reset Demo Data",
      "This will erase current data and re-initialize with sample inventory.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              setIsResetting(true);
              await dbService.resetDemoData();
              Alert.alert("Success", "Demo data reset successfully.");
            } catch {
              Alert.alert(
                "Reset Failed",
                "Could not reset demo data at this time.",
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

      {/* App Info Card */}
      <View style={styles.card}>
        <View style={styles.appInfoRow}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>🏪</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>Stocker</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
          </View>
        </View>
        <View style={styles.appInfoDivider} />
        <View style={styles.appInfoDetail}>
          <Info color={COLORS.textSecondary} size={16} />
          <Text style={styles.appInfoText}>
            Smart inventory system for small shops — built by FourPoint Team.
          </Text>
        </View>
      </View>

      {/* Demo Tools Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Demo Tools</Text>
        <Text style={styles.cardBody}>
          Reset SQLite data for a clean start.
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
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  // App info card
  appInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  appIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  appIconText: {
    fontSize: 28,
  },
  appName: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 20,
    fontWeight: "800",
  },
  appVersion: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  appInfoDivider: {
    height: 1,
    backgroundColor: COLORS.overlay,
    marginBottom: 12,
  },
  appInfoDetail: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  appInfoText: {
    ...TYPOGRAPHY.body,
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  // Demo tools
  cardTitle: {
    ...TYPOGRAPHY.bodyLarge,
    marginBottom: 8,
  },
  cardBody: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
    lineHeight: 24,
  },
  resetButton: {
    marginTop: SPACING.md,
    height: 74,
  },
});
