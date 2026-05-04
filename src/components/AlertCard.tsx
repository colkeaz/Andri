import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';

interface AlertCardProps {
  type: 'PRICE_HIKE' | 'DEAD_STOCK';
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
  const isWarning = type === 'PRICE_HIKE';
  
  return (
    <View style={[styles.container, isWarning ? styles.borderWarning : styles.borderInfo]}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: isWarning ? COLORS.danger : COLORS.success }]}
        onPress={onAction}
      >
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  borderWarning: {
    borderColor: COLORS.danger,
  },
  borderInfo: {
    borderColor: COLORS.success,
  },
  content: {
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.xs,
  },
  message: {
    ...TYPOGRAPHY.body,
    lineHeight: 26,
  },
  button: {
    height: 60,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...TYPOGRAPHY.buttonLabel,
    fontSize: 18,
  },
});
