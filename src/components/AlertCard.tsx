import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

interface AlertCardProps {
  type: "PRICE_HIKE" | "DEAD_STOCK" | "LOW_STOCK";
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  type,
  title,
  message,
  actionLabel,
  onAction,
}) => {
  const isWarning = type === "PRICE_HIKE" || type === "LOW_STOCK";
  const accentColor = isWarning ? COLORS.warning : COLORS.primary;

  return (
    <View style={[styles.container, { borderLeftColor: accentColor }]}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: accentColor }]}
        onPress={onAction}
        activeOpacity={0.82}
      >
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm,
    borderLeftWidth: 3,
    ...SHADOW.card,
  },
  content: {
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.bodyLarge,
    marginBottom: 4,
  },
  message: {
    ...TYPOGRAPHY.body,
    lineHeight: 22,
  },
  button: {
    height:         48,
    borderRadius:   RADIUS.sm,
    alignItems:     "center",
    justifyContent: "center",
  },
  buttonText: {
    ...TYPOGRAPHY.buttonLabel,
    fontSize: 15,
  },
});
