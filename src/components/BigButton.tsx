import * as Haptics from "expo-haptics";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  ViewStyle,
} from "react-native";
import { COLORS, SPACING, TYPOGRAPHY } from "../theme/tokens";

interface BigButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * A highly accessible button for elderly users.
 * - Large touch target (min 80px height)
 * - Haptic feedback on press
 * - High contrast
 */
export const BigButton: React.FC<BigButtonProps> = ({
  title,
  onPress,
  color = COLORS.primary,
  icon,
  style,
}) => {
  const handlePress = async () => {
    // 4ms-like click sensation via light haptic + tiny fallback vibration.
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Vibration.vibrate(4);
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[styles.container, { backgroundColor: color }, style]}
    >
      {icon}
      <Text style={styles.label}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 90, // Massive touch target
    width: "100%",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.overlay,
  },
  label: {
    ...TYPOGRAPHY.buttonLabel,
    marginLeft: SPACING.sm,
  },
});
