import * as Haptics from "expo-haptics";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  ViewStyle,
} from "react-native";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

interface BigButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  variant?: "filled" | "outlined" | "ghost";
}

/**
 * Primary action button – Productive Minimalism edition.
 * - Minimum 56 px height (well above Apple's 44 px guideline)
 * - Crisp shadows on white, not heavy elevation
 * - Haptic + micro-vibration feedback
 */
export const BigButton: React.FC<BigButtonProps> = ({
  title,
  onPress,
  color = COLORS.primary,
  textColor,
  icon,
  style,
  variant = "filled",
}) => {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Vibration.vibrate(4);
    onPress();
  };

  const isOutlined = variant === "outlined";
  const isGhost    = variant === "ghost";

  const resolvedBg    = isOutlined || isGhost ? COLORS.background : color;
  const resolvedBorder= isOutlined ? color : "transparent";
  const resolvedText  = textColor ?? (isOutlined || isGhost ? color : COLORS.white);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={handlePress}
      style={[
        styles.container,
        { backgroundColor: resolvedBg, borderColor: resolvedBorder },
        !isGhost && SHADOW.card,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.label, { color: resolvedText, marginLeft: icon ? SPACING.xs : 0 }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight:      56,
    width:          "100%",
    borderRadius:   RADIUS.lg,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    borderWidth:    1.5,
  },
  label: {
    ...TYPOGRAPHY.buttonLabel,
  },
});
