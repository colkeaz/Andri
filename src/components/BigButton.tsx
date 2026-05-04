import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  Vibration 
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';

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
  style 
}) => {
  const handlePress = () => {
    Vibration.vibrate(10); // Subtle feedback
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
    width: '100%',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    // Premium Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  label: {
    ...TYPOGRAPHY.buttonLabel,
    marginLeft: SPACING.sm,
  },
});
