import { useRouter } from "expo-router";
import {
  CircleX,
  Edit3,
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
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

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
    inventoryValue:  0,
    lowStockCount:   0,
    totalStockItems: 0,
    averageMargin:   0,
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

          if (item.totalStock <= 0 || margin >= 12) return null;

          return {
            id:          `margin-${item.id}`,
            type:        "PRICE_HIKE" as const,
            title:       `Low Margin: ${item.name}`,
            message:     `Margin is ${margin.toFixed(1)}%. Aim for at least 12% to protect your profit.`,
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
                  ? ((item.sellingPrice - estimatedCost) / item.sellingPrice) * 100
                  : 0;
              return sum + margin;
            }, 0) / inventory.length
          : 0;

      setProfitAlerts(computedAlerts);
      setStoreHealth({ inventoryValue, lowStockCount, totalStockItems, averageMargin });
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
    Alert.alert(
      selectedAlert.type === "PRICE_HIKE"
        ? "Price suggestion saved"
        : "Flash sale marked",
      selectedAlert.type === "PRICE_HIKE"
        ? "Suggested price was queued for your next stock update."
        : "Item tagged for quick clearance.",
    );
    setDismissedAlertIds((prev) => [...prev, selectedAlert.id]);
    setSelectedAlertId(null);
  };

  const stockHealthPct =
    storeHealth.totalStockItems > 0
      ? (1 - storeHealth.lowStockCount / storeHealth.totalStockItems) * 100
      : 100;
  const profitHealthPct = Math.min(100, Math.max(0, (storeHealth.averageMargin / 12) * 100));

  // ── Mini donut ring ────────────────────────────────────────────
  const ProgressRing = ({
    percent,
    label,
    value,
    color = COLORS.primary,
  }: {
    percent: number;
    label: string;
    value: string;
    color?: string;
  }) => {
    const size        = 100;
    const strokeWidth = 9;
    const radius      = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset      = circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference;

    return (
      <View style={styles.ringCard}>
        {/* Ring + centered value overlay */}
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            {/* Track */}
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              stroke={COLORS.overlay} strokeWidth={strokeWidth} fill="transparent"
            />
            {/* Progress */}
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              stroke={color} strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset}
              fill="transparent"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          {/* Value centered inside the ring */}
          <View style={[
            { position: "absolute", top: 0, left: 0, width: size, height: size },
            styles.ringCenter,
          ]}>
            <Text style={[styles.ringValue, { color }]}>{value}</Text>
          </View>
        </View>
        {/* Label below the ring */}
        <Text style={styles.ringLabel}>{label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>Stocker</Text>
          <Text style={TYPOGRAPHY.h1}>{"Nanay's Store 🏪"}</Text>
          <Text style={styles.headerSubtitle}>
            Keep your margins protected and stock moving today.
          </Text>
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionSection}>
          <BigButton
            title="Incoming Stock"
            color={COLORS.primary}
            onPress={() => router.push("/intake")}
            style={styles.mainButton}
            icon={<PackagePlus color={COLORS.white} size={24} />}
          />
          <BigButton
            title="Sell Items"
            color={COLORS.success}
            onPress={() => router.push("/pos")}
            style={styles.mainButton}
            icon={<ShoppingCart color={COLORS.white} size={24} />}
          />
          <BigButton
            title="Manual Add"
            variant="outlined"
            color={COLORS.primary}
            onPress={() => router.push("/intake?mode=manual&source=dashboard")}
            style={styles.smallButton}
            icon={<Edit3 color={COLORS.primary} size={22} />}
          />
        </View>

        {/* ── Bento Grid ── */}
        <Text style={styles.sectionLabel}>Store Health</Text>
        <View style={styles.bentoGrid}>
          {/* Inventory value — full-width card */}
          <View style={styles.bentoMain}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoLabel}>Inventory Value</Text>
              <PieChart color={COLORS.primary} size={16} />
            </View>
            <Text style={styles.bentoValue}>
              ₱{Math.round(storeHealth.inventoryValue).toLocaleString()}
            </Text>
            <Text style={styles.bentoCaption}>
              {storeHealth.totalStockItems} product{storeHealth.totalStockItems !== 1 ? "s" : ""} tracked
            </Text>
          </View>

          {/* Progress rings row */}
          <View style={styles.bentoRow}>
            <ProgressRing
              percent={stockHealthPct}
              label="Stock Health"
              value={`${Math.round(stockHealthPct)}%`}
              color={stockHealthPct >= 70 ? COLORS.success : COLORS.warning}
            />
            <ProgressRing
              percent={profitHealthPct}
              label="Profit Health"
              value={`${storeHealth.averageMargin.toFixed(1)}%`}
              color={profitHealthPct >= 70 ? COLORS.success : COLORS.warning}
            />
          </View>
        </View>

        {/* ── Smart Alerts ── */}
        <View style={styles.sectionRow}>
          <TrendingUp color={COLORS.primary} size={20} />
          <Text style={[styles.sectionLabel, { marginLeft: 6, marginBottom: 0 }]}>
            Smart Suggestions
          </Text>
          {visibleAlerts.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{visibleAlerts.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
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
            <View style={styles.emptyAlerts}>
              <Info color={COLORS.success} size={20} />
              <Text style={styles.emptyAlertsText}>
                All good! No pending suggestions right now.
              </Text>
            </View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [styles.viewStockBtn, pressed && styles.pressed]}
          onPress={() => router.push("/inventory")}
        >
          <Text style={styles.viewStockBtnText}>View Full Stock →</Text>
        </Pressable>

      </ScrollView>

      {/* ── Suggestion Modal ── */}
      <Modal
        animationType="slide"
        transparent
        visible={!!selectedAlert}
        onRequestClose={() => setSelectedAlertId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={TYPOGRAPHY.h2}>Suggestion Details</Text>
              <Pressable onPress={() => setSelectedAlertId(null)} hitSlop={8}>
                <CircleX color={COLORS.textSecondary} size={22} />
              </Pressable>
            </View>
            <Text style={styles.modalTitle}>{selectedAlert?.title}</Text>
            <Text style={styles.modalMessage}>{selectedAlert?.message}</Text>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalSecondary, pressed && styles.pressed]}
                onPress={() => {
                  if (selectedAlert) setDismissedAlertIds((prev) => [...prev, selectedAlert.id]);
                  setSelectedAlertId(null);
                }}
              >
                <Text style={styles.modalSecondaryText}>Dismiss</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalPrimary, pressed && styles.pressed]}
                onPress={handleSuggestionAction}
              >
                <Text style={styles.modalPrimaryText}>Apply</Text>
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
    padding:      SPACING.md,
    paddingBottom: SPACING.xl,
  },

  // Header
  header: {
    marginBottom: SPACING.lg,
  },
  headerEyebrow: {
    ...TYPOGRAPHY.caption,
    fontWeight:    "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom:  4,
    color:         COLORS.primary,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    marginTop: 6,
    lineHeight: 22,
  },

  // Labels
  sectionLabel: {
    ...TYPOGRAPHY.body,
    fontWeight:    "700",
    color:         COLORS.textPrimary,
    marginBottom:  SPACING.sm,
    fontSize:      14,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionRow: {
    flexDirection:  "row",
    alignItems:     "center",
    marginBottom:   SPACING.sm,
  },
  badge: {
    marginLeft:      8,
    backgroundColor: COLORS.primary,
    borderRadius:    999,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  badgeText: {
    color:      COLORS.white,
    fontSize:   12,
    fontWeight: "700",
  },

  // Buttons
  actionSection: {
    marginBottom: SPACING.lg,
    gap:          SPACING.sm,
  },
  mainButton: {
    height: 64,
  },
  smallButton: {
    height: 54,
  },

  // Bento
  bentoGrid: {
    marginBottom: SPACING.lg,
    gap:          SPACING.sm,
  },
  bentoMain: {
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.xl,
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    padding:         SPACING.md,
    ...SHADOW.card,
  },
  bentoHeader: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   6,
  },
  bentoLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
  },
  bentoValue: {
    fontSize:      32,
    fontWeight:    "800",
    color:         COLORS.textPrimary,
    fontFamily:    "Inter_700Bold",
    letterSpacing: -0.5,
  },
  bentoCaption: {
    ...TYPOGRAPHY.caption,
    marginTop: 4,
  },
  bentoRow: {
    flexDirection: "row",
    gap:           SPACING.sm,
  },
  ringCard: {
    flex:            1,
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.xl,
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    alignItems:      "center",
    paddingVertical: SPACING.md,
    gap:             8,
    ...SHADOW.card,
  },
  ringCenter: {
    alignItems:     "center",
    justifyContent: "center",
  },
  ringValue: {
    fontSize:      16,
    fontWeight:    "800",
    fontFamily:    "Inter_700Bold",
    letterSpacing: -0.3,
  },
  ringLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
  },

  // Alerts section
  sectionCard: {
    marginBottom: SPACING.md,
  },
  emptyAlerts: {
    backgroundColor: "#F0FFF4",
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    flexDirection:   "row",
    alignItems:      "center",
    gap:             10,
    borderWidth:     1,
    borderColor:     "rgba(52,199,89,0.2)",
  },
  emptyAlertsText: {
    ...TYPOGRAPHY.body,
    flex:    1,
    color:   COLORS.textPrimary,
    fontSize: 14,
  },

  // View stock link
  viewStockBtn: {
    marginTop:     SPACING.sm,
    borderRadius:  RADIUS.sm,
    paddingVertical: 14,
    alignItems:    "center",
    borderWidth:   1,
    borderColor:   COLORS.overlay,
    backgroundColor: COLORS.surface,
  },
  viewStockBtnText: {
    ...TYPOGRAPHY.body,
    color:      COLORS.primary,
    fontWeight: "700",
    fontSize:   15,
  },

  // Modal
  modalBackdrop: {
    flex:             1,
    backgroundColor:  "rgba(0,0,0,0.25)",
    justifyContent:   "flex-end",
  },
  modalCard: {
    backgroundColor:     COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding:      SPACING.lg,
    paddingBottom: SPACING.xl,
    ...SHADOW.modal,
  },
  modalHandle: {
    width:           40,
    height:          4,
    backgroundColor: COLORS.overlay,
    borderRadius:    999,
    alignSelf:       "center",
    marginBottom:    SPACING.md,
  },
  modalHeader: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   SPACING.sm,
  },
  modalTitle: {
    ...TYPOGRAPHY.bodyLarge,
    marginBottom: SPACING.xs,
  },
  modalMessage: {
    ...TYPOGRAPHY.body,
    lineHeight: 22,
  },
  modalActions: {
    marginTop:     SPACING.lg,
    flexDirection: "row",
    gap:           SPACING.sm,
  },
  modalSecondary: {
    flex:            1,
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    borderRadius:    RADIUS.sm,
    paddingVertical: 14,
    alignItems:      "center",
    backgroundColor: COLORS.surface,
  },
  modalSecondaryText: {
    ...TYPOGRAPHY.body,
    color:      COLORS.textPrimary,
    fontWeight: "700",
  },
  modalPrimary: {
    flex:            1,
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.sm,
    paddingVertical: 14,
    alignItems:      "center",
  },
  modalPrimaryText: {
    ...TYPOGRAPHY.body,
    color:      COLORS.white,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
});
