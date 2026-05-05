import { AlertCircle, Boxes, CircleX, Package } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getAggregatedInventory } from "../logic/inventoryHelper";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

type InventoryItem = {
  id: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  min_stock: number;
};

const FALLBACK_INVENTORY: InventoryItem[] = [
  { id: "1", name: "Coke 1.5L",       quantity: 12,  min_stock: 5  },
  { id: "2", name: "Lucky Me Noodles", quantity: 2,   min_stock: 10 },
  { id: "3", name: "Bear Brand 320g",  quantity: 45,  min_stock: 10 },
  { id: "4", name: "Egg (Large)",      quantity: 120, min_stock: 50 },
];

export const InventoryScreen: React.FC = () => {
  const [inventory,    setInventory]    = useState<InventoryItem[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const hydrateInventory = async () => {
    try {
      const products = await getAggregatedInventory();
      if (!Array.isArray(products) || products.length === 0) {
        setInventory(FALLBACK_INVENTORY);
        setIsUsingFallback(true);
        return;
      }
      setInventory(
        products.map((p) => ({
          id:        p.id,
          name:      p.name,
          barcode:   p.barcode,
          quantity:  p.totalStock,
          min_stock: p.minStockLevel,
        })),
      );
      setIsUsingFallback(false);
    } catch {
      setInventory(FALLBACK_INVENTORY);
      setIsUsingFallback(true);
    }
  };

  useEffect(() => {
    hydrateInventory().finally(() => setIsLoading(false));
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await hydrateInventory();
    setIsRefreshing(false);
  };

  const lowStockCount = inventory.filter((i) => i.quantity <= i.min_stock).length;

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const isLow = item.quantity <= item.min_stock;
    const pct   = Math.min(1, item.quantity / Math.max(1, item.min_stock * 2));

    return (
      <TouchableOpacity
        activeOpacity={0.82}
        style={[styles.card, isLow && styles.cardLow]}
        onPress={() => setSelectedItem(item)}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width:           `${Math.round(pct * 100)}%` as any,
                  backgroundColor: isLow ? COLORS.danger : COLORS.success,
                },
              ]}
            />
          </View>
          <Text style={styles.itemMeta}>
            {item.quantity} in stock · Min {item.min_stock}
          </Text>
        </View>

        <View style={[styles.stockBadge, { backgroundColor: isLow ? COLORS.danger : COLORS.success }]}>
          {isLow && <AlertCircle color={COLORS.white} size={12} />}
          <Text style={styles.stockBadgeText}>
            {isLow ? "LOW" : "OK"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Metric strip */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{inventory.length}</Text>
          <Text style={styles.metricLabel}>Total Items</Text>
        </View>
        <View style={[styles.metricCard, lowStockCount > 0 && styles.metricCardAlert]}>
          <Text style={[styles.metricValue, lowStockCount > 0 && { color: COLORS.danger }]}>
            {lowStockCount}
          </Text>
          <Text style={styles.metricLabel}>Low Stock</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {inventory.length > 0
              ? `${Math.round(((inventory.length - lowStockCount) / inventory.length) * 100)}%`
              : "—"}
          </Text>
          <Text style={styles.metricLabel}>Stocked</Text>
        </View>
      </View>

      {isUsingFallback && (
        <View style={styles.demoBar}>
          <Text style={styles.demoBarText}>
            📦 Demo data shown — add real items in the Add tab
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading inventory…</Text>
        </View>
      ) : (
        <FlatList
          data={inventory}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Boxes color={COLORS.textSecondary} size={48} />
              <Text style={styles.emptyTitle}>Your shop is empty</Text>
              <Text style={styles.emptySubtitle}>
                Let's add your first product! Head to the Add tab to get started.
              </Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={!!selectedItem}
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Package color={COLORS.primary} size={22} />
              </View>
              <Text style={[TYPOGRAPHY.h2, { flex: 1, marginLeft: 10 }]}>
                {selectedItem?.name}
              </Text>
              <Pressable onPress={() => setSelectedItem(null)} hitSlop={8}>
                <CircleX color={COLORS.textSecondary} size={22} />
              </Pressable>
            </View>

            {[
              { label: "Current Stock", value: String(selectedItem?.quantity ?? 0) },
              { label: "Min. Stock",    value: String(selectedItem?.min_stock ?? 0) },
              { label: "Barcode",       value: selectedItem?.barcode ?? "Not set" },
              {
                label: "Status",
                value: (selectedItem?.quantity ?? 0) <= (selectedItem?.min_stock ?? 0) ? "⚠️ Low Stock" : "✅ OK",
              },
            ].map(({ label, value }) => (
              <View key={label} style={styles.modalRow}>
                <Text style={styles.modalLabel}>{label}</Text>
                <Text style={styles.modalValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: COLORS.background,
  },

  // Metrics strip
  metricsRow: {
    flexDirection:   "row",
    gap:             SPACING.xs,
    padding:         SPACING.md,
    paddingBottom:   SPACING.sm,
  },
  metricCard: {
    flex:            1,
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.md,
    padding:         SPACING.sm,
    alignItems:      "center",
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    ...SHADOW.card,
  },
  metricCardAlert: {
    borderColor: "rgba(255,59,48,0.3)",
    backgroundColor: "#FFF5F5",
  },
  metricValue: {
    fontSize:   24,
    fontWeight: "800",
    color:      COLORS.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },

  // Demo hint
  demoBar: {
    marginHorizontal: SPACING.md,
    marginBottom:     SPACING.xs,
    backgroundColor:  "#FFF8E7",
    borderRadius:     RADIUS.sm,
    padding:          10,
    borderWidth:      1,
    borderColor:      "rgba(255,149,0,0.25)",
  },
  demoBarText: {
    ...TYPOGRAPHY.caption,
    color: "#865200",
  },

  // Loading
  loadingWrap: {
    alignItems:    "center",
    paddingVertical: SPACING.xl,
    gap:           12,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
  },

  // List
  list: {
    padding:      SPACING.md,
    paddingTop:   SPACING.xs,
    paddingBottom: SPACING.xl,
  },

  // Card
  card: {
    backgroundColor: COLORS.background,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.md,
    marginBottom:    SPACING.xs,
    flexDirection:   "row",
    justifyContent:  "space-between",
    alignItems:      "center",
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    ...SHADOW.card,
  },
  cardLow: {
    borderColor: "rgba(255,59,48,0.25)",
    backgroundColor: "#FFFAFA",
  },
  cardLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  itemName: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 16,
    marginBottom: 8,
  },
  progressBar: {
    height:          4,
    backgroundColor: COLORS.overlay,
    borderRadius:    999,
    overflow:        "hidden",
    marginBottom:    6,
  },
  progressFill: {
    height:       4,
    borderRadius: 999,
  },
  itemMeta: {
    ...TYPOGRAPHY.caption,
  },
  stockBadge: {
    flexDirection:   "row",
    alignItems:      "center",
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:    999,
    gap:             4,
  },
  stockBadgeText: {
    color:      COLORS.white,
    fontSize:   12,
    fontWeight: "800",
  },

  // Empty state
  emptyState: {
    marginTop:       SPACING.xl,
    alignItems:      "center",
    paddingHorizontal: SPACING.lg,
    gap:             SPACING.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    textAlign: "center",
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    lineHeight: 22,
  },

  // Modal
  modalBackdrop: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent:  "flex-end",
  },
  modalCard: {
    backgroundColor:      COLORS.background,
    borderTopLeftRadius:  RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding:      SPACING.lg,
    paddingBottom: SPACING.xl,
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
    alignItems:     "center",
    marginBottom:   SPACING.md,
  },
  modalIconWrap: {
    width:           40,
    height:          40,
    borderRadius:    RADIUS.sm,
    backgroundColor: COLORS.surface,
    alignItems:      "center",
    justifyContent:  "center",
  },
  modalRow: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.overlay,
  },
  modalLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  modalValue: {
    ...TYPOGRAPHY.body,
    color:      COLORS.textPrimary,
    fontWeight: "700",
  },
});
