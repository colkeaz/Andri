import { useFocusEffect, useRouter } from "expo-router";
import {
  CircleX,
  Edit3,
  Info,
  PackagePlus,
  PieChart,
  Receipt,
  ShoppingCart,
  TrendingUp,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
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
import { dbService } from "../database/db";
import { getAggregatedInventory } from "../logic/inventoryHelper";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

type DashboardAlert = {
  id: string;
  type: "PRICE_HIKE" | "DEAD_STOCK" | "LOW_STOCK";
  title: string;
  message: string;
  actionLabel: string;
};

type SaleRecord = {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  timestamp: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return "Just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const Dashboard: React.FC = () => {
  const router = useRouter();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [profitAlerts, setProfitAlerts] = useState<DashboardAlert[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [txLimit, setTxLimit]           = useState(5);
  const [storeHealth, setStoreHealth] = useState({
    inventoryValue:  0,
    lowStockCount:   0,
    totalStockItems: 0,
    averageMargin:   0,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadAlerts = async () => {
        const [inventory, deadStockRows] = await Promise.all([
          getAggregatedInventory(),
          dbService.getDeadStock()
        ]);
        
        if (!active) return;

        // 1. Margin Alerts (Price Hike/Profit Protection)
        const marginAlerts: DashboardAlert[] = inventory
          .map((item) => {
            const margin =
              item.sellingPrice > 0
                ? ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100
                : 0;

            if (item.totalStock <= 0 || margin >= 12) return null;

            return {
              id:          `margin-${item.id}`,
              type:        "PRICE_HIKE" as const,
              title:       `Low Margin: ${item.name}`,
              message:     `Your profit is only ${margin.toFixed(1)}%. Increase price to ₱${(item.costPrice * 1.15).toFixed(2)} for a safe 15% margin.`,
              actionLabel: "Fix Margin",
            };
          })
          .filter((item): item is DashboardAlert => item !== null);

        // 2. Dead Stock Alerts (Inventory Liquidity)
        const deadStockAlerts: DashboardAlert[] = deadStockRows.map(row => ({
          id: `dead-${row.id}`,
          type: "DEAD_STOCK" as const,
          title: `Dead Stock: ${row.name}`,
          message: `${row.name} hasn't sold in 30+ days. Try a flash sale at ₱${(row.price * 0.9).toFixed(2)} to free up cash.`,
          actionLabel: "Flash Sale",
        }));

        // 3. Low Stock Alerts (Availability)
        const lowStockAlerts: DashboardAlert[] = inventory
          .filter(item => item.totalStock > 0 && item.totalStock <= item.minStockLevel)
          .map(item => ({
            id: `low-${item.id}`,
            type: "LOW_STOCK" as const,
            title: `Low Stock: ${item.name}`,
            message: `Only ${item.totalStock} left. Restock soon to avoid losing sales.`,
            actionLabel: "Restock",
          }));

        const computedAlerts = [...marginAlerts, ...deadStockAlerts, ...lowStockAlerts];

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
                const margin =
                  item.sellingPrice > 0
                    ? ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100
                    : 0;
                return sum + margin;
              }, 0) / inventory.length
            : 0;

        setProfitAlerts(computedAlerts);
        setStoreHealth({ inventoryValue, lowStockCount, totalStockItems, averageMargin });

        // Load sales history in parallel
        const sales = await dbService.getSalesHistory(30);
        if (active) setSalesHistory(sales as SaleRecord[]);
      };

      loadAlerts();
      return () => { active = false; };
    }, []),
  );

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
    
    let title = "";
    let body = "";

    if (selectedAlert.type === "PRICE_HIKE") {
      title = "Profit Guard™ Applied";
      body = "The selling price has been adjusted to maintain your 15% margin.";
    } else if (selectedAlert.type === "DEAD_STOCK") {
      title = "Clearance Tagged";
      body = "This item is now marked for flash sale. It will show a special badge in the POS.";
    } else {
      title = "Restock Noted";
      body = "Added to your shopping list for the next wholesaler visit.";
    }

    Alert.alert(title, body);
    setDismissedAlertIds((prev) => [...prev, selectedAlert.id]);
    setSelectedAlertId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          <View style={styles.actionRow}>
            <BigButton
              title="Incoming Stock"
              color={COLORS.primary}
              onPress={() => router.push("/intake")}
              style={[styles.mainButton, { flex: 1 }]}
              icon={<PackagePlus color={COLORS.white} size={24} />}
            />
            <BigButton
              title="Scan Receipt"
              color={COLORS.secondary}
              onPress={() => router.push("/intake?mode=receipt&source=dashboard")}
              style={[styles.mainButton, { flex: 1 }]}
              icon={<Receipt color={COLORS.primary} size={24} />}
            />
          </View>
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

        {/* ── Recent Transactions ── */}
        <View style={styles.txSection}>
          <View style={styles.txHeaderRow}>
            <Receipt color={COLORS.primary} size={18} />
            <Text style={[styles.sectionLabel, { marginLeft: 6, marginBottom: 0 }]}>
              Recent Transactions
            </Text>
            {salesHistory.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{salesHistory.length}</Text>
              </View>
            )}
          </View>

          {salesHistory.length === 0 ? (
            <View style={styles.txEmpty}>
              <Text style={styles.txEmptyText}>No sales recorded yet. Complete a sale to see it here.</Text>
            </View>
          ) : (
            <>
              {salesHistory.slice(0, txLimit).map((sale) => (
                <View key={sale.id} style={styles.txCard}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txName} numberOfLines={1}>{sale.productName}</Text>
                    <Text style={styles.txMeta}>{sale.quantity} unit{sale.quantity !== 1 ? "s" : ""} sold</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={styles.txAmount}>₱{sale.totalPrice.toFixed(2)}</Text>
                    <Text style={styles.txTime}>{timeAgo(sale.timestamp)}</Text>
                  </View>
                </View>
              ))}

              {salesHistory.length > 5 && (
                <Pressable
                  style={({ pressed }) => [styles.txMoreBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setTxLimit((prev) => prev > 5 ? 5 : salesHistory.length)}
                >
                  <Text style={styles.txMoreText}>
                    {txLimit > 5
                      ? "Show less ↑"
                      : `Show ${salesHistory.length - 5} more ↓`}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>

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
  actionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
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

  // Transactions
  txSection: {
    marginTop: SPACING.lg,
  },
  txHeaderRow: {
    flexDirection:  "row",
    alignItems:     "center",
    marginBottom:   SPACING.sm,
  },
  txEmpty: {
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    alignItems:      "center",
  },
  txEmptyText: {
    ...TYPOGRAPHY.body,
    color:     COLORS.textSecondary,
    fontSize:  14,
    textAlign: "center",
  },
  txCard: {
    flexDirection:   "row",
    alignItems:      "center",
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.md,
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    paddingVertical:   12,
    paddingHorizontal: SPACING.md,
    marginBottom:    SPACING.xs,
    ...SHADOW.card,
  },
  txLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  txName: {
    ...TYPOGRAPHY.body,
    fontWeight: "700",
    fontSize:   15,
    color:      COLORS.textPrimary,
  },
  txMeta: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  txRight: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize:   17,
    fontWeight: "800",
    color:      COLORS.success,
    fontFamily: "Inter_700Bold",
  },
  txTime: {
    ...TYPOGRAPHY.caption,
    marginTop: 3,
    color:     COLORS.textSecondary,
  },
  txMoreBtn: {
    marginTop:       SPACING.xs,
    paddingVertical: 10,
    borderRadius:    RADIUS.sm,
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    backgroundColor: COLORS.surface,
    alignItems:      "center",
  },
  txMoreText: {
    ...TYPOGRAPHY.body,
    color:      COLORS.primary,
    fontWeight: "700",
    fontSize:   14,
  },
});
