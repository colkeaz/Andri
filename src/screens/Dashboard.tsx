import React, { useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  StatusBar,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { BigButton } from '../components/BigButton';
import { AlertCard } from '../components/AlertCard';
import { PackagePlus, ShoppingCart, TrendingUp, Archive, Edit, Info, CircleX } from 'lucide-react-native';

// Mock data for initial UI demonstration
const MOCK_ALERTS = [
  {
    id: '1',
    type: 'PRICE_HIKE' as const,
    title: '⚠️ Price Alert: Cooking Oil',
    message: 'Supplier cost rose by ₱15. Tap to update your selling price and keep your 15% profit.',
    actionLabel: 'Update Price to ₱125',
  },
  {
    id: '2',
    type: 'DEAD_STOCK' as const,
    title: '📦 Slow Mover: Biscuits',
    message: 'This item hasn\'t sold in 30 days. Suggest a Flash Sale to free up ₱1,200 cash.',
    actionLabel: 'Start Flash Sale (₱10 off)',
  }
];

export const Dashboard: React.FC = () => {
  const router = useRouter();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  const visibleAlerts = useMemo(
    () => MOCK_ALERTS.filter((item) => !dismissedAlertIds.includes(item.id)),
    [dismissedAlertIds]
  );

  const selectedAlert = useMemo(
    () => visibleAlerts.find((item) => item.id === selectedAlertId) || null,
    [selectedAlertId, visibleAlerts]
  );

  const handleSuggestionAction = () => {
    if (!selectedAlert) return;

    if (selectedAlert.type === 'PRICE_HIKE') {
      Alert.alert(
        'Price suggestion saved',
        'Suggested selling price was applied for your next stock update.'
      );
    } else {
      Alert.alert(
        'Flash sale marked',
        'This item is now tagged for quick clearance in your next selling session.'
      );
    }

    setDismissedAlertIds((prev) => [...prev, selectedAlert.id]);
    setSelectedAlertId(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerSubText}>Good morning,</Text>
          <Text style={TYPOGRAPHY.h1}>{"Nanay's Store 🏪"}</Text>
          <Text style={styles.headerBodyText}>
            Keep your margins protected and stock moving today.
          </Text>
        </View>

        {/* Primary Quick Actions */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <BigButton 
            title="INCOMING STOCK"
            color={COLORS.primary}
            onPress={() => router.push('/intake')}
            style={styles.mainButton}
            icon={<PackagePlus color={COLORS.white} size={32} />}
          />
          <BigButton 
            title="SELL ITEMS"
            color={COLORS.success}
            onPress={() => router.push('/pos')}
            style={styles.mainButton}
            icon={<ShoppingCart color={COLORS.white} size={32} />}
          />
          <BigButton 
            title="MANUAL ADD"
            color={COLORS.secondary}
            onPress={() =>
              Alert.alert(
                'Manual Add',
                'Open Add screen then tap "ADD MANUALLY INSTEAD" to enter item details without camera.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Add', onPress: () => router.push('/intake') },
                ]
              )
            }
            style={styles.smallButton}
            icon={<Edit color={COLORS.primary} size={28} />}
          />
        </View>

        {/* Smart Alerts Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <TrendingUp color={COLORS.primary} size={28} style={{ marginRight: 10 }} />
            <Text style={TYPOGRAPHY.h2}>Smart Suggestions</Text>
            <Text style={styles.suggestionCount}>{visibleAlerts.length}</Text>
          </View>

          {visibleAlerts.length > 0 ? (
            visibleAlerts.map((alert) => (
              <AlertCard 
                key={alert.id}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                actionLabel={alert.actionLabel}
                onAction={() => setSelectedAlertId(alert.id)}
              />
            ))
          ) : (
            <View style={styles.emptySuggestionCard}>
              <Info color={COLORS.success} size={20} />
              <Text style={styles.emptySuggestionText}>
                No pending suggestions. Your store is looking healthy.
              </Text>
            </View>
          )}
        </View>

        {/* Inventory Overview (Simplified) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={[TYPOGRAPHY.h2, { color: COLORS.white }]}>Store Health</Text>
            <Archive color={COLORS.white} size={24} />
          </View>
          <View style={styles.healthStats}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>₱45,200</Text>
              <Text style={styles.statLabel}>Inventory Value</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS.secondary }]}>5</Text>
              <Text style={styles.statLabel}>Low Stock</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.healthAction, pressed && styles.healthActionPressed]}
            onPress={() => router.push('/inventory')}
          >
            <Text style={styles.healthActionText}>View Stock Details</Text>
          </Pressable>
        </View>

      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={!!selectedAlert}
        onRequestClose={() => setSelectedAlertId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={TYPOGRAPHY.h2}>Suggestion Details</Text>
              <Pressable onPress={() => setSelectedAlertId(null)} hitSlop={8}>
                <CircleX color={COLORS.textSecondary} size={24} />
              </Pressable>
            </View>
            <Text style={styles.modalTitle}>{selectedAlert?.title}</Text>
            <Text style={styles.modalMessage}>{selectedAlert?.message}</Text>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalActionSecondary, pressed && styles.pressed]}
                onPress={() => {
                  if (selectedAlert) {
                    setDismissedAlertIds((prev) => [...prev, selectedAlert.id]);
                  }
                  setSelectedAlertId(null);
                }}
              >
                <Text style={styles.modalActionSecondaryText}>Dismiss</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalActionPrimary, pressed && styles.pressed]}
                onPress={handleSuggestionAction}
              >
                <Text style={styles.modalActionPrimaryText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.md,
  },
  headerSubText: {
    ...TYPOGRAPHY.body,
    marginBottom: 4,
  },
  headerBodyText: {
    ...TYPOGRAPHY.body,
    marginTop: 4,
    fontSize: 15,
  },
  actionSection: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  mainButton: {
    marginBottom: SPACING.md,
    height: 108,
  },
  smallButton: {
    marginBottom: SPACING.sm,
    height: 80,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  suggestionCount: {
    marginLeft: 'auto',
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptySuggestionCard: {
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.25)',
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptySuggestionText: {
    ...TYPOGRAPHY.body,
    flex: 1,
    fontSize: 15,
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  healthStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    fontSize: 28,
  },
  statLabel: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  healthAction: {
    marginTop: SPACING.md,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  healthActionPressed: {
    opacity: 0.8,
  },
  healthActionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.white,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    ...TYPOGRAPHY.bodyLarge,
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    ...TYPOGRAPHY.body,
    lineHeight: 24,
  },
  modalActions: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalActionSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalActionSecondaryText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  modalActionPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalActionPrimaryText: {
    ...TYPOGRAPHY.body,
    color: COLORS.white,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
