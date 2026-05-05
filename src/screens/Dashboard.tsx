import { useRouter } from "expo-router";
import {
  CircleX,
  Edit,
  Info,
  PackagePlus,
  PieChart,
  ShoppingCart,
  TrendingUp,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { AlertCard } from "../components/AlertCard";
import { BigButton } from "../components/BigButton";
import { getAggregatedInventory } from "../logic/inventoryHelper";
import { COLORS, SPACING, TYPOGRAPHY } from "../theme/tokens";

type DashboardAlert = {
  id: string;
  type: "PRICE_HIKE" | "DEAD_STOCK" | "LOW_STOCK";
  title: string;
  message: string;
  actionLabel: string;
};

export const Dashboard: React.FC = () => {
  const router = useRouter();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [profitAlerts, setProfitAlerts] = useState<DashboardAlert[]>([]);
  const [storeHealth, setStoreHealth] = useState({
    inventoryValue: 0,
    lowStockCount: 0,
    totalStockItems: 0,
    averageMargin: 0,
  });

  React.useEffect(() => {
    const loadAlerts = async () => {
      const inventory = await getAggregatedInventory();

      const computedAlerts: DashboardAlert[] = inventory
        .map((item) => {
          const estimatedCost = item.sellingPrice * 0.9;
          const margin =
            item.sellingPrice > 0
              ? ((item.sellingPrice - estimatedCost) / item.sellingPrice) * 100
              : 0;

          if (item.totalStock <= 0 || margin >= 12) {
            return null;
          }

          return {
            id: `margin-${item.id}`,
            type: "PRICE_HIKE" as const,
            title: `Low Margin Alert: ${item.name}`,
            message: `Current margin is ${margin.toFixed(
              1,
            )}%. Keep at least 12% to protect your profit.`,
            actionLabel: "Review Price",
          };
        })
        .filter((item): item is DashboardAlert => item !== null);

      const inventoryValue = inventory.reduce(
        (sum, item) => sum + item.totalStock * item.sellingPrice,
        0,
      );
      const lowStockCount = inventory.filter(
        (item) => item.totalStock <= item.minStockLevel,
      ).length;
      const totalStockItems = inventory.length;
      const averageMargin =
        inventory.length > 0
          ? inventory.reduce((sum, item) => {
              const estimatedCost = item.sellingPrice * 0.9;
              const margin =
                item.sellingPrice > 0
                  ? ((item.sellingPrice - estimatedCost) / item.sellingPrice) *
                    100
                  : 0;
              return sum + margin;
            }, 0) / inventory.length
          : 0;

      setProfitAlerts(computedAlerts);
      setStoreHealth({
        inventoryValue,
        lowStockCount,
        totalStockItems,
        averageMargin,
      });
    };

    loadAlerts();
  }, []);

  const visibleAlerts = useMemo(
    () => profitAlerts.filter((item) => !dismissedAlertIds.includes(item.id)),
    [dismissedAlertIds, profitAlerts],
  );

  const selectedAlert = useMemo(
    () => visibleAlerts.find((item) => item.id === selectedAlertId) || null,
    [selectedAlertId, visibleAlerts],
  );

  const handleSuggestionAction = () => {
    if (!selectedAlert) return;

    if (selectedAlert.type === "PRICE_HIKE") {
      Alert.alert(
        "Price suggestion saved",
        "Suggested selling price was applied for your next stock update.",
      );
    } else {
      Alert.alert(
        "Flash sale marked",
        "This item is now tagged for quick clearance in your next selling session.",
      );
    }

    setDismissedAlertIds((prev) => [...prev, selectedAlert.id]);
    setSelectedAlertId(null);
  };

  const stockHealthPct =
    storeHealth.totalStockItems > 0
      ? (1 - storeHealth.lowStockCount / storeHealth.totalStockItems) * 100
      : 100;
  const profitHealthPct = Math.min(
    100,
    Math.max(0, (storeHealth.averageMargin / 12) * 100),
  );

  const ProgressRing = ({
    percent,
    label,
    value,
  }: {
    percent: number;
    label: string;
    value: string;
  }) => {
    const size = 96;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(100, percent));
    const offset = circumference - (progress / 100) * circumference;

    return (
      <View style={styles.ringCard}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.overlay}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.primary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            fill="transparent"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text style={styles.ringValue}>{value}</Text>
        <Text style={styles.ringLabel}>{label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerSubText}>Stocker</Text>
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
            onPress={() => router.push("/intake")}
            style={styles.mainButton}
            icon={<PackagePlus color={COLORS.white} size={32} />}
          />
          <BigButton
            title="SELL ITEMS"
            color={COLORS.success}
            onPress={() => router.push("/pos")}
            style={styles.mainButton}
            icon={<ShoppingCart color={COLORS.white} size={32} />}
          />
          <BigButton
            title="MANUAL ADD"
            color={COLORS.secondary}
            onPress={() => router.push("/intake?mode=manual&source=dashboard")}
            style={styles.smallButton}
            icon={<Edit color={COLORS.primary} size={28} />}
          />
        </View>

        <View style={styles.bentoGrid}>
          <View style={styles.bentoMain}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoTitle}>Store Health</Text>
              <PieChart color={COLORS.primary} size={18} />
            </View>
            <Text style={styles.bentoValue}>
              ₱{Math.round(storeHealth.inventoryValue).toLocaleString()}
            </Text>
            <Text style={styles.bentoCaption}>Inventory Value</Text>
          </View>

          <View style={styles.bentoRow}>
            <ProgressRing
              percent={stockHealthPct}
              label="Stock Health"
              value={`${Math.round(stockHealthPct)}%`}
            />
            <ProgressRing
              percent={profitHealthPct}
              label="Profit Health"
              value={`${storeHealth.averageMargin.toFixed(1)}%`}
            />
          </View>
        </View>

        {/* Smart Alerts Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <TrendingUp
              color={COLORS.primary}
              size={28}
              style={{ marginRight: 10 }}
            />
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

        <Pressable
          style={({ pressed }) => [
            styles.healthAction,
            pressed && styles.healthActionPressed,
          ]}
          onPress={() => router.push("/inventory")}
        >
          <Text style={styles.healthActionText}>View Stock Details</Text>
        </Pressable>
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
                style={({ pressed }) => [
                  styles.modalActionSecondary,
                  pressed && styles.pressed,
                ]}
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
                style={({ pressed }) => [
                  styles.modalActionPrimary,
                  pressed && styles.pressed,
                ]}
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
  bentoGrid: {
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  bentoMain: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    padding: SPACING.md,
  },
  bentoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  bentoTitle: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
  },
  bentoValue: {
    ...TYPOGRAPHY.h2,
    fontSize: 30,
  },
  bentoCaption: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
  },
  bentoRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  ringCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  ringValue: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 4,
  },
  ringLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
  },
  sectionLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: "700",
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
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  suggestionCount: {
    marginLeft: "auto",
    ...TYPOGRAPHY.body,
    fontWeight: "700",
    color: COLORS.primary,
  },
  emptySuggestionCard: {
    borderWidth: 1,
    borderColor: "rgba(46,125,50,0.25)",
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptySuggestionText: {
    ...TYPOGRAPHY.body,
    flex: 1,
    fontSize: 15,
  },
  healthAction: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.overlay,
    backgroundColor: COLORS.surface,
  },
  healthActionPressed: {
    opacity: 0.8,
  },
  healthActionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    gap: SPACING.sm,
  },
  modalActionSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.overlay,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalActionSecondaryText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  modalActionPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalActionPrimaryText: {
    ...TYPOGRAPHY.body,
    color: COLORS.white,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
});
