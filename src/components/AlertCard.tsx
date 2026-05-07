import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AlertCircle, Package, TrendingUp } from "lucide-react-native";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";
import { StatusPill } from "./ui";

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
  const isDanger = type === "LOW_STOCK";
  const isWarning = type === "PRICE_HIKE";
  const tone = isDanger ? "danger" : isWarning ? "warning" : "primary";
  const accentColor = isDanger ? COLORS.danger : isWarning ? COLORS.warning : COLORS.primary;
  const Icon = type === "PRICE_HIKE" ? TrendingUp : type === "DEAD_STOCK" ? Package : AlertCircle;

  return (
    <View style={[styles.container, { borderColor: accentColor + "55" }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: accentColor + "18" }]}>
          <Icon color={accentColor} size={22} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <StatusPill label={type.replace("_", " ")} tone={tone} />
        </View>
      </View>

      <Text style={styles.message}>{message}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: accentColor },
          pressed && styles.pressed,
        ]}
        onPress={onAction}
      >
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    ...SHADOW.soft,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  title: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
    lineHeight: 21,
  },
  message: {
    ...TYPOGRAPHY.body,
    lineHeight: 21,
    marginBottom: SPACING.md,
  },
  button: {
    minHeight: 48,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    ...TYPOGRAPHY.buttonLabel,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.82,
  },
});
