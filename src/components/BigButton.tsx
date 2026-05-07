import * as Haptics from "expo-haptics";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  ViewStyle,
} from "react-native";
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

interface BigButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "filled" | "outlined" | "ghost";
  disabled?: boolean;
}

export const BigButton: React.FC<BigButtonProps> = ({
  title,
  onPress,
  color = COLORS.primary,
  textColor,
  icon,
  style,
  variant = "filled",
  disabled = false,
}) => {
  const handlePress = async () => {
    if (disabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Vibration.vibrate(4);
    onPress();
  };

  const isOutlined = variant === "outlined";
  const isGhost = variant === "ghost";
  const resolvedBg = isOutlined || isGhost ? COLORS.surface : color;
  const resolvedBorder = isGhost ? "transparent" : isOutlined ? color : color;
  const resolvedText = textColor ?? (isOutlined || isGhost ? color : COLORS.white);

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      disabled={disabled}
      onPress={handlePress}
      style={[
        styles.container,
        {
          backgroundColor: resolvedBg,
          borderColor: resolvedBorder,
          opacity: disabled ? 0.55 : 1,
        },
        !isGhost && SHADOW.soft,
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.label,
          { color: resolvedText, marginLeft: icon ? SPACING.xs : 0 },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: LAYOUT.minTouch + 8,
    width: "100%",
    borderRadius: RADIUS.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
  },
  label: {
    ...TYPOGRAPHY.buttonLabel,
  },
});
