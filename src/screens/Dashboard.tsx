import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  StatusBar 
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { BigButton } from '../components/BigButton';
import { AlertCard } from '../components/AlertCard';
import { PackagePlus, ShoppingCart, TrendingUp, Archive, Edit } from 'lucide-react-native';

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
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={TYPOGRAPHY.body}>Good morning,</Text>
          <Text style={TYPOGRAPHY.h1}>Nanay's Store 🏪</Text>
        </View>

        {/* Primary Quick Actions */}
        <View style={styles.actionSection}>
          <BigButton 
            title="INCOMING STOCK"
            color={COLORS.primary}
            onPress={() => console.log('Open Visual Intake')}
            style={styles.mainButton}
            icon={<PackagePlus color={COLORS.white} size={32} />}
          />
          <BigButton 
            title="SELL ITEMS"
            color={COLORS.success}
            onPress={() => console.log('Open POS')}
            style={styles.mainButton}
            icon={<ShoppingCart color={COLORS.white} size={32} />}
          />
          <BigButton 
            title="MANUAL ADD"
            color={COLORS.secondary}
            onPress={() => console.log('Navigate to Manual')}
            style={styles.smallButton}
            icon={<Edit color={COLORS.primary} size={28} />}
          />
        </View>

        {/* Smart Alerts Section */}
        <View style={styles.alertSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
            <TrendingUp color={COLORS.primary} size={28} style={{ marginRight: 10 }} />
            <Text style={TYPOGRAPHY.h2}>Smart Suggestions</Text>
          </View>
          {MOCK_ALERTS.map(alert => (
            <AlertCard 
              key={alert.id}
              type={alert.type}
              title={alert.title}
              message={alert.message}
              actionLabel={alert.actionLabel}
              onAction={() => console.log('Action taken', alert.id)}
            />
          ))}
        </View>

        {/* Inventory Overview (Simplified) */}
        <View style={styles.summaryCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
        </View>

      </ScrollView>
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
  },
  header: {
    marginBottom: SPACING.lg,
  },
  actionSection: {
    marginBottom: SPACING.xl,
  },
  mainButton: {
    marginBottom: SPACING.md,
    height: 120, // Extra large for the main dashboard
  },
  smallButton: {
    marginBottom: SPACING.md,
    height: 80,
  },
  alertSection: {
    marginBottom: SPACING.xl,
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
});
