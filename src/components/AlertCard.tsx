import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TrendingUp, Package, AlertCircle } from "lucide-react-native";
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
  const isDanger = type === "LOW_STOCK";
  const isWarning = type === "PRICE_HIKE";
  
  const accentColor = isDanger ? COLORS.error : (isWarning ? COLORS.warning : COLORS.primary);
  
  const Icon = type === "PRICE_HIKE" ? TrendingUp : (type === "DEAD_STOCK" ? Package : AlertCircle);

  return (
    <View style={[styles.container, { borderLeftColor: accentColor }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: accentColor + '20' }]}>
          <Icon color={accentColor} size={24} />
        </View>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      
      <Text style={styles.message}>{message}</Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: accentColor }]}
        onPress={onAction}
        activeOpacity={0.82}
      >
        <Text style={styles.buttonText}>{actionLabel.toUpperCase()}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.md,
    marginBottom:    SPACING.md,
    borderLeftWidth: 6,
    ...SHADOW.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  message: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  button: {
    height:         56, // Massive touch target
    borderRadius:   RADIUS.md,
    alignItems:     "center",
    justifyContent: "center",
    ...SHADOW.card,
  },
  buttonText: {
    ...TYPOGRAPHY.buttonLabel,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
