import { useFocusEffect } from "expo-router";
import {
  AlertCircle,
  Boxes,
  CircleX,
  Edit3,
  Package,
  Trash2,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { dbService } from "../database/db";
import { getAggregatedInventory } from "../logic/inventoryHelper";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../theme/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

type InventoryItem = {
  id: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  min_stock: number;
  sellingPrice: number;
  costPrice: number;
};

type EditForm = {
  name: string;
  barcode: string;
  quantity: string;
  sellingPrice: string;
  costPrice: string;
  minStock: string;
};

// ─── Fallback demo data ────────────────────────────────────────────────────────

const FALLBACK_INVENTORY: InventoryItem[] = [
  { id: "1", name: "Coke 1.5L",        quantity: 12,  min_stock: 5,  sellingPrice: 65,   costPrice: 54  },
  { id: "2", name: "Lucky Me Noodles",  quantity: 2,   min_stock: 10, sellingPrice: 18.5, costPrice: 14  },
  { id: "3", name: "Bear Brand 320g",   quantity: 45,  min_stock: 10, sellingPrice: 102,  costPrice: 88  },
  { id: "4", name: "Egg (Large)",        quantity: 120, min_stock: 50, sellingPrice: 8,    costPrice: 6.5 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(val: string): number | undefined {
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

function safeInt(val: string): number | undefined {
  const n = parseInt(val, 10);
  return isNaN(n) ? undefined : n;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const InventoryScreen: React.FC = () => {
  const [inventory,      setInventory]      = useState<InventoryItem[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isRefreshing,   setIsRefreshing]   = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);

  // Edit sheet state
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [form,       setForm]       = useState<EditForm>({
    name:         "",
    barcode:      "",
    quantity:     "",
    sellingPrice: "",
    costPrice:    "",
    minStock:     "",
  });

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadInventory = useCallback(async () => {
    try {
      const products = await getAggregatedInventory();
      if (!Array.isArray(products) || products.length === 0) {
        setInventory(FALLBACK_INVENTORY);
        setIsUsingFallback(true);
        return;
      }
      setInventory(
        products.map((p) => ({
          id:           p.id,
          name:         p.name,
          barcode:      p.barcode,
          quantity:     p.totalStock,
          min_stock:    p.minStockLevel,
          sellingPrice: p.sellingPrice,
          costPrice:    p.costPrice,
        })),
      );
      setIsUsingFallback(false);
    } catch {
      setInventory(FALLBACK_INVENTORY);
      setIsUsingFallback(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = async () => {
        await loadInventory();
        if (active) setIsLoading(false);
      };
      run();
      return () => { active = false; };
    }, [loadInventory]),
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadInventory();
    setIsRefreshing(false);
  };

  // ── Edit sheet ──────────────────────────────────────────────────────────────

  const openEdit = (item: InventoryItem) => {
    setForm({
      name:         item.name,
      barcode:      item.barcode ?? "",
      quantity:     String(item.quantity),
      sellingPrice: String(item.sellingPrice),
      costPrice:    String(item.costPrice),
      minStock:     String(item.min_stock),
    });
    setEditTarget(item);
  };

  const closeEdit = () => {
    setEditTarget(null);
  };

  const handleSave = async () => {
    if (!editTarget) return;

    const name = form.name.trim();
    if (!name) {
      Alert.alert("Validation", "Product name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      // Update product row
      await dbService.updateProduct(editTarget.id, {
        name,
        barcode:       form.barcode.trim() || null,
        minStockLevel: safeInt(form.minStock) ?? editTarget.min_stock,
      });

      // Update inventory prices / quantity
      await dbService.updateInventoryPrices(editTarget.id, {
        quantity:     safeInt(form.quantity),
        sellingPrice: safeNum(form.sellingPrice),
        costPrice:    safeNum(form.costPrice),
      });

      closeEdit();
      await loadInventory();
    } catch (err) {
      Alert.alert("Save Failed", err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const confirmDelete = (item: InventoryItem) => {
    Alert.alert(
      "Delete Product",
      `Remove "${item.name}" and all its stock records? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dbService.deleteProduct(item.id);
              await loadInventory();
            } catch (err) {
              Alert.alert("Delete Failed", err instanceof Error ? err.message : "Could not delete product.");
            }
          },
        },
      ],
    );
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const lowStockCount = inventory.filter((i) => i.quantity <= i.min_stock).length;

  // ── Render helpers ───────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const isLow = item.quantity <= item.min_stock;
    const pct   = Math.min(1, item.quantity / Math.max(1, item.min_stock * 2));

    return (
      <View style={[styles.card, isLow && styles.cardLow]}>
        {/* Main info area */}
        <TouchableOpacity
          activeOpacity={0.82}
          style={styles.cardLeft}
          onPress={() => openEdit(item)}
        >
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

          {item.sellingPrice > 0 && (
            <Text style={styles.priceTag}>₱{item.sellingPrice.toFixed(2)}</Text>
          )}
        </TouchableOpacity>

        {/* Actions column */}
        <View style={styles.cardActions}>
          <View style={[styles.stockBadge, { backgroundColor: isLow ? COLORS.danger : COLORS.success }]}>
            {isLow && <AlertCircle color={COLORS.white} size={12} />}
            <Text style={styles.stockBadgeText}>{isLow ? "LOW" : "OK"}</Text>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openEdit(item)}
            hitSlop={8}
          >
            <Edit3 color={COLORS.primary} size={18} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => confirmDelete(item)}
            hitSlop={8}
          >
            <Trash2 color={COLORS.danger} size={18} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

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

      {/* ── Edit Sheet ── */}
      <Modal
        animationType="slide"
        transparent
        visible={!!editTarget}
        onRequestClose={closeEdit}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Package color={COLORS.primary} size={20} />
              </View>
              <Text style={[TYPOGRAPHY.h2, { flex: 1, marginLeft: 10 }]}>
                Edit Product
              </Text>
              <Pressable onPress={closeEdit} hitSlop={8}>
                <CircleX color={COLORS.textSecondary} size={22} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Product name */}
              <Field label="Product Name">
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder="e.g. Coke 1.5L"
                  placeholderTextColor={COLORS.textSecondary}
                  returnKeyType="next"
                />
              </Field>

              {/* Barcode */}
              <Field label="Barcode (optional)">
                <TextInput
                  style={styles.input}
                  value={form.barcode}
                  onChangeText={(v) => setForm((f) => ({ ...f, barcode: v }))}
                  placeholder="e.g. 4800016642158"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
              </Field>

              {/* Prices row */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: SPACING.xs }}>
                  <Field label="Selling Price (₱)">
                    <TextInput
                      style={styles.input}
                      value={form.sellingPrice}
                      onChangeText={(v) => setForm((f) => ({ ...f, sellingPrice: v }))}
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.xs }}>
                  <Field label="Cost Price (₱)">
                    <TextInput
                      style={styles.input}
                      value={form.costPrice}
                      onChangeText={(v) => setForm((f) => ({ ...f, costPrice: v }))}
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                    />
                  </Field>
                </View>
              </View>

              {/* Stock row */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: SPACING.xs }}>
                  <Field label="Current Quantity">
                    <TextInput
                      style={styles.input}
                      value={form.quantity}
                      onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))}
                      placeholder="0"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="number-pad"
                      returnKeyType="next"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.xs }}>
                  <Field label="Min. Stock Level">
                    <TextInput
                      style={styles.input}
                      value={form.minStock}
                      onChangeText={(v) => setForm((f) => ({ ...f, minStock: v }))}
                      placeholder="5"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  </Field>
                </View>
              </View>

              {/* Margin preview */}
              {(() => {
                const sell = safeNum(form.sellingPrice) ?? 0;
                const cost = safeNum(form.costPrice) ?? 0;
                if (sell > 0 && cost > 0) {
                  const margin = ((sell - cost) / sell) * 100;
                  const color  = margin >= 12 ? COLORS.success : COLORS.warning;
                  return (
                    <View style={[styles.marginChip, { borderColor: color }]}>
                      <Text style={[styles.marginChipText, { color }]}>
                        Margin: {margin.toFixed(1)}% {margin >= 12 ? "✅" : "⚠️ Below 12%"}
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
                onPress={closeEdit}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed, isSaving && styles.btnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.btnPrimaryText}>
                  {isSaving ? "Saving…" : "Save Changes"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Field wrapper ─────────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: COLORS.background,
  },

  // Metrics strip
  metricsRow: {
    flexDirection:  "row",
    gap:            SPACING.xs,
    padding:        SPACING.md,
    paddingBottom:  SPACING.sm,
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
    borderColor:     "rgba(255,59,48,0.3)",
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
    alignItems:     "center",
    paddingVertical: SPACING.xl,
    gap:            12,
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
    borderColor:     "rgba(255,59,48,0.25)",
    backgroundColor: "#FFFAFA",
  },
  cardLeft: {
    flex:        1,
    marginRight: SPACING.sm,
  },
  itemName: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize:     16,
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
  priceTag: {
    ...TYPOGRAPHY.caption,
    color:      COLORS.primary,
    fontWeight: "700",
    marginTop:  4,
  },

  // Card actions column
  cardActions: {
    alignItems: "center",
    gap:        SPACING.xs,
  },
  stockBadge: {
    flexDirection:   "row",
    alignItems:      "center",
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:    999,
    gap:             4,
  },
  stockBadgeText: {
    color:      COLORS.white,
    fontSize:   11,
    fontWeight: "800",
  },
  actionBtn: {
    width:           36,
    height:          36,
    borderRadius:    RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    alignItems:      "center",
    justifyContent:  "center",
  },

  // Empty state
  emptyState: {
    marginTop:         SPACING.xl,
    alignItems:        "center",
    paddingHorizontal: SPACING.lg,
    gap:               SPACING.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    textAlign: "center",
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    textAlign:  "center",
    lineHeight: 22,
  },

  // Edit modal
  modalBackdrop: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent:  "flex-end",
  },
  modalCard: {
    backgroundColor:      COLORS.background,
    borderTopLeftRadius:  RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding:              SPACING.lg,
    paddingBottom:        SPACING.xl,
    maxHeight:            "90%",
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

  // Form
  row: {
    flexDirection: "row",
  },
  fieldWrap: {
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight:   "600",
    marginBottom: 6,
    color:        COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.md,
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   12,
    ...TYPOGRAPHY.body,
    color:           COLORS.textPrimary,
    fontSize:        16,
  },

  // Margin chip
  marginChip: {
    borderWidth:    1,
    borderRadius:   RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
    marginBottom:   SPACING.sm,
    alignItems:     "center",
    backgroundColor: COLORS.surface,
  },
  marginChipText: {
    ...TYPOGRAPHY.body,
    fontWeight: "700",
    fontSize:   14,
  },

  // Modal actions
  modalActions: {
    marginTop:     SPACING.md,
    flexDirection: "row",
    gap:           SPACING.sm,
  },
  btnSecondary: {
    flex:            1,
    borderWidth:     1,
    borderColor:     COLORS.overlay,
    borderRadius:    RADIUS.sm,
    paddingVertical: 14,
    alignItems:      "center",
    backgroundColor: COLORS.surface,
  },
  btnSecondaryText: {
    ...TYPOGRAPHY.body,
    color:      COLORS.textPrimary,
    fontWeight: "700",
  },
  btnPrimary: {
    flex:            1,
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.sm,
    paddingVertical: 14,
    alignItems:      "center",
  },
  btnPrimaryText: {
    ...TYPOGRAPHY.body,
    color:      COLORS.white,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
});
