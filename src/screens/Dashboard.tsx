import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Edit3,
  PackagePlus,
  PieChart,
  Receipt,
  ShoppingCart,
  Sparkles,
  TrendingUp
} from "lucide-react-native";
import { Image } from "expo-image";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertCard } from "../components/AlertCard";
import {
  ActionTile,
  AppHeader,
  AppScreen,
  EmptyState,
  MetricTile,
  PremiumCard,
  SectionHeader,
  StatusPill,
} from "../components/ui";
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

function money(value: number) {
  return `PHP ${value.toFixed(2)}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const Dashboard: React.FC = () => {
  const router = useRouter();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [profitAlerts, setProfitAlerts] = useState<DashboardAlert[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [storeHealth, setStoreHealth] = useState({
    inventoryValue: 0,
    lowStockCount: 0,
    totalStockItems: 0,
    averageMargin: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadDashboard = async () => {
        const [inventory, deadStockRows, sales] = await Promise.all([
          getAggregatedInventory(),
          dbService.getDeadStock(),
          dbService.getSalesHistory(30),
        ]);

        if (!active) return;

        const marginAlerts = inventory
          .map<DashboardAlert | null>((item) => {
            const margin =
              item.sellingPrice > 0
                ? ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100
                : 0;
            if (item.totalStock <= 0 || margin >= 12) return null;
            return {
              id: `margin-${item.id}`,
              type: "PRICE_HIKE" as const,
              title: `Low Margin: ${item.name}`,
              message: `Profit is ${margin.toFixed(1)}%. Raise price to ${money(item.costPrice / 0.85)} for a safer margin.`,
              actionLabel: "Fix Margin",
            };
          })
          .filter((item): item is DashboardAlert => item !== null);

        const deadStockAlerts: DashboardAlert[] = deadStockRows.map((row) => ({
          id: `dead-${row.id}`,
          type: "DEAD_STOCK",
          title: `Dead Stock: ${row.name}`,
          message: `${row.name} has not sold in 30+ days. Try a flash sale at ${money(row.price * 0.9)}.`,
          actionLabel: "Flash Sale",
        }));

        const lowStockAlerts: DashboardAlert[] = inventory
          .filter((item) => item.totalStock > 0 && item.totalStock <= item.minStockLevel)
          .map((item) => ({
            id: `low-${item.id}`,
            type: "LOW_STOCK",
            title: `Low Stock: ${item.name}`,
            message: `Only ${item.totalStock} left. Restock soon to avoid losing sales.`,
            actionLabel: "Restock",
          }));

        const inventoryValue = inventory.reduce(
          (sum, item) => sum + item.totalStock * item.sellingPrice,
          0,
        );
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

        setProfitAlerts([...marginAlerts, ...deadStockAlerts, ...lowStockAlerts]);
        setStoreHealth({
          inventoryValue,
          lowStockCount: inventory.filter((item) => item.totalStock <= item.minStockLevel).length,
          totalStockItems: inventory.length,
          averageMargin,
        });
        setSalesHistory(sales as SaleRecord[]);
      };

      loadDashboard().catch((error) => {
        Alert.alert("Dashboard Unavailable", error instanceof Error ? error.message : "Could not load dashboard.");
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const visibleAlerts = useMemo(
    () => profitAlerts.filter((item) => !dismissedAlertIds.includes(item.id)),
    [dismissedAlertIds, profitAlerts],
  );
  const selectedAlert = visibleAlerts.find((item) => item.id === selectedAlertId) ?? null;
  const stockHealthPct =
    storeHealth.totalStockItems > 0
      ? Math.round((1 - storeHealth.lowStockCount / storeHealth.totalStockItems) * 100)
      : 100;

  const handleSuggestionAction = async () => {
    if (!selectedAlert) return;

    if (selectedAlert.type === "PRICE_HIKE") {
      const productId = selectedAlert.id.replace("margin-", "");
      const inventory = await getAggregatedInventory();
      const product = inventory.find((p) => p.id === productId);
      if (product) {
        await dbService.updateInventoryPrices(productId, {
          sellingPrice: Number((product.costPrice / 0.85).toFixed(2)),
        });
      }
      Alert.alert("Profit Guard Applied", "The selling price was adjusted.");
    } else if (selectedAlert.type === "DEAD_STOCK") {
      const productId = selectedAlert.id.replace("dead-", "");
      const inventory = await getAggregatedInventory();
      const product = inventory.find((p) => p.id === productId);
      if (product) {
        await dbService.updateInventoryPrices(productId, {
          sellingPrice: Number((product.sellingPrice * 0.9).toFixed(2)),
        });
      }
      Alert.alert("Clearance Applied", "This item was marked down for a flash sale.");
    } else {
      router.push("/intake?mode=manual&source=dashboard");
      Alert.alert("Restock Reminder", "Add new stock for this item.");
    }

    setDismissedAlertIds((prev) => [...prev, selectedAlert.id]);
    setSelectedAlertId(null);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <AppScreen>
      <AppHeader
        title="Nanay's Store"
        subtitle="Keep margins protected, shelves stocked, and sales moving today."
        right={<StatusPill label={`${stockHealthPct}% stocked`} tone={stockHealthPct >= 70 ? "success" : "warning"} />}
      />

     

      <View style={styles.actionGrid}>
        <ActionTile title="Incoming Stock" subtitle="Add or restock items" icon={PackagePlus} tone="primary" onPress={() => router.push("/addstock")} />
        <ActionTile title="Sell Items" subtitle="Open mobile POS" icon={ShoppingCart} tone="success" onPress={() => router.push("/pos")} />
        <ActionTile title="Scan Receipt" subtitle="OCR purchase or sale" icon={Receipt} tone="warning" onPress={() => router.push("/addstock?mode=receipt&source=dashboard")} />
        <ActionTile title="Manual Add" subtitle="Fast non-camera entry" icon={Edit3} tone="neutral" onPress={() => router.push("/addstock?mode=manual&source=dashboard")} />
      </View>

      <SectionHeader title="Store Health" subtitle="Live from local inventory" />
      <View style={styles.metricsRow}>
        <MetricTile
          label="Inventory Value"
          value={money(storeHealth.inventoryValue)}
          caption={`${storeHealth.totalStockItems} product${storeHealth.totalStockItems === 1 ? "" : "s"} tracked`}
          tone="primary"
          icon={<PieChart color={COLORS.primary} size={16} />}
          style={styles.wideMetric}
        />
      </View>
      <View style={styles.metricsRow}>
        <MetricTile label="Stock Health" value={`${stockHealthPct}%`} caption={`${storeHealth.lowStockCount} low-stock item${storeHealth.lowStockCount === 1 ? "" : "s"}`} tone={stockHealthPct >= 70 ? "success" : "warning"} />
        <MetricTile label="Margin" value={`${storeHealth.averageMargin.toFixed(1)}%`} caption="Average profit" tone={storeHealth.averageMargin >= 12 ? "success" : "warning"} />
      </View>

      <SectionHeader title="Smart Suggestions" subtitle="Profit Guard and stock alerts" count={visibleAlerts.length} />
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
        <PremiumCard>
          <View style={styles.goodNews}>
            <Sparkles color={COLORS.success} size={24} />
            <View style={styles.goodNewsText}>
              <Text style={styles.goodNewsTitle}>Everything looks steady</Text>
              <Text style={styles.goodNewsBody}>No urgent stock or profit suggestions right now.</Text>
            </View>
          </View>
        </PremiumCard>
      )}

     

      <SectionHeader
        title="Recent Transactions"
        subtitle="Latest sales activity"
        right={
          <Pressable onPress={() => router.push("/inventory")}>
            <Text className="text-blue-600 font-medium">
              View full inventory →
            </Text>
          </Pressable>
        }
      />
      
      {salesHistory.length === 0 ? (
        <EmptyState title="No sales yet" message="Finish a sale in POS and it will appear here." icon={<Receipt color={COLORS.primary} size={30} />} />
      ) : (
        salesHistory.slice(0, 3).map((sale) => (
          <PremiumCard key={sale.id} style={styles.txCard}>
            <View style={styles.txIcon}>
              <Receipt color={COLORS.primary} size={18} />
            </View>
            
            <View style={styles.txInfo}>
              <Text style={styles.txName} numberOfLines={1}>{sale.productName}</Text>
              <Text style={styles.txMeta}>{sale.quantity} sold</Text>
            </View>
            <View style={styles.txRight}>
              <Text style={styles.txAmount}>{money(sale.totalPrice)}</Text>
              <Text style={styles.txTime}>{timeAgo(sale.timestamp)}</Text>
            </View>
          </PremiumCard>
        ))
      )}

      <Modal animationType="slide" transparent visible={!!selectedAlert} onRequestClose={() => setSelectedAlertId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
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
              <Pressable style={({ pressed }) => [styles.modalPrimary, pressed && styles.pressed]} onPress={handleSuggestionAction}>
                <TrendingUp color={COLORS.white} size={18} />
                <Text style={styles.modalPrimaryText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    height: 160,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  actionGrid: {
    gap: SPACING.sm,
  },
  metricsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  wideMetric: {
    minHeight: 118,
  },
  goodNews: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  goodNewsText: {
    flex: 1,
  },
  goodNewsTitle: {
    ...TYPOGRAPHY.bodyBold,
  },
  goodNewsBody: {
    ...TYPOGRAPHY.caption,
    marginTop: 3,
  },
  stockLink: {
    marginTop: SPACING.md,
    minHeight: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: "#BBD5FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  stockLinkText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: {
    flex: 1,
  },
  txName: {
    ...TYPOGRAPHY.bodyBold,
  },
  txMeta: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  txRight: {
    alignItems: "flex-end",
  },
  txAmount: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.success,
  },
  txTime: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.36)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    ...SHADOW.modal,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.overlay,
    alignSelf: "center",
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
  },
  modalMessage: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  modalSecondary: {
    flex: 1,
    minHeight: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: {
    ...TYPOGRAPHY.bodyBold,
  },
  modalPrimary: {
    flex: 1,
    minHeight: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  modalPrimaryText: {
    ...TYPOGRAPHY.buttonLabel,
  },
  pressed: {
    opacity: 0.78,
  },
});
